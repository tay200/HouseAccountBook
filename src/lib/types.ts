// DB 테이블 한 행(row)의 모양. supabase/schema.sql 과 맞춰야 한다.

export type TxType = 'income' | 'expense'
export type PaymentKind = 'cash' | 'card' | 'account'

export type Category = {
  id: string
  name: string
  type: TxType
  color: string
}

export type PaymentMethod = {
  id: string
  name: string
  kind: PaymentKind
}

export type Transaction = {
  id: string
  date: string // 'YYYY-MM-DD'
  type: TxType
  amount: number
  category_id: string | null
  payment_method_id: string | null
  memo: string | null
}

export type Budget = {
  id: string
  month: string // 'YYYY-MM-01'
  category_id: string
  amount: number
}

// 새로 만들 때는 id 가 없다 (DB 가 만들어 줌)
export type CategoryInput = Omit<Category, 'id'>
export type PaymentMethodInput = Omit<PaymentMethod, 'id'>
export type TransactionInput = Omit<Transaction, 'id'>

export const TX_TYPE_LABEL: Record<TxType, string> = {
  income: '수입',
  expense: '지출',
}

export const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  cash: '현금',
  card: '카드',
  account: '계좌',
}
