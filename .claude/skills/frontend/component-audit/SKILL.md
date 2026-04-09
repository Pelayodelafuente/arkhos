---
name: component-audit
description: Audita componentes React del proyecto buscando problemas de rendimiento, accesibilidad, TypeScript y consistencia con el design system. Activar cuando se pide revisar componentes o antes de un refactor de UI.
context: fork
---

# Component Audit — Arkhos

## Buscar problemas comunes

```bash
echo "=== Colores hardcodeados (debe usar CSS variables) ==="
grep -r "#[0-9a-fA-F]\{3,6\}" src/components/ --include="*.tsx" | grep -v "comment\|//\|globals" | head -20

echo "=== any types en props ==="
grep -r ": any\b\|as any\b" src/components/ --include="*.tsx" | grep -v "// eslint-disable"

echo "=== useEffect para fetching ==="
grep -r "useEffect.*fetch\|fetch.*useEffect" src/components/ --include="*.tsx"

echo "=== Imágenes sin next/image ==="
grep -r "<img " src/components/ --include="*.tsx" | grep -v "// "

echo "=== Stores completos (debe usar selectores) ==="
grep -rn "useUIStore()\|useProjectsStore()\|useExpensesStore()\|useNotesStore()" src/components/ --include="*.tsx" | grep -v "state =>"

echo "=== Falta aria-label en iconos ==="
grep -r "LucideIcon\|<.*Icon" src/components/ --include="*.tsx" | grep -v "aria-\|//\|import" | head -10
```

## Generar reporte
Para cada problema encontrado: archivo, línea, descripción, fix recomendado.
