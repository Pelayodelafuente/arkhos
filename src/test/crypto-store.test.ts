import { describe, it, expect, beforeEach } from 'vitest'
import { useCryptoStore } from '@/stores/crypto-store'
import type { CryptoAsset, CryptoDefiPosition, CryptoMonthlyPlan } from '@/types/crypto'

function makeAsset(overrides: Partial<CryptoAsset>): CryptoAsset {
  return {
    id: 'a1',
    user_id: 'u1',
    symbol: 'BTC',
    name: 'Bitcoin',
    coingecko_id: 'bitcoin',
    wallet_address: null,
    wallet_type: null,
    network: 'bitcoin' as CryptoAsset['network'],
    current_balance: 0,
    avg_buy_price_eur: 0,
    total_invested_eur: 0,
    current_price_eur: null,
    price_updated_at: null,
    is_active: true,
    notes: null,
    color: null,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  useCryptoStore.setState({ assets: [], defiPositions: [], monthlyPlan: [], transactions: [] })
})

describe('crypto-store · getAssetsWithPL', () => {
  it('devuelve [] sin activos', () => {
    expect(useCryptoStore.getState().getAssetsWithPL()).toEqual([])
  })

  it('calcula valor, P&L y peso con precio live', () => {
    useCryptoStore.setState({
      assets: [
        makeAsset({ id: 'btc', symbol: 'BTC', current_balance: 0.5, current_price_eur: 60000, total_invested_eur: 20000 }),
        makeAsset({ id: 'eth', symbol: 'ETH', current_balance: 10, current_price_eur: 2000, total_invested_eur: 25000 }),
      ],
    })
    const [btc, eth] = useCryptoStore.getState().getAssetsWithPL()

    expect(btc.current_value_eur).toBe(30000)
    expect(btc.pl_eur).toBe(10000)
    expect(btc.pl_pct).toBeCloseTo(50, 5)
    expect(btc.weight_pct).toBeCloseTo(60, 5) // 30k de 50k

    expect(eth.current_value_eur).toBe(20000)
    expect(eth.pl_eur).toBe(-5000)
    expect(eth.pl_pct).toBeCloseTo(-20, 5)
    expect(eth.weight_pct).toBeCloseTo(40, 5)
  })

  it('sin precio live: estima valor con precio medio pero P&L es null (no inventa beneficios)', () => {
    useCryptoStore.setState({
      assets: [
        makeAsset({ current_balance: 2, current_price_eur: null, avg_buy_price_eur: 1500, total_invested_eur: 3000 }),
      ],
    })
    const [a] = useCryptoStore.getState().getAssetsWithPL()
    expect(a.has_live_price).toBe(false)
    expect(a.current_value_eur).toBe(3000)
    expect(a.pl_eur).toBeNull()
    expect(a.pl_pct).toBeNull()
  })
})

describe('crypto-store · getOverview', () => {
  it('null sin activos', () => {
    expect(useCryptoStore.getState().getOverview()).toBeNull()
  })

  it('agrega totales y P&L global', () => {
    useCryptoStore.setState({
      assets: [
        makeAsset({ id: 'btc', symbol: 'BTC', current_balance: 0.5, current_price_eur: 60000, total_invested_eur: 20000 }),
        makeAsset({ id: 'usdc', symbol: 'USDC', current_balance: 1000, current_price_eur: 0.9, total_invested_eur: 950 }),
      ],
    })
    const o = useCryptoStore.getState().getOverview()!
    expect(o.total_value_eur).toBeCloseTo(30900, 2)
    expect(o.total_invested_eur).toBeCloseTo(20950, 2)
    expect(o.pl_eur).toBeCloseTo(9950, 2)
    expect(o.has_live_prices).toBe(true)
  })

  it('convierte el yield de Aave (USDC) a EUR con el precio de USDC', () => {
    useCryptoStore.setState({
      assets: [
        makeAsset({ id: 'usdc', symbol: 'USDC', current_balance: 100, current_price_eur: 0.9, total_invested_eur: 90 }),
      ],
      defiPositions: [
        {
          id: 'd1', user_id: 'u1', asset_id: 'usdc', protocol: 'aave', network: 'ethereum',
          wallet_address: null, deposited_amount: 1000, current_amount: 1050,
          apy: 5, yield_earned: 50, last_updated: null, is_active: true, created_at: '',
        } as unknown as CryptoDefiPosition,
      ],
    })
    const o = useCryptoStore.getState().getOverview()!
    expect(o.aave_yield_eur).toBeCloseTo(45, 5) // 50 USDC × 0.9
  })

  it('suma el plan mensual', () => {
    useCryptoStore.setState({
      assets: [makeAsset({ current_balance: 1, current_price_eur: 100, total_invested_eur: 100 })],
      monthlyPlan: [
        { id: 'p1', monthly_amount_eur: 150 } as unknown as CryptoMonthlyPlan,
        { id: 'p2', monthly_amount_eur: 50 } as unknown as CryptoMonthlyPlan,
      ],
    })
    expect(useCryptoStore.getState().getOverview()!.monthly_plan_eur).toBe(200)
  })
})
