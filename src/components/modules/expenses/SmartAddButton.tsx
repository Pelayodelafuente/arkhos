"use client"

import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui"
import { useUIStore } from "@/stores/ui-store"

// TODO: Smart Add — el usuario escribe 'Netflix 15.49 mensual dia 1'
// y la API (Gemini/Claude) parsea y autocompleta el formulario.
// Subflow implementa esto en components/smart-add/ con @google/generative-ai.
// En Arkhos usar la Claude API desde src/lib/ai/smart-add.ts

export function SmartAddButton() {
  const addToast = useUIStore((s) => s.addToast)

  const handleClick = () => {
    addToast("Smart Add estara disponible proximamente", "info")
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleClick} className="border border-border">
      <Sparkles size={14} strokeWidth={1.75} />
      <span className="hidden sm:inline">Smart Add</span>
    </Button>
  )
}
