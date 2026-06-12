'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvas-store';
import { useProjectsStore } from '@/stores/projects-store';
import type { Project, ProjectPhase, PhaseTask } from '@/types/projects';

// ─── Types ───────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Helpers ─────────────────────────

function serializeProject(project: Project): string {
  const phases = project.phases.map((phase: ProjectPhase) => {
    const tasks = phase.tasks.map((task: PhaseTask) => ({
      text: task.text,
      done: task.done,
      priority: task.priority,
    }));
    return {
      name: phase.name,
      status: phase.status,
      taskCount: phase.tasks.length,
      tasks,
    };
  });

  return JSON.stringify(
    {
      name: project.name,
      status: project.status,
      type: project.type,
      stack: project.stack,
      tags: project.tags ?? [],
      phases,
    },
    null,
    2
  );
}

// ─── Message bubble ──────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className="relative max-w-[85%] px-[10px] py-[7px]"
        style={
          isUser
            ? {
                background: '#C4704A',
                color: '#fff',
                borderRadius: '10px 3px 10px 10px',
              }
            : {
                background: 'rgba(237,232,224,0.75)',
                backdropFilter: 'blur(8px)',
                border: '0.5px solid rgba(255,255,255,0.7)',
                borderRadius: '3px 10px 10px 10px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                color: '#3a2a2a',
              }
        }
      >
        {/* User gradient overlay */}
        {isUser && (
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              borderRadius: '10px 3px 10px 10px',
              background:
                'radial-gradient(ellipse at bottom, rgba(255,255,255,0.15), transparent)',
            }}
          />
        )}
        <p className="relative whitespace-pre-wrap text-[11px] leading-[1.5]">
          {message.content}
        </p>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────

export function WindowChat() {
  const selectedProjectId = useCanvasStore((s) => s.selectedProjectId);
  const activeProject = useProjectsStore((s) => s.activeProject);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset chat when project changes
  const [prevProjectId, setPrevProjectId] = useState(selectedProjectId);
  if (selectedProjectId !== prevProjectId) {
    setPrevProjectId(selectedProjectId);
    setMessages([]);
    setInput('');
    setIsStreaming(false);
  }

  // Abort in-flight stream from the previous project
  useEffect(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, [selectedProjectId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming || !activeProject) return;

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);

    // Prepare abort controller
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    const projectData = serializeProject(activeProject);

    // Add empty assistant message for streaming
    const assistantMessage: ChatMessage = { role: 'assistant', content: '' };
    setMessages([...newMessages, assistantMessage]);

    try {
      const res = await fetch('/api/projects/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          projectData,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(errBody?.error ?? `Error ${res.status}`);
      }

      if (!res.body) {
        throw new Error('No se recibió respuesta');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (controller.signal.aborted) {
          reader.cancel();
          return;
        }
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        // Update the last (assistant) message
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
            updated[lastIdx] = { ...updated[lastIdx], content: accumulated };
          }
          return updated;
        });
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      const errorMsg =
        err instanceof Error ? err.message : 'Error en el chat';
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: `Error: ${errorMsg}`,
          };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, activeProject, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!selectedProjectId) {
    return (
      <p className="text-[11px] text-text-tertiary">
        Selecciona un proyecto para chatear
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2" style={{ minHeight: 120 }}>
      {/* Messages area */}
      <div
        ref={messagesRef}
        className="flex max-h-[180px] flex-col gap-[6px] overflow-y-auto"
      >
        {messages.length === 0 && (
          <p className="py-2 text-center text-[10px] text-text-tertiary">
            Pregunta lo que necesites sobre el proyecto
          </p>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={`${msg.role}-${i}`} message={msg} />
        ))}
        {isStreaming && messages.length > 0 && (
          <div className="flex justify-start">
            <span className="inline-block h-[11px] w-[1px] animate-pulse bg-accent" />
          </div>
        )}
      </div>

      {/* Input row */}
      <div className="flex items-center gap-[6px]">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming || !activeProject}
          placeholder={
            activeProject ? 'Escribe tu mensaje...' : 'Cargando proyecto...'
          }
          className="flex-1 rounded-[8px] bg-[rgba(250,247,242,0.8)] px-[10px] py-[6px] font-sans text-[11px] text-text-secondary outline-none transition-all duration-150 placeholder:text-text-tertiary disabled:opacity-50"
          style={{
            border: '0.5px solid var(--border-stone)',
            backdropFilter: 'blur(4px)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(196,112,74,0.5)';
            e.currentTarget.style.boxShadow =
              '0 0 0 3px rgba(196,112,74,0.08)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-stone)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <button
          type="button"
          onClick={sendMessage}
          disabled={isStreaming || !input.trim()}
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] transition-all duration-150 hover:scale-[1.07] disabled:opacity-40 disabled:hover:scale-100"
          style={{
            background: '#C4704A',
          }}
          onMouseEnter={(e) => {
            if (!(e.currentTarget as HTMLButtonElement).disabled) {
              (e.currentTarget as HTMLButtonElement).style.background =
                '#b05e3a';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#C4704A';
          }}
        >
          <Send className="h-[13px] w-[13px] text-white" />
        </button>
      </div>
    </div>
  );
}
