/* GET  /.netlify/functions/tickers  -> { count }
 * POST /.netlify/functions/tickers  -> records a ticker, returns the new { count }
 *
 * A shared, permanent tally of distinct tickers ever screened by anyone. The previous
 * implementation was a localStorage number, which was per-browser and reset whenever
 * storage was cleared. That contradicted what the stat claims to measure.
 *
 * Stored as a set, so the same ticker from a thousand users counts once and the total
 * can only ever rise.
 */
import { getStore } from '@netlify/blobs';

const KEY = 'screened-tickers';
const MAX_TICKERS = 50000;          // ceiling so one blob cannot grow without limit
const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }
});

async function load(store) {
  try {
    const rec = await store.get(KEY, { type: 'json' });
    if (rec && Array.isArray(rec.tickers)) return rec;
  } catch { /* first run */ }
  return { tickers: [], updatedAt: Date.now() };
}

export default async (req) => {
  const store = getStore('stats');

  if (req.method === 'GET') {
    const rec = await load(store);
    return json(200, { count: rec.tickers.length });
  }

  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  // Cap the body before reading: a real payload is a few dozen bytes.
  const declared = Number(req.headers.get('content-length') || 0);
  if (declared > 2048) return json(413, { error: 'Body too large' });
  let raw;
  try { raw = await req.text(); } catch { return json(400, { error: 'Unreadable body' }); }
  if (raw.length > 2048) return json(413, { error: 'Body too large' });

  let body;
  try { body = JSON.parse(raw); } catch { return json(400, { error: 'Invalid JSON' }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json(400, { error: 'Expected a JSON object' });
  }

  // Only plausible ticker symbols. Anything else is discarded rather than stored.
  const t = String(body.ticker || '').trim().toUpperCase();
  if (!/^[A-Z0-9._-]{1,20}$/.test(t)) return json(400, { error: 'Invalid ticker' });

  const rec = await load(store);
  if (!rec.tickers.includes(t)) {
    if (rec.tickers.length >= MAX_TICKERS) return json(200, { count: rec.tickers.length });
    rec.tickers.push(t);
    rec.updatedAt = Date.now();
    // Last-write-wins. Two simultaneous writers could drop one entry, which is acceptable
    // for a display counter and avoids needing locking.
    await store.setJSON(KEY, rec);
  }
  return json(200, { count: rec.tickers.length });
};
