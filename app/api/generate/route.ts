import { streamText } from 'ai';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/ai/prompts';
import { generateMockResponse } from '@/lib/ai/mock-responses';
import { getSourceContentByIds } from '@/lib/api/source-content-mock';
import type { ContentType, ToneType } from '@/lib/types/content';

export async function POST(req: Request) {
  const body = await req.json();
  
  const {
    type,
    sourceContentIds,
    customPrompt,
    tone,
    additionalContext,
  } = body as {
    type: ContentType;
    sourceContentIds: string[];
    customPrompt?: string;
    tone: ToneType;
    additionalContext?: string;
  };

  // Validate required fields
  if (!type || !tone) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: type and tone' }),
      { status: 400 }
    );
  }

  // Check if API key is available
  const hasApiKey = !!process.env.OPENAI_API_KEY;

  // If no API key, use mock mode
  if (!hasApiKey) {
    const mockResponse = generateMockResponse(type, tone);
    
    // Stream the mock response to match the real API behavior
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Simulate streaming by sending chunks
        let currentIndex = 0;
        const chunkSize = 20;
        
        const sendChunk = () => {
          if (currentIndex < mockResponse.length) {
            const chunk = mockResponse.slice(currentIndex, currentIndex + chunkSize);
            const delta = `0:"${chunk.replace(/"/g, '\\"')}"\n`;
            controller.enqueue(encoder.encode(delta));
            currentIndex += chunkSize;
            setTimeout(sendChunk, 30); // Simulate streaming delay
          } else {
            controller.close();
          }
        };
        
        setTimeout(sendChunk, 100);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  // Get source content
  const sourceContents = getSourceContentByIds(sourceContentIds);
  
  // Build source material string
  const sourceText = sourceContents.length > 0
    ? sourceContents
        .map((c) => `Title: ${c.title}\nAuthor: ${c.author}\n\n${c.body}`)
        .join('\n\n---\n\n')
    : 'No source material provided. Create original content based on the user instructions.';

  const systemPrompt = buildSystemPrompt(type, tone);
  const userPrompt = buildUserPrompt(type, sourceText, customPrompt, additionalContext);

  const result = streamText({
    model: 'openai/gpt-4o',
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 2000,
    temperature: 0.7,
  });

  return result.toTextStreamResponse();
}
