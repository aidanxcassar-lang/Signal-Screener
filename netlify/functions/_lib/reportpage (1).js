/* Renders a coin report: hand-written editorial that never changes, plus live figures.
 *
 * The split matters for maintenance. Editorial is authored once. Everything numeric comes
 * from the daily scoring run, so the page stays current without anyone rewriting it.
 *
 * Both the published score and today's score are shown. Showing only the frozen one would
 * diverge from the app and look broken; showing only today's would lose the accountability
 * that makes the return ticker worth having.
 */
import { fmtUSD } from './commentary.js';
import { markSVG, LOGOS } from './coins.js';
import { header, footer, BASE_CSS } from './chrome.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const SITE = process.env.SITE_URL || 'https://www.signalscreener.app';
const pct1 = (n) => (n == null ? 'n/a' : n.toFixed(1) + '%');
const human = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

function renderReport({ coin, sector, raw, scored, coverage, publishedScore, currentPrice,
                       baselinePrice, baselineAt, updatedAt, logo, audits, peers = [] }) {
  // The baseline captured live on first publish beats anything typed by hand.
  const basePrice = baselinePrice ?? coin.publishedPrice;
  const baseISO = baselineAt ? new Date(baselineAt).toISOString().slice(0, 10) : coin.publishedISO;
  const core = scored.components || {};
  const ret = (currentPrice && basePrice)
    ? ((currentPrice - basePrice) / basePrice) * 100 : null;
  const days = Math.max(0, Math.round((Date.now() - Date.parse(baseISO)) / 86400000));
  const fdvRatio = raw.fdv && raw.marketCap ? raw.fdv / raw.marketCap : null;
  const volRatio = raw.volume24h && raw.marketCap ? raw.volume24h / raw.marketCap : null;


  const title = `${coin.name} (${coin.ticker}): What It Is, Why It Scores Well, and What To Watch`;
  const desc = `${coin.name} explained: what it does, the bull case, the risks, and a ${scored.quality?.toFixed(1)}/10 Quality score `
             + `on ${coverage}% verified data. Market cap ${fmtUSD(raw.marketCap)}. Updated ${human(updatedAt)}.`;

  const faqs = [
    [`What is ${coin.name} used for?`, coin.usedFor],
    [`Is ${coin.name} a good investment?`,
     `We do not give investment advice. ${coin.name} scores ${scored.quality?.toFixed(1)} of 10 for Quality and ${scored.risk?.toFixed(1)} for Risk on ${coverage}% verified data. The bull case and the risks are both set out above so you can weigh them yourself.`],
    [`What should I watch with ${coin.name}?`,
     coin.bear.slice(0, 2).join(' ')],
    [`What is the ${sector.name} sector?`, sector.what],
    [`How has ${coin.name} performed since this report?`,
     ret == null ? `Price data is not currently available.` :
     `Since publication on ${human(baseISO)}, ${coin.ticker} has moved ${ret > 0 ? '+' : ''}${ret.toFixed(1)}%. We show this regardless of direction.`]
  ];

  const schemas = [
    { '@context':'https://schema.org','@type':'Article',
      headline:title, datePublished:coin.publishedISO, dateModified:new Date(updatedAt).toISOString(),
      author:{'@type':'Organization',name:'Signal Screener',url:SITE,sameAs:['https://x.com/Sigscreenerapp']},
      publisher:{'@type':'Organization',name:'Signal Screener',url:SITE,sameAs:['https://x.com/Sigscreenerapp']},
      mainEntityOfPage:`${SITE}/coins/${coin.slug}`, description:desc },
    { '@context':'https://schema.org','@type':'FAQPage',
      mainEntity:faqs.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}})) },
    { '@context':'https://schema.org','@type':'BreadcrumbList',
      itemListElement:[
        {'@type':'ListItem',position:1,name:'Home',item:SITE},
        {'@type':'ListItem',position:2,name:'Crypto reports',item:`${SITE}/crypto-scores`},
        {'@type':'ListItem',position:3,name:sector.name,item:`${SITE}/sector/${sector.slug}`},
        {'@type':'ListItem',position:4,name:coin.name,item:`${SITE}/coins/${coin.slug}`}]}
  ];

  const retClass = ret == null ? 'flat' : ret > 0 ? 'up' : ret < 0 ? 'down' : 'flat';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="${esc(desc.slice(0,158))}">
