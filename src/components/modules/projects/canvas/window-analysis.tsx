'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvas-store';
import { useProjectsStore } from '@/stores/projects-store';
import type { Project, ProjectPhase, PhaseTask } from '@/types/projects';

// ─── Types ───────────────────────────

type StepStatus = 'pending' | 'active' | 'done';

interface AnalysisStep {
  label: string;
  status: StepStatus;
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

// ─── Step row component ──────────────

function StepRow({
  step,
  isLast,
  animDelay,
}: {
  step: AnalysisStep;
  isLast: boolean;
  animDelay: number;
}) {
  const dotStyle: Record<StepStatus, React.CSSProperties> = {
    done: { background: '#8AAC7E' },
    active: {
      background: '#8AAC7E',
      animation: 'analysis-pulse 2s ease-in-out infinite',
    },
    pending: {
      background: 'transparent',
      border: '1.5px solid #252B20',
    },
  };

  const textClass: Record<StepStatus, string> = {
    done: 'text-[#6B6F62] line-through',
    active: 'text-[#8AAC7E] font-semibold',
    pending: 'text-[#4A4D44]',
  };

  return (
    <div
      className="relative flex items-start gap-[9px] pb-[10px]"
      style={{
        opacity: step.status === 'pending' ? 0.6 : 1,
        animation:
          step.status !== 'pending'
            ? `analysis-fade-in 0.3s ease ${animDelay}ms both`
            : undefined,
      }}
    >
      {/* Connector line */}
      {!isLast && (
        <span
          className="absolute left-[8px] top-[20px] w-px"
          style={{
            height: 'calc(100% - 8px)',
            background: '#1E2219',
            transformOrigin: 'top',
          }}
        />
      )}

      {/* Dot */}
      <span
        className="flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full"
        style={dotStyle[step.status]}
      >
        {step.status === 'done' && (
          <Check className="h-[10px] w-[10px] text-white" strokeWidth={3} />
        )}
        {step.status === 'active' && (
          <span className="block h-[5px] w-[5px] rounded-full bg-white" />
        )}
      </span>

      {/* Text */}
      <span className={`text-[11px] leading-[17px] ${textClass[step.status]}`}>
        {step.label}
      </span>
    </div>
  );
}

// ─── Main component ──────────────────

export function WindowAnalysis() {
  const selectedProjectId = useCanvasStore((s) => s.selectedProjectId);
  const setAnalysisBadge = useCanvasStore((s) => s.setAnalysisBadge);
  const activeProject = useProjectsStore((s) => s.activeProject);

  const [steps, setSteps] = useState<AnalysisStep[]>([
    { label: 'Cargar proyecto de Supabase', status: 'pending' },
    { label: 'Leer fases y tareas', status: 'pending' },
    { label: 'Calcular bloqueos', status: 'pending' },
    { label: 'Generando análisis…', status: 'pending' },
    { label: 'Análisis completo', status: 'pending' },
  ]);
  const [streamedText, setStreamedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastAnalyzedId = useRef<string | null>(null);

  // Auto-scroll when streaming text changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamedText]);

  const updateStep = useCallback(
    (index: number, status: StepStatus) => {
      setSteps((prev) =>
        prev.map((s, i) => (i === index ? { ...s, status } : s))
      );
    },
    []
  );

  const resetSteps = useCallback(() => {
    setSteps([
      { label: 'Cargar proyecto de Supabase', status: 'pending' },
      { label: 'Leer fases y tareas', status: 'pending' },
      { label: 'Calcular bloqueos', status: 'pending' },
      { label: 'Generando análisis…', status: 'pending' },
      { label: 'Análisis completo', status: 'pending' },
    ]);
    setStreamedText('');
    setError(null);
  }, []);

  const runAnalysis = useCallback(
    async (project: Project) => {
      // Cancel any previous request
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      resetSteps();
      setIsStreaming(true);
      setAnalysisBadge({ text: 'En curso...', variant: 'terracotta' });

      // Step 1: Load project — immediate (data already available)
      updateStep(0, 'done');

      // Step 2: Read phases and tasks — small delay
      await new Promise((r) => setTimeout(r, 200));
      if (controller.signal.aborted) return;
      updateStep(1, 'done');

      // Step 3: Calculate blocks — small delay
      await new Promise((r) => setTimeout(r, 400));
      if (controller.signal.aborted) return;
      updateStep(2, 'done');

      // Step 4: Start generating analysis
      updateStep(3, 'active');

      const projectData = serializeProject(project);

      try {
        const res = await fetch('/api/projects/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectData }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errBody = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(
            errBody?.error ?? `Error ${res.status}`
          );
        }

        if (!res.body) {
          throw new Error('No se recibió respuesta del servidor');
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
          setStreamedText(accumulated);
        }

        // Step 4: done, step 5: done
        updateStep(3, 'done');
        updateStep(4, 'done');
        setAnalysisBadge({ text: 'Listo \u2713', variant: 'green' });
      } catch (err) {
        if (controller.signal.aborted) return;
        const msg =
          err instanceof Error ? err.message : 'Error al analizar';
        setError(msg);
        updateStep(3, 'pending');
        setAnalysisBadge({ text: 'Error', variant: 'gray' });
      } finally {
        setIsStreaming(false);
      }
    },
    [resetSteps, updateStep, setAnalysisBadge]
  );

  // Trigger analysis when project changes
  useEffect(() => {
    if (
      selectedProjectId &&
      activeProject &&
      activeProject.id === selectedProjectId &&
      lastAnalyzedId.current !== selectedProjectId
    ) {
      lastAnalyzedId.current = selectedProjectId;
      runAnalysis(activeProject);
    }
  }, [selectedProjectId, activeProject, runAnalysis]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  if (!selectedProjectId) {
    return (
      <p className="text-[11px] text-text-tertiary">
        Selecciona un proyecto para analizar
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Keyframes */}
      <style>{`
        @keyframes analysis-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.92); }
        }
        @keyframes analysis-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Steps list */}
      <div className="flex flex-col">
        {steps.map((step, i) => (
          <StepRow
            key={step.label}
            step={step}
            isLast={i === steps.length - 1}
            animDelay={i * 100}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-[11px] text-red-500">{error}</p>
      )}

      {/* Streamed analysis text */}
      {(streamedText || isStreaming) && (
        <div
          ref={scrollRef}
          className="max-h-[140px] overflow-y-auto rounded-md border border-border bg-surface-2 p-2"
        >
          <p className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-text-secondary">
            {streamedText}
            {isStreaming && (
              <span className="ml-0.5 inline-block h-[11px] w-[1px] animate-pulse bg-accent" />
            )}
          </p>
        </div>
      )}
    </div>
  );
}
