/* Serves /coins/:slug and /crypto-scores.
 *
 * Editorial comes from _lib/coins.js and never changes. Figures come from Blobs, which
 * the daily cron refreshes. If the cron has not run or a provider was down, the page
 * serves the last good figures rather than failing.
 */
import { getStore } from '@netlify/blobs';
import { COINS, SECTORS } from './_lib/coins.js';
import { scoreAll } from './_lib/scoring.js';
import { renderReport } from './_lib/reportpage.js';
import { renderHub } from './_lib/hubpage.js';
import { fetchRaw } from './_lib/providers.js';

const SITE = process.env.SITE_URL || 'https://www.signalscreener.app';
const notFound = () => new Response(null, { status: 302, headers: { Location: `${SITE}/crypto-scores` } });

async function loadFigures(slug) {
  try {
    const store = getStore('report-figures');
    return await store.get(slug, { type: 'json' });
  } catch { return null; }
}

/* Self-populating. A scheduled function only runs on its cron, and Netlify does not
   reliably expose a manual trigger, so requiring someone to "run it once" left the
   reports permanently empty on a fresh deploy. If a coin has no stored figures, fetch
   them on the first request and save them. Every later request reads from the store,
   and the daily job keeps them current from then on. */
async function ensureFigures(coin) {
  const existing = await loadFigures(coin.slug);
  if (existing) return existing;
  try {
    const raw = await fetchRaw(coin.ticker);
    if (!raw || !raw.marketCap) return null;
    const rec = {
      raw,
      price: raw.price ?? null,
      logo: raw.logo ?? null,
      // Anchor to the publication price from the editorial, not to whenever this server
      // first fetched. Using "now" would make every report read 0.0% on its first day and
      // measure from an arbitrary moment thereafter.
      baselinePrice: coin.publishedPrice ?? raw.price ?? null,
      baselineAt: Date.parse(coin.publishedISO) || Date.now(),
      audits: null,
      updatedAt: Date.now(),
      bootstrapped: true
    };
    try { await getStore('report-figures').setJSON(coin.slug, rec); } catch { /* serve anyway */ }
    return rec;
  } catch { return null; }
}

export default async (req) => {
  const u = new URL(req.url);
  const path = u.pathname.replace(/\/+$/, '');
  // A netlify.toml rewrite hands us ?slug=; a direct hit gives us the real path. Support both.
  const slugParam = (u.searchParams.get('slug') || '').trim();

  // ── JSON feed for the homepage table ──
  // Same figures the reports render from, so the two can never disagree.
  if (u.searchParams.get('format') === 'json') {
    const out = [];
    const slugs = Object.keys(COINS);
    const figs = await Promise.all(slugs.map(s => ensureFigures(COINS[s]).catch(() => null)));
    for (let i = 0; i < slugs.length; i++) {
      const fig = figs[i]; if (!fig) continue;
      const c = COINS[slugs[i]], sc = scoreAll(fig.raw);
      if (sc.quality == null) continue;
      out.push({
        slug: c.slug, name: c.name, ticker: c.ticker,
        sector: SECTORS[c.sector].name,
        quality: sc.quality, opportunity: sc.opportunity ?? 0,
        riskTier: sc.riskTier,
        coverage: Math.round(((sc.qualityCoverage + sc.opportunityCoverage + sc.riskCoverage) / 3) * 100),
        marketCap: fig.raw.marketCap ?? null,
        sincePublished: (fig.price && (fig.baselinePrice ?? c.publishedPrice))
          ? ((fig.price - (fig.baselinePrice ?? c.publishedPrice)) / (fig.baselinePrice ?? c.publishedPrice)) * 100
          : null,
        daysSince: Math.max(0, Math.round(
          (Date.now() - (fig.baselineAt ?? Date.parse(c.publishedISO) ?? Date.now())) / 86400000))
      });
    }
    out.sort((a, b) => b.quality - a.quality);
    return new Response(JSON.stringify({ rows: out, updatedAt: Date.now() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' }
    });
  }

  // ── Hub ──
  if (path === '/crypto-scores' || path.endsWith('/reports') && !slugParam) {
    const rows = [];
    // Fetch any missing coins in parallel rather than one at a time, so a cold start
    // costs one round trip instead of eight.
    const slugs = Object.keys(COINS);
    const figs = await Promise.all(slugs.map(s => ensureFigures(COINS[s]).catch(() => null)));
    for (let i = 0; i < slugs.length; i++) {
      const slug = slugs[i], fig = figs[i];
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
  const slug = m ? m[1] : (/^[a-z0-9-]{1,40}$/.test(slugParam) ? slugParam : null);
  if (!slug) return notFound();
  const coin = COINS[slug];
  if (!coin) return notFound();

  const fig = await ensureFigures(coin);
  if (!fig) {
    // Redirecting here made it look as though the report did not exist. Say what is
    // actually missing instead.
    return new Response(
      `<!doctype html><meta charset="utf-8"><title>${coin.name} report is not ready</title>
<meta name="robots" content="noindex">
<body style="margin:0;background:#0F1219;color:#C3CEE0;font-family:system-ui,sans-serif;
display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px">
<div style="max-width:460px">
<h1 style="color:#E6EDF7;font-size:20px;margin:0 0 10px">The ${coin.name} report is briefly unavailable</h1>
<p style="line-height:1.65;margin:0 0 14px">The write-up is published, but live market figures
could not be fetched just now. This is usually a rate limit on a data provider and clears
within a few minutes. Please try again shortly.</p>
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
    baselinePrice: fig.baselinePrice ?? null, baselineAt: fig.baselineAt ?? null,
    logo: fig.logo ?? null, audits: fig.audits ?? null,
    updatedAt: fig.updatedAt || Date.now(), peers
  }), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=900' }
  });
};

// Routed by the redirects in netlify.toml rather than a config.path array, which is not
// reliably supported. The redirect passes the coin slug through as ?slug=.

