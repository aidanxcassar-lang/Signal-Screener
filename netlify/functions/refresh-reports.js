/* Scheduled daily. Refreshes the figures behind every report.
 *
 * Editorial is never touched. This writes only market data, so a report written once
 * stays current without anyone editing it. On a provider failure it leaves the previous
 * figures in place rather than writing a gap.
 */
import { getStore } from '@netlify/blobs';
import { COINS } from './_lib/coins.js';
import { fetchRaw } from './_lib/providers.js';
import { fetchAudits } from './_lib/audits.js';

export default async () => {
  const store = getStore('report-figures');
  const out = { updated: [], kept: [], failed: [] };

  for (const slug of Object.keys(COINS)) {
    const coin = COINS[slug];
    try {
      const raw = await fetchRaw(coin.ticker);
      if (!raw || !raw.marketCap) { out.kept.push(slug); continue; }
      const prev = await store.get(slug, { type: 'json' }).catch(() => null);
      // Capture the baseline price on first run rather than trusting a hand-typed one.
      // A price written by hand is stale the moment it is written, and a wrong baseline
      // makes every future "since published" figure wrong too.
      const baselinePrice = prev?.baselinePrice ?? raw.price ?? null;
      const baselineAt = prev?.baselineAt ?? Date.now();
      // Audit record from DefiLlama, refreshed weekly rather than daily.
      const auditStale = !prev?.auditsAt || (Date.now() - prev.auditsAt) > 7 * 86400000;
      const audits = auditStale ? await fetchAudits(coin.ticker, coin.name).catch(() => null)
                                : prev?.audits ?? null;
      await store.setJSON(slug, {
        raw, price: raw.price ?? prev?.price ?? null,
        baselinePrice, baselineAt,
        logo: raw.logo ?? prev?.logo ?? null,
        audits: audits ?? prev?.audits ?? null,
        auditsAt: audits ? Date.now() : (prev?.auditsAt ?? null),
        updatedAt: Date.now()
      });
      out.updated.push(slug);
    } catch (e) {
      out.kept.push(slug);
    }
  }
  return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } });
};

export const config = { schedule: '0 7 * * *' };   // 07:00 UTC, before the alerts job
