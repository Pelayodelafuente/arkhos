import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

interface AnalyzeRequestBody {
  projectData: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY no configurada' },
      { status: 500 }
    );
  }

  let body: AnalyzeRequestBody;
  try {
    body = (await req.json()) as AnalyzeRequestBody;
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de petición inválido' },
      { status: 400 }
    );
  }

  if (!body.projectData || typeof body.projectData !== 'string') {
    return NextResponse.json(
      { error: 'projectData es requerido' },
      { status: 400 }
    );
  }

  const client = new Anthropic({ apiKey });

  const systemPrompt =
    'Eres un asistente experto en gestión de proyectos. Analiza el siguiente proyecto y proporciona:\n' +
    '1. Resumen del estado actual\n' +
    '2. Tareas bloqueadas o de alta prioridad que necesitan atención\n' +
    '3. Sugerencias concretas para avanzar\n' +
    'Sé conciso y directo. Responde en español. Máximo 300 palabras.';

  const userMessage = `Analiza este proyecto:\n\n${body.projectData}`;

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error al generar análisis';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
