/* Shared scoring rules.
 *
 * These MUST stay identical to the tier tables in index.html. They are duplicated here
 * because the scheduled alert job has to score a coin while the user's browser is closed,
 * and a browser-only implementation cannot do that.
 *
 * If you change a threshold in index.html, change it here too. The test in
 * netlify/functions/_lib/scoring.test.mjs guards the main cases.
 */

const QUALITY_WEIGHTS = { adoption:20, dev:15, tokenomics:20, survivability:10,
                          valueCapture:15, teamQuality:10, sectorStrength:10 };
const OPPORTUNITY_WEIGHTS = { narrativeMomentum:20, sectorMomentum:20, adoptionGrowth:15,
                              devGrowth:10, tokenomics:15, valueCapture:10, riskAdjustment:10 };
const MIN_COVERAGE = 0.40;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function round5(v) { return Math.round(v * 2) / 2; }

/** Adoption: market-cap tier, adjusted for liquidity and 30-day momentum. */
function scoreAdoption({ marketCap, volume24h, change30d }) {
  if (!marketCap) return null;
  const volRatio = volume24h ? volume24h / marketCap : 0;
  let a = marketCap >= 50e9 ? 9 : marketCap >= 10e9 ? 8 : marketCap >= 1e9 ? 7
        : marketCap >= 100e6 ? 5.5 : marketCap >= 10e6 ? 4 : 2.5;
  if (volRatio > 0.15) a = Math.min(10, a + 1);
  else if (volRatio > 0.05) a = Math.min(10, a + 0.5);
  if (change30d != null) {
    if (change30d > 30) a = Math.min(10, a + 0.5);
    else if (change30d < -40) a = Math.max(1, a - 1);
  }
  return round5(a);
}

/** Tokenomics: dilution overhang from FDV vs circulating cap. */
function scoreTokenomics({ marketCap, fdv, circulatingSupply, totalSupply }) {
  if (!marketCap || !fdv) return null;
  const ratio = fdv / marketCap;
  let t = ratio <= 1.2 ? 9 : ratio <= 2 ? 7.5 : ratio <= 3.5 ? 6
        : ratio <= 5 ? 4.5 : ratio <= 10 ? 3 : 1.5;
  if (circulatingSupply && totalSupply) {
    const circR = circulatingSupply / totalSupply;
    if (circR > 0.8) t = Math.min(10, t + 1);
    else if (circR < 0.3) t = Math.max(1, t - 1);
  }
  return round5(t);
}

/** Survivability: size, age and liquidity depth. */
function scoreSurvivability({ marketCap, volume24h, genesisDate }) {
  if (!marketCap) return null;
  const volRatio = volume24h ? volume24h / marketCap : 0;
  let s = marketCap >= 50e9 ? 9.5 : marketCap >= 10e9 ? 8 : marketCap >= 1e9 ? 6.5
        : marketCap >= 100e6 ? 5 : 3;
  if (genesisDate) {
    const yrs = (Date.now() - new Date(genesisDate).getTime()) / (365.25 * 86400000);
    if (yrs > 5) s = Math.min(10, s + 1);
    else if (yrs > 2) s = Math.min(10, s + 0.5);
    else if (yrs < 0.5) s = Math.max(1, s - 1);
  }
  if (volRatio > 0.1) s = Math.min(10, s + 0.5);
  else if (volRatio < 0.01) s = Math.max(1, s - 1);
  return round5(s);
}

/** Developer: 4-week commit volume, weighted with active contributor count. */
function scoreDev({ commits4wk, stars, forks, contributors4wk }) {
  const hasSignal = commits4wk > 0 || stars > 0 || forks > 0;
  if (!hasSignal) return null;
  let d = commits4wk > 200 ? 9 : commits4wk > 100 ? 8 : commits4wk > 40 ? 7
        : commits4wk > 15 ? 6 : commits4wk > 5 ? 5 : commits4wk > 0 ? 4 : 2;
  if (stars > 5000) d = Math.min(10, d + 1);
  if (forks > 2000) d = Math.min(10, d + 0.5);
  if (contributors4wk != null) {
    const c = contributors4wk >= 20 ? 9.5 : contributors4wk >= 10 ? 8
            : contributors4wk >= 5 ? 6.5 : contributors4wk >= 3 ? 5
            : contributors4wk >= 2 ? 4 : 3;
    d = (d * 0.6) + (c * 0.4);
  }
  return round5(d);
}

