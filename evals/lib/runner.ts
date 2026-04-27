/**
 * Eval runner.
 *
 * Takes a list of EvalCases, runs each one, returns results.
 *
 * Design:
 * - Serial execution (not parallel). API rate limits + readable logs.
 * - Each case is wrapped in try/catch — a thrown error becomes a failed
 *   EvalResult with `error` populated, never crashes the whole run.
 * - All cases run regardless of failures. We want full coverage even
 *   when one case is broken.
 */

import type { EvalCase, EvalResult, AssertionResult } from './types';

/**
 * Run a single eval case. Never throws — all errors captured in the result.
 */
async function runOneCase(evalCase: EvalCase): Promise<EvalResult> {
  const startedAt = Date.now();
  try {
    const output = await evalCase.run();
    const assertions = evalCase.assertions(output);
    const duration_ms = Date.now() - startedAt;
    const passed = assertions.every((a) => a.passed);
    return {
      caseName: evalCase.name,
      passed,
      assertions,
      duration_ms,
    };
  } catch (err) {
    const duration_ms = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : String(err);
    return {
      caseName: evalCase.name,
      passed: false,
      assertions: [],
      duration_ms,
      error: message,
    };
  }
}

/**
 * Run all eval cases serially. Logs progress to stderr so stdout
 * remains clean for the final summary.
 */
export async function runAllCases(cases: EvalCase[]): Promise<EvalResult[]> {
  const results: EvalResult[] = [];

  for (let i = 0; i < cases.length; i++) {
    const evalCase = cases[i];
    process.stderr.write(`[${i + 1}/${cases.length}] Running ${evalCase.name}... `);
    const result = await runOneCase(evalCase);
    const status = result.passed ? '✅' : '❌';
    process.stderr.write(`${status} (${result.duration_ms}ms)\n`);
    results.push(result);
  }

  return results;
}

/**
 * Pretty-print results to stdout. Returns true iff all cases passed.
 */
export function printResults(results: EvalResult[]): boolean {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log('\n' + '='.repeat(70));
  console.log(`EVAL SUMMARY: ${passed}/${total} passed, ${failed} failed`);
  console.log('='.repeat(70) + '\n');

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.caseName} (${result.duration_ms}ms)`);

    if (result.error) {
      console.log(`   ERROR (case threw before assertions ran):`);
      console.log(`   ${result.error}`);
      console.log();
      continue;
    }

    for (const a of result.assertions) {
      const aIcon = a.passed ? '  ✓' : '  ✗';
      console.log(`${aIcon} ${a.name}`);
      if (!a.passed && a.message) {
        console.log(`     ${a.message}`);
      }
    }
    console.log();
  }

  console.log('='.repeat(70));
  console.log(`FINAL: ${passed}/${total} passed`);
  console.log('='.repeat(70));

  return failed === 0;
}
