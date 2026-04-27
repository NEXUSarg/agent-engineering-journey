/**
 * Eval 06 — Confidence calibrated against missing_data
 *
 * Type: property
 * Why this exists:
 *   The system prompt explicitly states (in <what_not_to_do>):
 *     "Never set overall_confidence > 0.7 if missing_data array has 3+ items."
 *
 *   This is a "rule the agent must respect" — a calibration property.
 *   Without it, the agent could return confidence=0.9 on a document where
 *   it admittedly couldn't extract half the relevant fields. That misleads
 *   the allocator using the output.
 *
 *   sample-ppm-2 (Meridian Crypto) has multiple unstated economics:
 *     - no target size or hard cap
 *     - no fund term
 *     - auditor not yet engaged
 *     - vintage stated as "anticipated"
 *
 *   The agent should fill missing_data with at least 3 of these, and
 *   consequently keep overall_confidence ≤ 0.7.
 *
 *   Note: this eval becomes a no-op if missing_data has < 3 items —
 *   we explicitly assert the precondition so we know whether the eval
 *   actually exercised the rule.
 */

import type { EvalCase, AssertionResult } from '../lib/types';
import { loadFixture } from '../lib/load-fixture';
import { assertSchemaValid, assertCondition } from '../lib/matchers';
import { PpmAnalysisSchema } from '../../lib/schema';

const ENDPOINT = process.env.EVALS_ENDPOINT ?? 'http://localhost:3000/api/extract-ppm';

interface ExtractApiResponse {
  ok: boolean;
  analysis?: unknown;
  error?: string;
}

const evalCase: EvalCase = {
  name: '06-confidence-calibration',
  description: 'When missing_data has 3+ items, overall_confidence must be ≤ 0.7 (per prompt rule).',
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

    const parsed = schemaResult.parsed;
    const missingCount = parsed.missing_data.length;
    const confidence = parsed.overall_confidence;

    return [
      schemaResult,
      // Precondition: this rule only applies when missing_data has 3+ items
      assertCondition(
        'precondition: missing_data has at least 3 items',
        missingCount >= 3,
        `missing_data only has ${missingCount} items (was: ${JSON.stringify(parsed.missing_data)}). The calibration rule does not apply — eval is inconclusive.`
      ),
      // The actual property assertion
      assertCondition(
        `overall_confidence ≤ 0.7 when missing_data has ${missingCount} items`,
        confidence <= 0.7,
        `Expected confidence ≤ 0.7 (rule from prompt), got ${confidence}. Agent violated explicit calibration rule.`
      ),
    ];
  },
};

export default evalCase;
