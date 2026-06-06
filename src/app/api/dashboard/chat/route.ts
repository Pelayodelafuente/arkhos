import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod/v4'

const client = new Anthropic()

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  context: z
    .object({
      patrimonio: z.number().optional(),
      gastos: z.number().optional(),
      projects: z.number().optional(),
    })
    .optional(),
})

export async function POST(req: NextRequest) {
  const { success } = await rateLimit(req, { limit: 20, window: 3600 })
  if (!success) {
    return new Response('Demasiadas peticiones. Espera un momento.', { status: 429 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de petición inválido' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const { message, context } = parsed.data

  const systemPrompt = `Eres el AI Copiloto de Arkhos, la plataforma personal de Pelayo.
Contexto actual:
- Patrimonio total: ${context?.patrimonio != null ? `€${context.patrimonio.toLocaleString('es-ES', { maximumFractionDigits: 0 })}` : 'no disponible'}
- Gasto mensual en suscripciones: ${context?.gastos != null ? `€${context.gastos.toFixed(0)}` : 'no disponible'}
- Proyectos activos: ${context?.projects ?? 'desconocido'}
Responde siempre en español. Sé directo y específico. Máximo 200 palabras.`

  const anthropicClient = new Anthropic({ apiKey })

  try {
    const stream = anthropicClient.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
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
              const parsed = JSON.parse(chunk) as {
                type: string
                delta?: { type: string; text?: string }
              }
              if (
                parsed.type === 'content_block_delta' &&
                parsed.delta?.type === 'text_delta' &&
                parsed.delta.text
              ) {
                controller.enqueue(encoder.encode(parsed.delta.text))
              }
            } catch {
              // Non-JSON chunk — skip
            }
          }
        } finally {
          reader.releaseLock()
          controller.close()
        }
      },
    })

    return new Response(textStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Error al procesar el mensaje' }, { status: 500 })
  }
}

void client
