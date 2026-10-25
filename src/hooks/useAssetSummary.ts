import {
  bankAccountsApi,
  depositsApi,
  investAccountsApi,
  investIncomesApi,
  ledgerApi,
  loansApi,
  realAssetsApi,
  savingsApi,
  stockHoldingsApi,
  stockTradesApi,
  useStockPrices,
} from '../api/tables'
import { calcDeposit, calcLoan, calcSaving, termByMonths } from '../lib/finance'
import { analyzeInvest, investSummary, isIncluded, withIncomes } from '../lib/invest'
import type { SnapshotAccount, Term } from '../lib/types'

export type AssetItem = { label: string; group: string; amount: number; term: Term; risky: boolean }

/**
 * 지금 이 순간의 자산·부채·투자 합계 (자산현황, 대시보드, 월별 기록 공용)
 * 계좌 잔액은 직접 입력한 현재 값, 투자는 현재 시세로 계산한다.
 */
export function useAssetSummary() {
  const queries = {
    accounts: bankAccountsApi.useList(),
    deposits: depositsApi.useList(),
    savings: savingsApi.useList(),
    loans: loansApi.useList(),
    realAssets: realAssetsApi.useList(),
    ledger: ledgerApi.useList(),
    investAccounts: investAccountsApi.useList(),
    stockHoldings: stockHoldingsApi.useList(),
    trades: stockTradesApi.useList(),
    prices: useStockPrices(),
    incomes: investIncomesApi.useList(),
  }
  // 하나라도 덜 받았으면 합계가 작게 나오므로, 월별 기록은 전부 받은 뒤에만 저장한다
  const isLoaded = Object.values(queries).every((q) => q.isSuccess)
  const accounts = queries.accounts.data ?? []
  const deposits = queries.deposits.data ?? []
  const savings = queries.savings.data ?? []
  const loans = queries.loans.data ?? []
  const realAssets = queries.realAssets.data ?? []
  const ledger = queries.ledger.data ?? []
  const investAccounts = queries.investAccounts.data ?? []
  const stockHoldings = queries.stockHoldings.data ?? []
  const trades = queries.trades.data ?? []
  const prices = queries.prices.data ?? []
  const incomes = queries.incomes.data ?? []

  const items: AssetItem[] = [
    ...accounts.map((a) => ({ label: a.name, group: '계좌', amount: a.balance, term: a.term, risky: false })),
    // 만기가 지난 예적금은 세후 수령액으로 넣는다 (다른 계좌로 옮겼으면 정리해 주세요)
    ...deposits.map((d) => {
      const c = calcDeposit(d)
      return { label: maturedLabel(d.name, c.matured), group: '예금', amount: c.matured ? c.maturityAmount : c.current, term: termByMonths(c.total), risky: false }
    }),
    ...savings.map((s) => {
      const c = calcSaving(s)
      return { label: maturedLabel(s.name, c.matured), group: '적금', amount: c.matured ? c.maturityAmount : c.current, term: termByMonths(c.total), risky: false }
    }),
  ]

  // 통장 기록(공동통장, 비상금 등)의 잔액도 단기 안정 자산으로 본다
  const books = new Map<string, number>()
  for (const e of ledger) books.set(e.book, (books.get(e.book) ?? 0) + (e.direction === 'in' ? e.amount : -e.amount))
  for (const [book, balance] of books) items.push({ label: book, group: '통장 기록', amount: balance, term: 'short', risky: false })

  // 순자산에는 투자 탭에서 '합계 포함'을 끈 계좌(연금 등)도 넣는다 (내 자산이므로)
  const { positions } = analyzeInvest(stockHoldings, trades, new Map(prices.map((p) => [p.stock_code, p])))
  const allInvest = investSummary(positions)
  const excludedCount = investAccounts.filter((a) => !isIncluded(a)).length
  const investLabel = excludedCount > 0 ? `투자 평가금액 (투자 탭 합계 제외 계좌 ${excludedCount}개 포함)` : '투자 평가금액'
  if (allInvest.value > 0) items.push({ label: investLabel, group: '투자', amount: allInvest.value, term: 'mid', risky: true })

  // 투자 탭 기준 합계('합계 포함' 계좌만)와 계좌별 값
  // realized 는 매도 실현손익 + 직접 입력한 판매수익·배당금 누계 (월별 추이의 '수익' 계산용)
  const includedIds = new Set(investAccounts.filter(isIncluded).map((a) => a.id))
  const included = withIncomes(
    investSummary(positions.filter((p) => includedIds.has(p.accountId))),
    incomes.filter((i) => includedIds.has(i.account_id)),
  )
  const invest = { value: included.value, cost: included.cost, realized: included.earned }
  const investByAccount: SnapshotAccount[] = investAccounts.map((a) => {
    const s = withIncomes(investSummary(positions.filter((p) => p.accountId === a.id)), incomes.filter((i) => i.account_id === a.id))
    return { id: a.id, name: a.name, included: isIncluded(a), value: s.value, cost: s.cost, realized: s.earned }
  })
  // 환율을 몰라 미국 종목이 합계에서 빠진 상태 (기록하면 투자금이 줄어든 것처럼 보임)
  const fxMissing = positions.some((p) => p.quantity > 0 && p.fxMissing)

  const financial = items.reduce((s, i) => s + i.amount, 0)
  const real = realAssets.reduce((s, r) => s + r.amount, 0)
  const debt = loans.reduce((s, l) => s + calcLoan(l).balance, 0)
  return { isLoaded, fxMissing, items, financial, real, debt, total: financial + real, net: financial + real - debt, invest, investByAccount }
}

/** 만기 지난 예적금 이름 표시 */
function maturedLabel(name: string, matured: boolean) {
  return matured ? `${name} (만기 지남)` : name
}
