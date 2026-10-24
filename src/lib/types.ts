// DB 테이블 한 행(row)의 모양. supabase/migrations/*.sql 과 맞춰야 한다.

export type TxType = 'income' | 'expense'
export type PaymentKind = 'cash' | 'card' | 'account'
/** 수입: fixed(고정수입) / extra(부가수입), 지출: saving(저축성) / fixed(고정) / variable(변동) */
export type TxKind = 'fixed' | 'extra' | 'saving' | 'variable'
export type Term = 'long' | 'mid' | 'short'

export type Category = {
  id: string
  name: string
  type: TxType
  color: string
  parent_id: string | null // null 이면 대분류
}

export type PaymentMethod = {
  id: string
  name: string
  kind: PaymentKind
}

export type Member = {
  id: string
  name: string
}

export type Transaction = {
  id: string
  date: string // 'YYYY-MM-DD'
  type: TxType
  kind: TxKind
  amount: number // 실지출 = 결제금액 - 할인
  discount: number
  category_id: string | null
  payment_method_id: string | null
  member_id: string | null // null = 공동
  memo: string | null
}

export type Budget = {
  id: string
  month: string // 'YYYY-MM-01'
  category_id: string
  amount: number
}

export type Goal = {
  id: string
  year: number
  monthly_saving_target: number
  saving_rate_target: number // 퍼센트
}

export type InvestAccount = {
  id: string
  name: string
  member_id: string | null
  memo: string | null
}

export type Trade = {
  id: string
  account_id: string
  stock_code: string
  stock_name: string
  buy_date: string | null
  buy_price: number
  quantity: number
  sell_date: string | null
  sell_price: number | null
  fee: number
  memo: string | null
}

export type StockPrice = {
  stock_code: string
  price: number
  updated_at: string
}

export type BankAccount = {
  id: string
  bank: string | null
  name: string
  kind: string | null
  term: Term
  account_number: string | null
  purpose: string | null
  member_id: string | null
  opened_on: string | null
  balance: number
  memo: string | null
}

export type Deposit = {
  id: string
  bank: string | null
  name: string
  member_id: string | null
  start_date: string
  maturity_date: string
  principal: number
  rate: number
  tax_rate: number
  memo: string | null
}

export type InstallmentSaving = {
  id: string
  bank: string | null
  name: string
  member_id: string | null
  start_date: string
  maturity_date: string
  monthly_amount: number
  rate: number
  tax_rate: number
  method: 'simple' | 'monthly_compound'
  memo: string | null
}

export type LoanMethod = 'equal_payment' | 'equal_principal' | 'bullet'

export type Loan = {
  id: string
  lender: string | null
  name: string
  start_date: string
  maturity_date: string
  principal: number
  rate: number
  method: LoanMethod
  memo: string | null
}

export type RealAsset = {
  id: string
  name: string
  amount: number
  memo: string | null
}

export type NetWorthSnapshot = {
  id: string
  year: number
  amount: number
  memo: string | null
}

export type LedgerEntry = {
  id: string
  book: string
  date: string
  direction: 'in' | 'out'
  amount: number
  member_id: string | null
  memo: string | null
}

// 새로 만들 때는 id 가 없다 (DB 가 만들어 줌)
export type CategoryInput = Omit<Category, 'id'>
export type PaymentMethodInput = Omit<PaymentMethod, 'id'>
export type TransactionInput = Omit<Transaction, 'id'>

export const TX_TYPE_LABEL: Record<TxType, string> = {
  income: '수입',
  expense: '지출',
}

export const KIND_LABEL: Record<TxKind, string> = {
  fixed: '고정',
  extra: '부가',
  saving: '저축성',
  variable: '변동',
}

export const KINDS_BY_TYPE: Record<TxType, TxKind[]> = {
  income: ['fixed', 'extra'],
  expense: ['variable', 'fixed', 'saving'],
}

export const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  cash: '현금',
  card: '카드',
  account: '계좌',
}

export const TERM_LABEL: Record<Term, string> = {
  long: '장기',
  mid: '중기',
  short: '단기',
}

export const LOAN_METHOD_LABEL: Record<LoanMethod, string> = {
  equal_payment: '원리금균등',
  equal_principal: '원금균등',
  bullet: '만기일시',
}

export const SAVING_METHOD_LABEL: Record<InstallmentSaving['method'], string> = {
  simple: '단리',
  monthly_compound: '월복리',
}
