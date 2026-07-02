# Arkhos 2.0 — Plan de mejoras (diseño + producto + funcionalidades)

## Contexto

Pelayo quiere llevar Arkhos (su centro de mando personal: Dashboard, Proyectos, Gastos,
Notas, Patrimonio, Mercados, Cronos) al siguiente nivel antes de cambiar a un modelo
más potente (Fable 5) para ejecutar la implementación. Este documento es un **roadmap
de producto/diseño**, no un plan de implementación técnica línea a línea — cada bloque
se convertirá en su propio Plan Mode (o `/sdd-new`) cuando se decida ejecutarlo.

Investigué qué hacen las mejores apps del mundo en cada categoría que ya cubre Arkhos
(Kubera/Monarch/Copilot Money en patrimonio, Linear/Things3/Todoist en proyectos,
Obsidian/Notion/Craft en notas, Notion Calendar/Sunsama/Fantastical en agenda) y las
tendencias de diseño 2026 (bento grids, dark-first, IA-nativa, low-stimulus UI). Fuentes
al final del documento.

Todo lo propuesto respeta lo ya decidido: brand claro/flat de Arkhos, sin keyboard
shortcuts en Notas (feedback ya dado por Pelayo), stack actual (Next.js 16, Supabase,
Zustand, Tailwind v4, Anthropic), sin staging, sin historial IA persistente (descartado).

Cada idea lleva una etiqueta de esfuerzo: **[S]** rápido (días), **[M]** medio (1-2
semanas), **[L]** grande (módulo nuevo o rediseño mayor).

---

## 1. Diseño y UX transversal (afecta a toda la app)

- **[M] Rediseño Dashboard a Bento Grid**: sustituir el layout actual por tarjetas
  modulares de tamaño variable donde el tamaño refleja *importancia* del dato, no
  volumen (patrón dominante en dashboards 2026). Tile hero (1-2 números clave:
  patrimonio total, gasto del mes) + tiles secundarios.
- **[M] Widgets personalizables**: permitir a Pelayo reordenar/ocultar tarjetas del
  Dashboard (drag-and-drop, persistido en `user_settings` o localStorage). Cada módulo
  expone un "widget" reusable para Dashboard y para un futuro "Hoy" unificado.
- **[S] Modo oscuro real**: hoy el brand es 100% claro. Añadir variante dark de las
  CSS variables (`globals.css`) respetando la estética flat sin sombras. +80% de
  usuarios móviles tienen dark mode por defecto — hoy Arkhos "fuerza" claro en móvil.
- **[S] Quick Capture universal**: extender el `CommandPalette` (⌘K) con un modo
  "captura rápida" tipo Notion/Things: desde cualquier pantalla, crear gasto/nota/
  tarea/evento sin cambiar de módulo, con parsing de lenguaje natural (ya existe la
  infraestructura de IA NL en Cronos — reutilizar patrón).
- **[S] Ritual "Hoy" (estilo Sunsama)**: pantalla de inicio de día que agrega: eventos
  de Cronos, tareas de Proyectos con deadline, alertas de Mercados/Patrimonio, gasto
  del día — ya identificado como mejora futura de Cronos ("Widget Hoy en Dashboard"),
  aquí se eleva a ritual completo con checklist de cierre de día.
- **[S] Low-stimulus mode / Focus mode**: toggle que oculta widgets secundarios,
  animaciones y notificaciones — para sesiones de trabajo profundo (coherente con la
  tendencia "low-stimulus UI" 2026 y con el estilo flat/whitespace ya definido).
- **[M] Búsqueda semántica global**: el ⌘K actual es de comandos; añadir búsqueda por
  contenido (notas, proyectos, transacciones) con embeddings — permite preguntas tipo
  "¿dónde apunté lo de la hipoteca?".
- **[S] Micro-interacciones consistentes**: ya existe `feedback_button_hover_premium.md`
  (hover con scale/lift/glow) — auditar que todos los módulos lo cumplan, extender a
  transiciones de carga (skeletons ya parciales) y a estados vacíos con ilustraciones
  ligeras en vez de texto plano.

## 2. IA / Copiloto (transversal, hoy solo en Dashboard con tool-use)

