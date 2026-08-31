/* Scheduled daily. This is the function that makes alerts real: it re-scores every tracked
 * asset while the user's browser is closed, compares against their stored baseline, and
 * emails only when something has moved materially.
 *
 * Schedule is set in netlify.toml. Run it manually from the Netlify UI to test.
 */
import { getStore } from '@netlify/blobs';
import { fetchRaw } from './_lib/providers.js';
import { scoreAll } from './_lib/scoring.js';

// A score must move by at least this much before anyone is emailed. Without a threshold
// the job would email on every rounding wobble and be unsubscribed from within a week.
const THRESHOLD = 1.0;
// And never email the same person about the same asset more than once every few days.
const COOLDOWN_MS = 3 * 86400000;

export default async () => {
  const index = getStore('alerts-index');
  const store = getStore('alerts');
  const { blobs } = await index.list();

  const scoreCache = new Map();   // one fetch per ticker, however many subscribers
  let emails = 0, checked = 0, skipped = 0;

  for (const b of blobs) {
    const rec = await store.get(b.key, { type: 'json' }).catch(() => null);
    if (!rec || !rec.confirmed || !rec.subscriptions?.length) { skipped++; continue; }

    const changes = [];
    for (const sub of rec.subscriptions) {
      checked++;
      if (sub.lastNotifiedAt && Date.now() - sub.lastNotifiedAt < COOLDOWN_MS) continue;

      let scored = scoreCache.get(sub.ticker);
      if (scored === undefined) {
        const raw = await fetchRaw(sub.ticker).catch(() => null);
        scored = raw ? scoreAll(raw) : null;
        scoreCache.set(sub.ticker, scored);
      }
      if (!scored) continue;   // provider outage: stay silent rather than guess

      const base = sub.baseline || {};
      const deltas = {
        quality: delta(base.q, scored.quality),
        opportunity: delta(base.o, scored.opportunity),
        risk: delta(base.r, scored.risk)
      };
      const want = sub.condition;
      const hit =
        (want === 'any' && Object.values(deltas).some(d => d != null && Math.abs(d) >= THRESHOLD)) ||
        (want === 'quality' && deltas.quality != null && Math.abs(deltas.quality) >= THRESHOLD) ||
        (want === 'opportunity' && deltas.opportunity != null && Math.abs(deltas.opportunity) >= THRESHOLD) ||
        (want === 'risk' && deltas.risk != null && deltas.risk >= THRESHOLD);

      if (hit) {
        changes.push({ ticker: sub.ticker, name: sub.name, deltas, scored });
        sub.baseline = { q: scored.quality, o: scored.opportunity, r: scored.risk };
        sub.lastNotifiedAt = Date.now();
      }
    }

    if (changes.length) {
      const sent = await sendAlert(rec, changes).catch(() => false);
      if (sent) emails++;
      await store.setJSON(b.key, rec);
    }
  }

  return new Response(JSON.stringify({ ok: true, subscribers: blobs.length, checked, skipped, emails }),
    { headers: { 'Content-Type': 'application/json' } });
};

function delta(before, after) {
  if (before == null || after == null) return null;
  return Math.round((after - before) * 10) / 10;
}
const arrow = d => d > 0 ? `+${d.toFixed(1)}` : d.toFixed(1);

async function sendAlert(rec, changes) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL;
  // alerts@ is send-only, so point replies at the mailbox you actually read.
  const replyTo = process.env.REPLY_TO_EMAIL || 'hello@signalscreener.app';
  const site = process.env.SITE_URL || 'https://www.signalscreener.app';
  if (!key || !from) return false;

  const unsub = `${site}/.netlify/functions/unsubscribe?t=${rec.unsubToken}`;
  const lines = changes.map(c => {
    const parts = [];
    if (c.deltas.quality != null && c.deltas.quality) parts.push(`Quality ${arrow(c.deltas.quality)}`);
    if (c.deltas.opportunity != null && c.deltas.opportunity) parts.push(`Opportunity ${arrow(c.deltas.opportunity)}`);
    if (c.deltas.risk != null && c.deltas.risk) parts.push(`Risk ${arrow(c.deltas.risk)}`);
    return `${c.ticker} — ${parts.join(', ')}  (now Q ${fmt(c.scored.quality)} / O ${fmt(c.scored.opportunity)} / Risk ${c.scored.riskTier})`;
  }).join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from, to: rec.email, reply_to: replyTo,
      subject: `Score change: ${changes.map(c => c.ticker).join(', ')}`,
      text:
`Scores moved on assets you track:

${lines}

These are mechanical scores from public data, not financial advice.
Open the screener: ${site}

Unsubscribe: ${unsub}`,
      headers: { 'List-Unsubscribe': `<${unsub}>` }
    })
  });
  return res.ok;
}
const fmt = v => v == null ? 'n/a' : v.toFixed(1);

export const config = { schedule: '0 8 * * *' };   // 08:00 UTC daily