/** Liquidity risk: higher means thinner. */
function riskLiquidity({ marketCap, volume24h }) {
  if (!marketCap || volume24h == null) return null;
  const r = volume24h / marketCap;
  let v = r > 0.15 ? 1 : r > 0.08 ? 2 : r > 0.03 ? 3.5 : r > 0.01 ? 5.5 : r > 0.003 ? 7.5 : 9;
  if (marketCap < 10e6) v = Math.min(10, v + 1.5);
  return round5(v);
}

function riskAge({ genesisDate }) {
  if (!genesisDate) return null;
  const yrs = (Date.now() - new Date(genesisDate).getTime()) / (365.25 * 86400000);
  return round5(yrs < 0.5 ? 9 : yrs < 1 ? 7 : yrs < 2 ? 5 : yrs < 4 ? 3 : 1.5);
}

/** Weighted average over available components only; null below the coverage floor. */
function weighted(values, weights) {
  const used = Object.keys(weights).filter(k => typeof values[k] === 'number' && isFinite(values[k]));
  if (!used.length) return { value: null, coverage: 0 };
  const totalW = Object.values(weights).reduce((a, b) => a + b, 0);
  const usedW = used.reduce((a, k) => a + weights[k], 0);
  const coverage = usedW / totalW;
  if (coverage < MIN_COVERAGE) return { value: null, coverage };
  const v = used.reduce((a, k) => a + values[k] * weights[k], 0) / usedW;
  return { value: clamp(v, 0, 10), coverage };
}