- **[M] Copiloto global cross-módulo**: hoy el tool-use vive en el Dashboard
  (`src/lib/ai/models.ts`). Extenderlo para que desde cualquier módulo se puedan
  ejecutar acciones NL ("apunta 40€ de gasolina", "crea tarea para el viernes",
  "¿cuánto llevo invertido en cripto?") — un único endpoint de intención + routing a
  las tool functions ya existentes por módulo.
- **[S] Briefing diario generado por IA**: resumen matutino (push o en el ritual "Hoy")
  con 3-4 líneas: qué venció ayer, qué hay hoy, alerta si un gasto se disparó, si
  Mercados tiene algo relevante en la watchlist.
- **[M] Digest semanal**: informe automático (email o notificación) los domingos:
  resumen financiero, proyectos avanzados/estancados, próxima semana en Cronos.
- **[M] Detección proactiva de anomalías**: la IA ya tiene acceso a datos de Gastos/
  Patrimonio vía tool-use — añadir un job (cron) que detecte gasto anómalo, suscripción
  duplicada, o desviación de presupuesto y genere una alerta in-app (reutilizar
  `AlertsFeed` de Mercados como patrón).
- **[L] Modo "pregunta sobre todo"**: RAG ligero sobre notas + proyectos + histórico de
  gastos para responder preguntas de contexto largo ("¿qué decidí sobre el simulador de
  Indexa el mes pasado?"). Requiere decidir almacenamiento de embeddings (pgvector en
  Supabase, ya disponible como extensión Postgres).

## 3. Patrimonio (referencia: Kubera, Monarch, Copilot Money)

- **[S] Comparador vs. índices**: overlay en `GlobalEvolutionChart` comparando tu TWR
  vs. S&P 500 / MSCI World / MSCI ACWI — responde "¿le estoy ganando al mercado?".
- **[M] Multi-divisa real**: Kubera destaca por soportar ver el patrimonio en distintas
  divisas (útil si hay activos en USD/cripto). Arkhos ya normaliza a EUR — añadir
  toggle de divisa de visualización con tasas FX (ya se usa FRED/CoinGecko).
- **[M] Simulador de escenarios ("¿y si...?")**: ya existen simuladores TR/Indexa con
  params en localStorage — unificar en un simulador de patrimonio total: "¿y si dejo de
  aportar 6 meses?", "¿y si el mercado cae 20%?". Estilo Kubera/Monarch "what-if".
- **[S] Alertas de rebalanceo automáticas**: cron que compare allocation actual vs.
  objetivo (ya hay `AllocationBars`/`AllocationDonut`) y dispare alerta si se desvía
  >X puntos — hoy es manual.
- **[M] Informe mensual automático**: PDF o email generado el día 1 con evolución,
  rentabilidad, allocation — mecánico, sin intervención.
- **[L] Snapshots diarios (no solo mensuales)**: ya identificado en `PENDING-FIXES.md`
  como bloqueante para Max Drawdown real y correlación entre activos — requiere un cron
  diario de precios y ampliar el modelo de snapshot. Es la base para varias features
  avanzadas (drawdown, correlación, Sharpe más preciso).
- **[S] FIRE / retirement calculator**: dado el patrón de ahorro/inversión ya modelado,
  una proyección "cuándo alcanzo la independencia financiera" es una extensión natural
  del simulador de proyección existente.

## 4. Gastos (referencia: Copilot Money, Monarch)

- **[S] Presupuestos con alertas proactivas**: hoy Gastos es principalmente registro;
  añadir presupuesto por categoría + aviso in-app/push al 80% y 100% consumido.
  (`expense_categories` ya existe en el schema).
- **[M] Categorización automática por IA**: al crear un gasto, sugerir categoría por
  patrón de descripción/importe (tool-use ligero, sin necesidad de ML custom).
- **[S] Detección de suscripciones duplicadas/olvidadas**: ya hay tabla `subscriptions`
  — cruzar con Mercados/Patrimonio para detectar solapes o subidas de precio no vistas.
- **[M] Vista "cashflow calendar"**: calendario mensual con gasto/ingreso por día
  (patrón Copilot Money) — reutiliza el motor de calendario ya construido en Cronos.
