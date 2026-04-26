# agent-engineering-journey

Public log of my 30-day journey from "Claude Code user" to "agent engineer."
Each commit corresponds to a specific day in the plan documented in
AltX_Master_Plan.docx (private).

## What's currently in this repo

A working PPM (Private Placement Memorandum) extractor agent built with the
Vercel AI SDK and Claude Sonnet 4.6. Given a fragment of a fund offering
document, the agent:

- Extracts structural and commercial terms (fund name, manager, strategy,
  vintage, fees, lockup, target IRR).
- Calls a lookup_benchmark tool to compare against industry medians.
- Identifies red flags with severity, category, and evidence.
- Returns structured JSON validated against a Zod schema.
- Self-assesses confidence and flags items for human review.

## Stack

- Next.js 16 (App Router)
- Vercel AI SDK v6 — generateText with tools + structured output via
  experimental_output and Output.object
- @ai-sdk/anthropic provider
- Zod for schema validation
- TypeScript

## Endpoints

- GET /api/smoke — sanity check that the LLM and API key are wired correctly
- POST /api/extract-ppm — the main agent. Body shape: { "document": "..." }

## Local development

Install deps, add an Anthropic API key to .env.local, run npm run dev,
then POST to /api/extract-ppm with a JSON body containing a "document"
field. See test-fixtures/sample-ppm-1.json for an example payload.

## Day-by-day log

- Day 1 — Read Anthropic's "Building Effective Agents" + multi-agent
  paper. Refactored a sub-agent of a separate trading bot to use the
  agentic structure (role / context / approach / stop_conditions /
  output_format).
- Day 2 — Built a reusable agentic prompt template. Refactored briefs
  for a separate Claude Code worker.
- Day 3 — This repo. PPM extractor agent end-to-end with tool use +
  structured outputs + Zod validation + Vercel deploy.

## License

MIT. Use anything here however you want.
