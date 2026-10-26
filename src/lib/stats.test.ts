import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'
import { parseTags, shiftMonth } from './format'
import { budgetCarry, budgetUsage, consumptionByMonth, forecastMonthEnd, isBigSpend, monthSummary, noSpendStats } from './stats'
import type { Transaction } from './types'

const tx = (fields: Partial<Transaction>): Transaction => ({
  id: 'x', date: '2026-10-01', type: 'expense', kind: 'variable', amount: 0, discount: 0,
  category_id: null, payment_method_id: null, member_id: null, memo: null, recurring_id: null, tags: [], ...fields,
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
      budget: 900_000, spent: 300_000, left: 600_000, pending: 0, daysLeft: 7, perDay: 85_714,
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

describe('budgetUsage 반복 지출', () => {
  it('아직 안 나간 반복 지출을 하루 금액에서 미리 뺀다', () => {
    const u = budgetUsage([{ category_id: 'food', amount: 600_000 }], new Map([['food', 250_000]]), '2026-10', '2026-10-25', 70_000)
    // (350,000 − 70,000) ÷ 7일
    expect(u.left).toBe(350_000)
    expect(u.perDay).toBe(40_000)
  })
})

describe('budgetCarry', () => {
  const majorOf = (t: Transaction) => t.category_id ?? ''
  const spentIn = consumptionByMonth(
    [
      tx({ date: '2026-08-03', category_id: 'cloth', amount: 20_000 }),
      tx({ date: '2026-09-10', category_id: 'cloth', amount: 150_000 }),
      // 저축성 지출은 쓴 돈이 아니므로 빠진다
      tx({ date: '2026-09-11', category_id: 'cloth', kind: 'saving', amount: 999_999 }),
      tx({ date: '2026-09-12', category_id: 'food', amount: 100_000 }),
    ],
    majorOf,
  )
  const budgets = [
    { month: '2025-12-01', category_id: 'cloth', amount: 100_000 }, // 작년은 이월하지 않음
    { month: '2026-08-01', category_id: 'cloth', amount: 100_000 },
    { month: '2026-09-01', category_id: 'cloth', amount: 100_000 },
    { month: '2026-10-01', category_id: 'cloth', amount: 100_000 }, // 이번 달 자신은 빠짐
    { month: '2026-09-01', category_id: 'food', amount: 300_000 }, // 이월을 끈 카테고리
  ]

  it('같은 해 지난달까지 (예산 − 소비)를 더한다. 초과분도 넘어간다', () => {
    // 8월 +80,000, 9월 −50,000
    expect(budgetCarry(budgets, spentIn, '2026-10', new Set(['cloth']))).toEqual(new Map([['cloth', 30_000]]))
  })
  it('1월은 새로 시작한다', () => {
    expect(budgetCarry(budgets, spentIn, '2026-01', new Set(['cloth'])).size).toBe(0)
  })
})

describe('forecastMonthEnd', () => {
  it('변동지출 하루 평균으로 남은 날을 채우고 반복 지출을 더한다', () => {
    // 10월 10일까지 소비 500,000 (그중 변동 200,000 → 하루 20,000 × 남은 21일 = 420,000) + 예정 100,000
    expect(forecastMonthEnd({ spent: 500_000, variable: 200_000, pending: 100_000, month: '2026-10', today: '2026-10-10' })).toBe(1_020_000)
  })
  it('다른 달이면 null', () => {
    expect(forecastMonthEnd({ spent: 1, variable: 1, pending: 0, month: '2026-09', today: '2026-10-10' })).toBeNull()
  })
})

describe('parseTags', () => {
  it('공백·쉼표로 나누고 # 을 떼고 중복을 없앤다', () => {
    expect(parseTags('#제주여행  #가족, 이사 #제주여행')).toEqual(['제주여행', '가족', '이사'])
    expect(parseTags('   ')).toEqual([])
  })
})

describe('isBigSpend', () => {
  it('기준 금액 이상인 변동지출만', () => {
    expect(isBigSpend(tx({ amount: 100_000 }), 100_000)).toBe(true)
    expect(isBigSpend(tx({ amount: 99_999 }), 100_000)).toBe(false)
    expect(isBigSpend(tx({ amount: 500_000, kind: 'fixed' }), 100_000)).toBe(false)
    expect(isBigSpend(tx({ amount: 500_000, type: 'income', kind: 'extra' }), 100_000)).toBe(false)
  })
})

describe('noSpendStats', () => {
  // 10월: 3일·7일에 지출, 오늘은 10일 → 1~9일 중 무지출 7일, 최장 연속 3일(4~6일), 지금 연속 2일(8~9일)
  const spent = new Map([['2026-10-03', 5000], ['2026-10-07', 12000]])
  it('이번 달: 어제까지 센다', () => {
    expect(noSpendStats('2026-10', spent, '2026-10-10', true)).toEqual({ days: 7, current: 2, best: 3 })
  })
  it('지난달: 말일까지 센다', () => {
    // 9월 전체 무지출 30일
    expect(noSpendStats('2026-09', new Map(), '2026-10-10', true)).toEqual({ days: 30, current: 30, best: 30 })
  })
  it('기록이 없는 달은 0', () => {
    expect(noSpendStats('2026-09', new Map(), '2026-10-10', false)).toEqual({ days: 0, current: 0, best: 0 })
  })
})
