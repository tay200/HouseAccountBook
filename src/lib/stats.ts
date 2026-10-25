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

/** 'YYYY-MM' 달의 날짜 수 */
function daysInMonth(month: string) {
  const [year, mon] = month.split('-').map(Number)
  return new Date(year, mon, 0).getDate() // 다음 달의 0일 = 이번 달 마지막 날
}

/**
 * 한 달 예산 사용 현황 (대시보드 '남은 예산' 카드, 예산 화면 공용).
 * 예산을 정한 카테고리에서 쓴 돈만 더해야 '예산 대비'가 맞다.
 * today 가 그 달 안이면 남은 일수(오늘 포함)와 하루에 쓸 수 있는 금액도 계산한다.
 */
export function budgetUsage(
  budgets: { category_id: string; amount: number }[],
  spentByCategory: Map<string, number>,
  month: string,
  today: string,
) {
  const budget = budgets.reduce((sum, b) => sum + b.amount, 0)
  const spent = budgets.reduce((sum, b) => sum + (spentByCategory.get(b.category_id) ?? 0), 0)
  const left = budget - spent
  const daysLeft = today.startsWith(month) ? daysInMonth(month) - Number(today.slice(8, 10)) + 1 : null
  return {
    budget,
    spent,
    left,
    daysLeft,
    /** 남은 예산 ÷ 남은 일수 (원 단위 버림). 이미 다 썼으면 0 */
    perDay: daysLeft === null ? null : Math.max(Math.floor(left / daysLeft), 0),
  }
}
