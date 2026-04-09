# Instalación de MCPs — Arkhos
> Ejecutar en PowerShell desde cualquier directorio

## 1. Supabase MCP (oficial — HTTP con OAuth automático) ★ PRIORITARIO
Necesitas: tu PROJECT_REF de Supabase (Settings → General → Reference ID)

```powershell
claude mcp add --scope user --transport http supabase `
  "https://mcp.supabase.com/mcp?project_ref=TU_PROJECT_REF&features=database,development,debugging"
```
Después ejecuta: `/mcp` en Claude Code y autentícate con OAuth.

## 2. GitHub MCP (oficial — HTTP con PAT)
Necesitas: Personal Access Token de GitHub (github.com → Settings → Developer Settings → PAT)
Permisos mínimos: repo, read:org, read:user

```powershell
$PAT = "tu_github_pat_aqui"
claude mcp add-json github `
  "{`"type`":`"http`",`"url`":`"https://api.githubcopilot.com/mcp`",`"headers`":{`"Authorization`":`"Bearer $PAT`"}}" `
  --scope user
```

## 3. Playwright MCP (auditoría visual y testing)
```powershell
claude mcp add --scope user playwright -- npx -y @anthropic-ai/mcp-playwright
```

## 4. Brave Search MCP (acceso a internet desde Claude Code)
Necesitas: API key gratis en brave.com/search/api (2000 req/mes, no tarjeta)

```powershell
$env:BRAVE_API_KEY = "tu_brave_api_key"
claude mcp add --scope user brave-search -- npx -y @brave/brave-search-mcp-server
# Añadir también a tu PowerShell profile: $env:BRAVE_API_KEY = "..."
```

## 5. Actualizar Context7 (versión más reciente)
```powershell
claude mcp remove context7
claude mcp add context7 --scope user -- npx -y @upstash/context7-mcp
```

## Verificar instalación
```powershell
claude mcp list
# Debe mostrar: engram, context7, supabase, github, playwright, brave-search
```

## Variables de entorno necesarias en .env.local
Verifica que tienes estas variables:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...       ← solo para Edge Functions/Server
ANTHROPIC_API_KEY=sk-ant-...
UPSTASH_REDIS_REST_URL=...          ← necesario antes de Mercados
UPSTASH_REDIS_REST_TOKEN=...
ALPHA_VANTAGE_API_KEY=...           ← para módulo Mercados
COINGECKO_API_KEY=...               ← opcional en free tier
```