<link rel="canonical" href="${SITE}/coins/${coin.slug}">
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc.slice(0,158))}">
<meta property="og:url" content="${SITE}/coins/${coin.slug}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@Sigscreenerapp">
<meta name="twitter:creator" content="@Sigscreenerapp">
<link rel="icon" href="/favicon.ico" sizes="any">
${schemas.map(s=>`<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n')}
<style>${BASE_CSS}
.wrap{max-width:760px;margin:0 auto;padding:26px 20px 64px}
nav.crumb{font-size:13px;color:var(--subtle);margin-bottom:18px}
nav.crumb a{color:var(--accent);text-decoration:none}
.hd{display:flex;align-items:flex-start;gap:14px;margin-bottom:8px}
.hd-mark{flex-shrink:0;line-height:0;margin-top:3px}
.hd-mark img{border-radius:12px;display:block}
h1{font-size:29px;line-height:1.25;color:var(--ink);margin:0;letter-spacing:-.01em}
.tagline{font-size:17px;color:var(--muted);margin:0 0 18px;line-height:1.55}
.byline{font-size:12.5px;color:var(--subtle);font-family:var(--mono);margin-bottom:22px}
.ticker{display:flex;align-items:center;gap:14px;background:var(--surface);border:1px solid var(--border);
border-radius:10px;padding:13px 16px;margin-bottom:22px;flex-wrap:wrap}
.tk-lab{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700}
.tk-val{font-family:var(--mono);font-size:22px;font-weight:700}
.tk-val.up{color:var(--green)}.tk-val.down{color:var(--red)}.tk-val.flat{color:var(--muted)}
.tk-note{font-size:12px;color:var(--subtle)}
.sc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}
.sc-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:13px 10px;text-align:center}
.sc-label{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);font-weight:700}
.sc-value{font-family:var(--mono);font-size:27px;font-weight:700;line-height:1.15;margin:3px 0 1px}
.sc-den{font-size:11px;color:var(--subtle);font-weight:400}
.sc-sub{font-size:10.5px;color:var(--muted)}
.sc-good .sc-value{color:var(--green)}.sc-mid .sc-value{color:var(--amber)}.sc-bad .sc-value{color:var(--red)}
.drift{font-size:12px;color:var(--subtle);font-family:var(--mono);margin-bottom:24px}
h2{font-size:20px;color:var(--ink);margin:36px 0 12px;letter-spacing:-.01em}
p{margin:0 0 15px}
.case{border-radius:10px;padding:16px 18px;margin-bottom:14px}
.case-bull{background:rgba(16,185,129,.07);border-left:3px solid var(--green)}
.case-bear{background:rgba(245,158,11,.07);border-left:3px solid var(--amber)}
.case h3{margin:0 0 10px;font-size:15px;letter-spacing:.02em;text-transform:uppercase}
.case-bull h3{color:var(--green)}.case-bear h3{color:var(--amber)}
.case ul{margin:0;padding-left:19px}
.case li{margin-bottom:10px;font-size:15.5px}
.case li:last-child{margin-bottom:0}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:8px;margin-bottom:10px}
.fact{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 12px}
.fact-l{font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.fact-v{font-family:var(--mono);font-size:16px;color:var(--ink);font-weight:600;margin-top:2px}
.gap-box.gap-ok{border-left-color:var(--green);margin-bottom:10px}
.gap-box.gap-ok a{color:var(--accent)}
.gap-box{background:var(--surface);border-left:3px solid var(--amber);border-radius:0 8px 8px 0;padding:14px 16px}
.gap-item{font-size:14px;margin-bottom:8px}
.gap-item:last-child{margin-bottom:0}
.gap-item b{color:var(--ink)}.gap-item span{color:var(--muted)}
details{border:1px solid var(--border);border-radius:8px;padding:12px 15px;margin-bottom:8px;background:var(--surface)}
summary{cursor:pointer;color:var(--ink);font-weight:600;font-size:15px}
details p{margin:10px 0 0;font-size:14.5px}
.peers{display:flex;flex-wrap:wrap;gap:8px}
.peer{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:6px 13px;
font-size:13.5px;color:var(--accent);text-decoration:none;transition:border-color .15s}
.peer:hover{border-color:var(--accent)}
.peer b{color:var(--ink);font-family:var(--mono)}
.cta{display:inline-block;margin:20px 0;background:var(--accent);color:#fff;text-decoration:none;
padding:12px 22px;border-radius:8px;font-weight:600;font-size:15px}
.disc{margin-top:32px;padding-top:18px;border-top:1px solid var(--border);font-size:12.5px;color:var(--subtle)}
.disc a{color:var(--accent)}
@media(max-width:560px){.sc-grid{grid-template-columns:1fr}h1{font-size:24px}}
</style>
</head>
<body>
${header("reports")}
<div class="wrap">

<nav class="crumb"><a href="/crypto-scores">Reports</a> <span>›</span> ${esc(sector.name)}</nav>

<div class="hd"><span class="hd-mark">${(LOGOS[coin.slug] || logo)
  ? `<img src="${esc(LOGOS[coin.slug] || logo)}" alt="${esc(coin.name)} logo" width="52" height="52" loading="eager" decoding="async">`
  : markSVG(coin.slug, 52)}</span>
<h1>${esc(coin.name)} (${esc(coin.ticker)}): what it is, why it scores well, and what to watch</h1></div>
<p class="tagline">${esc(coin.tagline)}</p>
<div class="byline">Published ${esc(human(coin.publishedISO))} · figures updated ${esc(human(updatedAt))} · ${coverage}% of scored metrics verified</div>

<div class="ticker">
  <div>
    <div class="tk-lab">Since published</div>
    <div class="tk-val ${retClass}">${ret == null ? '&mdash;' : (ret > 0 ? '+' : '') + ret.toFixed(1) + '%'}</div>
  </div>
  <div class="tk-note">
    ${coin.ticker} was ${'$' + basePrice.toLocaleString('en-US', { maximumFractionDigits: 2 })} when this report was written${days ? ` ${days} days ago` : ' today'}${currentPrice ? `, and is ${'$' + currentPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })} now` : ''}.<br>
    We show this whichever way it has gone.
  </div>
</div>

<h2>What it is</h2>
<p>${esc(coin.what)}</p>

<h2>What it is used for</h2>
<p>${esc(coin.usedFor)}</p>

<h2>Why it stands out</h2>
<div class="case case-bull">
  <h3>The case for it</h3>
  <ul>${coin.bull.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
</div>

<h2>What to watch</h2>
<div class="case case-bear">
  <h3>Things to keep an eye on</h3>
  <ul>${coin.bear.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
</div>

<h2>How it scored when written</h2>
<div class="sc-grid">
  <div class="sc-card sc-${scored.quality >= 6.5 ? 'good' : scored.quality >= 4 ? 'mid' : 'bad'}">
    <div class="sc-label">Quality</div><div class="sc-value">${scored.quality?.toFixed(1)}<span class="sc-den">/10</span></div><div class="sc-sub">fundamentals</div></div>
  <div class="sc-card sc-${scored.opportunity >= 6.5 ? 'good' : scored.opportunity >= 4 ? 'mid' : 'bad'}">
    <div class="sc-label">Opportunity</div><div class="sc-value">${scored.opportunity?.toFixed(1)}<span class="sc-den">/10</span></div><div class="sc-sub">momentum</div></div>
  <div class="sc-card sc-${scored.risk <= 3 ? 'good' : scored.risk <= 6 ? 'mid' : 'bad'}">
    <div class="sc-label">Risk</div><div class="sc-value">${scored.risk?.toFixed(1)}<span class="sc-den">/10</span></div><div class="sc-sub">${esc(scored.riskTier.toLowerCase())}</div></div>
</div>
<div class="drift">Scored on ${esc(human(coin.publishedISO))}. These scores are part of the written analysis and are fixed. For a live score, run the asset through the screener.</div>

<h2>Key figures</h2>
<div class="facts">
  <div class="fact"><div class="fact-l">Market cap</div><div class="fact-v">${fmtUSD(raw.marketCap)}</div></div>
  ${raw.fdv ? `<div class="fact"><div class="fact-l">Fully diluted</div><div class="fact-v">${fmtUSD(raw.fdv)}</div></div>` : ''}
  ${fdvRatio ? `<div class="fact"><div class="fact-l">FDV / cap</div><div class="fact-v">${fdvRatio.toFixed(2)}x</div></div>` : ''}
  ${raw.volume24h ? `<div class="fact"><div class="fact-l">24h volume</div><div class="fact-v">${fmtUSD(raw.volume24h)}</div></div>` : ''}
  ${volRatio != null ? `<div class="fact"><div class="fact-l">Volume / cap</div><div class="fact-v">${pct1(volRatio * 100)}</div></div>` : ''}
  ${raw.change30d != null ? `<div class="fact"><div class="fact-l">30-day change</div><div class="fact-v">${raw.change30d > 0 ? '+' : ''}${raw.change30d.toFixed(1)}%</div></div>` : ''}
</div>

<h2>About the ${esc(sector.name)} sector</h2>
<p>${esc(sector.what)}</p>
<p>${esc(sector.why)}</p>
<p><b>What to watch:</b> ${esc(sector.watch)}</p>

<h2>What we could not verify</h2>
<p>The ${coverage}% above means every metric the score <em>uses</em> resolved cleanly. Separately,
these cannot be measured from free public sources at all, so they sit outside the model rather
than being estimated.</p>
${audits && audits.count > 0 ? `<div class="gap-box gap-ok">
  <div class="gap-item"><b>Audit status</b> — <span>${audits.count} independent audit${audits.count === 1 ? '' : 's'} on record via ${esc(audits.source)}${audits.links.length ? `. <a href="${esc(audits.links[0])}" target="_blank" rel="noopener noreferrer">View report</a>` : ''}</span></div>
