---
name: design
description: Verifica la consistencia del design system de Arkhos. Detecta colores incorrectos, fuentes no del brand, espaciados inconsistentes. Activar cuando se hacen cambios visuales o para auditoría de consistencia.
context: fork
---

# Design System Verifier — Arkhos

## Paleta de módulos (verificar que se usa correctamente)
- Proyectos: var(--module-proyectos) #C4704A — NO crimson, NO naranja generic
- Mercados: var(--module-mercados) #7260C4
- Patrimonio: var(--module-patrimonio) #2E7D6B
- Gastos: var(--module-gastos) #3B78B0 — NO crimson #5f1b29
- Notas: var(--module-notas) #B07A3A

## Verificaciones automáticas

```bash
echo "=== Colores hex hardcodeados ==="
grep -r "#[0-9a-fA-F]\{3,6\}" src/components/ --include="*.tsx" | grep "className\|style=" | head -20

echo "=== Colores hex en globals.css que no son variables ==="
grep -n "#[0-9a-fA-F]\{3,6\}" src/app/globals.css | grep -v ":" | head -10

echo "=== Uso correcto de CSS variables de módulo ==="
grep -r "var(--module-" src/ --include="*.tsx" --include="*.css" | wc -l
echo "Usos de var(--module-*)"

echo "=== Componentes sin rounded-xl (cards) o rounded-md (inputs) ==="
grep -r "rounded-\[" src/components/ --include="*.tsx" | head -10
```

## Generar reporte de inconsistencias con fix sugerido
