import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type {
  BankAccount,
  Deposit,
  Goal,
  InstallmentSaving,
  InvestAccount,
  LedgerEntry,
  Loan,
  Member,
  NetWorthSnapshot,
  RealAsset,
  StockHolding,
  StockPrice,
  StockTrade,
} from '../lib/types'
import { createTableApi } from './createTableApi'

// '목록 + 추가/수정/삭제'만 필요한 테이블들
export const membersApi = createTableApi<Member>('members', {
  alsoInvalidate: [['transactions'], ['ledger_entries']],
})
export const goalsApi = createTableApi<Goal>('goals', { order: [{ column: 'year' }] })

export const investAccountsApi = createTableApi<InvestAccount>('invest_accounts', {
  alsoInvalidate: [['stock_holdings'], ['stock_trades']],
})
export const stockHoldingsApi = createTableApi<StockHolding>('stock_holdings')
// 날짜가 없는 기록(엑셀에서 옮긴 것)은 가장 오래된 것으로 보고 맨 앞에
export const stockTradesApi = createTableApi<StockTrade>('stock_trades', {
  order: [{ column: 'trade_date', ascending: true, nullsFirst: true }, { column: 'created_at' }],
})

export const bankAccountsApi = createTableApi<BankAccount>('bank_accounts')
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
      const ok = results.filter((r) => typeof r.price === 'number')
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
