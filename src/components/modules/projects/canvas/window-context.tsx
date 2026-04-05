'use client';

import { useEffect, useState } from 'react';
import { useProjectsStore } from '@/stores/projects-store';
import { createClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────

interface ContextRow {
  label: string;
  value: string;
  live?: boolean;
}

// ─── Main component ──────────────────

export function WindowContext() {
  const projects = useProjectsStore((s) => s.projects);
  const [userEmail, setUserEmail] = useState<string>('—');
  const [supabaseStatus, setSupabaseStatus] = useState<'connected' | 'error'>('connected');
  const [lastSync, setLastSync] = useState<string>('—');

  useEffect(() => {
    async function loadContext() {
      try {
        const client = createClient();
        const { data: { user }, error } = await client.auth.getUser();
        if (error) {
          setSupabaseStatus('error');
        } else {
          setSupabaseStatus('connected');
          setUserEmail(user?.email ?? '—');
        }
        setLastSync(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
      } catch {
        setSupabaseStatus('error');
      }
    }
    loadContext();
  }, []);

  const rows: ContextRow[] = [
    {
      label: 'Proyectos',
      value: `${projects.length} proyecto${projects.length !== 1 ? 's' : ''}`,
      live: true,
    },
    {
      label: 'Supabase',
      value: supabaseStatus === 'connected' ? 'Conectado' : 'Error',
      live: supabaseStatus === 'connected',
    },
    {
      label: 'Última sync',
      value: lastSync,
    },
    {
      label: 'Usuario',
      value: userEmail,
    },
  ];

  return (
    <div className="flex flex-col gap-[6px]">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between rounded-md px-[8px] py-[5px]"
          style={{
            background: 'rgba(240,235,225,0.4)',
          }}
        >
          <span className="text-[10px] font-medium text-text-tertiary">
            {row.label}
          </span>
          <div className="flex items-center gap-[6px]">
            <span
              className="max-w-[140px] truncate font-mono text-[10px]"
              style={{ color: '#5a3e28' }}
              title={row.value}
            >
              {row.value}
            </span>
            {row.live && (
              <span
                className="h-[5px] w-[5px] shrink-0 rounded-full"
                style={{
                  background: '#B07A3A',
                  boxShadow: '0 0 4px rgba(122,155,118,0.6)',
                  animation: 'ctx-pulse 2s ease-in-out infinite',
                }}
              />
            )}
          </div>
        </div>
      ))}

      {/* Keyframes */}
      <style>{`
        @keyframes ctx-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 4px rgba(122,155,118,0.6); }
          50% { opacity: 0.5; box-shadow: 0 0 8px rgba(122,155,118,0.9); }
        }
      `}</style>
    </div>
  );
}
