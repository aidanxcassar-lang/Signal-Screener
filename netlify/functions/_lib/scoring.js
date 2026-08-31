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

/** Produce Quality / Opportunity / Risk from a raw data bundle. */
function scoreAll(raw) {
  const q = {
    adoption: scoreAdoption(raw),
    dev: scoreDev(raw),
    tokenomics: scoreTokenomics(raw),
    survivability: scoreSurvivability(raw),
    valueCapture: raw.valueCapture ?? null,
    teamQuality: raw.teamQuality ?? null,
    sectorStrength: raw.sectorStrength ?? null
  };
  const risk = {
    liquidityRisk: riskLiquidity(raw),
    ageRisk: riskAge(raw),
    revenueRisk: raw.revenueRisk ?? null,
    unlockRisk: raw.unlockRisk ?? null,
    centralizationRisk: raw.centralizationRisk ?? null,
    teamRisk: raw.teamRisk ?? null
  };
  const riskUsed = Object.values(risk).filter(v => typeof v === 'number');
  const riskCoverage = riskUsed.length / Object.keys(risk).length;
  const riskValue = riskCoverage < MIN_COVERAGE ? null
    : clamp(riskUsed.reduce((a, b) => a + b, 0) / riskUsed.length, 0, 10);

  const o = {
    narrativeMomentum: raw.narrativeMomentum ?? null,
    sectorMomentum: raw.sectorMomentum ?? null,
    adoptionGrowth: raw.adoptionGrowth ?? null,
    devGrowth: raw.devGrowth ?? null,
    tokenomics: q.tokenomics,
    valueCapture: q.valueCapture,
    riskAdjustment: riskValue == null ? null : (10 - riskValue)
  };

  const quality = weighted(q, QUALITY_WEIGHTS);
  const opportunity = weighted(o, OPPORTUNITY_WEIGHTS);
  return {
    quality: quality.value, qualityCoverage: quality.coverage,
    opportunity: opportunity.value, opportunityCoverage: opportunity.coverage,
    risk: riskValue, riskCoverage, riskTier: riskTier(riskValue),
    components: { quality: q, opportunity: o, risk }
  };
}

export { scoreAll, scoreAdoption, scoreTokenomics, scoreSurvivability, scoreDev,
         riskLiquidity, riskAge, riskTier, MIN_COVERAGE,
         QUALITY_WEIGHTS, OPPORTUNITY_WEIGHTS };
