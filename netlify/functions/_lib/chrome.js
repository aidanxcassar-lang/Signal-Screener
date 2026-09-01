/* Shared site header and footer for the server-rendered pages.
 *
 * Reports previously rendered with no navigation at all, so the only way back into the app
 * was the browser button. That is bad for visitors and worse for SEO: a page with no
 * outbound links to the rest of the site passes none of its authority on.
 */
const SITE = process.env.SITE_URL || 'https://www.signalscreener.app';
const X = 'https://x.com/Sigscreenerapp';

const EYE = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
 stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
 <path d="M2 12s3.6-6.4 10-6.4S22 12 22 12s-3.6 6.4-10 6.4S2 12 2 12Z"/>
 <circle cx="12" cy="12" r="2.9"/></svg>`;

function header(active) {
  const link = (href, label, key) =>
    `<a class="nv-link${active === key ? ' nv-on' : ''}" href="${href}">${label}</a>`;
  return `<header class="nv">
  <div class="nv-in">
    <a class="nv-brand" href="/"><span class="nv-mark">${EYE}</span>Signal Screener</a>
    <nav class="nv-links">
      ${link('/', 'Home', 'home')}
      ${link('/#screener', 'Screener', 'screener')}
      ${link('/crypto-scores', 'Reports', 'reports')}
      ${link('/#pricing', 'Pricing', 'pricing')}
    </nav>
    <a class="nv-cta" href="/">Launch screener</a>
  </div>
</header>`;
}

function footer() {
  return `<footer class="ft">
  <div class="ft-in">
    <div class="ft-l"><span class="ft-mark">${EYE}</span> Signal Screener</div>
    <nav class="ft-links">
      <a href="/crypto-scores">All reports</a>
      <a href="/">Screener</a>
      <a href="${X}" target="_blank" rel="noopener noreferrer me">@Sigscreenerapp</a>
      <a href="/#terms">Terms</a>
      <a href="/#privacy">Privacy</a>
    </nav>
  </div>
  <div class="ft-fine">Not financial advice. Scores are mechanical output from public data and
  take no account of your circumstances. Crypto is volatile and you can lose everything.</div>
</footer>`;
}

/* Tokens and chrome styling shared by both page types, so the reports and the app read as
   one product rather than two. One accent colour; colour otherwise reserved for meaning. */
const BASE_CSS = `
:root{--bg:#0B0E14;--surface:#12161F;--surface2:#171C27;--border:#1F2733;--border-hi:#2A3441;
--ink:#F0F4FA;--body:#BFCBDC;--muted:#8592A8;--subtle:#66738A;--accent:#818CF8;--accent-dim:#5B6AF0;
--green:#34D399;--amber:#FBBF24;--red:#F87171;
--mono:ui-monospace,SFMono-Regular,Menlo,monospace;--sans:Inter,system-ui,-apple-system,sans-serif;
--nav-h:60px}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--body);font-family:var(--sans);
line-height:1.7;font-size:16px;-webkit-font-smoothing:antialiased}
a{color:var(--accent)}
.nv{position:sticky;top:0;z-index:40;background:rgba(11,14,20,.82);
backdrop-filter:saturate(160%) blur(10px);border-bottom:1px solid var(--border)}
.nv-in{max-width:1120px;margin:0 auto;height:var(--nav-h);padding:0 22px;
display:flex;align-items:center;gap:26px}
.nv-brand{display:flex;align-items:center;gap:9px;color:var(--ink);text-decoration:none;
font-weight:650;font-size:15.5px;letter-spacing:-.01em;flex-shrink:0}
.nv-mark{display:flex;width:30px;height:30px;border-radius:9px;background:var(--accent-dim);
color:#fff;align-items:center;justify-content:center;flex-shrink:0}
.nv-links{display:flex;gap:22px;margin-left:8px}
.nv-link{color:var(--muted);text-decoration:none;font-size:14.5px;font-weight:500;
padding:4px 0;border-bottom:1.5px solid transparent;transition:color .15s,border-color .15s}
.nv-link:hover{color:var(--ink)}
.nv-on{color:var(--ink);border-bottom-color:var(--accent)}
.nv-cta{margin-left:auto;background:var(--accent-dim);color:#fff;text-decoration:none;
font-size:13.5px;font-weight:600;padding:8px 15px;border-radius:8px;white-space:nowrap;
transition:background .15s}
.nv-cta:hover{background:var(--accent)}
.ft{border-top:1px solid var(--border);margin-top:56px;padding:26px 22px 34px}
.ft-in{max-width:1120px;margin:0 auto;display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.ft-l{display:flex;align-items:center;gap:8px;color:var(--ink);font-weight:600;font-size:14px}
.ft-mark{display:flex;color:var(--accent)}
.ft-links{display:flex;gap:18px;margin-left:auto;flex-wrap:wrap}
.ft-links a{color:var(--muted);text-decoration:none;font-size:13.5px}
.ft-links a:hover{color:var(--accent)}
.ft-fine{max-width:1120px;margin:14px auto 0;font-size:12px;color:var(--subtle);line-height:1.6}
@media(max-width:720px){.nv-links{display:none}.nv-cta{margin-left:auto}}
`;

export { header, footer, BASE_CSS, SITE, X };
