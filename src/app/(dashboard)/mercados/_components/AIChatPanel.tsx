'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Trash2, Send, Bot, CalendarDays } from 'lucide-react';
import { marked } from 'marked';
import { sanitizeHtml } from '@/lib/utils/sanitize';
import { QUICK_ACTIONS } from '@/lib/mercados/ai-prompts';
import type { PulseData } from '@/lib/mercados/pulse';
import type { MacroData } from '@/lib/mercados/macro';
import type { AssetsData } from '@/lib/mercados/assets';
import type { PortfolioMarketData } from '@/lib/mercados/portfolio-market';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface WeeklyAnalysisData {
  response: string | null;
  created_at: string | null;
}

interface WeeklyPostError {
  error: string;
  lastAnalysis?: string;
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pulseData: PulseData | null;
  macroData: MacroData | null;
  assetsData: AssetsData | null;
  portfolioData: PortfolioMarketData | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hola Pelayo 👋 Tengo acceso a tus datos de mercado en tiempo real y tu cartera de Patrimonio. ¿En qué puedo ayudarte hoy?',
  timestamp: new Date(),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderMarkdown(content: string): string {
  const raw = marked.parse(content, { async: false }) as string;
  return sanitizeHtml(raw);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AIChatPanel({
  isOpen,
  onClose,
  pulseData,
  macroData,
  assetsData,
  portfolioData,
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastWeeklyDate, setLastWeeklyDate] = useState<string | null>(null);
  const [isWeeklyLoading, setIsWeeklyLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load last weekly analysis date on mount
  useEffect(() => {
    async function checkWeekly() {
      try {
        const res = await fetch('/api/mercados/ai/weekly');
        if (res.ok) {
          const data = (await res.json()) as WeeklyAnalysisData;
          if (data.created_at) setLastWeeklyDate(data.created_at);
        }
      } catch {
        // Network error — ignore
      }
    }
    void checkWeekly();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }

  // Send message (streaming)
  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isStreaming) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMsg]);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setIsStreaming(true);

      const assistantId = crypto.randomUUID();
      setMessages(prev => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
      ]);

