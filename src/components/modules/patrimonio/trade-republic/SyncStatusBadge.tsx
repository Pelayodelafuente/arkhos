'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface SyncLog {
  id: string
  status: 'running' | 'success' | 'error'
  started_at: string
  finished_at: string | null
  positions_updated: number | null
  transactions_upserted: number | null
  cash_eur: number | null
  error_message: string | null
  trigger_source: string | null
}

interface SyncStatusResponse {
  logs: SyncLog[]
}

export function SyncStatusBadge() {
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [syncing, setSyncing] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/tr/sync')
      if (res.ok) {
        const json = await res.json() as SyncStatusResponse
        setLogs(json.logs ?? [])
      }
    } catch {
      // silently fail — non-critical UI
    }
  }, [])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  async function handleSync() {
    setSyncing(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/tr/sync', { method: 'POST' })
      const json = await res.json() as { success?: boolean; message?: string; error?: string }
      setFeedback(json.message ?? json.error ?? 'Error desconocido')
      // Poll for completion after a delay
      setTimeout(() => { void fetchLogs() }, 90_000)
    } catch {
      setFeedback('Error de red al disparar el sync')
    } finally {
      setSyncing(false)
    }
  }

  const lastLog = logs[0]

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {/* Status pill */}
      {lastLog && (
        <div className="flex items-center gap-1.5 text-text-tertiary">
          {lastLog.status === 'success' && (
            <>
              <CheckCircle size={12} className="text-patrimonio shrink-0" />
              <span>
                Sync{' '}
                {formatDistanceToNow(new Date(lastLog.started_at), {
                  addSuffix: true,
                  locale: es,
                })}
              </span>
            </>
          )}
          {lastLog.status === 'error' && (
            <>
              <AlertCircle size={12} className="text-red-400 shrink-0" />
              <span className="text-red-400 truncate max-w-[160px]" title={lastLog.error_message ?? ''}>
                Error de sync
              </span>
            </>
          )}
          {lastLog.status === 'running' && (
            <>
              <Clock size={12} className="text-amber-400 shrink-0 animate-pulse" />
              <span className="text-amber-400">Sincronizando...</span>
            </>
          )}
        </div>
      )}

      {/* Manual sync button */}
      <button
        onClick={() => { void handleSync() }}
        disabled={syncing}
        title="Sincronizar datos de Trade Republic ahora"
        className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-text-secondary transition-colors hover:border-patrimonio hover:text-patrimonio disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
        <span>{syncing ? 'Iniciando…' : 'Sincronizar'}</span>
      </button>

      {/* Feedback message */}
      {feedback && (
        <span className="text-amber-500">{feedback}</span>
      )}
    </div>
  )
}
