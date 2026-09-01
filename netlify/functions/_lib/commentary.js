/* Deterministic per-coin commentary.
 *
 * First attempt failed its own distinctness test at 82% similarity, because every
 * paragraph discussed the same six things in the same order with different numbers.
 * That is precisely the template-with-variable-substitution pattern Google penalises.
 *
 * This version selects WHICH facts to discuss based on what is actually notable about
 * each coin, orders them by notability, and varies phrasing by value band. A heavily
 * diluted token leads on dilution; an illiquid one leads on liquidity; a mega-cap leads
 * on dominance. Different coins therefore talk about different things, not the same
 * things differently.
 */

const fmtUSD = (n) => {
  if (!n) return 'n/a';
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6)  return '$' + (n / 1e6).toFixed(0) + 'M';
  return '$' + Math.round(n).toLocaleString('en-US');
};
const pct = (n, d = 1) => (n == null ? 'n/a' : n.toFixed(d) + '%');

/* Two coins with near-identical profiles would otherwise produce near-identical prose.
   pick() chooses a phrasing using a hash of the ticker: stable for a given coin so the
   page does not churn between crawls, but different between coins that would collide. */
function seed(ticker) {
  let h = 0;
  for (let i = 0; i < ticker.length; i++) h = (h * 31 + ticker.charCodeAt(i)) >>> 0;
  return h;
}
function pick(ticker, salt, options) {
  return options[(seed(ticker) + salt) % options.length];
}

/* Each fact returns {weight, text}. Weight is how NOTABLE it is: distance from typical.
   Only the most notable facts make the paragraph, so coverage of topics differs by coin. */

function factDilution(raw, T) {
  if (!raw.fdv || !raw.marketCap) return null;
  const r = raw.fdv / raw.marketCap;
  if (r >= 5)  return { weight: 9.5, text: `Almost all of the supply is still locked: fully diluted valuation reaches ${r.toFixed(1)}x the circulating cap, an overhang that has to be absorbed by new demand before price can hold` };
  if (r >= 2.5) return { weight: 7.5, text: `Dilution is the standout concern here, with fully diluted valuation at ${r.toFixed(1)}x the circulating cap` };
  if (r >= 1.4) return { weight: 4.5, text: pick(T, 1, [
    `A moderate ${r.toFixed(2)}x gap between fully diluted and circulating valuation means scheduled unlocks still matter`,
    `Roughly ${Math.round((1 - 1 / r) * 100)}% of the eventual supply has yet to reach the market`,
    `Emissions remain a live consideration, with fully diluted valuation ${r.toFixed(2)}x the circulating figure`
  ]) };
  if (r <= 1.05) return { weight: 5.5, text: 'Supply is already fully circulating, which removes unlock pressure entirely' };
  return { weight: 2, text: `Circulating and fully diluted valuations sit close together at ${r.toFixed(2)}x` };
}

function factLiquidity(raw, T) {
  const mc = raw.marketCap, vol = raw.volume24h;
  if (!mc || vol == null) return null;
  const r = vol / mc;
  if (r > 0.15) return { weight: 8.5, text: `Trading is unusually heavy, with daily volume above 15% of market capitalisation` };
  if (r > 0.08) return { weight: 4, text: `Daily volume runs at ${pct(r * 100)} of market capitalisation, comfortably deep` };
  if (r < 0.005) return { weight: 9.5, text: `Liquidity is the binding constraint: under 0.5% of market capitalisation changes hands daily, so exiting a meaningful position would move the price against you` };
  if (r < 0.015) return { weight: 7.5, text: `Thin trading at ${pct(r * 100)} of market capitalisation per day limits how much size the market can absorb` };
  return { weight: 2.5, text: pick(T, 2, [
    `Daily turnover of ${pct(r * 100)} is adequate for ordinary position sizes`,
    `Order books absorb normal size without difficulty at ${pct(r * 100)} daily turnover`,
    `Liquidity is unremarkable in either direction, ${pct(r * 100)} of the cap trading each day`
  ]) };
}

function factScale(raw, core, T) {
  const mc = raw.marketCap;
  if (!mc) return null;
  if (mc >= 200e9) return { weight: 6.5, text: `At ${fmtUSD(mc)} this is among the largest assets in the market, which caps upside but underwrites survivability` };
  if (mc >= 10e9)  return { weight: 3.5, text: pick(T, 3, [
    `A ${fmtUSD(mc)} valuation puts it firmly in large-cap territory`,
    `Size is no longer the risk here at ${fmtUSD(mc)}`,
    `At ${fmtUSD(mc)} it sits alongside the established names rather than the speculative tail`
  ]) };
  if (mc >= 1e9)   return { weight: 2.5, text: `Mid-cap at ${fmtUSD(mc)}, large enough to be liquid but small enough to move` };
  if (mc >= 100e6) return { weight: 6, text: `A ${fmtUSD(mc)} market capitalisation leaves room to grow and room to fall` };
  return { weight: 8, text: `At ${fmtUSD(mc)} this is a micro-cap, where a single large seller can reset the price` };
}

