import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export async function GET() {
  try {
    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      prompt: 'Say exactly: "Smoke test passed." Nothing else.',
    });

    return Response.json({ ok: true, text });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
