/**
 * Eval 01 — Schema valid on clean PPM
 *
 * Type: property
 * Why this exists:
 *   The most fundamental property of the agent: its output must parse
 *   against our Zod schema. If schema parsing fails, nothing else matters
 *   — every downstream consumer (UI, DB, comparator agents) breaks.
 *   This is "schema validation" assertion (Hamel level 1, foundational).
 */

import type { EvalCase, AssertionResult } from '../lib/types';
import { loadFixture } from '../lib/load-fixture';
import { assertSchemaValid } from '../lib/matchers';
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
  name: '01-schema-clean',
  description: 'Output of the agent on a clean private-credit PPM must parse against PpmAnalysisSchema.',
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
    return [
      assertSchemaValid('analysis parses against PpmAnalysisSchema', response.analysis, PpmAnalysisSchema),
    ];
  },
};

export default evalCase;
