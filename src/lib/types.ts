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
  /** 예산 이월 (대분류만 의미 있음) */
  rollover: boolean
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
  /** 반복 거래 규칙에서 [확인]으로 만든 거래면 그 규칙 id */
  recurring_id: string | null
  /** 카테고리와 따로 붙이는 꼬리표 ('#' 없이 저장) */
  tags: string[]
}

/** 매달 같은 날 나가는(들어오는) 거래의 규칙. 그 달의 '예정' 거래로 보여주고 [확인]하면 실제 거래가 된다 */
export type RecurringRule = {
  id: string
  memo: string
  type: TxType
  kind: TxKind
  amount: number
  category_id: string | null
  payment_method_id: string | null
  member_id: string | null
  /** 매월 며칠 (그 달 마지막 날보다 크면 마지막 날) */
  day: number
  start_month: string // 'YYYY-MM-01'
  end_month: string | null // 비우면 계속
  active: boolean
}

/** 자주 쓰는 거래. 누르면 입력 폼을 채운다 (amount 가 없으면 금액만 입력) */
export type FavoriteTransaction = {
  id: string
  name: string
  type: TxType
  kind: TxKind
  amount: number | null
  category_id: string | null
  payment_method_id: string | null
  member_id: string | null
  memo: string | null
  tags: string[]
}

export type GiftEventType = 'wedding' | 'funeral' | 'first_birthday' | 'birthday' | 'etc'
export type GiftDirection = 'give' | 'receive'

/** 경조사비 장부 한 줄 */
export type GiftEvent = {
  id: string
  date: string // 'YYYY-MM-DD'
  counterpart: string // 상대방
  relation: string | null // 관계 (친구, 직장 …)
  event_type: GiftEventType
  direction: GiftDirection
  amount: number
  member_id: string | null // 우리 쪽 누구와 관련된 일인지 (null = 공동)
  /** 보낼 때 '가계부 지출로도 기록'으로 함께 만든 거래 */
  transaction_id: string | null
  memo: string | null
}

export const GIFT_EVENT_LABEL: Record<GiftEventType, string> = {
  wedding: '결혼',
  funeral: '장례',
  first_birthday: '돌잔치',
  birthday: '생일',
  etc: '기타',
}

export const GIFT_DIRECTION_LABEL: Record<GiftDirection, string> = {
  give: '보냄',
  receive: '받음',
}

/** sinking = 쓸 돈 모으기 (명절·자동차세), goal = 목표 모으기 (전세·차) */
export type SavingGoalKind = 'sinking' | 'goal'
/** 모은 돈을 어디서 읽을지: 직접 입력 / 통장 기록의 통장 잔액 / 자산의 계좌 잔액 */
export type SavingSource = 'manual' | 'book' | 'account'

export type SavingGoal = {
  id: string
  name: string
  kind: SavingGoalKind
  target_amount: number
  start_month: string // 'YYYY-MM-01'
  due_month: string // 'YYYY-MM-01'
  /** 기한이 지나면 다음 해 같은 기간으로 넘어간다 */
  repeat_yearly: boolean
  source: SavingSource
  saved_amount: number // source = manual 일 때
  book: string | null // source = book 일 때
  bank_account_id: string | null // source = account 일 때
  memo: string | null
}

export const SAVING_GOAL_KIND_LABEL: Record<SavingGoalKind, string> = {
  sinking: '쓸 돈',
  goal: '목표',
}

export const SAVING_SOURCE_LABEL: Record<SavingSource, string> = {
  manual: '직접 입력',
  book: '통장 기록',
  account: '계좌 잔액',
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
  /** 월 무지출 목표 일수 (0 = 목표 없음) */
  no_spend_target: number
}

/** 가계부 설정 (가계부마다 1줄. 아직 저장한 적 없으면 기본값) */
export type AppSettings = {
  /** 이 금액 이상인 변동지출을 큰 지출로 강조 */
  big_spend_threshold: number
}

export const DEFAULT_APP_SETTINGS: AppSettings = { big_spend_threshold: 100000 }

/**
 * 잔액 맞추기 기록.
 * book    : 통장 기록의 통장 잔액을 date 기준으로 실제 잔액과 비교
 * payment : 결제수단의 한 달(date = 그 달 1일) 사용액을 카드사 금액과 비교
 */
export type Reconciliation = {
  id: string
  target: 'book' | 'payment'
  book: string | null
  payment_method_id: string | null
  date: string
  actual: number
  recorded: number
  memo: string | null
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

/** sale = 판매수익(실현 금액만 아는 매도), dividend = 배당금 */
export type IncomeKind = 'sale' | 'dividend'

/** 직접 입력한 투자 수익 (증권사 앱의 판매수익·배당금을 금액 그대로) */
export type InvestIncome = {
  id: string
  account_id: string
  kind: IncomeKind
  income_date: string // 'YYYY-MM-DD'
  market: Market
  stock_code: string | null
  stock_name: string
  amount: number // 원, 손실은 음수
  memo: string | null
  created_at: string
}

export const INCOME_LABEL: Record<IncomeKind, string> = {
  sale: '판매수익',
  dividend: '배당',
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
// 이월 여부는 예산 화면에서 따로 바꾼다
export type CategoryInput = Omit<Category, 'id' | 'rollover'>
export type PaymentMethodInput = Omit<PaymentMethod, 'id'>
// recurring_id 는 반복 거래를 [확인]할 때만 넣는다 (일반 입력·수정에서는 건드리지 않음)
export type TransactionInput = Omit<Transaction, 'id' | 'recurring_id'> & { recurring_id?: string }

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