- **[S] Comparativa mes a mes con insight IA**: en vez de solo gráficos, una frase
  generada ("Este mes gastaste 120€ más en restaurantes que la media de los últimos 3
  meses") junto al gráfico existente.

## 5. Proyectos (referencia: Linear, Things 3, Todoist)

- **[M] Vista Timeline/Gantt**: Proyectos v2 ya tiene fases/tareas — Linear-style
  timeline ayudaría a ver solapes y dependencias, algo que el Kanban actual no muestra.
- **[S] Dependencias entre tareas**: bloquear/desbloquear tareas según otras — encaja
  con el modelo de `tasks` ya existente, es una columna FK + validación en UI.
- **[M] Time-tracking con Pomodoro**: ya existe `time_entries` (migración 010) — falta
  un temporizador Pomodoro integrado en la UI que alimente esas entradas automáticamente.
- **[S] Plantillas de proyecto potenciadas por IA**: `project_templates` ya existe —
  añadir generación de plantilla completa (fases + tareas) a partir de una descripción
  en lenguaje natural.
- **[M] Integración GitHub**: dado que Pelayo es desarrollador, vincular proyectos a
  repos y mostrar issues/PRs abiertos como tareas sincronizadas (vía MCP GitHub ya
  disponible en el entorno de Claude Code, o API GitHub directa server-side).

## 6. Notas (referencia: Obsidian, Notion, Craft)

- **[M] Backlinks + graph view real**: Arkhos ya tiene Canvas/Grafo (mencionado en
  memoria `notas_canvas_v2`) — llevarlo al patrón Obsidian: enlaces automáticos entre
  notas por `[[wikilink]]` y un grafo de conexión real, no solo espacial.
- **[S] Sugerencias de conexión por IA**: al escribir una nota, la IA sugiere notas
  relacionadas existentes (embeddings, mismo mecanismo que la búsqueda semántica del
  punto 1).
- **[S] Modo Focus/Zen**: editor a pantalla completa sin sidebar ni chrome — común en
  Craft/Obsidian para escritura larga.
- **[M] Notas de voz con transcripción**: grabar audio y transcribir a texto (Whisper o
  equivalente) — casa bien con "captura rápida" del punto 1.
- **[S] Historial de versiones**: TipTap soporta extensiones de historial — permitir
  volver a una versión anterior de una nota (hoy no hay undo persistente más allá de la
  sesión de edición).
- Explícitamente **NO** añadir keyboard shortcuts en Notas — feedback ya dado por
  Pelayo (`feedback_no_keyboard_shortcuts.md`).

## 7. Mercados (referencia: Bloomberg-lite, TradingView)

- **[S] Resumen de noticias relevantes a watchlist por IA**: cruzar activos en
  watchlist con headlines (vía API de noticias o scraping ligero) y resumir en 2-3
  líneas — hoy Mercados es solo precios/indicadores, sin contexto cualitativo.
- **[M] Comparador de carteras hipotéticas**: "¿qué habría pasado si en vez de X
  hubiera comprado Y?" — usa los mismos datos históricos que ya se cargan para Pulso/
  Macro.
- **[S] Correlación entre activos de la watchlist**: matriz simple de correlación
  (depende de tener series históricas ya cargadas, más ligero que la correlación de
  Patrimonio del punto 3 porque aquí los precios de mercado sí están disponibles).
- **[S] Backtesting simple de alertas**: cuando se dispara una alerta de precio, guardar
  el resultado a N días para ver si "hubiera merecido la pena" actuar.

## 8. Cronos / Agenda (completar lo ya identificado + nuevo)

- **[S] Widget "Hoy en Cronos" en Dashboard** — ya en el backlog de Cronos, se resuelve
  junto con el rediseño Bento del punto 1.
- **[M] Ritual de planificación diaria estilo Sunsama** — ya en el backlog de Cronos;
  aquí se integra con el "Hoy" transversal del punto 1 en vez de ser algo aislado.
- **[S] Recordatorios push para eventos recurrentes** — el cron v1 solo cubre eventos
  únicos, pendiente ya anotado.
- **[M] Time-blocking sugerido por IA**: dado que ya hay auto-scheduling, un paso más
  es que la IA proponga bloques de foco para tareas de Proyectos directamente en el
  calendario (cierra el círculo Proyectos↔Cronos).

## 9. Infraestructura / calidad (soporte a todo lo anterior)

- **[S] pgvector en Supabase**: base necesaria para búsqueda semántica (punto 1),
  sugerencias de notas (punto 6) y RAG (punto 2) — una única pieza de infraestructura
  que desbloquea tres features.
- **[S] Exportación de datos completa**: botón "exportar todo mi Arkhos" (JSON/CSV) por
  módulo — importante para un centro de mando personal, hoy solo existe export puntual
  en Mercados/Gastos.
- **[M] App nativa ligera (Capacitor/PWA mejorada)**: la PWA ya existe (sw.js, /offline)
  — evaluar Capacitor para notificaciones nativas más fiables en iOS que el Web Push
  actual (que depende de "añadir a inicio").
- **[S] Autenticación biométrica**: Face ID/Touch ID vía WebAuthn como capa adicional
  a MFA TOTP, mejora fricción de acceso diario sin bajar seguridad.

## 10. Qué NO tocar / simplificar

- No proponer módulos nuevos completos sin decisión previa de Pelayo (p.ej. un módulo
  de Hábitos/Salud sería una opción de "gran apuesta" [L], pero se marca como pregunta
  abierta, no como recomendación cerrada, porque Cronos ya cubre buena parte del
  terreno de planificación diaria).
- No romper el flat design / ausencia de sombras y degradados — todas las ideas de
  diseño (bento, dark mode, focus mode) deben implementarse solo con Tailwind utilities
  + CSS variables de `globals.css`, igual que hoy.
- No añadir historial IA persistente ni staging — ya descartado explícitamente por
  Pelayo en la auditoría global.

---

## Priorización sugerida para el arranque con Fable 5

1. **Fundamentos rápidos de alto impacto [S]**: dark mode, Quick Capture en ⌘K, ritual
   "Hoy" v1 (solo agregación, sin ritual completo), presupuestos con alertas en Gastos,
   comparador vs. índices en Patrimonio.
2. **Bloque de IA transversal [M]**: pgvector + búsqueda semántica + copiloto
   cross-módulo — desbloquea features de Notas, Gastos y Patrimonio a la vez.
3. **Rediseño Bento del Dashboard [M]** una vez estén los widgets base de "Hoy" y las
   nuevas alertas, para no rediseñar dos veces.
4. **Bloques grandes [L]** (snapshots diarios de Patrimonio, graph view real de Notas,
   integración GitHub en Proyectos) como iniciativas independientes, una por sesión.

## Verificación

Este documento no cambia código — no aplica verificación técnica. Al aprobarse, cada
bloque priorizado debe pasar por su propio ciclo: Plan Mode (o `/sdd-new`) → implementar
→ `tsc --noEmit` + tests + build → `mem_save` — siguiendo el protocolo de sesión ya
definido en `.claude/rules/session-protocol.md`.

---

### Fuentes consultadas
- [Kubera App Review 2026](https://www.wallstreetzen.com/blog/kubera-app-review/)
- [Copilot Money](https://www.copilot.money/)
- [8 Best Net-Worth Tracker Apps for 2026](https://wallethub.com/best-net-worth-tracker)
- [Best Notion Alternatives 2026 — Nuclino](https://www.nuclino.com/alternatives/notion-alternatives)
- [Obsidian vs Notion 2026](https://tech-insider.org/obsidian-vs-notion-2026/)
- [Todoist vs Linear 2026](https://www.sollmannkann.com/project-management-and-notes/todoist-vs-linear/)
- [Top 10 Task Management Apps 2026](https://guptadeepak.com/tools/top-10-task-management-apps-2026/)
- [Best Calendar Apps 2026 — Efficient App](https://efficient.app/best/calendar)
- [Notion Calendar / Sunsama / Fantastical comparison — Morgen](https://www.morgen.so/blog-posts/digital-calendar-planner)
- [12 Product Design Trends for 2026 — UX Pilot](https://uxpilot.ai/blogs/product-design-trends)
- [Bento Grid Dashboard Design 2026 — Orbix](https://www.orbix.studio/blogs/bento-grid-dashboard-design-aesthetics)
- [App Design Trends 2026 — Intuitia Tech](https://www.intuitia.tech/blog/app-design-trends)
