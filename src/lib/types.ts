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
  /** 투자 탭 합계에 포함할지 (마이그레이션 004 이전 데이터는 undefined → 포함으로 취급) */
  included?: boolean
}

export type Market = 'KR' | 'US'

/** 매매 기록 없이 직접 넣은 보유 종목 (예: 다른 앱에서 옮겨 온 평균단가·수량) */
export type StockHolding = {
  id: string
  account_id: string
  /** KR: 원화, 종목코드 6자리 / US: 달러, 티커 (AAPL) */
  market: Market
  stock_code: string
  stock_name: string
  quantity: number
  avg_price: number // 해당 통화
  /** US 만. 비우면 현재 환율로 계산 */
  avg_fx_rate: number | null
  memo: string | null
}

export type TradeSide = 'buy' | 'sell'

/** 매수 1건 또는 매도 1건 */
export type StockTrade = {
  id: string
  account_id: string
  side: TradeSide
  market: Market
  stock_code: string
  stock_name: string
  trade_date: string | null // 엑셀에서 옮긴 기록은 비어 있을 수 있음
  price: number // 해당 통화
  quantity: number
  /** US 만. 거래 당시 환율, 비우면 현재 환율로 계산 */
  fx_rate: number | null
  fee: number // 수수료·세금, 해당 통화 (KR=원, US=달러)
  memo: string | null
  created_at: string
}

export const SIDE_LABEL: Record<TradeSide, string> = {
  buy: '매수',
  sell: '매도',
}

/** stock_prices 에서 원/달러 환율을 저장하는 코드 */
export const FX_CODE = 'USDKRW'

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

/** 월별 자산 기록의 투자 계좌 1개 값 */
export type SnapshotAccount = {
  id: string
  name: string
  included: boolean
  value: number
  cost: number
  realized: number
}

/** 월별 자산 기록: 그 달에 마지막으로 앱을 연 시점의 값 */
export type MonthlySnapshot = {
  id: string
  month: string // 'YYYY-MM-01'
  financial: number
  real_assets: number
  debt: number
  net_worth: number
  /** 투자 합계는 '합계 포함' 계좌만 */
  invest_value: number
  invest_cost: number
  invest_realized: number
  invest_accounts: SnapshotAccount[]
  saved_at: string
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
