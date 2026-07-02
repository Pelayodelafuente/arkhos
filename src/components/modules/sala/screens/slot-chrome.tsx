"use client";

// ══════════════════════════════════════
// Arkhos OPS — chrome de un slot (DOM)
// Barra de acciones bajo la pantalla (foco / cambiar widget) y selector
// de widget en overlay. Aparece al hacer hover sobre la pantalla.
// ══════════════════════════════════════

import { useState } from "react";
import { LayoutGrid, Maximize2, Minimize2, Check, GripHorizontal } from "lucide-react";
import { SALA_WIDGET_KEYS, type SalaSlotId, type SalaWidgetKey } from "@/lib/sala/config";
import { useSalaStore } from "@/stores/sala-store";
import { SALA_WIDGETS } from "../widgets/registry";

export function SlotToolbar({
  slotId,
  visible,
  screenHeight,
}: {
  slotId: SalaSlotId;
  visible: boolean;
  /** Altura en px del área de pantalla (para el overlay del picker) */
  screenHeight: number;
}) {
  const focusedSlot = useSalaStore((s) => s.focusedSlot);
  const setFocusedSlot = useSalaStore((s) => s.setFocusedSlot);
  const setDraggingSlot = useSalaStore((s) => s.setDraggingSlot);
  const [pickerOpen, setPickerOpen] = useState(false);
  const isFocused = focusedSlot === slotId;

  return (
    <>
      <div
        className="flex h-[30px] items-center justify-end gap-1.5 pr-1 transition-opacity duration-200"
        style={{ opacity: visible || isFocused || pickerOpen ? 1 : 0 }}
      >
        <button
          type="button"
          aria-label="Arrastrar pantalla"
          title="Arrastrar a otro slot"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDraggingSlot(slotId);
          }}
          className="flex h-6 w-8 cursor-grab items-center justify-center rounded border border-[var(--sala-border)] bg-[rgba(10,10,18,0.85)] text-[var(--sala-text-dim)] transition-colors duration-150 hover:border-[var(--sala-copper)] hover:text-[var(--sala-copper)] active:cursor-grabbing"
        >
          <GripHorizontal className="h-3 w-3" />
        </button>
        <ChromeButton
          label="Cambiar widget"
          onClick={() => setPickerOpen((open) => !open)}
        >
          <LayoutGrid className="h-3 w-3" />
        </ChromeButton>
        <ChromeButton
          label={isFocused ? "Salir del foco" : "Enfocar pantalla"}
          onClick={() => setFocusedSlot(isFocused ? null : slotId)}
        >
          {isFocused ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
        </ChromeButton>
      </div>
      {pickerOpen && (
        <WidgetPicker slotId={slotId} height={screenHeight} onClose={() => setPickerOpen(false)} />
      )}
    </>
  );
}

function ChromeButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-[var(--sala-border)] bg-[rgba(10,10,18,0.85)] text-[var(--sala-text-dim)] transition-colors duration-150 hover:border-[var(--sala-copper)] hover:text-[var(--sala-copper)]"
    >
      {children}
    </button>
  );
}

function WidgetPicker({
  slotId,
  height,
  onClose,
}: {
  slotId: SalaSlotId;
  height: number;
  onClose: () => void;
}) {
  const assignments = useSalaStore((s) => s.assignments);
  const assignWidget = useSalaStore((s) => s.assignWidget);
  const current = assignments[slotId];

  const handleSelect = (key: SalaWidgetKey) => {
    assignWidget(slotId, key);
    onClose();
  };

  return (
    <div className="sala-screen absolute inset-x-0 top-0 z-20 flex flex-col" style={{ height }}>
      <header className="flex h-[30px] shrink-0 items-center justify-between border-b border-[var(--sala-border)] px-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--sala-copper)]">
          Seleccionar widget
        </span>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer font-mono text-[10px] text-[var(--sala-text-dim)] hover:text-[var(--sala-text)]"
        >
          ESC
        </button>
      </header>
      <ul className="grid flex-1 grid-cols-2 content-start gap-1.5 overflow-y-auto p-3">
        {SALA_WIDGET_KEYS.map((key) => {
          const meta = SALA_WIDGETS[key];
          const active = key === current;
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => handleSelect(key)}
                className={`flex w-full cursor-pointer items-center gap-2 rounded border px-2 py-1.5 text-left transition-colors duration-150 ${
                  active
                    ? "border-[var(--sala-copper)] bg-[var(--sala-copper-glow)]"
                    : "border-[var(--sala-border)] bg-[var(--sala-surface)] hover:border-[var(--sala-copper)]"
                }`}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: meta.accentHex }}
                />
                <span className="truncate font-mono text-[10px] text-[var(--sala-text)]">
                  {meta.label}
                </span>
                {active && <Check className="ml-auto h-3 w-3 shrink-0 text-[var(--sala-copper)]" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
