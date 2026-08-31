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

function validEmail(e) {
  return typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid JSON' }); }

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

  if (record.subscriptions.length >= MAX_PER_EMAIL &&
      !record.subscriptions.some(s => s.ticker === ticker)) {
    return json(429, { error: `You can track up to ${MAX_PER_EMAIL} assets.` });
  }

  const baseline = body.baseline && typeof body.baseline === 'object' ? body.baseline : {};
  const existing = record.subscriptions.find(s => s.ticker === ticker);
  const sub = {
    ticker, name, condition,
    baseline: {
      q: Number.isFinite(baseline.q) ? baseline.q : null,
      o: Number.isFinite(baseline.o) ? baseline.o : null,
      r: Number.isFinite(baseline.r) ? baseline.r : null
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

export const config = { path: '/.netlify/functions/subscribe' };
