import { Sparkles } from 'lucide-react';

export function WindowAIPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{
          background: 'rgba(196,112,74,0.08)',
          border: '0.5px solid rgba(196,112,74,0.15)',
        }}
      >
        <Sparkles className="h-5 w-5" style={{ color: '#C4704A', opacity: 0.6 }} />
      </div>
      <div className="text-center">
        <p className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Análisis IA
        </p>
        <p className="mt-1 text-[10px] text-text-tertiary">
          Próximamente
        </p>
      </div>
      <div
        className="w-full rounded-lg px-3 py-2 text-center"
        style={{
          background: 'rgba(196,112,74,0.04)',
          border: '0.5px dashed rgba(196,112,74,0.2)',
        }}
      >
        <p className="text-[9px] text-text-tertiary">
          Chat con el proyecto, análisis automático y sugerencias inteligentes
        </p>
      </div>
    </div>
  );
}
