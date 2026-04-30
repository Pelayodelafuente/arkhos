import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { buildSystemPrompt, type MarketContext } from '@/lib/mercados/ai-prompts';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  context: MarketContext;
}

export async function POST(req: NextRequest) {
  const { success } = await rateLimit(req, { limit: 30, window: 3600 });
  if (!success) {
    return new Response('Demasiadas peticiones. Espera un momento.', { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: 'Cuerpo de petición inválido' }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: 'messages requerido' }, { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(body.context ?? {});
  const client = new Anthropic({ apiKey });

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: body.messages.map(m => ({ role: m.role, content: m.content })),
    });

    const readable = stream.toReadableStream();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const textStream = new ReadableStream({
      async start(controller) {
        const reader = readable.getReader();
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            try {
              const parsed = JSON.parse(chunk) as {
                type: string;
                delta?: { type: string; text?: string };
              };
              if (
                parsed.type === 'content_block_delta' &&
                parsed.delta?.type === 'text_delta' &&
                parsed.delta.text
              ) {
                controller.enqueue(encoder.encode(parsed.delta.text));
              }
            } catch {
              // Non-JSON chunk — skip
            }
          }
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(textStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Error al procesar chat' }, { status: 500 });
  }
}
