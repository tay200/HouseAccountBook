import { describe, expect, it } from 'vitest'
import { investChange, investSeries, isSameSnapshot, previousSnapshot, toSnapshotValues } from './snapshots'
import type { MonthlySnapshot } from './types'

const snap = (month: string, fields: Partial<MonthlySnapshot> = {}): MonthlySnapshot => ({
  id: month, month: `${month}-01`, financial: 0, real_assets: 0, debt: 0, net_worth: 0,
  invest_value: 0, invest_cost: 0, invest_realized: 0, invest_accounts: [], saved_at: `${month}-28T12:00:00Z`, ...fields,
})

describe('investChange', () => {
  it('추가 매수 300만 + 주가 상승 120만', () => {
    const c = investChange({ value: 10_000_000, cost: 9_000_000, realized: 0 }, { value: 14_200_000, cost: 12_000_000, realized: 0 })
    expect(c).toEqual({ valueDiff: 4_200_000, profit: 1_200_000, netFlow: 3_000_000 })
  })
  it('100에 산 것을 110에 팔면 수익 0, 110을 빼 간 것', () => {
    const c = investChange({ value: 110, cost: 100, realized: 0 }, { value: 0, cost: 0, realized: 10 })
    expect(c).toEqual({ valueDiff: -110, profit: 0, netFlow: -110 })
  })
})

describe('previousSnapshot', () => {
  it('지난달이 없으면 그 전 기록', () => {
    const list = [snap('2026-07'), snap('2026-08'), snap('2026-10')]
    expect(previousSnapshot(list, '2026-10')?.month).toBe('2026-08-01')
    expect(previousSnapshot(list, '2026-07')).toBeUndefined()
  })
})

describe('isSameSnapshot', () => {
  const values = toSnapshotValues('2026-10', {
    financial: 100.4, real: 0, debt: 0, net: 100.4,
    invest: { value: 50, cost: 40, realized: 0 },
    investByAccount: [{ id: 'b', name: 'B', included: true, value: 30, cost: 20, realized: 0 }, { id: 'a', name: 'A', included: false, value: 20, cost: 20, realized: 0 }],
  })
  it('반올림해서 저장하고, 계좌 순서가 달라도 같은 값으로 본다', () => {
    expect(values.financial).toBe(100)
    const saved = snap('2026-10', { ...values, invest_accounts: [...values.invest_accounts].reverse() })
    expect(isSameSnapshot(saved, values)).toBe(true)
    expect(isSameSnapshot({ ...saved, debt: 1 }, values)).toBe(false)
    expect(isSameSnapshot(undefined, values)).toBe(false)
  })
})

describe('investSeries', () => {
  const list = [
    snap('2026-08', { invest_value: 100, invest_cost: 90, invest_accounts: [{ id: 'old', name: '옛 계좌', included: true, value: 100, cost: 90, realized: 0 }] }),
    snap('2026-09', { invest_value: 200, invest_cost: 150, invest_accounts: [{ id: 'a', name: 'A', included: true, value: 200, cost: 150, realized: 0 }] }),
    snap('2026-10', { invest_value: 1, invest_cost: 1 }), // 이번 달 저장분은 지금 값으로 바뀐다
  ]
  const live = { month: '2026-10', total: { value: 300, cost: 250, realized: 5 }, accounts: [{ id: 'a', name: 'A', included: true, value: 300, cost: 250, realized: 5 }] }

  it('합계: 이번 달은 지금 값', () => {
    expect(investSeries(list, live, null).map((p) => [p.month, p.value])).toEqual([['2026-08', 100], ['2026-09', 200], ['2026-10', 300]])
  })
  it('계좌: 그 계좌가 없던 달은 건너뛴다', () => {
    expect(investSeries(list, live, 'a').map((p) => p.month)).toEqual(['2026-09', '2026-10'])
    expect(investSeries(list, live, 'old').map((p) => p.month)).toEqual(['2026-08'])
  })
})
