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
