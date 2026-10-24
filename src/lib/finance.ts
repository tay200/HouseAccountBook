// 예금·적금·대출 계산. 금리(rate)와 세율(tax_rate)은 퍼센트 단위(3.5 = 3.5%).
import { toDateString, todayString } from './format'
import type { Deposit, InstallmentSaving, Loan, Term } from './types'

/**
 * 두 날짜 사이의 개월 수 (일자가 덜 지났으면 한 달을 빼서 '꽉 찬 개월'만 센다).
 * 은행처럼, 그 달에 같은 날짜가 없으면 말일을 같은 날로 본다. 예: 1/31 → 2/28 은 1개월
 */
export function monthsBetween(from: string, to: string) {
  const [y1, m1, d1] = from.split('-').map(Number)
  const [y2, m2, d2] = to.split('-').map(Number)
  let months = (y2 - y1) * 12 + (m2 - m1)
  const lastDayOfToMonth = new Date(y2, m2, 0).getDate() // 다음 달 0일 = 이번 달 말일
  if (d2 < d1 && d2 !== lastDayOfToMonth) months -= 1
  return months
}

/** date 에서 n개월 뒤 날짜 (그 달에 같은 날짜가 없으면 말일. 예: 1/31 + 1개월 = 2/28) */
export function addMonths(date: string, n: number) {
  const [y, m, d] = date.split('-').map(Number)
  const lastDay = new Date(y, m - 1 + n + 1, 0).getDate()
  return toDateString(new Date(y, m - 1 + n, Math.min(d, lastDay)))
}

/** 오늘부터 date 까지 남은 일수 */
export function daysUntil(date: string) {
  const ms = new Date(`${date}T00:00:00`).getTime() - new Date(`${todayString()}T00:00:00`).getTime()
  return Math.round(ms / 86_400_000)
}

/** 가입 기간과 오늘까지 지난 기간 */
function period(start: string, maturity: string) {
  const today = todayString()
  const total = Math.max(monthsBetween(start, maturity), 0)
  const elapsed = Math.min(Math.max(monthsBetween(start, today), 0), total)
  return { total, elapsed, remaining: total - elapsed, matured: today >= maturity, started: today >= start }
}

/** 3년 이상이면 중기, 미만이면 단기 (엑셀 자산현황 기준) */
export function termByMonths(months: number): Term {
  return months >= 36 ? 'mid' : 'short'
}

export function calcDeposit(d: Deposit) {
  const p = period(d.start_date, d.maturity_date)
  const interest = Math.round(d.principal * (d.rate / 100) * (p.total / 12))
  const afterTax = Math.round(interest * (1 - d.tax_rate / 100))
  // 가입일 전이면 아직 넣은 돈이 없다
  return { ...p, interest, afterTax, maturityAmount: d.principal + afterTax, current: p.started ? d.principal : 0 }
}

export function calcSaving(s: InstallmentSaving) {
  const p = period(s.start_date, s.maturity_date)
  const n = p.total
  const monthlyRate = s.rate / 100 / 12
  let interest: number
  if (s.method === 'simple') {
    // 단리: 첫 달 납입분은 n개월, 마지막 달 납입분은 1개월 동안 이자가 붙는다
    interest = s.monthly_amount * monthlyRate * ((n * (n + 1)) / 2)
  } else {
    // 월복리: 매달 넣은 돈이 남은 개월 수만큼 복리로 불어난다
    interest = 0
    for (let k = 1; k <= n; k++) interest += s.monthly_amount * ((1 + monthlyRate) ** k - 1)
  }
  interest = Math.round(interest)
  const afterTax = Math.round(interest * (1 - s.tax_rate / 100))
  const principal = s.monthly_amount * n
  // 오늘까지 빠짐없이 납입했다고 가정 (가입한 달 포함, 가입일 전이면 0)
  const current = p.started ? s.monthly_amount * Math.min(p.elapsed + 1, n) : 0
  return { ...p, principal, interest, afterTax, maturityAmount: principal + afterTax, current }
}

export type LoanRow = { month: number; payment: number; principal: number; interest: number; balance: number }

/** 대출 상환 스케줄 (월 단위) */
export function loanSchedule(loan: Loan): LoanRow[] {
  const n = Math.max(monthsBetween(loan.start_date, loan.maturity_date), 1)
  const r = loan.rate / 100 / 12
  const rows: LoanRow[] = []
  let balance = loan.principal

  for (let month = 1; month <= n; month++) {
    const interest = balance * r
    let principal: number
    if (loan.method === 'equal_payment') {
      // 원리금균등: 매달 같은 금액(원금+이자)을 낸다
      const payment = r === 0 ? loan.principal / n : (loan.principal * r) / (1 - (1 + r) ** -n)
      principal = payment - interest
    } else if (loan.method === 'equal_principal') {
      // 원금균등: 원금을 똑같이 나눠 내고, 이자는 남은 원금에 붙는다
      principal = loan.principal / n
    } else {
      // 만기일시: 이자만 내다가 마지막 달에 원금을 한 번에 갚는다
      principal = month === n ? loan.principal : 0
    }
    if (month === n) principal = balance // 반올림 오차 정리
    balance -= principal
    rows.push({
      month,
      payment: Math.round(principal + interest),
      principal: Math.round(principal),
      interest: Math.round(interest),
      balance: Math.max(Math.round(balance), 0),
    })
  }
  return rows
}

export function calcLoan(loan: Loan) {
  const rows = loanSchedule(loan)
  const p = period(loan.start_date, loan.maturity_date)
  const paidRows = rows.slice(0, p.elapsed)
  const totalInterest = rows.reduce((s, r) => s + r.interest, 0)
  const paid = paidRows.reduce((s, r) => s + r.payment, 0)
  const balance = p.elapsed === 0 ? loan.principal : (paidRows.at(-1)?.balance ?? loan.principal)
  return {
    ...p,
    rows,
    totalInterest,
    totalPayment: loan.principal + totalInterest,
    paid,
    balance,
    // 다음 회차 상환액과 상환일 (다 갚았으면 0, null)
    nextPayment: rows[p.elapsed]?.payment ?? 0,
    nextDate: p.elapsed < rows.length ? addMonths(loan.start_date, p.elapsed + 1) : null,
  }
}
