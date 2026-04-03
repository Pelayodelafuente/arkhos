'use client';

import { useRef, useEffect, useState } from 'react';
import { TaskDetailFields } from './task-detail-fields';
import type { PhaseTask } from '@/types/projects';

interface TaskInlineDetailProps {
  task: PhaseTask;
  onClose: () => void;
}

export function TaskInlineDetail({ task, onClose }: TaskInlineDetailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (containerRef.current) {
      setHeight(containerRef.current.scrollHeight);
    }
  }, [task.id]);

  return (
    <div
      style={{
        overflow: 'hidden',
        maxHeight: height || undefined,
        transition: 'max-height 300ms cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <div
        ref={containerRef}
        className="mt-2 rounded-xl border border-border bg-background p-4"
      >
        <TaskDetailFields task={task} onClose={onClose} onDelete={onClose} compact />
      </div>
    </div>
  );
}
