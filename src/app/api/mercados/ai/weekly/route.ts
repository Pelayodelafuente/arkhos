import Anthropic from '@anthropic-ai/sdk';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { buildSystemPrompt } from '@/lib/mercados/ai-prompts';
import { fetchPulseData } from '@/lib/mercados/pulse';
import { fetchMacroData } from '@/lib/mercados/macro';

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const admin = getAdminClient();
  const { data } = await admin
    .from('market_ai_analyses')
    .select('response, created_at')
    .eq('user_id', user.id)
    .eq('analysis_type', 'weekly')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json(data ?? { response: null, created_at: null });
}

export async function POST(req: NextRequest) {
  const { success } = await rateLimit(req, { limit: 5, window: 3600 });
  if (!success) {
    return NextResponse.json({ error: 'Demasiadas peticiones.' }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });

  const admin = getAdminClient();

  // Cooldown: 1 análisis semanal
  const { data: recent } = await admin
    .from('market_ai_analyses')
    .select('id, created_at')
    .eq('user_id', user.id)
    .eq('analysis_type', 'weekly')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(1);

  if (recent && recent.length > 0) {
    return NextResponse.json(
      { error: 'Ya tienes un análisis semanal de esta semana.', lastAnalysis: recent[0].created_at },
      { status: 429 }
    );
  }

  const [pulseResult, macroResult] = await Promise.allSettled([
    fetchPulseData(),
    fetchMacroData(),
  ]);

  const context = {
    pulse: pulseResult.status === 'fulfilled' ? pulseResult.value : null,
    macro: macroResult.status === 'fulfilled' ? macroResult.value : null,
  };

  const systemPrompt = buildSystemPrompt(context);

  const weeklyPrompt = `Genera un análisis semanal completo del mercado para Pelayo.

Estructura tu respuesta así:
1. **Estado general del mercado** — ¿Cómo está el clima financiero global esta semana?
2. **Lo más relevante para tu cartera** — Top 3 factores que impactan directamente tus inversiones
3. **Señales a vigilar** — ¿Qué indicadores o eventos pueden mover los mercados próximamente?
4. **Acción recomendada** — Una recomendación concreta (puede ser "no hacer nada" si aplica)
5. **Perspectiva de largo plazo** — Recordatorio del contexto a 10+ años

Sé específico con los datos actuales de mercado disponibles en tu contexto. Máximo 600 palabras.`;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: weeklyPrompt }],
    });

    const analysisText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    await admin.from('market_ai_analyses').insert({
      user_id: user.id,
      analysis_type: 'weekly',
      prompt: weeklyPrompt,
      response: analysisText,
      market_context: context,
    });

    return NextResponse.json({ analysis: analysisText });
  } catch {
    return NextResponse.json({ error: 'Error al generar análisis' }, { status: 500 });
  }
}
