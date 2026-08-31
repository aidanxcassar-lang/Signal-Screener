/* GET /s/:id — the page a social platform actually fetches when the link is shared.
 * It carries the per-card og:image, then sends humans on to the app.
 */
import { getStore } from '@netlify/blobs';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export default async (req) => {
  const id = (new URL(req.url).pathname.split('/').pop() || '').slice(0, 40);
  const site = process.env.SITE_URL || 'https://www.signalscreener.app';
  const store = getStore('share-cards');

  let meta = null;
  try {
    const res = await store.getWithMetadata(id, { type: 'stream' });
    meta = res?.metadata || null;
  } catch { meta = null; }

  if (!meta) {
    return new Response(null, { status: 302, headers: { Location: site } });
  }

  const ticker = esc(meta.ticker || 'Asset');
  const name = esc(meta.name || '');
  const fmt = (v) => (typeof v === 'number' ? v.toFixed(1) : 'n/a');
  const title = `${ticker} scorecard | Signal Screener`;
  const desc = `Quality ${fmt(meta.quality)}, Opportunity ${fmt(meta.opportunity)}, `
             + `Risk ${esc(meta.riskTier || 'unrated')}`
             + (typeof meta.coverage === 'number' ? `, ${Math.round(meta.coverage)}% data coverage.` : '.')
             + ' Scored from live public data. Not financial advice.';
  const img = `${site}/card/${encodeURIComponent(id)}.png`;

  return new Response(
`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${site}/s/${encodeURIComponent(id)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Signal Screener">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1080">
<meta property="og:image:height" content="1080">
<meta property="og:image:alt" content="${ticker} scorecard from Signal Screener">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${img}">
<meta name="robots" content="noindex,follow">
<style>body{margin:0;background:#0F1219;color:#E6EDF7;font-family:system-ui,sans-serif;
display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:18px;padding:24px}
img{max-width:min(90vw,520px);border-radius:16px;border:1px solid #232B3A}
a{color:#818CF8}</style></head>
<body>
<img src="${img}" alt="${ticker} scorecard">
<p style="color:#8A9AB8;font-size:14px;margin:0">${desc}</p>
<a href="${site}">Score your own on Signal Screener</a>
</body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=600' } }
  );
};

export const config = { path: '/s/:id' };
