import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  projectData: string;
}

export async function POST(req: NextRequest) {
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

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de petición inválido' },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: 'messages es requerido y no puede estar vacío' },
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
    'Eres un asistente integrado en Arkhos, una plataforma de gestión de proyectos.\n' +
    'El usuario está trabajando en el siguiente proyecto. Responde preguntas sobre el proyecto,\n' +
    'sugiere mejoras y ayuda a planificar. Sé conciso y directo. Responde en español.\n\n' +
    `Datos del proyecto:\n${body.projectData}`;

  const apiMessages: Array<{ role: 'user' | 'assistant'; content: string }> =
    body.messages.map((m) => ({
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
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch {
    return NextResponse.json({ error: 'Error al procesar chat' }, { status: 500 });
  }
}