</div>` : ''}
<div class="gap-box">
  ${coin.unverified.filter(u => !(audits && audits.count > 0 && /audit/i.test(u[0])))
     .map(u => `<div class="gap-item"><b>${esc(u[0])}</b> — <span>${esc(u[1])}</span></div>`).join('')}
</div>

${peers.length ? `<h2>Others in this sector</h2>
<div class="peers">${peers.map(p => `<a class="peer" href="/coins/${esc(p.slug)}">${esc(p.name)} <b>${p.quality.toFixed(1)}</b></a>`).join('')}</div>` : ''}

<h2>Frequently asked</h2>
${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}

<a class="cta" href="/">Score any asset yourself →</a>

<div class="disc">
  <p><b>Not financial advice.</b> These are assets that score well on our framework, so the
  report leads with why. It also sets out what to watch, because a report that only tells you
  good news is not worth reading. It is not a recommendation, and it takes no account of your circumstances.
  Scores are the mechanical output of a published framework applied to public data. Digital
  assets are volatile and you may lose everything you put in. Verify all figures independently.</p>
  <p><a href="/crypto-scores">All reports</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a>
  · <a href="https://x.com/Sigscreenerapp" target="_blank" rel="noopener noreferrer me">@Sigscreenerapp on X</a></p>
</div>

</div>
${footer()}
</body>
</html>`;
}

export { renderReport };
