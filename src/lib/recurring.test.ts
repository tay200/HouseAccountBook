import { describe, expect, it } from 'vitest'
import { isRuleInMonth, pendingAmount, recurringForMonth, ruleDate } from './recurring'
import type { RecurringRule, Transaction } from './types'

const rule = (fields: Partial<RecurringRule>): RecurringRule => ({
  id: 'r', memo: '관리비', type: 'expense', kind: 'fixed', amount: 200_000, category_id: null, payment_method_id: null,
  member_id: null, day: 25, start_month: '2026-01-01', end_month: null, active: true, ...fields,
})

const tx = (fields: Partial<Transaction>): Transaction => ({
  id: 't', date: '2026-10-25', type: 'expense', kind: 'fixed', amount: 0, discount: 0, category_id: null,
  payment_method_id: null, member_id: null, memo: null, recurring_id: null, tags: [], ...fields,
})

describe('ruleDate', () => {
  it('31일 규칙은 그 달 마지막 날', () => {
    expect(ruleDate({ day: 31 }, '2026-02')).toBe('2026-02-28')
    expect(ruleDate({ day: 5 }, '2026-10')).toBe('2026-10-05')
  })
})

describe('isRuleInMonth', () => {
  it('시작~끝 월 안이고 사용 중일 때만', () => {
    const r = rule({ start_month: '2026-03-01', end_month: '2026-12-01' })
    expect(isRuleInMonth(r, '2026-02')).toBe(false)
    expect(isRuleInMonth(r, '2026-03')).toBe(true)
    expect(isRuleInMonth(r, '2026-12')).toBe(true)
    expect(isRuleInMonth(r, '2027-01')).toBe(false)
    expect(isRuleInMonth({ ...r, active: false }, '2026-05')).toBe(false)
  })
})

describe('recurringForMonth', () => {
  const rules = [rule({ id: 'a', day: 25 }), rule({ id: 'b', memo: '통신비', day: 5, amount: 50_000, kind: 'variable' }), rule({ id: 'c', memo: '적금', kind: 'saving', amount: 500_000 })]
  const items = recurringForMonth(rules, [tx({ id: 'done', recurring_id: 'b', date: '2026-10-06' })], '2026-10')

  it('날짜순으로, 확인한 거래를 찾아 붙인다', () => {
    expect(items.map((i) => i.rule.id)).toEqual(['b', 'a', 'c'])
    expect(items[0].done?.id).toBe('done')
    expect(items[1].done).toBeUndefined()
  })
  it('예정 합계는 확인하지 않은 것만', () => {
    expect(pendingAmount(items, (r) => r.kind !== 'saving')).toBe(200_000)
  })
})
