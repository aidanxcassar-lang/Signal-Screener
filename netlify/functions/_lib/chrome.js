/* Shared site chrome for the server-rendered pages.
 *
 * Matches the app's header exactly: same links including Contact, same currency selector,
 * same theme toggle. Reads and writes the same localStorage keys (ss-theme, ss-currency,
 * ss-fx), so switching theme or currency on a report carries straight back into the app.
 *
 * Reports previously had no navigation at all, so the only way back was the browser
 * button, and they passed no link authority to the rest of the site.
 */
const SITE = process.env.SITE_URL || 'https://www.signalscreener.app';
const X = 'https://x.com/Sigscreenerapp';

const CURRENCIES = { USD:'$', EUR:'\u20ac', GBP:'\u00a3', JPY:'\u00a5',
                     AUD:'A$', CAD:'C$', CHF:'Fr', INR:'\u20b9' };

const EYE = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-6.4 10-6.4S22 12 22 12s-3.6 6.4-10 6.4S2 12 2 12Z"/><circle cx="12" cy="12" r="2.9"/></svg>`;
const SUN = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.6v2M12 19.4v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.6 12h2M19.4 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>`;
const MOON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.2A8.4 8.4 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2Z"/></svg>`;

function header(active) {
  const link = (href, label, key) =>
    `<a class="nv-link${active === key ? ' nv-on' : ''}" href="${href}">${label}</a>`;
  const opts = Object.keys(CURRENCIES)
    .map(c => `<option value="${c}">${c} ${CURRENCIES[c]}</option>`).join('');
  return `<header class="nv">
  <div class="nv-in">
    <a class="nv-brand" href="/"><span class="nv-mark">${EYE}</span>Signal Screener</a>
    <nav class="nv-links">
      ${link('/', 'Home', 'home')}
      ${link('/?view=screener', 'Screener', 'screener')}
      ${link('/crypto-scores', 'Reports', 'reports')}
      ${link('/?view=pricing', 'Pricing', 'pricing')}
      ${link('/?view=contact', 'Contact', 'contact')}
    </nav>
    <div class="nv-right">
      <select class="nv-cur" id="navCur" title="Display currency" aria-label="Display currency">${opts}</select>
      <button class="nv-theme" id="navTheme" title="Switch theme" aria-label="Switch theme">${MOON}</button>
      <a class="nv-cta" href="/?view=screener">Launch Screener &rarr;</a>
    </div>
  </div>
</header>`;
}

function footer() {
  return `<footer class="ft">
  <div class="ft-in">
    <div class="ft-l"><span class="ft-mark">${EYE}</span> Signal Screener</div>
    <nav class="ft-links">
      <a href="/crypto-scores">All reports</a>
      <a href="/?view=screener">Screener</a>
      <a href="${X}" target="_blank" rel="noopener noreferrer me">@Sigscreenerapp</a>
      <a href="/?view=terms">Terms</a>
      <a href="/?view=privacy">Privacy</a>
    </nav>
  </div>
  <div class="ft-fine">Not financial advice. Scores are mechanical output from public data and
  take no account of your circumstances. Crypto is volatile and you can lose everything.</div>
</footer>`;
}

/* Theme and currency, sharing the app's storage keys so a choice made on a report is still
   in force back in the screener. Figures are rendered in USD and converted in place using
   the FX rates the app already caches, so the server output stays cacheable. */
const CHROME_JS = `<script>
(function(){
  var SYM=${JSON.stringify(CURRENCIES)};
  function applyTheme(t){
    document.documentElement.setAttribute('data-theme',t);
    var b=document.getElementById('navTheme');
    if(b)b.innerHTML=(t==='dark')?${JSON.stringify(SUN)}:${JSON.stringify(MOON)};
  }
  var saved='dark';
  try{saved=localStorage.getItem('ss-theme')||'dark';}catch(e){}
  applyTheme(saved);
  var tb=document.getElementById('navTheme');
  if(tb)tb.addEventListener('click',function(){
    var next=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
    try{localStorage.setItem('ss-theme',next);}catch(e){}
    applyTheme(next);
  });

  function rate(cur){
    if(cur==='USD')return 1;
    try{
      var fx=JSON.parse(localStorage.getItem('ss-fx')||'null');
      if(fx&&fx.rates&&fx.rates[cur])return fx.rates[cur];
    }catch(e){}
    return null;                       // no rate cached: leave figures in USD
  }
  function convert(cur){
    var r=rate(cur), s=SYM[cur]||'$';
    document.querySelectorAll('[data-usd]').forEach(function(el){
      var usd=parseFloat(el.getAttribute('data-usd'));
      if(!isFinite(usd)){return;}
      if(r===null){el.textContent='$'+fmt(usd);return;}
      el.textContent=s+fmt(usd*r);
    });
  }
  function fmt(n){
    var a=Math.abs(n);
    if(a>=1e12)return (n/1e12).toFixed(2)+'T';
    if(a>=1e9) return (n/1e9).toFixed(1)+'B';
    if(a>=1e6) return (n/1e6).toFixed(0)+'M';
    if(a>=1)   return n.toLocaleString('en-US',{maximumFractionDigits:2});
    return n.toFixed(4);
  }
  var cur='USD';
  try{cur=localStorage.getItem('ss-currency')||'USD';}catch(e){}
  var cs=document.getElementById('navCur');
  if(cs){
    cs.value=cur;
    cs.addEventListener('change',function(){
      try{localStorage.setItem('ss-currency',cs.value);}catch(e){}
      convert(cs.value);
    });
  }
  convert(cur);
})();
</script>`;

