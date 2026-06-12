import { AI_MODEL_FAST } from '@/lib/ai/models'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

const suggestTagsSchema = z.object({
  title: z.string().max(500).optional().default(''),
  content: z.string().max(50000).optional().default(''),
  existingTags: z.array(z.string().max(50)).max(100).optional().default([]),
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

  const parsed = suggestTagsSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos de entrada inválidos' }, { status: 400 })
  }

  const { title, content, existingTags } = parsed.data

  const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const existing = existingTags

  const client = new Anthropic({ apiKey })

  const systemPrompt =
    'Eres un asistente de etiquetado de notas. Sugiere entre 3 y 5 etiquetas relevantes para la nota. ' +
    'Reglas: etiquetas cortas (1-2 palabras), en minúsculas, sin espacios (usa guion si necesario), en español. ' +
    (existing.length > 0 ? `No repitas estas etiquetas ya existentes: ${existing.join(', ')}. ` : '') +
    'Responde ÚNICAMENTE con JSON válido en este formato exacto: {"tags": ["tag1", "tag2", "tag3"]}'

  const userMessage = title
    ? `Título: ${title}\n\n${plainText.slice(0, 2000)}`
    : plainText.slice(0, 2000)

  try {
    const message = await client.messages.create({
      model: AI_MODEL_FAST,
      max_tokens: 150,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''

    // Extract JSON — sometimes the model wraps it in backticks
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ tags: [] })
    }

    const jsonParsed = JSON.parse(jsonMatch[0]) as { tags?: unknown }
    const tags = Array.isArray(jsonParsed.tags)
      ? (jsonParsed.tags as unknown[])
          .filter((t): t is string => typeof t === 'string' && t.length > 0)
          .filter((t) => !existing.includes(t))
          .slice(0, 5)
      : []

    return NextResponse.json({ tags })
  } catch {
    return NextResponse.json({ error: 'Error al sugerir tags' }, { status: 500 })
  }
}
