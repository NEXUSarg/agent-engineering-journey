/**
 * Eval 04 — Red flags severely problematic detected on adversarial PPM
 *
 * Type: property
 * Why this exists:
 *   sample-ppm-2 (Meridian Crypto) contains multiple red flags that any
 *   competent allocator analyst would catch. The agent must catch at
 *   minimum two of them as evidence of substantive analysis (not just
 *   field extraction):
 *
 *   1. Performance fee with NO high water mark — verbatim in document.
 *      Asymmetric to LPs (GP keeps gains, LP eats losses fully on next quarter).
 *
 *   2. Manager is NOT a registered investment adviser — verbatim in document.
 *      Operates under de minimis exemption, which is a governance / legal
 *      safety concern for a fund taking institutional money.
 *
 *   We use subset matching on the `evidence` field of red_flags. The agent
 *   may identify 5-7 red flags total — we only assert that these two
 *   specific ones are present, regardless of order or how many others.
 */

import type { EvalCase, AssertionResult } from '../lib/types';
import { loadFixture } from '../lib/load-fixture';
import { assertSchemaValid, assertSubsetIncludes } from '../lib/matchers';
import { PpmAnalysisSchema, type PpmAnalysis } from '../../lib/schema';

const ENDPOINT = process.env.EVALS_ENDPOINT ?? 'http://localhost:3000/api/extract-ppm';

interface ExtractApiResponse {
  ok: boolean;
  analysis?: unknown;
  error?: string;
}

const evalCase: EvalCase = {
  name: '04-red-flags-detection',
  description: 'Agent detects "no high water mark" and "not a registered investment adviser" red flags in adversarial PPM.',
  fixturePath: 'sample-ppm-2.json',
  type: 'property',

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

    const parsed = schemaResult.parsed as PpmAnalysis;

    return [
      schemaResult,
      assertSubsetIncludes<PpmAnalysis['red_flags'][number], string>(
        'red_flags include both severe issues (high water mark + IA registration)',
        parsed.red_flags,
        ['high water mark', 'registered investment adviser'],
        (flag, expectedKeyword) =>
          JSON.stringify(flag).toLowerCase().includes(expectedKeyword.toLowerCase())
      ),
    ];
  },
};

export default evalCase;
