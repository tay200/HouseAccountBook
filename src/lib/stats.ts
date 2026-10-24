import type { Transaction, TxType } from './types'

/** 수입 또는 지출 거래의 합계 */
export function sumByType(transactions: Transaction[], type: TxType) {
  return transactions.filter((t) => t.type === type).reduce((sum, t) => sum + t.amount, 0)
}

/** 지출 거래를 key 별로 합산. 예: 카테고리별, 결제수단별 */
export function sumExpenseBy(transactions: Transaction[], getKey: (t: Transaction) => string) {
  const totals = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    const key = getKey(t)
    totals.set(key, (totals.get(key) ?? 0) + t.amount)
  }
  return totals
}
