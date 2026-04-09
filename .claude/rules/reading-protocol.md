# Protocolo de lectura eficiente de archivos

## Regla fundamental
NUNCA leas un archivo completo si no necesitas todo su contenido.
Siempre usa Read con offset y limit para leer solo las secciones relevantes.

## Estrategia por tipo de archivo

### Archivos TypeScript/TSX (>100 líneas)
1. Lee líneas 1-25: imports y tipos exportados
2. Usa Grep para localizar la función/componente exacto
3. Lee con offset solo esa función ±10 líneas de contexto
4. Nunca leas más de 80 líneas seguidas sin justificación

### Archivos de configuración (next.config.ts, tailwind.config.ts)
- Estos son cortos, leer completo está permitido

### Migraciones SQL
- Lee solo la más reciente a menos que necesites contexto histórico
- Usa Grep para buscar nombre de tabla específica en todas las migraciones

### globals.css / styles
- Usa Grep para buscar el CSS variable o clase específica que necesitas
- No leas el archivo completo

### CLAUDE.md
- Lee con Grep la sección relevante a la tarea
- Lee completo solo al inicio de sesión (una vez)

### Stores Zustand
- Lee la interfaz del estado (primeras 30 líneas típicamente)
- Lee solo la acción específica que necesitas modificar

### package.json
- Lee solo las primeras 30 líneas (name, version, scripts)
- Usa Grep para buscar una dependencia específica

## Comandos preferidos
- `Grep pattern file` → antes de Read para localizar
- `Read file offset:N limit:30` → para leer sección específica
- `Bash "wc -l archivo"` → para saber tamaño antes de leer

## Máximos por sesión
- Máximo 3 lecturas completas de archivos >200 líneas por sesión
- Si necesitas más, estás haciendo algo mal — usa Grep primero
