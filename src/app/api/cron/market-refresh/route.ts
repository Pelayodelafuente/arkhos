import { NextRequest, NextResponse } from 'next/server'
import { fetchPulseData } from '@/lib/mercados/pulse'

export const maxDuration = 60

// F4.3 — Cron de refresco de market_data_cache (Vercel Cron, ver vercel.json).
// Refresca el Pulso Global sin necesidad de visitar /mercados, de modo que el
// Dashboard y los widgets siempre lean datos frescos de la caché.
// Vercel envía `Authorization: Bearer ${CRON_SECRET}` si el secret existe.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    // Sin secret configurado no se expone el endpoint (fail-closed)
    return NextResponse.json({ error: 'Cron no configurado' }, { status: 503 })
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const data = await fetchPulseData(true)
    const metrics = Object.entries(data)
      .filter(([, v]) => v != null)
      .map(([k]) => k)
    return NextResponse.json({ ok: true, refreshed: metrics, at: new Date().toISOString() })
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'unknown'
    return NextResponse.json({ ok: false, error: detail }, { status: 500 })
  }
}