const RISK_TIERS = [
  { max: 2, label: 'LOW' }, { max: 4, label: 'MEDIUM' }, { max: 6, label: 'HIGH' },
  { max: 8, label: 'VERY HIGH' }, { max: 10, label: 'SPECULATIVE' }
];
function riskTier(v) {
  if (v == null) return 'UNRATED';
  return (RISK_TIERS.find(t => v <= t.max) || RISK_TIERS[RISK_TIERS.length - 1]).label;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CORE METRICS — the same three-metric model the browser uses in Free mode.

   The previous version scored against the seven-metric extended model. From server-side
   providers that only ever reached 33% coverage for Risk and 15% for Opportunity, both
   below the 40% floor, so both returned null. The practical effect was that alerts with a
   trigger of "Opportunity" or "Risk" could NEVER fire, and "any" fired on Quality alone,
   while the pricing page advertised all three.

   These metrics derive purely from market data, which every listed coin has, so all three
   scores reach full coverage. Thresholds mirror computeCoreMetrics() in index.html.
   Change one, change both.
   ═══════════════════════════════════════════════════════════════════════════════ */
const CORE_QUALITY_W     = { adoption: 40, tokenomics: 35, scale: 25 };
const CORE_OPPORTUNITY_W = { momentum: 40, adoptionGrowth: 35, tokenomics: 25 };
const CORE_RISK_W        = { liquidityRisk: 50, scaleRisk: 30, volatilityRisk: 20 };

function computeCoreMetrics(raw) {
  const mc = raw.marketCap, vol = raw.volume24h, fdv = raw.fdv;
  const d7 = raw.change7d ?? null, d30 = raw.change30d ?? null;
  if (!mc) return null;                       // without a market cap nothing is comparable
  const volRatio = vol && mc ? vol / mc : 0;
  const o = {};

  let a = mc >= 500e9 ? 10 : mc >= 200e9 ? 9.5 : mc >= 50e9 ? 9 : mc >= 20e9 ? 8.5
        : mc >= 10e9 ? 8 : mc >= 3e9 ? 7.5 : mc >= 1e9 ? 7 : mc >= 300e6 ? 6
        : mc >= 100e6 ? 5.5 : mc >= 30e6 ? 4.5 : mc >= 10e6 ? 4 : 2.5;
  if (volRatio > 0.15) a = Math.min(10, a + 1);
  else if (volRatio > 0.05) a = Math.min(10, a + 0.5);
  else if (volRatio < 0.005) a = Math.max(1, a - 1);
  if (d30 != null) { if (d30 > 30) a = Math.min(10, a + 0.5); else if (d30 < -40) a = Math.max(1, a - 1); }
  o.adoption = round5(a);

  let t;
  if (fdv && mc) {
    const r = fdv / mc;
    t = r <= 1.2 ? 9 : r <= 2 ? 7.5 : r <= 3.5 ? 6 : r <= 5 ? 4.5 : r <= 10 ? 3 : 1.5;
  } else { t = 6; }
  const circR = (raw.circulatingSupply && raw.totalSupply) ? raw.circulatingSupply / raw.totalSupply : null;
  if (circR != null) { if (circR > 0.8) t = Math.min(10, t + 1); else if (circR < 0.3) t = Math.max(1, t - 1); }
  o.tokenomics = round5(t);

  let sc = mc >= 500e9 ? 10 : mc >= 200e9 ? 9.5 : mc >= 50e9 ? 9 : mc >= 20e9 ? 8.5
         : mc >= 10e9 ? 8 : mc >= 3e9 ? 7 : mc >= 1e9 ? 6.5 : mc >= 300e6 ? 5.5
         : mc >= 100e6 ? 5 : mc >= 30e6 ? 4 : mc >= 10e6 ? 3.5 : 2;
  if (volRatio > 0.10) sc = Math.min(10, sc + 0.5); else if (volRatio < 0.01) sc = Math.max(1, sc - 1);
  o.scale = round5(sc);

  if (d7 != null || d30 != null) {
    const s7  = d7  == null ? null : (d7 > 25 ? 9 : d7 > 10 ? 7.5 : d7 > 0 ? 6 : d7 > -10 ? 4.5 : 3);
    const s30 = d30 == null ? null : (d30 > 50 ? 9.5 : d30 > 20 ? 8 : d30 > 5 ? 6.5 : d30 > -5 ? 5 : d30 > -25 ? 3.5 : 2);
    o.momentum = round5(s7 != null && s30 != null ? (s7 * 0.5 + s30 * 0.5) : (s7 ?? s30));
  } else { o.momentum = 5; }

  let ag = d30 == null ? 5 : (d30 > 50 ? 9.5 : d30 > 20 ? 8 : d30 > 5 ? 6.5 : d30 > -5 ? 5 : d30 > -25 ? 3.5 : 2);
  if (volRatio > 0.10) ag = Math.min(10, ag + 0.5);
  o.adoptionGrowth = round5(ag);

  o.liquidityRisk = round5(volRatio > 0.15 ? 1 : volRatio > 0.08 ? 2 : volRatio > 0.03 ? 3.5
                         : volRatio > 0.01 ? 5.5 : volRatio > 0.003 ? 7.5 : 9);
  o.scaleRisk = round5(mc >= 500e9 ? 0.5 : mc >= 200e9 ? 1 : mc >= 50e9 ? 1.5 : mc >= 10e9 ? 2.5
                     : mc >= 1e9 ? 3.5 : mc >= 300e6 ? 4.5 : mc >= 100e6 ? 5.5 : mc >= 30e6 ? 7
                     : mc >= 10e6 ? 8 : 9.5);
  const swing = Math.max(Math.abs(d7 || 0), Math.abs(d30 || 0) / 2);
  o.volatilityRisk = round5(swing > 60 ? 9 : swing > 35 ? 7.5 : swing > 20 ? 6 : swing > 10 ? 4.5 : swing > 4 ? 3 : 2);
  return o;
}

function coreWeighted(vals, weights) {
  const keys = Object.keys(weights).filter(k => typeof vals[k] === 'number' && isFinite(vals[k]));
  if (!keys.length) return { value: null, coverage: 0 };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const used = keys.reduce((a, k) => a + weights[k], 0);
  const v = keys.reduce((a, k) => a + vals[k] * weights[k], 0) / used;
  return { value: clamp(v, 0, 10), coverage: used / total };
}

/** Produce Quality / Opportunity / Risk from a raw data bundle. */
function scoreAll(raw) {
  const core = computeCoreMetrics(raw);
  if (!core) {
    return { quality: null, opportunity: null, risk: null, riskTier: 'UNRATED',
             qualityCoverage: 0, opportunityCoverage: 0, riskCoverage: 0, components: null };
  }
  const q  = coreWeighted(core, CORE_QUALITY_W);
  const rk = coreWeighted(core, CORE_RISK_W);
  const op = coreWeighted(core, CORE_OPPORTUNITY_W);
  return {
    quality: q.value,      qualityCoverage: q.coverage,
    opportunity: op.value, opportunityCoverage: op.coverage,
    risk: rk.value,        riskCoverage: rk.coverage,
    riskTier: riskTier(rk.value),
    components: core
  };
}

export { scoreAll, computeCoreMetrics, riskTier, MIN_COVERAGE,
         CORE_QUALITY_W, CORE_OPPORTUNITY_W, CORE_RISK_W };
