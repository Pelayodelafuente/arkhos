'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { DashboardPanel, PanelHeader, ModuleChip } from './dashboard-view'
import type { ProjectData, SnapshotData, SubscriptionData } from './dashboard-view'

interface AICopilotPanelProps {
  projects: ProjectData[]
  snapshots: SnapshotData[]
  subscriptions: SubscriptionData[]
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

function toMonthly(amount: number, cycle: string): number {
  const map: Record<string, number> = {
    monthly: 1,
    annual: 12,
    quarterly: 3,
    biannual: 6,
    weekly: 0.25,
  }
  return amount / (map[cycle] ?? 1)
}

const QUICK_ACTIONS = [
  'Analizar mi cartera',
  'Señales de mercado',
  'Resumen semanal',
  'Riesgo USD',
  'Rebalanceo',
  'Oportunidades',
]

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hola Pelayo. Tengo acceso a tu patrimonio, gastos y proyectos activos. ¿En qué puedo ayudarte?',
  timestamp: new Date(),
}

export function AICopilotPanel({ projects, snapshots, subscriptions }: AICopilotPanelProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const patrimonio = snapshots.length > 0
    ? snapshots[snapshots.length - 1].total_value
    : undefined

  const gastos = subscriptions.reduce((s, sub) => s + toMonthly(sub.amount, sub.cycle), 0)
  const projectCount = projects.filter((p) => p.status === 'active' || p.status === 'in_progress').length

  const insights = [
    patrimonio
      ? `Patrimonio: €${patrimonio.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`
      : 'Sin datos de patrimonio',
    `Gastos: €${gastos.toFixed(0)}/mes`,
    `${projectCount} proyecto${projectCount !== 1 ? 's' : ''} activo${projectCount !== 1 ? 's' : ''}`,
    snapshots.length >= 2
      ? (() => {
          const last = snapshots[snapshots.length - 1]
          const prev = snapshots[snapshots.length - 2]
          const diff = last.total_value - prev.total_value
          return `${diff >= 0 ? '+' : ''}€${diff.toLocaleString('es-ES', { maximumFractionDigits: 0 })} vs mes ant.`
        })()
      : 'Sin histórico suficiente',
  ]

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim()
      if (!trimmed || isStreaming) return

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMsg])
      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      setIsStreaming(true)

      const assistantId = crypto.randomUUID()
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
      ])

      try {
        const res = await fetch('/api/dashboard/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            context: {
              patrimonio,
              gastos,
              projects: projectCount,
            },
          }),
        })

        if (!res.ok || !res.body) throw new Error('Error en la respuesta')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''

        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
          )
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: 'Error al conectar con el asistente. Inténtalo de nuevo.' }
              : m
          )
        )
      } finally {
        setIsStreaming(false)
      }
    },
    [isStreaming, patrimonio, gastos, projectCount]
  )

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 100)}px`
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage(input)
    }
  }

  return (
    <DashboardPanel className="flex flex-col">
      <PanelHeader
        color="var(--module-mercados)"
        title="AI Copiloto"
        chip={<ModuleChip label="CLAUDE 4" color="var(--module-mercados)" />}
        right={
          <div
            className="flex items-center justify-center h-6 w-6 rounded-md"
            style={{ background: 'linear-gradient(135deg, var(--accent-terracotta), var(--module-mercados))' }}
            aria-hidden="true"
          >
            <Sparkles size={12} color="white" />
          </div>
        }
      />
      <div className="px-4 pb-2">
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {insights.map((ins, i) => (
            <div
              key={i}
              className="px-2 py-1.5 rounded-lg bg-sand text-[11px] text-text-secondary font-mono"
            >
              {ins}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1 mb-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              onClick={() => void sendMessage(action)}
              disabled={isStreaming}
              className="text-[10px] px-2 py-1.5 rounded-lg border border-border text-text-secondary hover:text-foreground hover:border-border-medium hover:bg-sand transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {action}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 px-4 max-h-40">
        <div className="space-y-2 pb-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                  msg.role === 'user'
                    ? 'text-white'
                    : 'bg-sand text-foreground'
                }`}
                style={msg.role === 'user' ? { backgroundColor: 'var(--accent-terracotta)' } : {}}
              >
                {msg.content === '' && msg.role === 'assistant' ? (
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
                  </span>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="px-4 pb-4 pt-2 border-t border-border">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Pregunta algo sobre tu finanzas..."
            disabled={isStreaming}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-border bg-sand px-3 py-2 text-xs text-foreground placeholder:text-text-muted focus:outline-none focus:border-border-medium transition-colors disabled:opacity-50"
            style={{ minHeight: '36px', maxHeight: '100px' }}
            aria-label="Mensaje al AI Copiloto"
          />
          <button
            onClick={() => void sendMessage(input)}
            disabled={isStreaming || !input.trim()}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:scale-105 active:scale-95"
            style={{ backgroundColor: 'var(--accent-terracotta)' }}
            aria-label="Enviar mensaje"
          >
            <Send size={14} color="white" />
          </button>
        </div>
      </div>
    </DashboardPanel>
  )
}