const BASE_CSS = `
:root{--bg:#0B0E14;--surface:#12161F;--surface2:#171C27;--border:#1F2733;--border-hi:#2A3441;
--ink:#F0F4FA;--body:#BFCBDC;--muted:#8592A8;--subtle:#66738A;--accent:#818CF8;--accent-dim:#5B6AF0;
--green:#34D399;--amber:#FBBF24;--red:#F87171;
--mono:ui-monospace,SFMono-Regular,Menlo,monospace;--sans:Inter,system-ui,-apple-system,sans-serif;
--nav-h:60px}
[data-theme="light"]{--bg:#F6F8FC;--surface:#FFFFFF;--surface2:#F1F4F9;--border:#E3E8F0;--border-hi:#CBD5E3;
--ink:#0F1728;--body:#3C4A60;--muted:#5B6B84;--subtle:#6B7A90;--accent:#5B6AF0;--accent-dim:#5B6AF0;
--green:#059669;--amber:#B45309;--red:#DC2626}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--body);font-family:var(--sans);
line-height:1.7;font-size:16px;-webkit-font-smoothing:antialiased}
a{color:var(--accent)}
.nv{position:sticky;top:0;z-index:40;background:var(--bg);border-bottom:1px solid var(--border)}
.nv-in{max-width:1180px;margin:0 auto;height:var(--nav-h);padding:0 22px;display:flex;align-items:center;gap:24px}
.nv-brand{display:flex;align-items:center;gap:10px;color:var(--ink);text-decoration:none;
font-weight:700;font-size:16px;letter-spacing:-.01em;flex-shrink:0}
.nv-mark{display:flex;width:32px;height:32px;border-radius:9px;background:var(--accent-dim);
color:#fff;align-items:center;justify-content:center;flex-shrink:0}
.nv-links{display:flex;gap:6px;margin:0 auto}
.nv-link{color:var(--muted);text-decoration:none;font-size:14.5px;font-weight:500;
padding:7px 13px;border-radius:8px;transition:color .15s,background .15s}
.nv-link:hover{color:var(--ink);background:var(--surface2)}
.nv-on{color:var(--ink);background:var(--surface2);font-weight:600}
.nv-right{display:flex;align-items:center;gap:9px;flex-shrink:0}
.nv-cur{background:var(--surface);border:1px solid var(--border);color:var(--body);
border-radius:9px;padding:7px 9px;font-size:12.5px;font-family:var(--mono);cursor:pointer}
.nv-theme{background:var(--surface);border:1px solid var(--border);color:var(--body);
border-radius:9px;width:36px;height:35px;display:flex;align-items:center;justify-content:center;
cursor:pointer;transition:border-color .15s,color .15s}
.nv-theme:hover{border-color:var(--accent);color:var(--accent)}
.nv-cta{background:var(--accent-dim);color:#fff;text-decoration:none;font-size:13.5px;
font-weight:600;padding:9px 16px;border-radius:9px;white-space:nowrap;transition:filter .15s}
.nv-cta:hover{filter:brightness(1.1)}
.ft{border-top:1px solid var(--border);margin-top:56px;padding:26px 22px 34px}
.ft-in{max-width:1180px;margin:0 auto;display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.ft-l{display:flex;align-items:center;gap:8px;color:var(--ink);font-weight:600;font-size:14px}
.ft-mark{display:flex;color:var(--accent)}
.ft-links{display:flex;gap:18px;margin-left:auto;flex-wrap:wrap}
.ft-links a{color:var(--muted);text-decoration:none;font-size:13.5px}
.ft-links a:hover{color:var(--accent)}
.ft-fine{max-width:1180px;margin:14px auto 0;font-size:12px;color:var(--subtle);line-height:1.6}
@media(max-width:860px){.nv-links{display:none}.nv-cta{display:none}}
`;
export { header, footer, BASE_CSS, CHROME_JS, SITE, X, CURRENCIES };
