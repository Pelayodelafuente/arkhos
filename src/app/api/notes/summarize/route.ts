import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

const summarizeSchema = z.object({
  title: z.string().max(500).optional().default(''),
  content: z.string().min(1).max(50000),
})

export async function POST(req: NextRequest) {
  const { success } = await rateLimit(req, { limit: 10, window: 60 })
  if (!success) {
    return NextResponse.json({ error: 'Demasiadas peticiones. Espera un momento.' }, { status: 429 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de petición inválido' }, { status: 400 })
  }

  const parsed = summarizeSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos de entrada inválidos' }, { status: 400 })
  }

  const { title, content } = parsed.data

  const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (plainText.length < 20) {
    return NextResponse.json({ error: 'La nota es demasiado corta para resumir' }, { status: 422 })
  }

  const client = new Anthropic({ apiKey })

  const systemPrompt =
    'Eres un asistente de notas personales. Resume el contenido de la nota de forma concisa en 2-4 oraciones. ' +
    'Captura las ideas principales sin frases introductorias como "Esta nota trata de...". ' +
    'Ve directo al contenido. Responde en español.'

  const userMessage = title
    ? `Título: ${title}\n\n${plainText}`
    : plainText

  try {
    const stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const readable = stream.toReadableStream()
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const textStream = new ReadableStream({
      async start(controller) {
        const reader = readable.getReader()
        try {
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            try {
              const event = JSON.parse(chunk) as {
                type: string
                delta?: { type: string; text?: string }
              }
              if (
                event.type === 'content_block_delta' &&
                event.delta?.type === 'text_delta' &&
                event.delta.text
              ) {
                controller.enqueue(encoder.encode(event.delta.text))
              }
            } catch {
              // Raw chunk — skip unparseable
            }
          }
        } finally {
          reader.releaseLock()
          controller.close()
        }
      },
    })

    return new Response(textStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch {
    return NextResponse.json({ error: 'Error al generar resumen' }, { status: 500 })
  }
}
