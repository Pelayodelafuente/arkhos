"use client";

import { useState } from "react";
import { Search, Check } from "lucide-react";
import { ICON_CATEGORIES, type IconCategory } from "@/types/projects";
import { ProjectIcon, ICON_MAP } from "./project-icon";

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

const CATEGORIES = Object.keys(ICON_CATEGORIES) as IconCategory[];

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [activeTab, setActiveTab] = useState<IconCategory>(CATEGORIES[0]);
  const [search, setSearch] = useState("");

  const filteredIcons = search
    ? Object.keys(ICON_MAP).filter((name) =>
        name.toLowerCase().includes(search.toLowerCase())
      )
    : [...ICON_CATEGORIES[activeTab]];

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-text-secondary">
        Icono
      </label>

      {/* Search */}
      <div className="relative mb-2">
        <Search
          size={14}
          strokeWidth={1.75}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
        <input
          type="text"
          placeholder="Buscar icono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-border bg-card py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
        />
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="mb-2 flex gap-1 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveTab(cat)}
              className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors ${
                activeTab === cat
                  ? "bg-accent text-white"
                  : "bg-sand text-text-secondary hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Icon grid */}
      <div className="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto rounded-lg border border-border bg-card p-2">
        {filteredIcons.map((iconName) => {
          const isSelected = value === iconName;
          return (
            <button
              key={iconName}
              type="button"
              onClick={() => onChange(iconName)}
              className={`relative flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                isSelected
                  ? "bg-accent/15 text-accent"
                  : "text-text-secondary hover:bg-sand hover:text-foreground"
              }`}
              title={iconName}
            >
              <ProjectIcon icon={iconName} size={18} />
              {isSelected && (
                <Check
                  size={8}
                  strokeWidth={3}
                  className="absolute right-0.5 top-0.5 text-accent"
                />
              )}
            </button>
          );
        })}
        {filteredIcons.length === 0 && (
          <p className="col-span-8 py-4 text-center text-xs text-text-tertiary">
            Sin resultados
          </p>
        )}
      </div>
    </div>
  );
}
