/* Server-side market data.
 *
 * Running on the server removes every browser constraint that shaped the client code:
 * no CORS, no geo-blocked exchanges, no proxy fallbacks, and one shared IP means one
 * shared rate-limit budget you can cache against instead of every visitor paying it.
 */

const UA = { 'User-Agent': 'SignalScreener/1.0 (+https://www.signalscreener.app)' };

async function getJSON(url, ms = 8000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: UA });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Median is used rather than mean so one stale provider cannot drag the figure. */
function median(nums) {
  const a = nums.filter(n => typeof n === 'number' && isFinite(n) && n > 0).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

async function fromCoinGecko(id) {
  const key = process.env.COINGECKO_API_KEY;
  const base = key
    ? 'https://pro-api.coingecko.com/api/v3'
    : 'https://api.coingecko.com/api/v3';
  const suffix = key ? `&x_cg_pro_api_key=${key}` : '';
  const d = await getJSON(`${base}/coins/${id}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=true&sparkline=false${suffix}`);
  if (!d || !d.market_data) return null;
  const md = d.market_data, dev = d.developer_data || {};
  return {
    source: 'CoinGecko',
    marketCap: md.market_cap?.usd ?? null,
    fdv: md.fully_diluted_valuation?.usd ?? null,
    volume24h: md.total_volume?.usd ?? null,
    change30d: md.price_change_percentage_30d ?? null,
    circulatingSupply: md.circulating_supply ?? null,
    totalSupply: md.total_supply ?? null,
    genesisDate: d.genesis_date ?? null,
    commits4wk: dev.commit_count_4_weeks ?? 0,
    stars: dev.stars ?? 0,
    forks: dev.forks ?? 0
  };
}

async function fromCoinPaprika(symbol) {
  const s = await getJSON(`https://api.coinpaprika.com/v1/search?q=${encodeURIComponent(symbol)}&c=currencies&limit=5`);
  const list = s?.currencies || [];
  if (!list.length) return null;
  const exact = list.find(x => (x.symbol || '').toUpperCase() === symbol.toUpperCase());
  const pick = exact || list[0];
  const d = await getJSON(`https://api.coinpaprika.com/v1/tickers/${pick.id}`);
  const q = d?.quotes?.USD;
  if (!q) return null;
  return {
    source: 'CoinPaprika',
    marketCap: q.market_cap ?? null,
    fdv: d.max_supply && q.price ? d.max_supply * q.price : null,
    volume24h: q.volume_24h ?? null,
    change30d: q.percent_change_30d ?? null,
    circulatingSupply: d.circulating_supply ?? null,
    totalSupply: d.total_supply ?? null,
    genesisDate: null, commits4wk: 0, stars: 0, forks: 0
  };
}

async function resolveGeckoId(symbol) {
  const d = await getJSON(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`);
  const coins = d?.coins || [];
  if (!coins.length) return null;
  const exact = coins.filter(c => (c.symbol || '').toUpperCase() === symbol.toUpperCase());
  const pool = exact.length ? exact : coins;
  pool.sort((a, b) => (a.market_cap_rank ?? 9999) - (b.market_cap_rank ?? 9999));
  return pool[0].id;
}

/** Reconcile the providers that answered. Missing fields stay null — never invented. */
async function fetchRaw(symbol, geckoId) {
  const id = geckoId || await resolveGeckoId(symbol);
  const settled = await Promise.allSettled([
    id ? fromCoinGecko(id) : Promise.resolve(null),
    fromCoinPaprika(symbol)
  ]);
  const got = settled.filter(s => s.status === 'fulfilled' && s.value).map(s => s.value);
  if (!got.length) return null;
  const pick = f => median(got.map(g => g[f]));
  const first = f => got.find(g => g[f] != null && g[f] !== 0)?.[f] ?? null;
  return {
    sources: got.map(g => g.source),
    geckoId: id,
    marketCap: pick('marketCap'),
    fdv: pick('fdv'),
    volume24h: pick('volume24h'),
    change30d: first('change30d'),
    circulatingSupply: pick('circulatingSupply'),
    totalSupply: pick('totalSupply'),
    genesisDate: first('genesisDate'),
    commits4wk: first('commits4wk') ?? 0,
    stars: first('stars') ?? 0,
    forks: first('forks') ?? 0
  };
}

export { fetchRaw, resolveGeckoId, getJSON, median };
