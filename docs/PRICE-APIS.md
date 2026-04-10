# Configuración de APIs de Precios — Arkhos Patrimonio

## Alpha Vantage (acciones USA: NVDA, TSLA, GOOGL, META, AMZN, UBER, DWAVE, TSMC, PYPL, UNH, AMD)
1. Registrarse en alphavantage.co (gratis, no requiere tarjeta)
2. Copiar API key
3. Añadir a `.env.local`: `ALPHA_VANTAGE_API_KEY=TU_KEY`
4. Free tier: 25 requests/día, datos con retraso de 15 min
5. Premium: desde 50$/mes para datos en tiempo real sin límite

## Yahoo Finance (ETFs europeos, acciones HK/CN)
- No requiere API key para uso básico
- Rate limit: ~100 req/min por IP (suficiente para portfolio personal)
- Sufijos por bolsa:
  - `.DE` — Xetra (Frankfurt): SXR8.DE, XAIX.DE
  - `.AS` — Euronext Amsterdam: IWDA.AS, CNDX.AS, VFEM.AS...
  - `.HK` — Hong Kong Stock Exchange

## CoinGecko (cripto: BTC, ETH, USDT, SOL...)
- No requiere API key para free tier
- Free tier: 10-30 calls/min (más que suficiente)
- API endpoint: `https://api.coingecko.com/api/v3/simple/price?ids={id}&vs_currencies=eur`

## Upstash Redis (cache — RECOMENDADO para evitar rate limits)
1. Registrarse en upstash.com (gratis, 10.000 req/día)
2. Crear base de datos Redis (región EU-West-1 para menor latencia)
3. Copiar REST URL y REST Token del panel de control
4. Añadir a `.env.local`:
   ```
   UPSTASH_REDIS_REST_URL=https://...upstash.io
   UPSTASH_REDIS_REST_TOKEN=AX...
   ```

## Frecuencia de actualización por tipo de activo
| Tipo | Fuente | Intervalo | Mercado abierto |
|------|--------|-----------|-----------------|
| ETFs europeos | Yahoo Finance | 60s | 09:00-17:30 CET |
| Acciones USA | Alpha Vantage | 60s | 14:30-21:00 CET |
| Acciones HK/CN | Yahoo Finance | 60s | 02:30-09:00 CET |
| Acciones asiáticas | Yahoo Finance | 60s | Variable |
| Cripto | CoinGecko | 30s | 24/7 |
| Fondos (Indexa/Horos) | Manual | — | Actualización manual |
| P2P (Mintos) | Manual | — | Actualización manual |
| Efectivo | Manual | — | Siempre estático |

## Variables de entorno requeridas en `.env.local`
```bash
# Para acciones USA (Alpha Vantage)
ALPHA_VANTAGE_API_KEY=

# Para cache de precios (Upstash Redis) — opcional pero recomendado
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Yahoo Finance y CoinGecko no requieren API key
```

## Modo offline
Si no hay ninguna API configurada:
- El módulo funciona con precios del último seed importado
- Se muestra un banner informativo en el portfolio
- Los precios se pueden actualizar manualmente por plataforma

## Mapeo ISIN → Ticker (actualizado a Abril 2026)
Ver `src/lib/patrimonio/price-service.ts` — constante `YAHOO_TICKER_MAP`
