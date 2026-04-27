/**
 * Eval 02 — Fees extracted correctly on clean PPM
 *
 * Type: property
 * Why this exists:
 *   Fees are the most numerically explicit fields in any PPM. If the agent
 *   can't extract them with high precision on a clean document, downstream
 *   benchmark comparison and economic analysis are unreliable.
 *
 *   sample-ppm-1 explicitly states:
 *     "Management Fee: 1.75% per annum"
 *     "Carried Interest: 20%"
 *
 *   We assume the agent returns percent-format (1.75, 20.0) based on the
 *   schema field names (mgmt_fee_pct, carry_pct) and their describe() text.
 *   If the first run shows decimal format (0.0175, 0.20), we adjust the
 *   tolerance windows here and add a comment in the system prompt to make
 *   the format explicit. That is the bug-driven iteration loop Hamel describes.
 */

import type { EvalCase, AssertionResult } from '../lib/types';
import { loadFixture } from '../lib/load-fixture';
import { assertSchemaValid, assertTolerance } from '../lib/matchers';
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
  name: '02-fees-extraction',
  description: 'On a clean PPM with explicit fees (1.75% mgmt, 20% carry), agent extracts both correctly.',
  fixturePath: 'sample-ppm-1.json',
  type: 'property',

  run: async () => {
    const fixture = loadFixture('sample-ppm-1.json');
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document: fixture.document }),
    });
    const json = (await response.json()) as ExtractApiResponse;
    if (!json.ok) {
      throw new Error(`Agent returned ok=false: ${json.error ?? 'no error message'}`);
    }
    return json;
  },

  assertions: (output): AssertionResult[] => {
    const response = output as ExtractApiResponse;

    // First, schema-validate. If parsing fails, downstream assertions can't run.
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
      assertTolerance(
        'mgmt_fee_pct ≈ 1.75 (±0.05)',
        parsed.extracted_terms.mgmt_fee_pct,
        1.75,
        0.05
      ),
      assertTolerance(
        'carry_pct ≈ 20.0 (±0.5)',
        parsed.extracted_terms.carry_pct,
        20.0,
        0.5
      ),
    ];
  },
};

export default evalCase;
