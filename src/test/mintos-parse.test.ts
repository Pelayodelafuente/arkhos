import { describe, it, expect } from 'vitest'
import { parseMintosRows, EXPECTED_HEADERS } from '@/lib/mintos/parse-excel'

// Filas que imitan el "Extracto de cuenta" real de Mintos
// Columnas: Fecha · ID operación · Detalles · Volumen · Saldo · Divisa · Tipo de pago
const HEADERS = [...EXPECTED_HEADERS]

function row(
  date: string,
  volume: number,
  saldo: number,
  tipoPago: string
): unknown[] {
  return [new Date(date), `op-${date}-${volume}`, 'detalle', volume, saldo, 'EUR', tipoPago]
}

describe('parseMintosRows', () => {
  it('rechaza archivos vacíos', () => {
    const res = parseMintosRows([])
    expect(res.isValidFormat).toBe(false)
    expect(res.formatError).toContain('vacío')
  })

  it('rechaza cabeceras desconocidas', () => {
    const res = parseMintosRows([
      ['Date', 'Id', 'Details', 'Turnover', 'Balance', 'Currency', 'Payment'],
      row('2026-01-15', 100, 100, 'Depósitos'),
    ])
    expect(res.isValidFormat).toBe(false)
    expect(res.formatError).toContain('Cabeceras')
  })

  it('parsea un extracto válido con depósitos e intereses', () => {
    const res = parseMintosRows([
      HEADERS,
      row('2026-01-05', 500, 500, 'Depósitos'),
      row('2026-01-10', -480, 20, 'Inversión'),
      row('2026-01-20', 3.5, 23.5, 'Intereses recibidos'),
      row('2026-02-03', 200, 223.5, 'Depósitos'),
      row('2026-02-15', 4.2, 227.7, 'Intereses recibidos'),
      row('2026-02-28', -0.5, 227.2, 'Retención de impuestos'),
    ])

    expect(res.isValidFormat).toBe(true)
    expect(res.totalRows).toBe(6)
    expect(res.months).toEqual(['2026-01', '2026-02'])
    expect(res.periodStart).toBe('2026-01')
    expect(res.periodEnd).toBe('2026-02')

    // Depósitos: 500 + 200
    expect(res.totalDeposited).toBe(700)
    expect(res.deposits).toHaveLength(2)
    expect(res.deposits[0]).toEqual({ date: '2026-01-05', amount: 500 })

    // Acumulado de depósitos por mes
    expect(res.monthlyBreakdown[0].total_deposited_cumulative).toBe(500)
    expect(res.monthlyBreakdown[1].total_deposited_cumulative).toBe(700)

    // Interés neto feb: 4.2 - |−0.5| (taxes se almacena en valor absoluto)
    expect(res.monthlyBreakdown[1].net_interest).toBeCloseTo(3.7, 4)
    // Interés neto total: 3.5 + 3.7
    expect(res.totalNetInterest).toBeCloseTo(7.2, 4)

    // Saldo final = último Saldo del extracto
    expect(res.finalCashBalance).toBe(227.2)
  })

  it('deduplica depósitos idénticos (misma fecha y cantidad)', () => {
    const res = parseMintosRows([
      HEADERS,
      row('2026-03-01', 100, 100, 'Depósitos'),
      row('2026-03-01', 100, 200, 'Depósitos'),
    ])
    expect(res.deposits).toHaveLength(1)
    expect(res.totalDeposited).toBe(100)
  })

  it('acumula tipos de pago desconocidos sin romper', () => {
    const res = parseMintosRows([
      HEADERS,
      row('2026-01-05', 500, 500, 'Depósitos'),
      row('2026-01-06', 1, 501, 'Tipo Inventado Nuevo'),
    ])
    expect(res.isValidFormat).toBe(true)
    expect(res.unknownTypes).toEqual(['Tipo Inventado Nuevo'])
    expect(res.totalDeposited).toBe(500)
  })

  it('clasifica recompras: principal no es interés, interés de recompra sí', () => {
    const res = parseMintosRows([
      HEADERS,
      row('2026-04-02', 50, 50, 'Ingresos del principal recibidos por la recompra del préstamo'),
      row('2026-04-02', 2.5, 52.5, 'Ingresos de los intereses recibidos por la recompra del préstamo'),
    ])
    const m = res.monthlyBreakdown[0]
    expect(m.buyback_principal).toBe(50)
    expect(m.buyback_interest).toBe(2.5)
    expect(m.net_interest).toBeCloseTo(2.5, 4)
  })

  it('las comisiones restan del interés neto en valor absoluto', () => {
    const res = parseMintosRows([
      HEADERS,
      row('2026-05-10', 10, 10, 'Intereses recibidos'),
      row('2026-05-31', -1.2, 8.8, 'Mintos Core fee'),
    ])
    expect(res.monthlyBreakdown[0].commissions).toBeCloseTo(1.2, 4)
    expect(res.monthlyBreakdown[0].net_interest).toBeCloseTo(8.8, 4)
  })

  it('acepta fechas como string además de Date', () => {
    const res = parseMintosRows([
      HEADERS,
      ['2026-06-01 10:30:00', 'op1', 'd', 300, 300, 'EUR', 'Depósitos'],
    ])
    expect(res.deposits[0].date).toBe('2026-06-01')
    expect(res.months).toEqual(['2026-06'])
  })

  it('ignora filas sin fecha o sin volumen', () => {
    const res = parseMintosRows([
      HEADERS,
      ['', 'op1', 'd', 100, 100, 'EUR', 'Depósitos'],
      row('2026-07-01', 100, 200, 'Depósitos'),
    ])
    expect(res.totalRows).toBe(2)
    expect(res.totalDeposited).toBe(100)
  })
})
