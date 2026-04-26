import { z } from 'zod';

/**
 * Schema for the structured output returned by the PPM extractor agent.
 *
 * This contract has three priorities:
 * 1. Force the agent to declare its confidence — never let it pretend certainty it doesn't have.
 * 2. Capture both extracted facts AND analysis (red flags + benchmark comparison).
 * 3. Make every field downstream-parseable: no free-form prose where structure is possible.
 */

// ---- Sub-schemas (composable building blocks) ----

const ExtractedTermsSchema = z.object({
  fund_name: z.string().describe('Legal name of the fund as stated in the document.'),
  manager_name: z.string().describe('Name of the GP / management company.'),
  strategy: z
    .enum([
      'private_credit',
      'venture_capital',
      'buyout',
      'real_estate',
      'infrastructure',
      'other',
    ])
    .describe('Investment strategy. Use "other" if none of the listed apply.'),
  vintage_year: z
    .number()
    .describe('Year the fund started or plans to start investing as an integer. Must be between 2000 and 2030.'),
  target_size_usd_mm: z
    .number()
    .nullable()
    .describe('Target fund size in USD millions. Null if not stated.'),
  mgmt_fee_pct: z
    .number()
    .nullable()
    .describe('Annual management fee as a percentage. Null if not extractable.'),
  carry_pct: z
    .number()
    .nullable()
    .describe('Carried interest percentage. Null if not extractable.'),
  lockup_years: z
    .number()
    .nullable()
    .describe('Lockup period in years. Null if not extractable.'),
  target_irr_pct: z
    .number()
    .nullable()
    .describe('Target IRR as a percentage. Null if not stated.'),
});

const RedFlagSchema = z.object({
  category: z
    .enum([
      'fee_structure',
      'lockup_terms',
      'track_record',
      'governance',
      'concentration_risk',
      'liquidity',
      'other',
    ])
    .describe('Type of red flag.'),
  severity: z.enum(['high', 'medium', 'low']).describe('Severity assessment.'),
  evidence: z
    .string()
    .describe(
      'Direct evidence from the document supporting this flag. Quote or paraphrase, never invent.'
    ),
});

const BenchmarkComparisonSchema = z.object({
  was_lookup_successful: z
    .boolean()
    .describe(
      'True if a benchmark was found and used. False if no matching benchmark exists.'
    ),
  fees_vs_peers: z
    .enum(['below_market', 'in_line', 'above_market', 'no_data'])
    .describe('How the fund\'s fees compare to industry medians.'),
  lockup_vs_peers: z
    .enum(['shorter', 'in_line', 'longer', 'no_data'])
    .describe('How the lockup compares.'),
  comment: z
    .string()
    .describe('One-sentence summary of how this fund stacks up vs peers.'),
});

// ---- Top-level schema (what the agent must return) ----

export const PpmAnalysisSchema = z.object({
  extracted_terms: ExtractedTermsSchema,
  red_flags: z
    .array(RedFlagSchema)
    .describe('All red flags identified. Empty array if none found.'),
  benchmark_comparison: BenchmarkComparisonSchema,
  overall_confidence: z
    .number()
    .describe(
      'Confidence score between 0.0 and 1.0 for the overall analysis. Lower if input was incomplete or ambiguous.'
    ),
  needs_human_review: z
    .boolean()
    .describe(
      'True if any extracted field is ambiguous, any number seems off, or the document was unusual.'
    ),
  missing_data: z
    .array(z.string())
    .describe(
      'List of fields the agent could not extract. Empty array if everything was found.'
    ),
  one_paragraph_summary: z
    .string()
    .describe('Plain-English summary, max 4 sentences, no jargon for principals.'),
});

// Type inferred from the schema — use this anywhere in TS code
export type PpmAnalysis = z.infer<typeof PpmAnalysisSchema>;
