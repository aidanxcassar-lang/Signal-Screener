/* Audit status from DefiLlama.
 *
 * This is the one "unverifiable" field that turns out to be partly verifiable. DefiLlama's
 * protocol records carry an `audits` count and `audit_links`, both free and machine
 * readable. It only covers protocols, not base-layer networks like Bitcoin, so callers
 * must handle a null result rather than assume absence means unaudited.
 */
const UA = { 'User-Agent': 'SignalScreener/1.0 (+https://www.signalscreener.app)' };
let cache = null, cacheAt = 0;

async function loadProtocols() {
  if (cache && Date.now() - cacheAt < 6 * 3600000) return cache;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch('https://api.llama.fi/protocols', { signal: ctl.signal, headers: UA });
    if (!r.ok) return cache;
    cache = await r.json(); cacheAt = Date.now();
    return cache;
  } catch { return cache; } finally { clearTimeout(t); }
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Returns {count, links, source} or null when the asset is not a listed protocol. */
async function fetchAudits(ticker, name) {
  const list = await loadProtocols();
  if (!Array.isArray(list)) return null;
  const t = norm(ticker), n = norm(name);
  const hit = list.find(p => norm(p.symbol) === t) || list.find(p => norm(p.name) === n);
  if (!hit) return null;
  const count = Number(hit.audits);
  if (!Number.isFinite(count)) return null;
  let links = [];
  try {
    links = typeof hit.audit_links === 'string' ? JSON.parse(hit.audit_links) : (hit.audit_links || []);
  } catch { links = []; }
  return { count, links: Array.isArray(links) ? links.slice(0, 4) : [], source: 'DefiLlama' };
}

export { fetchAudits };
