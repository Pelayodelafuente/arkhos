# Recetas de extracción de Patrimonio (reutilizables)

## Setup (Windows)
1. Lanzar Chrome de depuración con perfil dedicado:
   ```powershell
   Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" `
     -ArgumentList '--remote-debugging-port=9222','--user-data-dir=C:\Users\PC\chrome-arkhos','--no-first-run'
   ```
   (Chrome 136+ bloquea depuración sobre el perfil por defecto → hace falta `--user-data-dir` separado.)
2. Loguearse manualmente (incl. 2FA) en TR, Indexa, Horos, Mintos, Bit2Me en esa ventana.
3. Playwright (MCP) se engancha por CDP a `http://localhost:9222`. Verificar con `/json/version`.

## Trade Republic
- Cartera: `app.traderepublic.com/portfolio`. Posiciones = `li[id="<ISIN>"]`, nombre en `.instrumentListItem__name`. El € de la lista es **cambio diario**, NO el valor.
- Valor real por posición: navegar a `/instrument/<ISIN>` y parsear bloque "Posición": Total, Rentabilidad (€/%), Acciones, Precio de compra, % cartera.
- **Truco eficiente:** un solo `evaluate` que (a) espera el bloque con poll, (b) lo parsea, (c) hace `location.href='/instrument/<siguiente ISIN>'` al final → 1 llamada por instrumento (cadena).
- Efectivo + intereses + plan + ventas: `/profile/transactions` (header "Efectivo").

## Indexa Capital
- Exports CSV oficiales vía `fetch(..., {credentials:'include'})`:
  - Posiciones: `/es/ac/<ACC>/summary?download=positions`
  - Histórico cartera: `/es/ac/<ACC>/summary?download=portfolios`
- Resumen (valor, TWR, aportaciones) en `/es/ac/<ACC>/summary`.

## Horos
- `horosam.com/portal/#/holdings/<id>` (SPA hash). Columnas tabla: **VL · TÍTULOS · IMPORTE COMPRA · VALORACIÓN · REVALORIZACIÓN** (¡no confundir VL con títulos!). Botones Excel/Pdf disponibles.

## Mintos
- Overview: `/es/general/` (header "Valor de la cuenta"). Cartera: `/es/portfolio/`. Extracto: `/es/account-statement-es/` (export .csv/.xlsx/.pdf). Ojo: rutas tipo `/es/overview/` y `/es/account-statement/` dan 404.

## Bit2Me
- Dashboard `/dashboard`, Wallet `/portfolio`, Actividad `/portfolio/activity`.
