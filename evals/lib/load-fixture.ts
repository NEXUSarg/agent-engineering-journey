/**
 * Loads a fixture file from the test-fixtures/ directory.
 *
 * Test fixtures are JSON files containing the structured input the
 * agent receives — typically a `document` field with the raw PPM text.
 *
 * Usage:
 *   const fixture = loadFixture('sample-ppm-1.json');
 *   const ppmDocument = fixture.document;
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Shape of a PPM fixture file.
 * Keep this loose — fixtures may have additional metadata fields (notes,
 * expected behavior hints) beyond just `document`.
 */
export interface PpmFixture {
  document: string;
  [key: string]: unknown;
}

/**
 * Loads a fixture by filename (relative to test-fixtures/ at repo root).
 * Throws with a clear error if the file is missing or malformed.
 */
export function loadFixture(filename: string): PpmFixture {
  // test-fixtures/ lives at the repo root, two levels up from evals/lib/
  const path = join(__dirname, '..', '..', 'test-fixtures', filename);
  let raw: string;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch (err) {
    throw new Error(
      `Failed to read fixture at ${path}. Does the file exist? Original: ${(err as Error).message}`
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Fixture at ${path} is not valid JSON. Original: ${(err as Error).message}`
    );
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as PpmFixture).document !== 'string'
  ) {
    throw new Error(
      `Fixture at ${path} does not have a 'document' string field.`
    );
  }
  return parsed as PpmFixture;
}
