import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/tr/sync — triggers a manual sync via GitHub Actions workflow_dispatch
// GET  /api/tr/sync — returns last 5 sync log entries for the current user

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const githubToken = process.env.GITHUB_ACTIONS_TOKEN
  if (!githubToken) {
    return NextResponse.json(
      { error: 'GITHUB_ACTIONS_TOKEN no configurado en el servidor' },
      { status: 503 }
    )
  }

  const response = await fetch(
    'https://api.github.com/repos/Pelayodelafuente/arkhos/actions/workflows/tr-sync.yml/dispatches',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main', inputs: { reason: 'Manual desde Arkhos UI' } }),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    console.error('GitHub API error:', response.status, text)
    return NextResponse.json(
      { error: 'Error al disparar el workflow de GitHub Actions' },
      { status: 502 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Sync iniciado — tarda ~60s. Recarga en un momento.',
  })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: logs, error } = await supabase
    .from('tr_sync_log')
    .select('id, status, started_at, finished_at, positions_updated, transactions_upserted, cash_eur, error_message, trigger_source')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(5)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ logs: logs ?? [] })
}
