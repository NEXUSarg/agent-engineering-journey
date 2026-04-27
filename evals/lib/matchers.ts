/**
 * Reusable assertion functions for eval cases.
 *
 * Each matcher returns an AssertionResult ready to be collected by the case.
 * Matchers do NOT throw — they capture the failure in the result.
 *
 * Four patterns:
 * - assertExactMatch:    deep-ish equality for primitives, strings, enums
 * - assertTolerance:     numeric equality with tolerance window
 * - assertSubsetIncludes: array contains all expected items (subset matching)
 * - assertSchemaValid:   output parses against a Zod schema
 *
 * Plus utility:
 * - assertCondition:     generic boolean assertion with custom message
 */

import type { AssertionResult } from './types';
import type { ZodSchema } from 'zod';

/**
 * Exact match for primitives (string, number, boolean) and simple enums.
 * For numeric tolerance, use assertTolerance instead.
 */
export function assertExactMatch(
  name: string,
  actual: unknown,
  expected: unknown
): AssertionResult {
  const passed = actual === expected;
  return {
    name,
    passed,
    expected,
    actual,
    message: passed
      ? undefined
      : `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  };
}

/**
 * Numeric equality with tolerance window.
 * Useful when the LLM might return 0.02 vs 0.020 vs 0.0200, all equivalent.
 */
export function assertTolerance(
  name: string,
  actual: unknown,
  expected: number,
  tolerance: number
): AssertionResult {
  if (typeof actual !== 'number') {
    return {
      name,
      passed: false,
      expected,
      actual,
      message: `Expected a number within ±${tolerance} of ${expected}, got ${typeof actual}: ${JSON.stringify(actual)}`,
    };
  }
  const diff = Math.abs(actual - expected);
  const passed = diff <= tolerance;
  return {
    name,
    passed,
    expected,
    actual,
    message: passed
      ? undefined
      : `Expected ${expected} ± ${tolerance}, got ${actual} (diff=${diff})`,
  };
}

/**
 * Subset matching: check that `actual` array contains all items in `expectedItems`.
 * `predicate` decides if an actual item "matches" an expected item.
 *
 * Example:
 *   assertSubsetIncludes(
 *     'red flags include high water mark',
 *     output.red_flags,
 *     ['high water mark', 'key person'],
 *     (flag, expectedKeyword) =>
 *       JSON.stringify(flag).toLowerCase().includes(expectedKeyword.toLowerCase())
 *   )
 */
export function assertSubsetIncludes<T, E>(
  name: string,
  actual: unknown,
  expectedItems: E[],
  predicate: (actualItem: T, expectedItem: E) => boolean
): AssertionResult {
  if (!Array.isArray(actual)) {
    return {
      name,
      passed: false,
      expected: expectedItems,
      actual,
      message: `Expected an array containing ${JSON.stringify(expectedItems)}, got ${typeof actual}`,
    };
  }
  const missing = expectedItems.filter(
    (expected) => !actual.some((item) => predicate(item as T, expected))
  );
  const passed = missing.length === 0;
  return {
    name,
    passed,
    expected: expectedItems,
    actual,
    message: passed
      ? undefined
      : `Missing expected items: ${JSON.stringify(missing)}`,
  };
}

/**
 * Schema validation. Returns the parsed/typed output as `actual`,
 * which downstream assertions can use.
 *
 * If validation fails, this is a "fatal" assertion — the case should
 * stop running further assertions, since the output shape is wrong.
 */
export function assertSchemaValid<T>(
  name: string,
  actual: unknown,
  schema: ZodSchema<T>
): AssertionResult & { parsed?: T } {
  const result = schema.safeParse(actual);
  if (result.success) {
    return {
      name,
      passed: true,
      parsed: result.data,
    };
  }
  return {
    name,
    passed: false,
    actual,
    message: `Schema validation failed: ${JSON.stringify(result.error.issues, null, 2)}`,
  };
}

/**
 * Generic boolean assertion. Use when the four patterns above don't fit.
 *
 * Example:
 *   assertCondition(
 *     'overall_confidence is between 0 and 1',
 *     output.overall_confidence >= 0 && output.overall_confidence <= 1,
 *     `confidence was ${output.overall_confidence}`
 *   )
 */
export function assertCondition(
  name: string,
  condition: boolean,
  failureMessage?: string
): AssertionResult {
  return {
    name,
    passed: condition,
    message: condition ? undefined : failureMessage,
  };
}
