import { AI_MODEL } from '@/lib/ai/models'
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

const analyzeSchema = z.object({
  projectData: z.string().min(1).max(20000),
});

export async function POST(req: NextRequest) {
  const { success } = await rateLimit(req, { limit: 10, window: 60 });
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

  const parsed = analyzeSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos de entrada inválidos' },
      { status: 400 }
    );
  }

  const { projectData } = parsed.data;

  const client = new Anthropic({ apiKey });

  const systemPrompt =
    'Eres un asistente experto en gestión de proyectos. Analiza el siguiente proyecto y proporciona:\n' +
    '1. Resumen del estado actual\n' +
    '2. Tareas bloqueadas o de alta prioridad que necesitan atención\n' +
    '3. Sugerencias concretas para avanzar\n' +
    'Sé conciso y directo. Responde en español. Máximo 300 palabras.';

  const userMessage = `Analiza este proyecto:\n\n${projectData}`;

  try {
    const stream = client.messages.stream({
      model: AI_MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const readable = stream.toReadableStream();

    // Transform the raw SSE stream into plain text deltas
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const textStream = new ReadableStream({
      async start(controller) {
        const reader = readable.getReader();
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            // Parse the SSE event from the raw stream
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
              // Raw text chunk — some SDK versions emit text directly
              // Try to extract text if it's valid data
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
    return NextResponse.json({ error: 'Error al generar análisis' }, { status: 500 });
  }
}
