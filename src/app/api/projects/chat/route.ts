import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(10000),
});

const chatSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(50),
  projectData: z.string().min(1).max(20000),
});

export async function POST(req: NextRequest) {
  const { success } = await rateLimit(req, { limit: 20, window: 60 });
  if (!success) {
    return NextResponse.json({ error: 'Demasiadas peticiones. Espera un momento.' }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de petición inválido' },
      { status: 400 }
    );
  }

  const parsed = chatSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos de entrada inválidos' },
      { status: 400 }
    );
  }

  const { messages, projectData } = parsed.data;

  const client = new Anthropic({ apiKey });

  const systemPrompt =
    'Eres un asistente integrado en Arkhos, una plataforma de gestión de proyectos.\n' +
    'El usuario está trabajando en el siguiente proyecto. Responde preguntas sobre el proyecto,\n' +
    'sugiere mejoras y ayuda a planificar. Sé conciso y directo. Responde en español.\n\n' +
    `Datos del proyecto:\n${projectData}`;

  const apiMessages: Array<{ role: 'user' | 'assistant'; content: string }> =
    messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: apiMessages,
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
              const event = JSON.parse(chunk) as {
                type: string;
                delta?: { type: string; text?: string };
              };
              if (
                event.type === 'content_block_delta' &&
                event.delta?.type === 'text_delta' &&
                event.delta.text
              ) {
                controller.enqueue(encoder.encode(event.delta.text));
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
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch {
    return NextResponse.json({ error: 'Error al procesar chat' }, { status: 500 });
  }
}
