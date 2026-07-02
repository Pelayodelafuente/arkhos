import { AI_MODEL } from '@/lib/ai/models'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod/v4'
import { COPILOT_TOOLS, executeCopilotTool } from '@/lib/ai/copilot-tools'

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  tz_offset_min: z.number().int().min(-840).max(840).optional(),
  context: z
    .object({
      patrimonio: z.number().optional(),
      gastos: z.number().optional(),
      projects: z.number().optional(),
    })
    .optional(),
})

// F4.2 — tool-use: límite del loop agéntico para evitar bucles infinitos
const MAX_TOOL_ITERATIONS = 5

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

  const { message, context, tz_offset_min = 0 } = parsed.data

  // Fecha/hora local del usuario para resolver "mañana", "el viernes", etc.
  const nowLocal = new Date(Date.now() + tz_offset_min * 60000)
  const nowNaive = nowLocal.toISOString().slice(0, 19)
  const weekday = new Intl.DateTimeFormat('es-ES', { weekday: 'long', timeZone: 'UTC' }).format(
    nowLocal
  )

  const systemPrompt = `Eres el AI Copiloto de Arkhos, la plataforma personal de Pelayo.
Ahora mismo es ${weekday}, ${nowNaive} (hora local del usuario).
Contexto actual:
- Patrimonio total: ${context?.patrimonio != null ? `€${context.patrimonio.toLocaleString('es-ES', { maximumFractionDigits: 0 })}` : 'no disponible'}
- Gasto mensual en suscripciones: ${context?.gastos != null ? `€${context.gastos.toFixed(0)}` : 'no disponible'}
- Proyectos activos: ${context?.projects ?? 'desconocido'}
Tienes herramientas de consulta (gastos por mes, suscripciones, patrimonio,
proyectos) y de acción (crear evento en Cronos, crear nota, registrar
suscripción, completar tarea). Úsalas cuando la petición dependa de datos
concretos o pida crear/registrar/completar algo — no estimes ni finjas.
Para eventos, trabaja en hora local naive "YYYY-MM-DDTHH:mm:ss" y resuelve
fechas relativas respecto a la fecha actual. Para completar una tarea, primero
localízala con list_pending_tasks.
Responde siempre en español. Sé directo y específico. Máximo 200 palabras.`

  const anthropicClient = new Anthropic({ apiKey })
  let mutated = false

  try {
    // F4.2 — loop agéntico manual: las tools se ejecutan server-side con el
    // cliente Supabase del usuario (RLS intacto) hasta la respuesta final.
    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: message }]
    let finalText = ''

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await anthropicClient.messages.create({
        model: AI_MODEL,
        max_tokens: 800,
        system: systemPrompt,
        tools: COPILOT_TOOLS,
        messages,
      })

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )

      if (response.stop_reason !== 'tool_use' || toolUses.length === 0) {
        finalText = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('')
        break
      }

      messages.push({ role: 'assistant', content: response.content })

      const results: Anthropic.ToolResultBlockParam[] = []
      for (const toolUse of toolUses) {
        const result = await executeCopilotTool(
          supabase,
          user.id,
          toolUse.name,
          toolUse.input,
          tz_offset_min
        )
        if (result.mutated) mutated = true
        results.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result.content,
          ...(result.isError && { is_error: true }),
        })
      }
      messages.push({ role: 'user', content: results })
    }

    if (!finalText) {
      finalText = 'No he podido completar la consulta. Inténtalo de nuevo.'
    }

    // El cliente lee un stream de texto plano; un único chunk es compatible
    return new Response(finalText, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Copilot-Mutated': mutated ? '1' : '0',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Error al procesar el mensaje' }, { status: 500 })
  }
}
