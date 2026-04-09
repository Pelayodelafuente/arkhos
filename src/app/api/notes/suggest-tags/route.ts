import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SuggestTagsRequestBody {
  title: string
  content: string
  existingTags: string[]
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }

  let body: SuggestTagsRequestBody
  try {
    body = (await req.json()) as SuggestTagsRequestBody
  } catch {
    return NextResponse.json({ error: 'Cuerpo de petición inválido' }, { status: 400 })
  }

  const plainText = (body.content ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const existing = Array.isArray(body.existingTags) ? body.existingTags : []

  const client = new Anthropic({ apiKey })

  const systemPrompt =
    'Eres un asistente de etiquetado de notas. Sugiere entre 3 y 5 etiquetas relevantes para la nota. ' +
    'Reglas: etiquetas cortas (1-2 palabras), en minúsculas, sin espacios (usa guion si necesario), en español. ' +
    (existing.length > 0 ? `No repitas estas etiquetas ya existentes: ${existing.join(', ')}. ` : '') +
    'Responde ÚNICAMENTE con JSON válido en este formato exacto: {"tags": ["tag1", "tag2", "tag3"]}'

  const userMessage = body.title
    ? `Título: ${body.title}\n\n${plainText.slice(0, 2000)}`
    : plainText.slice(0, 2000)

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
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

    const parsed = JSON.parse(jsonMatch[0]) as { tags?: unknown }
    const tags = Array.isArray(parsed.tags)
      ? (parsed.tags as unknown[])
          .filter((t): t is string => typeof t === 'string' && t.length > 0)
          .filter((t) => !existing.includes(t))
          .slice(0, 5)
      : []

    return NextResponse.json({ tags })
  } catch {
    return NextResponse.json({ error: 'Error al sugerir tags' }, { status: 500 })
  }
}
