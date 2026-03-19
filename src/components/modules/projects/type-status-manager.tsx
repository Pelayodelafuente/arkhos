"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal, Button, Input } from "@/components/ui";
import { ProjectIcon } from "./project-icon";

// ─── Color picker presets ─────────────

const COLOR_PRESETS = [
  "#8AAC7E", "#C87A8A", "#C9A96E", "#6B6F62",
  "#7C9B5C", "#9B8ABF", "#BF7A7A", "#5C8F9B",
  "#7AAC8E", "#9B6B8A", "#BFA86E", "#5CBFAF",
];

const DEFAULT_ICONS_FOR_TYPES = [
  "Globe", "Terminal", "Code", "Smartphone", "Pen", "Box",
  "Briefcase", "Rocket", "Database", "Layers",
];

// ─── Inline select with "new" button ──

interface TypeSelectProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  onCreateNew: (name: string, extra: { icon?: string; color?: string }) => Promise<void>;
  mode: "type" | "status";
}

export function TypeStatusSelect({
  label,
  value,
  options,
  onChange,
  onCreateNew,
  mode,
}: TypeSelectProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("Box");
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0]);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    await onCreateNew(newName.trim(), {
      icon: mode === "type" ? newIcon : undefined,
      color: newColor,
    });
    setSaving(false);
    setShowCreate(false);
    setNewName("");
    setNewIcon("Box");
    setNewColor(COLOR_PRESETS[0]);
    onChange(newName.trim());
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-text-secondary">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 appearance-none rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-md border border-border bg-card text-text-tertiary transition-colors hover:border-accent hover:text-accent"
          title={`Nuevo ${mode === "type" ? "tipo" : "estado"}`}
        >
          <Plus size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Mini-modal for creating new type/status */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={mode === "type" ? "Nuevo tipo de proyecto" : "Nuevo estado"}
        className="max-w-sm"
      >
        <div className="space-y-3">
          <Input
            label="Nombre"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={mode === "type" ? "Ej: Mobile, API..." : "Ej: En revisión..."}
          />

          {/* Icon selector (only for types) */}
          {mode === "type" && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Icono
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_ICONS_FOR_TYPES.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setNewIcon(iconName)}
                    className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                      newIcon === iconName
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-text-secondary hover:border-accent"
                    }`}
                  >
                    <ProjectIcon icon={iconName} size={16} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color selector */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${
                    newColor === color
                      ? "scale-110 border-foreground"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowCreate(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              loading={saving}
              onClick={handleCreate}
            >
              Crear
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
