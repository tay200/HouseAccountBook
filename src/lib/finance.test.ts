import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { addMonths, calcDeposit, calcLoan, calcSaving, loanSchedule, monthsBetween } from './finance'
import type { Deposit, InstallmentSaving, Loan } from './types'

// '오늘'에 따라 결과가 달라지는 계산이 있어서 날짜를 2026-10-25 로 고정한다
beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 25, 12))
})
afterAll(() => vi.useRealTimers())

const deposit = (fields: Partial<Deposit>): Deposit => ({
  id: 'd', bank: null, name: '예금', member_id: null, start_date: '2026-01-01', maturity_date: '2027-01-01',
  principal: 10_000_000, rate: 3.5, tax_rate: 15.4, memo: null, ...fields,
})
const saving = (fields: Partial<InstallmentSaving>): InstallmentSaving => ({
  id: 's', bank: null, name: '적금', member_id: null, start_date: '2026-01-01', maturity_date: '2027-01-01',
  monthly_amount: 1_000_000, rate: 4, tax_rate: 15.4, method: 'simple', memo: null, ...fields,
})
const loan = (fields: Partial<Loan>): Loan => ({
  id: 'l', lender: null, name: '대출', start_date: '2026-01-01', maturity_date: '2056-01-01',
  principal: 300_000_000, rate: 4, method: 'equal_payment', memo: null, ...fields,
})

describe('monthsBetween: 은행식 개월 수', () => {
  it.each([
    ['2026-01-15', '2026-02-14', 0],
    ['2026-01-15', '2026-02-15', 1],
    ['2026-01-31', '2026-02-28', 1], // 2월에 31일이 없으면 말일을 같은 날로
    ['2025-08-31', '2026-02-28', 6],
    ['2024-01-31', '2024-02-28', 0], // 윤년 2월 말일은 29일
    ['2024-01-31', '2024-02-29', 1],
  ])('%s → %s = %i개월', (from, to, months) => {
    expect(monthsBetween(from, to)).toBe(months)
  })
})

describe('addMonths', () => {
  it('그 달에 같은 날짜가 없으면 말일', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2025-10-20', 13)).toBe('2026-11-20')
  })
})

describe('예금', () => {
  it('1년 3.5% 세후이자', () => {
    const c = calcDeposit(deposit({}))
    expect(c.interest).toBe(350_000)
    expect(c.afterTax).toBe(296_100)
  })
  it('말일 가입 상품의 기간', () => {
    expect(calcDeposit(deposit({ start_date: '2025-08-31', maturity_date: '2026-02-28' })).afterTax).toBe(148_050)
  })
  it('가입 전이면 현재 금액 0', () => {
    expect(calcDeposit(deposit({ start_date: '2026-12-01', maturity_date: '2027-12-01' })).current).toBe(0)
  })
})

describe('적금', () => {
  it('단리 이자 = 월납입 × 월이율 × n(n+1)/2', () => {
    expect(calcSaving(saving({})).interest).toBe(260_000)
  })
  it('월복리 이자', () => {
    expect(calcSaving(saving({ method: 'monthly_compound' })).interest).toBe(263_204)
  })
  it('현재 저축액은 가입한 달 포함 납입 횟수만큼, 가입 전이면 0', () => {
    expect(calcSaving(saving({ start_date: '2026-03-15', maturity_date: '2027-03-15', monthly_amount: 300_000 })).current).toBe(2_400_000)
    expect(calcSaving(saving({ start_date: '2026-12-01', maturity_date: '2027-12-01' })).current).toBe(0)
  })
})

describe('대출', () => {
  it('원리금균등 3억 4% 30년 월 상환액', () => {
    expect(loanSchedule(loan({}))[0].payment).toBe(1_432_246)
  })
  it.each(['equal_payment', 'equal_principal', 'bullet'] as const)('%s: 원금 합계 = 대출금, 마지막 잔금 0', (method) => {
    const rows = loanSchedule(loan({ method, maturity_date: '2029-01-01' }))
    expect(rows.reduce((s, r) => s + r.principal, 0)).toBeCloseTo(300_000_000, -2)
    expect(rows.at(-1)!.balance).toBe(0)
  })
  it('다음 상환일', () => {
    const c = calcLoan(loan({ start_date: '2025-10-20', maturity_date: '2028-10-20', principal: 30_000_000, rate: 5 }))
    expect(c.nextDate).toBe('2026-11-20')
    expect(c.nextPayment).toBe(899_127)
  })
})
