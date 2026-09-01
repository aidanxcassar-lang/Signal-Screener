/* The /crypto-scores hub. Every report links here, and this links to every report.
 * It is the internal-linking centre of the whole set, so it is built last and kept simple.
 */
import { markSVG, LOGOS } from './coins.js';
import { header, footer, BASE_CSS } from './chrome.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const SITE = process.env.SITE_URL || 'https://www.signalscreener.app';
const fmtUSD = (n) => !n ? 'n/a' : n >= 1e12 ? '$' + (n/1e12).toFixed(2) + 'T'
  : n >= 1e9 ? '$' + (n/1e9).toFixed(1) + 'B' : n >= 1e6 ? '$' + (n/1e6).toFixed(0) + 'M' : '$' + Math.round(n);

function renderHub({ rows, sectors }) {
  const title = 'Crypto Scores & Risk Ratings, Updated Daily | Signal Screener';
  const desc = `Independent scores for ${rows.length} crypto assets across ${Object.keys(sectors).length} sectors. `
             + `Quality, Opportunity and Risk from live public data, with the data coverage shown on every score.`;

  const bySector = {};
  rows.forEach(r => { (bySector[r.coin.sector] ||= []).push(r); });
  Object.values(bySector).forEach(list => list.sort((a, b) => (b.scored.quality ?? 0) - (a.scored.quality ?? 0)));

  const org = {
    '@context':'https://schema.org','@type':'Organization',
    name:'Signal Screener', url:SITE, logo:`${SITE}/icon-512.svg`,
    sameAs:['https://x.com/Sigscreenerapp'],
    description:'Independent crypto scoring from live public data, with the data coverage shown behind every score.'
  };
  const itemList = {
    '@context':'https://schema.org','@type':'ItemList',
    itemListElement: rows.map((r, i) => ({
      '@type':'ListItem', position:i+1, name:`${r.coin.name} (${r.coin.ticker})`,
      url:`${SITE}/coins/${r.coin.slug}` }))
  };

  const sectorBlocks = Object.keys(bySector).map(key => {
    const sec = sectors[key], list = bySector[key];
    return `<section class="sec">
      <h2>${esc(sec.name)}</h2>
      <p class="sec-what">${esc(sec.what)}</p>
      <table>
        <thead><tr><th>Asset</th><th>Quality</th><th>Risk</th><th>Market cap</th></tr></thead>
        <tbody>${list.map(r => `
          <tr>
            <td class="c-name"><span class="c-mark">${(LOGOS[r.coin.slug] || r.fig.logo)
  ? `<img src="${esc(LOGOS[r.coin.slug] || r.fig.logo)}" alt="" width="26" height="26" loading="lazy" decoding="async">`
  : markSVG(r.coin.slug, 26)}</span><a href="/coins/${esc(r.coin.slug)}">${esc(r.coin.name)}</a>
              <span class="c-tk">${esc(r.coin.ticker)}</span></td>
            <td class="c-q">${r.scored.quality?.toFixed(1) ?? '&mdash;'}</td>
            <td class="c-r">${esc(r.scored.riskTier)}</td>
            <td class="c-mc">${fmtUSD(r.fig.raw.marketCap)}</td>
          </tr>`).join('')}</tbody>
      </table>
    </section>`;
  }).join('');

  return `<!doctype html>
<html lang="en"><head>
<meta charset="UTF-8"><title>${esc(title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="${esc(desc.slice(0,158))}">
<link rel="canonical" href="${SITE}/crypto-scores">
<meta name="robots" content="index,follow,max-snippet:-1">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc.slice(0,158))}">
<meta property="og:url" content="${SITE}/crypto-scores">
<meta property="og:image" content="${SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@Sigscreenerapp">
<link rel="icon" href="/favicon.ico" sizes="any">
<script type="application/ld+json">${JSON.stringify(org)}</script>
<script type="application/ld+json">${JSON.stringify(itemList)}</script>
<style>${BASE_CSS}
.wrap{max-width:820px;margin:0 auto;padding:28px 20px 64px}
h1{font-size:30px;color:var(--ink);margin:0 0 10px;letter-spacing:-.01em}
.lede{font-size:17px;color:var(--muted);margin:0 0 8px}
.meta{font-size:12.5px;color:var(--subtle);font-family:var(--mono);margin-bottom:28px}
h2{font-size:21px;color:var(--ink);margin:34px 0 8px}
.sec-what{font-size:15px;color:var(--muted);margin:0 0 14px}
table{width:100%;border-collapse:collapse;font-size:14.5px;margin-bottom:6px}
th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);
padding:8px 10px;border-bottom:1px solid var(--border)}
td{padding:10px;border-bottom:1px solid var(--border)}
.c-name{display:flex;align-items:center;gap:9px}
.c-mark{line-height:0;flex-shrink:0}
.c-mark img{border-radius:50%;display:block}
.c-name a{color:var(--accent);text-decoration:none;font-weight:600}
.c-tk{color:var(--subtle);font-family:var(--mono);font-size:11.5px;margin-left:7px}
.c-q{font-family:var(--mono);font-weight:700;color:var(--ink);width:70px}
.c-r{font-size:11.5px;color:var(--muted);width:100px}
.c-mc{font-family:var(--mono);color:var(--muted);width:96px}
.how{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px 18px;margin:30px 0}
.how h3{margin:0 0 8px;font-size:15px;color:var(--ink)}
.how p{margin:0 0 10px;font-size:14.5px}
.how p:last-child{margin:0}
.empty-note{background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--accent);
  border-radius:0 10px 10px 0;padding:18px 20px;margin:26px 0;}
.empty-note h2{margin:0 0 8px;font-size:17px;}
.empty-note p{margin:0;font-size:14.5px;color:var(--muted);}
.empty-note code{background:var(--bg);padding:2px 6px;border-radius:4px;font-size:13px;}
.disc{margin-top:30px;padding-top:18px;border-top:1px solid var(--border);font-size:12.5px;color:var(--subtle)}
.disc a{color:var(--accent)}
</style></head><body>
${header("reports")}
<div class="wrap">

<h1>Crypto scores and risk ratings</h1>
<p class="lede">Independent scores for ${rows.length} assets, built from live public data. Figures update daily.</p>
<div class="meta">Updated ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</div>

<div class="how">
  <h3>How to read these</h3>
  <p><b>Quality</b> measures how solid an asset looks today: its size, how easily it trades, and how much of its supply is already released. <b>Risk</b> measures what could go wrong: thin trading, small size, wild price swings.</p>
  <p>Every score also shows a <b>coverage</b> figure. That is the share of the measurements we could actually verify. Where something cannot be checked, we leave it out rather than guess, and we tell you what was missing.</p>
</div>

${rows.length ? sectorBlocks : `<div class="empty-note">
  <h2>Reports are not populated yet</h2>
  <p>The editorial for these reports is published, but the market figures behind them have
  not been fetched. Run the <code>refresh-reports</code> function once from the Netlify
  dashboard and this page will fill in.</p>
</div>`}

<div class="disc">
  <p><b>Not financial advice.</b> These are mechanical scores from public data. They take no account of your circumstances and are not a recommendation. Crypto is volatile and you can lose everything. Check all figures yourself.</p>
  <p><a href="/">Score any asset</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a>
  · <a href="https://x.com/Sigscreenerapp" target="_blank" rel="noopener noreferrer me">@Sigscreenerapp on X</a></p>
</div>

</div>
${footer()}
</body></html>`;
}
export { renderHub };