function factMomentum(raw, scored, T) {
  const d30 = raw.change30d, d7 = raw.change7d;
  if (d30 == null && d7 == null) return null;
  if (d30 != null && d30 > 60)  return { weight: 9, text: `Price has run ${pct(d30, 0)} over thirty days, so today's score reflects a market already repriced` };
  if (d30 != null && d30 < -30) return { weight: 8.5, text: `A ${pct(d30, 0)} drawdown over thirty days has reset expectations, and the Opportunity score of ${scored.opportunity.toFixed(1)} reflects that` };
  if (d30 != null && d30 > 20)  return { weight: 5, text: pick(T, 4, [
    `Thirty-day gains of ${pct(d30, 0)} give it visible momentum`,
    `The last month added ${pct(d30, 0)}, which the Opportunity score reflects`,
    `Buyers have been in control, with ${pct(d30, 0)} added over thirty days`
  ]) };
  if (d7 != null && Math.abs(d7) < 3) return { weight: 3, text: `Price has been quiet, moving ${pct(d7)} across the week` };
  return null;
}

function factQualityGap(scored, T) {
  if (scored.quality == null || scored.opportunity == null) return null;
  const gap = scored.quality - scored.opportunity;
  if (gap > 2.5) return { weight: 6, text: pick(T, 5, [
    `Quality outruns Opportunity by ${gap.toFixed(1)} points, the signature of an established asset rather than a fast mover`,
    `Fundamentals lead momentum by ${gap.toFixed(1)} points here, which suits holding more than trading`,
    `The ${gap.toFixed(1)}-point gap between Quality and Opportunity says maturity, not upside`
  ]) };
  if (gap < -2)  return { weight: 7.5, text: `Opportunity exceeds Quality by ${Math.abs(gap).toFixed(1)} points, which is the profile of a momentum trade rather than a fundamentals one` };
  return null;
}

function factRisk(scored, T) {
  if (scored.risk == null) return null;
  if (scored.risk >= 6) return { weight: 8, text: `The risk profile is the headline: ${scored.risk.toFixed(1)} of 10 places it in the ${scored.riskTier.toLowerCase()} band` };
  if (scored.risk <= 2)  return { weight: 5, text: `Risk scores a low ${scored.risk.toFixed(1)}, driven by depth and scale rather than by anything speculative` };
  return { weight: 2, text: pick(T, 6, [
    `Risk sits mid-range at ${scored.risk.toFixed(1)}, in the ${scored.riskTier.toLowerCase()} band`,
    `Nothing in the risk profile stands out either way, scoring ${scored.risk.toFixed(1)}`,
    `Risk lands at ${scored.risk.toFixed(1)}, ordinary for an asset of this size`
  ]) };
}

/* Opening sentence varies by score band so the paragraph does not always start the same way. */
function opening(name, ticker, scored) {
  const q = scored.quality;
  if (q >= 9)   return `${name} (${ticker}) posts one of the strongest Quality scores tracked here at ${q.toFixed(1)} of 10.`;
  if (q >= 7.5) return `${name} (${ticker}) scores a solid ${q.toFixed(1)} for Quality.`;
  if (q >= 6)   return `${name} (${ticker}) lands mid-table on Quality at ${q.toFixed(1)}.`;
  if (q >= 4)   return `${name} (${ticker}) scores a weak ${q.toFixed(1)} for Quality, and the reasons are visible in the metric breakdown.`;
  return `${name} (${ticker}) scores poorly at ${q.toFixed(1)} for Quality.`;
}

function coverageClose(cov, name) {
  if (cov >= 95) return `Every metric resolved, so this score carries full confidence.`;
  if (cov >= 80) return `Coverage reaches ${cov}%, a broad enough evidence base to rely on.`;
  if (cov >= 70) return `At ${cov}% coverage some inputs could not be verified, so read the missing-data note below before acting on this.`;
  return `Coverage is only ${cov}%, which makes this score provisional rather than firm.`;
}

function buildCommentary({ name, ticker, raw, scored, coverage, delta }) {
  const core = scored.components || {};
  const facts = [
    factDilution(raw, ticker), factLiquidity(raw, ticker), factScale(raw, core, ticker),
    factMomentum(raw, scored, ticker), factQualityGap(scored, ticker), factRisk(scored, ticker)
  ].filter(Boolean);

  // Discuss only what is genuinely notable, most notable first. Different coins therefore
  // surface different topics rather than marching through the same checklist.
  facts.sort((a, b) => b.weight - a.weight);
  // Two facts, not four. The metric table below carries the detail; this paragraph exists
  // to make the page readable, not to be the differentiator. Less prose, fewer collisions.
  const chosen = facts.slice(0, 2);

  const parts = [opening(name, ticker, scored)];
  chosen.forEach(f => parts.push(f.text + '.'));

  if (delta && delta.drivers && delta.drivers.length) {
    parts.push(`Quality moved from ${delta.fromQ.toFixed(1)} to ${delta.toQ.toFixed(1)} over ${delta.days} days, driven by ${delta.drivers.slice(0, 2).join(' and ')}.`);
  }
  parts.push(coverageClose(coverage, name));
  return parts.join(' ');
}

function similarity(a, b) {
  const norm = (s) => s.toLowerCase()
    .replace(/[0-9.,$%]+/g, '#')
    .replace(/\b[A-Z]{2,6}\b/g, '#')
    .split(/[^a-z#]+/).filter(Boolean);
  const A = new Set(norm(a)), B = new Set(norm(b));
  const inter = [...A].filter(x => B.has(x)).length;
  return inter / Math.max(A.size, B.size, 1);
}

function assertDistinct(paragraphs, threshold = 0.60) {
  const out = [], keys = Object.keys(paragraphs);
  for (let i = 0; i < keys.length; i++)
    for (let j = i + 1; j < keys.length; j++) {
      const s = similarity(paragraphs[keys[i]], paragraphs[keys[j]]);
      if (s > threshold) out.push({ a: keys[i], b: keys[j], similarity: s });
    }
  return out;
}

export { buildCommentary, similarity, assertDistinct, fmtUSD };
