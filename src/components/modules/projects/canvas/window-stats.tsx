'use client';

import { useMemo, useEffect, useState, useRef } from 'react';
import { useCanvasStore } from '@/stores/canvas-store';
import { useProjectsStore } from '@/stores/projects-store';
import type { Project } from '@/types/projects';

// ─── Types ───────────────────────────

interface StatCardData {
  label: string;
  value: number;
  sub: string;
  barPercent: number;
  barColor?: string;
}

// ─── Animated counter hook ──────────

function useCountUp(target: number, duration: number = 800): number {
  const [current, setCurrent] = useState(0);
  const prevTargetRef = useRef(0);

  useEffect(() => {
    if (target === prevTargetRef.current) return;
    prevTargetRef.current = target;

    if (target === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- animation countup needs sync setState
      setCurrent(0);
      return;
    }

    let frame: number;
    const startTime = performance.now();
    const startValue = 0;

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const val = Math.round(startValue + (target - startValue) * eased);
      setCurrent(val);
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    }

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return current;
}

// ─── Stat card component ────────────

function StatCard({ data, animateDelay }: { data: StatCardData; animateDelay: number }) {
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const animatedValue = useCountUp(data.value);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), animateDelay);
    return () => clearTimeout(timer);
  }, [animateDelay]);

  const barColor = data.barColor ?? '#C4704A';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#F5F0EA',
        borderRadius: 9,
        padding: '10px 10px 8px',
        cursor: 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        transform: hovered ? 'translateY(-2px)' : undefined,
        boxShadow: hovered ? '0 4px 12px rgba(0,0,0,0.06)' : undefined,
      }}
    >
      {/* Label */}
      <div
        className="font-sans font-semibold uppercase"
        style={{
          fontSize: 9,
          color: '#aaa',
          letterSpacing: 0.4,
          marginBottom: 4,
        }}
      >
        {data.label}
      </div>

      {/* Value */}
      <div
        className="font-mono font-bold"
        style={{
          fontSize: 23,
          color: '#2a2a2a',
          lineHeight: 1,
        }}
      >
        {data.label === 'Progreso' ? `${animatedValue}%` : animatedValue}
      </div>

      {/* Sub text */}
      <div
        className="font-sans"
        style={{
          fontSize: 9,
          color: '#aaa',
          marginTop: 2,
        }}
      >
        {data.sub}
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 3,
          borderRadius: 2,
          background: '#E2D9CA',
          marginTop: 7,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: 2,
            background: barColor,
            width: mounted ? `${data.barPercent}%` : '0%',
            transition: 'width 1.3s cubic-bezier(0.22,1,0.36,1)',
          }}
        />
      </div>
    </div>
  );
}

// ─── Stats computation ──────────────

function computeStats(project: Project): StatCardData[] {
  const phases = project.phases;
  const phaseCount = phases.length;
  const completedPhases = phases.filter((p) => p.status === 'done').length;

  const allTasks = phases.flatMap((p) => p.tasks);
  const totalTasks = allTasks.length;
  const doneTasks = allTasks.filter((t) => t.done).length;
  const pendingTasks = totalTasks - doneTasks;
  const highPriorityTasks = allTasks.filter((t) => t.priority === 'high').length;

  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const phaseBarPercent = phaseCount > 0 ? Math.round((completedPhases / phaseCount) * 100) : 0;
  const taskBarPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const highBarPercent = totalTasks > 0 ? Math.round((highPriorityTasks / totalTasks) * 100) : 0;

  return [
    {
      label: 'Fases',
      value: phaseCount,
      sub: `${completedPhases} completadas`,
      barPercent: phaseBarPercent,
    },
    {
      label: 'Tareas',
      value: totalTasks,
      sub: `${pendingTasks} pendientes`,
      barPercent: taskBarPercent,
    },
    {
      label: 'Progreso',
      value: progressPercent,
      sub: 'En plazo',
      barPercent: progressPercent,
    },
    {
      label: 'Alta prioridad',
      value: highPriorityTasks,
      sub: 'Urgentes',
      barPercent: highBarPercent,
      barColor: '#E07050',
    },
  ];
}

// ─── Main component ─────────────────

export function WindowStats() {
  const selectedProjectId = useCanvasStore((s) => s.selectedProjectId);
  const activeProject = useProjectsStore((s) => s.activeProject);

  const stats = useMemo(() => {
    if (!activeProject || activeProject.id !== selectedProjectId) return null;
    return computeStats(activeProject);
  }, [activeProject, selectedProjectId]);

  if (!selectedProjectId || !stats) {
    return (
      <div className="flex items-center justify-center py-6">
        <p className="font-sans text-[10px] text-text-tertiary">
          Selecciona un proyecto
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map((stat, i) => (
        <StatCard key={stat.label} data={stat} animateDelay={i * 100} />
      ))}
    </div>
  );
}
