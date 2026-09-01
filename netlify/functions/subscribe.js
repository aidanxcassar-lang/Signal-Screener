/* POST /.netlify/functions/subscribe
 * Stores a score-change alert subscription, pending email confirmation (double opt-in).
 *
 * Double opt-in is deliberate: without it, anyone could subscribe someone else's address,
 * which is both abuse and a GDPR problem. Nothing is sent until the address is confirmed.
 */
import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

const MAX_PER_EMAIL = 25;
// A real subscription payload is a few hundred bytes. Anything far past that is a mistake
// or an attack, and must be refused before it is read into memory and parsed.
const MAX_BODY_BYTES = 16 * 1024;

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' }
});

function validEmail(e) {
  return typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const declaredLength = Number(req.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json(413, { error: 'Request body too large' });
  }

  let body;
  try {
    // Content-Length can be absent (chunked) or a lie, so also cap what is actually read.
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json(413, { error: 'Request body too large' });
    body = JSON.parse(raw);
  } catch { return json(400, { error: 'Invalid JSON' }); }

  // `null`, arrays, strings and numbers are all valid JSON but not valid payloads. Without
  // this, a body of `null` threw a TypeError on the first property read and returned a 500.
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
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
  if (record && !Array.isArray(record.subscriptions)) record.subscriptions = [];
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

  if (record.subscriptions.length >= MAX_PER_EMAIL &&
      !record.subscriptions.some(s => s.ticker === ticker)) {
    return json(429, { error: `You can track up to ${MAX_PER_EMAIL} assets.` });
  }

  const baseline = body.baseline && typeof body.baseline === 'object' && !Array.isArray(body.baseline)
    ? body.baseline : {};
  // Scores live on a 0-10 scale. Storing anything else would produce nonsense deltas in the
  // alert job, so an out-of-range figure is clamped rather than persisted as sent.
  const score = v => (Number.isFinite(v) ? Math.max(0, Math.min(10, v)) : null);
  const existing = record.subscriptions.find(s => s.ticker === ticker);
  const sub = {
    ticker, name, condition,
    baseline: { q: score(baseline.q), o: score(baseline.o), r: score(baseline.r) },
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
// No `config.path` export: `/.netlify/*` is a reserved prefix, so declaring a custom path
// there suppresses the default `/.netlify/functions/subscribe` route without replacing it.
