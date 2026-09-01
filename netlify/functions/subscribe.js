/* POST /.netlify/functions/subscribe
 * Stores a score-change alert subscription, pending email confirmation (double opt-in).
 *
 * Double opt-in is deliberate: without it, anyone could subscribe someone else's address,
 * which is both abuse and a GDPR problem. Nothing is sent until the address is confirmed.
 */
import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

const MAX_PER_EMAIL = 25;

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' }
});

// Scores are defined on 0-10. Anything outside that is a client error, not data.
function clampScore(v) {
  return Number.isFinite(v) ? Math.max(0, Math.min(10, v)) : null;
}

function validEmail(e) {
  return typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  // Cap the body BEFORE reading it. A real payload is a few hundred bytes; an 8MB body
  // was enough to hard-crash the local dev proxy during testing.
  const MAX_BODY = 16 * 1024;
  const declared = Number(req.headers.get('content-length') || 0);
  if (declared > MAX_BODY) return json(413, { error: 'Request body too large' });
  let raw;
  try {
    raw = await req.text();
  } catch { return json(400, { error: 'Could not read body' }); }
  // A missing or dishonest Content-Length must not bypass the cap.
  if (raw.length > MAX_BODY) return json(413, { error: 'Request body too large' });

  let body;
  try { body = JSON.parse(raw); } catch { return json(400, { error: 'Invalid JSON' }); }
  // `null` is valid JSON, so it passed the parse guard and then threw a 500 with a raw
  // stack trace when a property was read off it. Same for arrays, strings and numbers.
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json(400, { error: 'Expected a JSON object' });
  }

  const email = String(body.email || '').trim().toLowerCase();
  const ticker = String(body.ticker || '').trim().toUpperCase().slice(0, 20);
  const name = String(body.name || '').trim().slice(0, 80);
  const condition = ['any', 'quality', 'opportunity', 'risk'].includes(body.condition)
    ? body.condition : 'any';

  if (!validEmail(email)) return json(400, { error: 'Invalid email address' });
  if (!ticker) return json(400, { error: 'Missing ticker' });

  const store = getStore('alerts');
  const emailKey = `by-email/${crypto.createHash('sha256').update(email).digest('hex')}`;

  let record = await store.get(emailKey, { type: 'json' }).catch(() => null);
  if (!record) {
    record = {
      email,
      confirmed: false,
      confirmToken: crypto.randomBytes(24).toString('hex'),
      unsubToken: crypto.randomBytes(24).toString('hex'),
      createdAt: Date.now(),
      subscriptions: []
    };
  }

  if (!Array.isArray(record.subscriptions)) record.subscriptions = [];
  if (record.subscriptions.length >= MAX_PER_EMAIL &&
      !record.subscriptions.some(s => s.ticker === ticker)) {
    return json(429, { error: `You can track up to ${MAX_PER_EMAIL} assets.` });
  }

  const baseline = body.baseline && typeof body.baseline === 'object' ? body.baseline : {};
  const existing = record.subscriptions.find(s => s.ticker === ticker);
  const sub = {
    ticker, name, condition,
    baseline: {
      q: clampScore(baseline.q),
      o: clampScore(baseline.o),
      r: clampScore(baseline.r)
    },
    addedAt: Date.now(),
    lastNotifiedAt: null
  };
  if (existing) Object.assign(existing, sub);
  else record.subscriptions.push(sub);

  await store.setJSON(emailKey, record);

  // Index so the scheduled job can enumerate subscribers without a full scan.
  const index = getStore('alerts-index');
  await index.setJSON(emailKey, { emailKey, updatedAt: Date.now() });

  if (!record.confirmed) {
    await sendConfirmation(record).catch(() => {});
    return json(200, { ok: true, pending: true });
  }
  return json(200, { ok: true, pending: false });
};

async function sendConfirmation(record) {
  const site = process.env.SITE_URL || 'https://www.signalscreener.app';
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL;
  // alerts@ is send-only, so point replies at the mailbox you actually read.
  const replyTo = process.env.REPLY_TO_EMAIL || 'hello@signalscreener.app';
  if (!key || !from) return; // Not configured yet — subscription is stored regardless.

  const link = `${site}/.netlify/functions/confirm?t=${record.confirmToken}`;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from, to: record.email, reply_to: replyTo,
      subject: 'Confirm your Signal Screener alerts',
      text: `Confirm score-change alerts for your watchlist:\n\n${link}\n\n`
          + `If you did not request this, ignore this email and nothing will be sent.`
    })
  });
}

// No config.path: the default /.netlify/functions/<name> route is correct.
// Declaring a custom path REPLACES that route, and /.netlify/* is reserved,
// so any path declared here makes the function 404 on every request.
