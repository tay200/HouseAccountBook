import { daysInMonth } from './format'
import type { Transaction, TxType } from './types'

/** 조건에 맞는 거래 금액 합계 */
export function sumWhere(transactions: Transaction[], predicate: (t: Transaction) => boolean) {
  return transactions.filter(predicate).reduce((sum, t) => sum + t.amount, 0)
}

/** 수입 또는 지출 거래의 합계 */
export function sumByType(transactions: Transaction[], type: TxType) {
  return sumWhere(transactions, (t) => t.type === type)
}

/** 저축성이 아닌 지출 = 소비성 지출 */
export const isConsumption = (t: Transaction) => t.type === 'expense' && t.kind !== 'saving'
export const isSaving = (t: Transaction) => t.type === 'expense' && t.kind === 'saving'

/** 조건에 맞는 거래를 key 별로 합산. 예: 대분류별, 결제수단별 */
export function sumGrouped(
  transactions: Transaction[],
  predicate: (t: Transaction) => boolean,
  getKey: (t: Transaction) => string,
) {
  const totals = new Map<string, number>()
  for (const t of transactions) {
    if (!predicate(t)) continue
    const key = getKey(t)
    totals.set(key, (totals.get(key) ?? 0) + t.amount)
  }
  return totals
}

/** 지출 거래를 key 별로 합산 */
export function sumExpenseBy(transactions: Transaction[], getKey: (t: Transaction) => string) {
  return sumGrouped(transactions, (t) => t.type === 'expense', getKey)
}

/** 월별 요약 (대시보드, 연간 리포트 공용) */
export function monthSummary(transactions: Transaction[]) {
  const income = sumByType(transactions, 'income')
  const expense = sumByType(transactions, 'expense')
  const saving = sumWhere(transactions, isSaving)
  const consumption = expense - saving
  return {
    income,
    expense,
    saving,
    consumption,
    balance: income - expense,
    /** 저축률 = 저축성 지출 / 수입 */
    savingRate: income > 0 ? saving / income : null,
  }
}

/**
 * 한 달 예산 사용 현황 (대시보드 '남은 예산' 카드, 예산 화면 공용).
 * 예산을 정한 카테고리에서 쓴 돈만 더해야 '예산 대비'가 맞다.
 * today 가 그 달 안이면 남은 일수(오늘 포함)와 하루에 쓸 수 있는 금액도 계산한다.
 * pending = 예산을 정한 카테고리에서 아직 나가지 않은 반복 지출. 하루 금액에서 미리 뺀다.
 * budgets 의 amount 는 이월을 더한 금액을 넘겨도 된다.
 */
export function budgetUsage(
  budgets: { category_id: string; amount: number }[],
  spentByCategory: Map<string, number>,
  month: string,
  today: string,
  pending = 0,
) {
  const budget = budgets.reduce((sum, b) => sum + b.amount, 0)
  const spent = budgets.reduce((sum, b) => sum + (spentByCategory.get(b.category_id) ?? 0), 0)
  const left = budget - spent
  const daysLeft = today.startsWith(month) ? daysInMonth(month) - Number(today.slice(8, 10)) + 1 : null
  return {
    budget,
    spent,
    left,
    pending,
    daysLeft,
    /** (남은 예산 − 나갈 반복 지출) ÷ 남은 일수 (원 단위 버림). 이미 다 썼으면 0 */
    perDay: daysLeft === null ? null : Math.max(Math.floor((left - pending) / daysLeft), 0),
  }
}

/** 'YYYY-MM' 달의 대분류별 소비성 지출을 찾는 함수를 만든다 (이월 계산용) */
export function consumptionByMonth(transactions: Transaction[], majorIdOf: (t: Transaction) => string) {
  const totals = sumGrouped(transactions, isConsumption, (t) => `${t.date.slice(0, 7)}|${majorIdOf(t)}`)
  return (month: string, categoryId: string) => totals.get(`${month}|${categoryId}`) ?? 0
}

/**
 * 예산 이월액 (예산 화면, 대시보드 공용). 대분류 id → 이번 달 예산에 더할 금액 (초과했으면 음수)
 * 이월을 켠 대분류마다 같은 해 1월부터 지난달까지 (그 달 예산 − 그 달 소비성 지출)을 더한다.
 * 예산을 정하지 않은 달은 건너뛴다. 1월은 항상 0 (매년 새로 시작).
 */
export function budgetCarry(
  budgets: { month: string; category_id: string; amount: number }[],
  spentIn: (month: string, categoryId: string) => number,
  month: string,
  rolloverIds: Set<string>,
) {
  const january = `${month.slice(0, 4)}-01`
  const carry = new Map<string, number>()
  for (const b of budgets) {
    const m = b.month.slice(0, 7)
    if (!rolloverIds.has(b.category_id) || m < january || m >= month) continue
    carry.set(b.category_id, (carry.get(b.category_id) ?? 0) + b.amount - spentIn(m, b.category_id))
  }
  return carry
}

/**
 * 이 속도면 월말에 얼마를 쓰게 될지 (대시보드 '남은 예산' 카드).
 *   지금까지 쓴 돈 + 변동지출 하루 평균(1일~오늘) × 남은 날(내일~말일) + 아직 확인하지 않은 반복 지출
 * 고정지출은 한 번 나가고 끝나는 돈이라 하루 평균에 넣지 않는다. today 가 그 달이 아니면 null.
 */
export function forecastMonthEnd(input: { spent: number; variable: number; pending: number; month: string; today: string }) {
  const { spent, variable, pending, month, today } = input
  if (!today.startsWith(month)) return null
  const day = Number(today.slice(8, 10))
  const rest = daysInMonth(month) - day
  return spent + Math.round((variable / day) * rest) + pending
}
