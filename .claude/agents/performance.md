---
name: performance
description: Audita y optimiza el rendimiento del frontend y backend. Invocar antes de deploys, cuando Lighthouse score baja de 85, o cuando se detectan componentes lentos.
tools: Read, Bash, Grep, Glob
context: fork
---

# Agente Performance — Arkhos

## Auditoría de bundle
```bash
# Analizar bundle size
ANALYZE=true pnpm build 2>&1 | grep -E "First Load|chunks"
# Buscar importaciones pesadas
grep -r "import \* as" src/ --include="*.tsx" --include="*.ts"
```

## Checklist de optimización React
- [ ] Imágenes: usar `next/image` con width/height explícitos
- [ ] Fuentes: verificar que están en `fonts.bunny.net` con `display: swap`
- [ ] Dynamic imports: componentes pesados con `dynamic(() => import(...), {ssr: false})`
- [ ] Memoización: `useMemo` para cálculos pesados, `useCallback` para callbacks en listas
- [ ] Zustand: selectores específicos, no suscribir al store completo
- [ ] Recharts: `<ResponsiveContainer>` con `debounce` en resize
- [ ] Framer Motion: usar `layout` prop solo cuando es necesario

## Checklist de optimización Supabase
- [ ] Queries: `select('col1,col2')` no `select('*')`
- [ ] Índices: columnas filtradas en WHERE y ORDER BY tienen índice
- [ ] N+1: no queries en bucle — usar joins o batch selects

## Output
Genera reporte con métricas antes/después y acciones concretas ordenadas por impacto.
