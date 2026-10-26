import { describe, expect, it } from 'vitest'
import { goalPeriod, goalProgress, savedOf } from './goals'
import type { BankAccount, SavingGoal } from './types'

const goal = (fields: Partial<SavingGoal>): SavingGoal => ({
  id: 'g', name: '명절', kind: 'sinking', target_amount: 1_200_000, start_month: '2026-01-01', due_month: '2026-12-01',
  repeat_yearly: false, source: 'manual', saved_amount: 0, book: null, bank_account_id: null, memo: null, ...fields,
})

describe('goalProgress', () => {
  it('월 필요액 = 남은 금액 ÷ 남은 개월(이번 달 포함)', () => {
    // 10월: 남은 달 10·11·12 = 3개월, 남은 돈 900,000
    const p = goalProgress(goal({}), 300_000, '2026-10')
    expect(p.monthsLeft).toBe(3)
    expect(p.monthlyNeed).toBe(300_000)
  })
  it('지난달까지 모았어야 할 돈보다 적으면 뒤처짐', () => {
    // 1~9월 9개월이 지났으니 900,000 을 모았어야 한다
    expect(goalProgress(goal({}), 300_000, '2026-10').status).toBe('behind')
    expect(goalProgress(goal({}), 900_000, '2026-10').status).toBe('onTrack')
    expect(goalProgress(goal({}), 1_200_000, '2026-10').status).toBe('done')
  })
  it('시작한 달에는 아직 모을 돈이 없으니 순조로움', () => {
    expect(goalProgress(goal({ start_month: '2026-10-01' }), 0, '2026-10').status).toBe('onTrack')
  })
  it('기한이 지나면 월 필요액 0, 기한 지남', () => {
    const p = goalProgress(goal({ due_month: '2026-09-01' }), 100, '2026-10')
    expect(p.status).toBe('overdue')
    expect(p.monthlyNeed).toBe(0)
  })
})

describe('goalPeriod', () => {
  it('매년 반복이면 기한이 지난 뒤 다음 해 기간으로', () => {
    const g = goal({ start_month: '2025-10-01', due_month: '2026-02-01', repeat_yearly: true })
    expect(goalPeriod(g, '2026-02')).toEqual({ start: '2025-10', due: '2026-02' })
    expect(goalPeriod(g, '2026-03')).toEqual({ start: '2026-10', due: '2027-02' })
  })
})

describe('savedOf', () => {
  const accounts = [{ id: 'acc', balance: 700_000 } as BankAccount]
  const books = new Map([['비상금', 400_000]])
  it('모은 돈을 어디서 읽을지 고른다', () => {
    expect(savedOf(goal({ saved_amount: 50_000 }), books, accounts)).toBe(50_000)
    expect(savedOf(goal({ source: 'book', book: '비상금' }), books, accounts)).toBe(400_000)
    expect(savedOf(goal({ source: 'account', bank_account_id: 'acc' }), books, accounts)).toBe(700_000)
    expect(savedOf(goal({ source: 'account', bank_account_id: 'gone' }), books, accounts)).toBe(0)
  })
})
