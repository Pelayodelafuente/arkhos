import { AI_MODEL } from '@/lib/ai/models'
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { buildSystemPrompt, type MarketContext } from '@/lib/mercados/ai-prompts';

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(8000),
      })
    )
    .min(1)
    .max(40),
  // El contexto de mercado son los datos que el propio cliente ya cargó;
  // se valida la forma y buildSystemPrompt interpola solo campos concretos
  context: z
    .object({
      pulse: z.unknown().optional(),
      macro: z.unknown().optional(),
      assets: z.unknown().optional(),
      portfolio: z.unknown().optional(),
    })
    .optional(),
});

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

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de petición inválido' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }
  const body = parsed.data;

  const systemPrompt = buildSystemPrompt((body.context ?? {}) as MarketContext);
  const client = new Anthropic({ apiKey });

  try {
    const stream = client.messages.stream({
      model: AI_MODEL,
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
