/**
 * Shared types for the eval harness.
 *
 * Three main concepts:
 * - EvalCase: a single eval (input + run function + assertions)
 * - AssertionResult: result of one assertion within a case
 * - EvalResult: result of running a full case (all its assertions)
 */

/**
 * The output shape of the PPM extractor agent.
 * We import this loosely as `unknown` because each case will narrow it
 * after schema validation. This avoids tight coupling between evals/ and
 * lib/schema.ts of the main app.
 */
export type ExtractorOutput = unknown;

/**
 * Result of a single assertion within an eval case.
 */
export interface AssertionResult {
  name: string;          // human-readable name, e.g. "mgmt_fee within tolerance"
  passed: boolean;
  expected?: unknown;    // what we expected (when applicable)
  actual?: unknown;      // what we got (when applicable)
  message?: string;      // additional context, especially on failure
}

/**
 * Result of running a full eval case.
 */
export interface EvalResult {
  caseName: string;
  passed: boolean;       // true iff ALL assertions in the case passed
  assertions: AssertionResult[];
  duration_ms: number;
  error?: string;        // present if the case threw before assertions ran
}

/**
 * The shape of a single eval case.
 *
 * `run` is responsible for:
 *   1. Loading the fixture (we provide a helper for this)
 *   2. Calling the agent
 *   3. Returning the agent's output (typed as ExtractorOutput)
 *
 * `assertions` takes the output and returns a list of AssertionResults.
 */
export interface EvalCase {
  name: string;
  description: string;       // why this eval exists, in 1-2 lines
  fixturePath: string;       // path relative to test-fixtures/
  type: 'property' | 'regression';
  run: () => Promise<ExtractorOutput>;
  assertions: (output: ExtractorOutput) => AssertionResult[];
}
