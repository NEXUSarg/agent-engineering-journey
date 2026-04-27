/**
 * Entry point for the eval suite.
 *
 * Usage:
 *   npx tsx evals/run.ts
 *
 * Optional env var:
 *   EVALS_ENDPOINT=https://agent-engineering-journey.vercel.app/api/extract-ppm \
 *   npx tsx evals/run.ts
 *
 *   By default cases hit http://localhost:3000/api/extract-ppm — make sure
 *   `npm run dev` is running in another terminal.
 *
 * Exit codes:
 *   0 = all cases passed
 *   1 = at least one case failed
 *
 *   Exit codes enable CI/CD integration in the future (a failing eval
 *   blocks merges to main).
 */

import case01 from './cases/01-schema-clean';
import case02 from './cases/02-fees-extraction';
import case03 from './cases/03-strategy-enum';
import case04 from './cases/04-red-flags-detection';
import case05 from './cases/05-tool-not-called-other';
import case07 from './cases/07-review-on-high-severity';

import { runAllCases, printResults } from './lib/runner';

const allCases = [case01, case02, case03, case04, case05, case07];

async function main() {
  const endpoint = process.env.EVALS_ENDPOINT ?? 'http://localhost:3000/api/extract-ppm';
  console.error(`Endpoint: ${endpoint}`);
  console.error(`Running ${allCases.length} eval cases...\n`);

  const startedAt = Date.now();
  const results = await runAllCases(allCases);
  const totalMs = Date.now() - startedAt;

  const allPassed = printResults(results);

  console.log(`\nTotal duration: ${(totalMs / 1000).toFixed(1)}s`);

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('FATAL: runner itself crashed:', err);
  process.exit(2);
});
