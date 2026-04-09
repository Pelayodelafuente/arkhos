---
name: perf-audit
description: Audita el rendimiento del frontend: bundle size, imágenes, fuentes, dynamic imports, re-renders innecesarios. Activar cuando hay problemas de rendimiento o antes de un release.
context: fork
---

# Frontend Performance Audit — Arkhos

## Bundle size
```bash
pnpm build 2>&1 | grep -E "Route|First Load|kB" | head -30
```

## Dynamic imports (componentes que deberían ser lazy)
```bash
# Componentes pesados que se importan estáticamente
grep -r "import.*Canvas\|import.*Chart\|import.*Editor\|import.*Modal" src/components/ --include="*.tsx" | grep -v "dynamic\|type " | head -15
```

## Imágenes
```bash
grep -r "<img " src/ --include="*.tsx" | grep -v "// "
```

## Zustand: suscripciones completas al store
```bash
grep -rn "useUIStore()\b\|useProjectsStore()\b" src/components/ --include="*.tsx" | grep -v "state =>"
```

## Framer Motion: layout prop innecesario
```bash
grep -r "layout=" src/components/ --include="*.tsx" | wc -l
```

## Checklist de optimizaciones
- [ ] Componentes >50KB → dynamic import
- [ ] Todas las imágenes usan next/image
- [ ] Canvas y Editor cargados lazy (ya implementado en Notas)
- [ ] Selectores Zustand específicos en todos los componentes
