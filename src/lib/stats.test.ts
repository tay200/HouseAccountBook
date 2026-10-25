import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'
import { shiftMonth } from './format'
import { budgetUsage, monthSummary } from './stats'
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

describe('budgetUsage', () => {
  const budgets = [
    { category_id: 'food', amount: 600_000 },
    { category_id: 'life', amount: 300_000 },
  ]
  // 예산을 정하지 않은 'etc' 지출은 예산 대비 계산에서 빠진다
  const spent = new Map([['food', 250_000], ['life', 50_000], ['etc', 99_999]])

  it('이번 달이면 오늘 포함 남은 일수로 나눈다', () => {
    // 10월은 31일 → 25일부터 남은 날은 7일
    expect(budgetUsage(budgets, spent, '2026-10', '2026-10-25')).toEqual({
      budget: 900_000, spent: 300_000, left: 600_000, daysLeft: 7, perDay: 85_714,
    })
  })
  it('마지막 날은 남은 예산 전부', () => {
    expect(budgetUsage(budgets, spent, '2026-02', '2026-02-28').daysLeft).toBe(1)
  })
  it('다른 달이면 하루 금액이 없다', () => {
    const u = budgetUsage(budgets, spent, '2026-09', '2026-10-25')
    expect(u.daysLeft).toBeNull()
    expect(u.perDay).toBeNull()
  })
  it('초과하면 하루 금액은 0', () => {
    const u = budgetUsage([{ category_id: 'food', amount: 100_000 }], spent, '2026-10', '2026-10-01')
    expect(u.left).toBe(-150_000)
    expect(u.perDay).toBe(0)
  })
})
