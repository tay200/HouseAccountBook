import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'
import { shiftMonth } from './format'
import { monthSummary } from './stats'
import type { Transaction } from './types'

const tx = (fields: Partial<Transaction>): Transaction => ({
  id: 'x', date: '2026-10-01', type: 'expense', kind: 'variable', amount: 0, discount: 0,
  category_id: null, payment_method_id: null, member_id: null, memo: null, ...fields,
})

describe('monthSummary', () => {
  it('수입·지출·저축성·소비성·저축률', () => {
    const s = monthSummary([
      tx({ type: 'income', kind: 'fixed', amount: 3_000_000 }),
      tx({ kind: 'saving', amount: 1_000_000 }),
      tx({ kind: 'variable', amount: 157_000 }),
    ])
    expect(s).toEqual({ income: 3_000_000, expense: 1_157_000, saving: 1_000_000, consumption: 157_000, balance: 1_843_000, savingRate: 1 / 3 })
  })
  it('수입이 없으면 저축률은 null', () => {
    expect(monthSummary([tx({ amount: 1000 })]).savingRate).toBeNull()
  })
})

describe('shiftMonth', () => {
  it('연도 경계를 넘는다', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-10', -12)).toBe('2025-10')
  })
})

describe('toCsv', () => {
  it('쉼표·따옴표·줄바꿈이 있는 칸은 따옴표로 감싼다', () => {
    const csv = toCsv([{ a: '김밥, 라면', b: '그는 "안녕"', c: null }])
    expect(csv.slice(1)).toBe('a,b,c\r\n"김밥, 라면","그는 ""안녕""",')
  })
})
