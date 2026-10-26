import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type {
  BankAccount,
  FavoriteTransaction,
  GiftEvent,
  Deposit,
  Goal,
  InstallmentSaving,
  InvestAccount,
  InvestIncome,
  LedgerEntry,
  Loan,
  Member,
  MonthlySnapshot,
  NetWorthSnapshot,
  RealAsset,
  Reconciliation,
  RecurringRule,
  SavingGoal,
  StockHolding,
  StockPrice,
  StockTrade,
} from '../lib/types'
import type { SnapshotValues } from '../lib/snapshots'
import { createTableApi } from './createTableApi'

// '목록 + 추가/수정/삭제'만 필요한 테이블들
// 사람을 지우면 이 테이블들의 member_id 가 비워지므로 함께 새로고침
export const membersApi = createTableApi<Member>('members', {
  alsoInvalidate: [['transactions'], ['ledger_entries'], ['bank_accounts'], ['deposits'], ['installment_savings'], ['invest_accounts'], ['recurring_rules'], ['favorite_transactions'], ['gift_events']],
})
export const goalsApi = createTableApi<Goal>('goals', { order: [{ column: 'year' }] })

export const investAccountsApi = createTableApi<InvestAccount>('invest_accounts', {
  alsoInvalidate: [['stock_holdings'], ['stock_trades'], ['invest_incomes']],
})
export const stockHoldingsApi = createTableApi<StockHolding>('stock_holdings')
// 날짜가 없는 기록(엑셀에서 옮긴 것)은 가장 오래된 것으로 보고 맨 앞에
export const stockTradesApi = createTableApi<StockTrade>('stock_trades', {
  order: [{ column: 'trade_date', ascending: true, nullsFirst: true }, { column: 'created_at' }],
})

export const investIncomesApi = createTableApi<InvestIncome>('invest_incomes', {
  order: [{ column: 'income_date' }, { column: 'created_at' }],
})

// 계좌를 지우면 그 계좌를 보던 모으기 목표의 연결이 비워진다
export const bankAccountsApi = createTableApi<BankAccount>('bank_accounts', { alsoInvalidate: [['saving_goals']] })
export const depositsApi = createTableApi<Deposit>('deposits')
export const savingsApi = createTableApi<InstallmentSaving>('installment_savings')
export const loansApi = createTableApi<Loan>('loans')
export const realAssetsApi = createTableApi<RealAsset>('real_assets')
export const snapshotsApi = createTableApi<NetWorthSnapshot>('net_worth_snapshots', {
  order: [{ column: 'year' }],
})
export const ledgerApi = createTableApi<LedgerEntry>('ledger_entries', {
  order: [{ column: 'date' }, { column: 'created_at' }],
})

// 반복 거래 규칙 (매달 예정 거래로 보여주고 [확인]하면 실제 거래가 됨). 규칙을 지우면 만든 거래의 연결이 비워진다
export const recurringRulesApi = createTableApi<RecurringRule>('recurring_rules', {
  order: [{ column: 'day' }, { column: 'created_at' }],
  alsoInvalidate: [['transactions']],
})

// 즐겨찾기 거래 (누르면 입력 폼을 채움)
export const favoritesApi = createTableApi<FavoriteTransaction>('favorite_transactions')

// 경조사비 장부 (저장·삭제는 가계부 거래와 함께 처리하는 api/gifts.ts 사용)
export const giftEventsApi = createTableApi<GiftEvent>('gift_events', {
  order: [{ column: 'date', ascending: false }, { column: 'created_at', ascending: false }],
})

// 잔액 맞추기 기록 (통장 기록 잔액, 카드 월 사용액 대조)
export const reconciliationsApi = createTableApi<Reconciliation>('reconciliations', {
  order: [{ column: 'date', ascending: false }, { column: 'created_at', ascending: false }],
})

/** 카드 사용액 대조: 결제수단·달마다 1줄이라 있으면 덮어쓴다 */
export function useSavePaymentCheck() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: { payment_method_id: string; date: string; actual: number; recorded: number }) => {
      const { error } = await supabase
        .from('reconciliations')
        .upsert({ ...values, target: 'payment' }, { onConflict: 'user_id,payment_method_id,date' })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reconciliationsApi.key }),
  })
}

// 모으기 목표 (특별비 적립 + 저축 목표)
export const savingGoalsApi = createTableApi<SavingGoal>('saving_goals', { order: [{ column: 'due_month' }, { column: 'created_at' }] })

// ─────────────────────────────────────────────
// 월별 자산 기록: 앱을 열 때 이번 달 줄을 덮어쓴다 (useMonthlySnapshotSync)
// ─────────────────────────────────────────────
export const monthlySnapshotsApi = createTableApi<MonthlySnapshot>('monthly_snapshots', {
  order: [{ column: 'month' }],
})

/** 이번 달 기록 저장 (같은 달 기록이 있으면 덮어쓰기: upsert) */
export function useSaveMonthlySnapshot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: SnapshotValues) => {
      const { error } = await supabase
        .from('monthly_snapshots')
        .upsert({ ...values, saved_at: new Date().toISOString() }, { onConflict: 'user_id,month' })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: monthlySnapshotsApi.key }),
  })
}

// ─────────────────────────────────────────────
// 현재가: 직접 입력 저장 + Edge Function 으로 자동 조회
// ─────────────────────────────────────────────
const PRICES_KEY = ['stock_prices']

export function useStockPrices() {
  return useQuery({
    queryKey: PRICES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('stock_prices').select('stock_code, price, updated_at')
      if (error) throw error
      return data as StockPrice[]
    },
  })
}

/** 현재가 직접 입력 (있으면 덮어쓰기: upsert) */
export function useSaveStockPrice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ stock_code, price }: { stock_code: string; price: number }) => {
      const { error } = await supabase
        .from('stock_prices')
        .upsert({ stock_code, price, updated_at: new Date().toISOString() })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRICES_KEY }),
  })
}

type PriceResult = { code: string; name?: string; price?: number; error?: string }

/**
 * Edge Function(stock-prices)을 불러 현재가를 받아오고 DB 에 저장한다. 실패한 종목 목록을 돌려준다.
 * kr = 한국 종목코드, us = 미국 티커 (미국 종목이 있으면 환율도 함께 받아온다)
 */
export function useRefreshStockPrices() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ kr, us }: { kr: string[]; us: string[] }) => {
      const { data, error } = await supabase.functions.invoke<{ results: PriceResult[] }>('stock-prices', {
        body: { codes: kr, us, fx: true },
      })
      if (error) throw error
      const results = data?.results ?? []
      const ok = results.filter((r): r is PriceResult & { price: number } => typeof r.price === 'number')
      if (ok.length > 0) {
        const now = new Date().toISOString()
        const { error: saveError } = await supabase
          .from('stock_prices')
          .upsert(ok.map((r) => ({ stock_code: r.code, price: r.price, updated_at: now })))
        if (saveError) throw saveError
      }
      return results.filter((r) => typeof r.price !== 'number')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRICES_KEY }),
  })
}
