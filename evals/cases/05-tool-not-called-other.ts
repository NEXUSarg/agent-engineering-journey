/**
 * Eval 05 — was_lookup_successful=false when strategy is "other"
 *
 * Type: regression
 * Origin: Day 3 bug — agent classified strategy as "other" but called
 *   lookup_benchmark with an invented "closest match" (e.g. venture_capital)
 *   to satisfy the tool's input schema, then quietly corrected to "other"
 *   in the final output. This created disagreement between tool input and
 *   output classification, and risked silently using benchmark data that
 *   didn't apply to the fund.
 *
 * Day 5 fix (structural): the tool's input schema was extended to accept
 *   strategy="other", and the execute() now early-returns for that case
 *   without performing a real lookup. The agent no longer has incentive
 *   to invent classifications.
 *
 * What this eval tests now: when the agent's final classification is "other",
 *   was_lookup_successful must be false. This guarantees the output is
 *   consistent with the tool's contract for off-database strategies.
 *
 * What this eval no longer tests: whether the tool was called or not.
 *   With the new schema, calling the tool with strategy="other" is the
 *   correct behavior, not a bug.
 */

import type { EvalCase, AssertionResult } from '../lib/types';
import { loadFixture } from '../lib/load-fixture';
import { assertSchemaValid, assertExactMatch } from '../lib/matchers';
import { PpmAnalysisSchema } from '../../lib/schema';

const ENDPOINT = process.env.EVALS_ENDPOINT ?? 'http://localhost:3000/api/extract-ppm';

interface ExtractApiResponse {
  ok: boolean;
  analysis?: unknown;
  error?: string;
  meta?: {
    elapsed_ms: number;
    benchmark_lookups: number;
    usage?: unknown;
  };
}

const evalCase: EvalCase = {
  name: '05-tool-not-called-other',
  description:
    'When strategy is classified as "other", was_lookup_successful must be false ' +
    '(off-database strategies cannot have a benchmark).',
  fixturePath: 'sample-ppm-2.json',
  type: 'regression',

  run: async () => {
    const fixture = loadFixture('sample-ppm-2.json');
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document: fixture.document }),
    });
    const json = (await response.json()) as ExtractApiResponse;
    if (!json.ok) {
      throw new Error(`Agent returned ok=false: ${json.error ?? 'no message'}`);
    }
    return json;
  },

  assertions: (output): AssertionResult[] => {
    const response = output as ExtractApiResponse;

    const schemaResult = assertSchemaValid(
      'analysis parses against PpmAnalysisSchema',
      response.analysis,
      PpmAnalysisSchema
    );
    if (!schemaResult.passed || !schemaResult.parsed) {
      return [schemaResult];
    }

    const parsed = schemaResult.parsed;

    return [
      schemaResult,
      // Sanity check: assertion only meaningful if strategy IS classified as "other"
      assertExactMatch(
        'precondition: strategy classified as "other"',
        parsed.extracted_terms.strategy,
        'other'
      ),
      // The actual assertion: when strategy is "other", lookup must not have succeeded
      assertExactMatch(
        'was_lookup_successful is false when strategy is "other"',
        parsed.benchmark_comparison.was_lookup_successful,
        false
      ),
    ];
  },
};

export default evalCase;
