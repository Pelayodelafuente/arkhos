'use client';

import { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskDetailFields } from './task-detail-fields';
import type { PhaseTask } from '@/types/projects';

interface TaskSlideOverProps {
  task: PhaseTask | null;
  projectId: string;
  userId: string;
  onClose: () => void;
}

export function TaskSlideOver({ task, onClose }: TaskSlideOverProps) {
  // Escape key to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {task && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Centered modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex flex-col rounded-2xl border border-border bg-card shadow-[0_8px_40px_rgba(26,23,20,0.14)]"
            style={{ maxHeight: 'min(90vh, 700px)' }}
          >
            {/* Header */}
            <div className="flex items-start gap-3 border-b border-border px-5 py-4">
              <div className="flex-1 min-w-0">
                <h2 className="font-heading text-lg leading-tight text-foreground">{task.text}</h2>
                {task.links && task.links.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {task.links.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        <ExternalLink size={10} strokeWidth={2} />
                        {link.label || link.url}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="shrink-0 rounded-md p-1.5 text-text-tertiary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="Cerrar"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            {/* Scrollable fields */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <TaskDetailFields task={task} onClose={onClose} onDelete={onClose} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
