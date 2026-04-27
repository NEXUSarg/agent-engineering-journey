import { generateText, tool, stepCountIs, Output } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

import { lookupBenchmark } from '@/lib/benchmarks';
import { PpmAnalysisSchema } from '@/lib/schema';
import { PPM_EXTRACTOR_SYSTEM_PROMPT } from '@/lib/prompts';

/**
 * POST /api/extract-ppm
 *
 * Body: { document: string }  — text content of a PPM excerpt
 *
 * Pipeline:
 * 1. Validate input (must be non-trivial text).
 * 2. Run agent with system prompt + 1 tool + structured output schema.
 * 3. Validate output via Zod (already enforced by generateObject).
 * 4. Return analysis or fail loud with error.
 */

const RequestSchema = z.object({
  document: z
    .string()
    .min(50, 'Document must be at least 50 characters to be meaningful.')
    .max(50000, 'Document must be under 50,000 characters for this prototype.'),
});

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    // --- Step 1: parse and validate the request body ---
    const body = await request.json().catch(() => null);
    if (!body) {
      return Response.json(
        { ok: false, error: 'Invalid JSON body.' },
        { status: 400 }
      );
    }

    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          ok: false,
          error: 'Invalid request body.',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { document } = parsed.data;

    // --- Step 2: define the tool the agent can call ---
    let benchmarkLookupCount = 0;

    const tools = {
      lookup_benchmark: tool({
        description:
          'Look up the median industry benchmark for a fund strategy and vintage year. ' +
          'Returns null if no matching benchmark exists for that combo. ' +
          'Call this AT MOST ONCE per document.',
        inputSchema: z.object({
          strategy: z
            .enum([
              'private_credit',
              'venture_capital',
              'buyout',
              'real_estate',
              'infrastructure',
              'other',
            ])
            .describe('Fund strategy in snake_case.'),
          vintage_year: z
            .number()
            .int()
            .describe('Vintage year of the fund (e.g. 2024 or 2025).'),
        }),
        execute: async ({ strategy, vintage_year }) => {
          console.log('[lookup_benchmark CALLED with]:', { strategy, vintage_year });
          benchmarkLookupCount += 1;

          // Early return for "other" — no benchmark exists for off-database strategies.
          // This prevents the agent from inventing a "closest match" classification
          // just to satisfy the tool's input schema. (See Day 5 eval 05 diagnosis.)
          if (strategy === 'other') {
            return {
              found: false,
              benchmark: null,
              note: 'Strategy is "other" (off-database). No benchmark available.',
            };
          }

          const result = lookupBenchmark(strategy, vintage_year);
          return {
            found: result !== null,
            benchmark: result,
            note:
              result === null
                ? `No benchmark in our database for ${strategy} vintage ${vintage_year}.`
                : `Benchmark found with sample_size=${result.sample_size}.`,
          };
        },
      }),
    };

    // --- Step 3: run the agent ---
    const result = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      system: PPM_EXTRACTOR_SYSTEM_PROMPT,
      experimental_output: Output.object({ schema: PpmAnalysisSchema }),
      tools,
      stopWhen: stepCountIs(5),
      messages: [
        {
          role: 'user',
          content: `Analyze the following PPM excerpt and produce structured output per the schema.

DOCUMENT:
"""
${document}
"""`,
        },
      ],
    });

    // --- Step 4: return the analysis ---
    const elapsedMs = Date.now() - startedAt;

    return Response.json({
      ok: true,
      analysis: result.experimental_output,
      meta: {
        elapsed_ms: elapsedMs,
        benchmark_lookups: benchmarkLookupCount,
        usage: result.usage,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error.';
    const elapsedMs = Date.now() - startedAt;

    console.error('[extract-ppm] error:', error);

    return Response.json(
      {
        ok: false,
        error: message,
        meta: { elapsed_ms: elapsedMs },
      },
      { status: 500 }
    );
  }
}
