"use client";

import { FolderKanban } from "lucide-react";

interface ProjectsEmptyProps {
  searchQuery?: string;
}

export function ProjectsEmpty({ searchQuery }: ProjectsEmptyProps) {
  if (searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sand">
          <FolderKanban size={28} strokeWidth={1.5} className="text-text-tertiary" />
        </div>
        <h3 className="font-heading text-lg text-foreground">Sin resultados</h3>
        <p className="mt-1 text-sm text-text-tertiary">
          Sin proyectos que coincidan con &ldquo;{searchQuery}&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sand">
        <FolderKanban size={28} strokeWidth={1.5} className="text-text-tertiary" />
      </div>
      <h3 className="font-heading text-lg text-foreground">Sin proyectos</h3>
      <p className="mt-1 text-sm text-text-tertiary">
        Crea tu primer proyecto para empezar a construir
      </p>
    </div>
  );
}
