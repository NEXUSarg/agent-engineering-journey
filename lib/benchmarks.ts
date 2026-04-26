/**
 * Mock benchmark database for the PPM extractor agent.
 * In production, this would be a Supabase table or external API.
 * The shape stays the same; only the source of data changes.
 */

export type BenchmarkRecord = {
  strategy: string;
  vintage_year: number;
  median_mgmt_fee_pct: number;
  median_carry_pct: number;
  typical_lockup_years: number;
  median_target_irr_pct: number;
  sample_size: number;
  notes: string;
};

const BENCHMARKS: BenchmarkRecord[] = [
  {
    strategy: 'private_credit',
    vintage_year: 2024,
    median_mgmt_fee_pct: 1.5,
    median_carry_pct: 15,
    typical_lockup_years: 5,
    median_target_irr_pct: 11,
    sample_size: 47,
    notes: 'Direct lending funds. Senior secured dominates the cohort.',
  },
  {
    strategy: 'private_credit',
    vintage_year: 2025,
    median_mgmt_fee_pct: 1.5,
    median_carry_pct: 15,
    typical_lockup_years: 5,
    median_target_irr_pct: 10.5,
    sample_size: 52,
    notes: 'Spreads compressed slightly vs 2024 vintage.',
  },
  {
    strategy: 'venture_capital',
    vintage_year: 2024,
    median_mgmt_fee_pct: 2.0,
    median_carry_pct: 20,
    typical_lockup_years: 10,
    median_target_irr_pct: 25,
    sample_size: 89,
    notes: 'Early-stage focus. Power-law distributed returns.',
  },
  {
    strategy: 'venture_capital',
    vintage_year: 2025,
    median_mgmt_fee_pct: 2.0,
    median_carry_pct: 20,
    typical_lockup_years: 10,
    median_target_irr_pct: 22,
    sample_size: 71,
    notes: 'Slower deployment pace post-2022 reset.',
  },
  {
    strategy: 'buyout',
    vintage_year: 2024,
    median_mgmt_fee_pct: 1.75,
    median_carry_pct: 20,
    typical_lockup_years: 10,
    median_target_irr_pct: 18,
    sample_size: 64,
    notes: 'Mid-market focus. Leverage costs elevated.',
  },
  {
    strategy: 'real_estate',
    vintage_year: 2024,
    median_mgmt_fee_pct: 1.25,
    median_carry_pct: 15,
    typical_lockup_years: 7,
    median_target_irr_pct: 12,
    sample_size: 38,
    notes: 'Opportunistic + value-add strategies blended.',
  },
  {
    strategy: 'infrastructure',
    vintage_year: 2024,
    median_mgmt_fee_pct: 1.5,
    median_carry_pct: 15,
    typical_lockup_years: 12,
    median_target_irr_pct: 10,
    sample_size: 22,
    notes: 'Long-duration, lower volatility. Energy transition heavy.',
  },
];

/**
 * Lookup function used by the agent's tool.
 * Returns the matching benchmark record or null if not found.
 */
export function lookupBenchmark(
  strategy: string,
  vintageYear: number
): BenchmarkRecord | null {
  return (
    BENCHMARKS.find(
      (b) =>
        b.strategy === strategy.toLowerCase() &&
        b.vintage_year === vintageYear
    ) ?? null
  );
}

/**
 * List available strategies — useful if the agent wants to know what's queryable.
 */
export function listAvailableStrategies(): string[] {
  return Array.from(new Set(BENCHMARKS.map((b) => b.strategy)));
}
