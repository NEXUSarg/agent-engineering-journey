/**
 * Eval 03 — Strategy enum valid on both fixtures
 *
 * Type: property
 * Why this exists:
 *   The strategy field gates several downstream behaviors:
 *   - Whether benchmark lookup is even attempted
 *   - Which red flags categorize as fee/governance/concentration
 *   - How the comparison narrative reads
 *
 *   sample-ppm-1 (Atlas Direct Lending) → strategy must be "private_credit"
 *   sample-ppm-2 (Meridian Crypto) → strategy must be "other"
 *
 *   This is one of the few evals that runs the agent on BOTH fixtures.
 *   We parallelize the two calls to save ~20s vs serial.
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
}

interface BothFixturesOutput {
  ppm1Response: ExtractApiResponse;
  ppm2Response: ExtractApiResponse;
}

async function callAgent(fixturePath: string): Promise<ExtractApiResponse> {
  const fixture = loadFixture(fixturePath);
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document: fixture.document }),
  });
  const json = (await response.json()) as ExtractApiResponse;
  if (!json.ok) {
    throw new Error(`Agent failed on ${fixturePath}: ${json.error ?? 'no message'}`);
  }
  return json;
}

const evalCase: EvalCase = {
  name: '03-strategy-enum',
  description: 'Agent classifies sample-ppm-1 as private_credit and sample-ppm-2 as other.',
  fixturePath: 'sample-ppm-1.json,sample-ppm-2.json',
  type: 'property',

  run: async () => {
    const [ppm1Response, ppm2Response] = await Promise.all([
      callAgent('sample-ppm-1.json'),
      callAgent('sample-ppm-2.json'),
    ]);
    return { ppm1Response, ppm2Response } satisfies BothFixturesOutput;
  },

  assertions: (output): AssertionResult[] => {
    const { ppm1Response, ppm2Response } = output as BothFixturesOutput;

    const schema1 = assertSchemaValid(
      'sample-ppm-1 analysis parses',
      ppm1Response.analysis,
      PpmAnalysisSchema
    );
    const schema2 = assertSchemaValid(
      'sample-ppm-2 analysis parses',
      ppm2Response.analysis,
      PpmAnalysisSchema
    );

    if (!schema1.passed || !schema2.passed || !schema1.parsed || !schema2.parsed) {
      return [schema1, schema2];
    }

    return [
      schema1,
      schema2,
      assertExactMatch(
        'sample-ppm-1 strategy is private_credit',
        schema1.parsed.extracted_terms.strategy,
        'private_credit'
      ),
      assertExactMatch(
        'sample-ppm-2 strategy is other',
        schema2.parsed.extracted_terms.strategy,
        'other'
      ),
    ];
  },
};

export default evalCase;