      try {
        // Capture current messages + new user message for the API call
        const allMessages = [...messages, userMsg];
        const res = await fetch('/api/mercados/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: allMessages.map(m => ({ role: m.role, content: m.content })),
            context: {
              pulse: pulseData,
              macro: macroData,
              assets: assetsData,
              portfolio: portfolioData,
            },
          }),
        });

        if (!res.ok || !res.body) throw new Error('Error en la respuesta');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, content: accumulated } : m
            )
          );
        }
      } catch {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: 'Error al procesar la respuesta. Inténtalo de nuevo.' }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, messages, pulseData, macroData, assetsData, portfolioData]
  );

  // Handle Enter key in textarea
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  }

  // Quick action click
  function handleQuickAction(prompt: string) {
    void sendMessage(prompt);
  }

  // Clear chat
  function handleClearChat() {
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
  }

  // Weekly analysis
  async function handleWeeklyAnalysis() {
    setIsWeeklyLoading(true);
    try {
      const res = await fetch('/api/mercados/ai/weekly', { method: 'POST' });

      if (res.status === 429) {
        const data = (await res.json()) as WeeklyPostError;
        if (data.lastAnalysis) {
          setLastWeeklyDate(data.lastAnalysis);
          // Offer to load existing analysis
          const loadMsg: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Ya tienes un análisis semanal del **${formatDate(data.lastAnalysis)}**. Pulsa el botón de análisis semanal para cargarlo.`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, loadMsg]);
        }
        return;
      }

      if (!res.ok) {
        const errorMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Error al generar el análisis semanal. Inténtalo de nuevo.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMsg]);
        return;
      }

      const data = (await res.json()) as { analysis: string };
      const analysisMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `## Análisis Semanal\n\n${data.analysis}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, analysisMsg]);
      setLastWeeklyDate(new Date().toISOString());
    } catch {
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Error de red al generar el análisis semanal.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsWeeklyLoading(false);
    }
  }

  // Load last weekly analysis
  async function handleLoadWeekly() {
    setIsWeeklyLoading(true);
    try {
      const res = await fetch('/api/mercados/ai/weekly');
      if (res.ok) {
        const data = (await res.json()) as WeeklyAnalysisData;
        if (data.response) {
          const analysisMsg: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `## Análisis Semanal (${data.created_at ? formatDate(data.created_at) : ''})\n\n${data.response}`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, analysisMsg]);
        }
      }
    } catch {
      // Network error — ignore
    } finally {
      setIsWeeklyLoading(false);
    }
  }

  const showQuickActions = messages.length === 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 z-50 flex h-full w-[420px] flex-col border-l border-border bg-white"
            role="dialog"
            aria-modal="true"
            aria-label="Arkhos Intelligence — Chat IA"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-mercados">
                  <Bot size={16} strokeWidth={1.75} className="text-white" />
                </div>
                <div>
                  <p className="font-heading text-base text-foreground leading-tight">
                    Arkhos Intelligence
                  </p>
                  <p className="text-[11px] text-text-secondary leading-tight">
                    Asistente de mercados con contexto real
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearChat}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-sand hover:text-foreground"
                  aria-label="Limpiar conversación"
                  title="Limpiar conversación"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-sand hover:text-foreground"
                  aria-label="Cerrar panel"
                >
                  <X size={16} strokeWidth={1.75} />
                </button>
              </div>
            </div>

            {/* Weekly analysis row */}
            <div className="flex items-center gap-3 border-b border-border px-5 py-3">
              <button
                onClick={() =>
                  lastWeeklyDate ? void handleLoadWeekly() : void handleWeeklyAnalysis()
                }
                disabled={isWeeklyLoading}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-mercados hover:text-mercados disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CalendarDays size={12} strokeWidth={1.75} />
                {isWeeklyLoading
                  ? 'Generando…'
                  : lastWeeklyDate
                  ? 'Cargar análisis semanal'
                  : 'Análisis semanal'}
              </button>
              {lastWeeklyDate && (
                <span className="text-[11px] text-text-secondary">
                  Último: {formatDate(lastWeeklyDate)}
                </span>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={
                    msg.role === 'user'
                      ? 'flex justify-end'
                      : 'flex justify-start'
                  }
                >
                  {msg.role === 'user' ? (
                    <div className="max-w-[80%] rounded-xl rounded-tr-sm bg-mercados/10 px-4 py-2.5">
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  ) : (
                    <div className="w-full">
                      {msg.content === '' && isStreaming ? (
                        <span className="text-sm text-text-secondary animate-pulse">
                          Pensando…
                        </span>
                      ) : (
                        <div
                          className="prose-chat text-sm text-foreground leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: renderMarkdown(msg.content),
                          }}
                        />
                      )}
                      {/* Blinking cursor during streaming for this message */}
                      {isStreaming &&
                        msg.id === messages[messages.length - 1]?.id &&
                        msg.role === 'assistant' &&
                        msg.content !== '' && (
                          <span className="ml-0.5 inline-block w-[2px] h-4 bg-mercados animate-pulse align-middle" />
                        )}
                    </div>
                  )}
                </div>
              ))}

              {/* Quick actions — shown only before any user message */}
              {showQuickActions && (
                <div className="mt-2">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
                    Acciones rápidas
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_ACTIONS.map(action => (
                      <button
                        key={action.id}
                        onClick={() => handleQuickAction(action.prompt)}
                        disabled={isStreaming}
                        className="rounded-lg border border-border px-3 py-2 text-left text-xs text-text-secondary transition-colors hover:border-mercados hover:bg-mercados/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-border px-4 py-3">
              <div className="flex items-end gap-2 rounded-xl border border-border bg-sand px-3 py-2 focus-within:border-mercados transition-colors">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Pregunta sobre tus inversiones…"
                  disabled={isStreaming}
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-text-secondary focus:outline-none disabled:cursor-not-allowed"
                  style={{ minHeight: '24px', maxHeight: '140px' }}
                  aria-label="Mensaje para Arkhos Intelligence"
                />
                <button
                  onClick={() => void sendMessage(input)}
                  disabled={isStreaming || !input.trim()}
                  className="mb-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-mercados text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-80"
                  aria-label="Enviar mensaje"
                >
                  <Send size={13} strokeWidth={2} />
                </button>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-text-secondary">
                Enter para enviar · Shift+Enter para nueva línea
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
