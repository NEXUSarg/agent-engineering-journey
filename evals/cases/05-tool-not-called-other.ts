/**
 * Eval 05 — Tool NOT called when strategy is "other" (REGRESSION)
 *
 * Type: regression
 * Origin: bug observed in Day 3, Test 2 (sample-ppm-2 in production).
 *   Agent classified strategy as "other" (correct) but ALSO called
 *   lookup_benchmark with strategy="other", which the prompt explicitly
 *   prohibits in the <tools_available> section.
 *
 *   The output was still correct (tool returned null and agent set
 *   was_lookup_successful=false), but the wasted step costs tokens and
 *   indicates the agent isn't fully respecting the gating condition.
 *
 * Why this exists:
 *   Hamel: "evals are how you turn bugs into continuous signal."
 *   Now that we have an eval, if this regresses, we'll see it immediately
 *   instead of discovering it again 2 weeks from now.
 *
 *   We use the meta.benchmark_lookups field exposed by the route handler
 *   rather than inferring tool usage from the analysis content. More
 *   reliable: the route handler counts actual tool invocations.
 */

import type { EvalCase, AssertionResult } from '../lib/types';
import { loadFixture } from '../lib/load-fixture';
import { assertSchemaValid, assertExactMatch, assertCondition } from '../lib/matchers';
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
  description: 'When strategy is classified as "other", agent must NOT call lookup_benchmark tool.',
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
    const benchmarkLookups = response.meta?.benchmark_lookups ?? -1;

    return [
      schemaResult,
      // Sanity check: assertion only meaningful if strategy IS classified as "other"
      assertExactMatch(
        'precondition: strategy classified as "other"',
        parsed.extracted_terms.strategy,
        'other'
      ),
      // The actual regression assertion
      assertCondition(
        'lookup_benchmark NOT called (benchmark_lookups === 0)',
        benchmarkLookups === 0,
        `Expected 0 tool calls, got ${benchmarkLookups}. This is the Day 3 bug regressing.`
      ),
    ];
  },
};

export default evalCase;
