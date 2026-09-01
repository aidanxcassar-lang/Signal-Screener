/* Serves /coins/:slug and /crypto-scores.
 *
 * Editorial comes from content/coins.js and never changes. Figures come from Blobs, which
 * the daily cron refreshes. If the cron has not run or a provider was down, the page
 * serves the last good figures rather than failing.
 */
import { getStore } from '@netlify/blobs';
import { COINS, SECTORS } from '../../content/coins.js';
import { scoreAll } from './_lib/scoring.js';
import { renderReport } from './_lib/reportpage.js';
import { renderHub } from './_lib/hubpage.js';

const SITE = process.env.SITE_URL || 'https://www.signalscreener.app';
const notFound = () => new Response(null, { status: 302, headers: { Location: `${SITE}/crypto-scores` } });

async function loadFigures(slug) {
  try {
    const store = getStore('report-figures');
    return await store.get(slug, { type: 'json' });
  } catch { return null; }
}

export default async (req) => {
  const path = new URL(req.url).pathname.replace(/\/+$/, '');

  // ── Hub ──
  if (path === '/crypto-scores') {
    const rows = [];
    for (const slug of Object.keys(COINS)) {
      const fig = await loadFigures(slug);
      if (!fig) continue;
      const scored = scoreAll(fig.raw);
      rows.push({ coin: COINS[slug], sector: SECTORS[COINS[slug].sector], scored, fig });
    }
    return new Response(renderHub({ rows, sectors: SECTORS }), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=900' }
    });
  }

  // ── Coin report ──
  const m = path.match(/^\/coins\/([a-z0-9-]{1,40})$/);
  if (!m) return notFound();
  const coin = COINS[m[1]];
  if (!coin) return notFound();

  const fig = await loadFigures(coin.slug);
  if (!fig) {
    // Redirecting here made it look as though the report did not exist. Say what is
    // actually missing instead.
    return new Response(
      `<!doctype html><meta charset="utf-8"><title>${coin.name} report is not ready</title>
<meta name="robots" content="noindex">
<body style="margin:0;background:#0F1219;color:#C3CEE0;font-family:system-ui,sans-serif;
display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px">
<div style="max-width:460px">
<h1 style="color:#E6EDF7;font-size:20px;margin:0 0 10px">The ${coin.name} report is not ready yet</h1>
<p style="line-height:1.65;margin:0 0 14px">The write-up is published, but the market figures
behind it have not been fetched. Run the <code style="background:#161C28;padding:2px 6px;border-radius:4px">refresh-reports</code>
function once from the Netlify dashboard and this page will work.</p>
<p style="margin:0"><a href="/crypto-scores" style="color:#818CF8">All reports</a> &nbsp;·&nbsp;
<a href="/" style="color:#818CF8">Signal Screener</a></p>
</div></body>`,
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
    );
  }

  const scored = scoreAll(fig.raw);
  const coverage = Math.round(((scored.qualityCoverage + scored.opportunityCoverage + scored.riskCoverage) / 3) * 100);

  // Peers: same sector, excluding this coin.
  const peers = [];
  for (const s of Object.keys(COINS)) {
    if (s === coin.slug || COINS[s].sector !== coin.sector) continue;
    const pf = await loadFigures(s);
    if (!pf) continue;
    peers.push({ name: COINS[s].name, slug: s, quality: scoreAll(pf.raw).quality });
  }

  return new Response(renderReport({
    coin, sector: SECTORS[coin.sector], raw: fig.raw, scored, coverage,
    publishedScore: coin.publishedScore, currentPrice: fig.price,
    updatedAt: fig.updatedAt || Date.now(), peers
  }), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=900' }
  });
};

export const config = { path: ['/coins/:slug', '/crypto-scores'] };
