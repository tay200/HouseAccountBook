import {
  bankAccountsApi,
  depositsApi,
  investAccountsApi,
  ledgerApi,
  loansApi,
  realAssetsApi,
  savingsApi,
  snapshotsApi,
  stockHoldingsApi,
  stockTradesApi,
  useStockPrices,
} from '../../api/tables'
import CrudTable, { type Column } from '../../components/CrudTable'
import { StatCard } from '../../components/Numbers'
import { calcDeposit, calcLoan, calcSaving, termByMonths } from '../../lib/finance'
import { formatWon, todayString } from '../../lib/format'
import { analyzeInvest, investSummary, isIncluded } from '../../lib/invest'
import { TERM_LABEL, type NetWorthSnapshot, type Term } from '../../lib/types'

// ─────────────────────────────────────────────
// 자산현황 (엑셀 '자산현황')
// ─────────────────────────────────────────────
type AssetItem = { label: string; group: string; amount: number; term: Term; risky: boolean }

function useAssetItems() {
  const { data: accounts = [] } = bankAccountsApi.useList()
  const { data: deposits = [] } = depositsApi.useList()
  const { data: savings = [] } = savingsApi.useList()
  const { data: loans = [] } = loansApi.useList()
  const { data: realAssets = [] } = realAssetsApi.useList()
  const { data: ledger = [] } = ledgerApi.useList()
  const { data: investAccounts = [] } = investAccountsApi.useList()
  const { data: stockHoldings = [] } = stockHoldingsApi.useList()
  const { data: trades = [] } = stockTradesApi.useList()
  const { data: prices = [] } = useStockPrices()

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
  const invest = investSummary(analyzeInvest(stockHoldings, trades, new Map(prices.map((p) => [p.stock_code, p]))).positions)
  const excludedCount = investAccounts.filter((a) => !isIncluded(a)).length
  const investLabel = excludedCount > 0 ? `투자 평가금액 (투자 탭 합계 제외 계좌 ${excludedCount}개 포함)` : '투자 평가금액'
  if (invest.value > 0) items.push({ label: investLabel, group: '투자', amount: invest.value, term: 'mid', risky: true })

  const financial = items.reduce((s, i) => s + i.amount, 0)
  const real = realAssets.reduce((s, r) => s + r.amount, 0)
  const debt = loans.reduce((s, l) => s + calcLoan(l).balance, 0)
  return { items, financial, real, debt, total: financial + real, net: financial + real - debt }
}

export default function SummaryTab() {
  const { items, financial, real, debt, total, net } = useAssetItems()
  const { data: snapshots = [] } = snapshotsApi.useList()
  const saveSnapshot = snapshotsApi.useSave()
  const deleteSnapshot = snapshotsApi.useDelete()
  const year = Number(todayString().slice(0, 4))

  const byTerm = (['long', 'mid', 'short'] as const).map((t) => ({
    label: TERM_LABEL[t],
    amount: items.filter((i) => i.term === t).reduce((s, i) => s + i.amount, 0),
  }))
  const byRisk = [
    { label: '안정 (입출금·예적금·비상금)', amount: items.filter((i) => !i.risky).reduce((s, i) => s + i.amount, 0) },
    { label: '위험 (투자 자산)', amount: items.filter((i) => i.risky).reduce((s, i) => s + i.amount, 0) },
  ]

  function recordThisYear() {
    const existing = snapshots.find((s) => s.year === year)
    saveSnapshot.mutate({ id: existing?.id, year, amount: net, memo: existing?.memo ?? null })
  }

  const snapshotColumns: Column<NetWorthSnapshot>[] = [
    { key: 'year', label: '연도', input: { type: 'number', step: '1' }, required: true, render: (s) => `${s.year}년` },
    { key: 'amount', label: '순자산', input: { type: 'money' }, required: true, align: 'right' },
    {
      key: 'change',
      label: '전년 대비',
      align: 'right',
      sortValue: (s) => {
        const prev = snapshots.find((p) => p.year === s.year - 1)
        return prev ? s.amount - prev.amount : null
      },
      render: (s) => {
        const prev = snapshots.find((p) => p.year === s.year - 1)
        if (!prev) return '-'
        const diff = s.amount - prev.amount
        const rate = prev.amount !== 0 ? ` (${((diff / Math.abs(prev.amount)) * 100).toFixed(1)}%)` : ''
        return `${diff >= 0 ? '+' : ''}${formatWon(diff)}${rate}`
      },
    },
    { key: 'memo', label: '메모', input: { type: 'text' } },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="금융자산" value={financial} />
        <Stat label="부동자산" value={real} />
        <Stat label="총자산" value={total} />
        <Stat label="부채" value={debt} />
        <Stat label="순자산" value={net} strong />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <RatioCard title="기간별 금융자산" rows={byTerm} total={financial} />
        <RatioCard title="위험자산 비율" rows={byRisk} total={financial} />
        <RatioCard title="금융자산 구성" rows={items.map((i) => ({ label: `${i.group} · ${i.label}`, amount: i.amount }))} total={financial} />
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">연도별 순자산</h3>
          <button className="btn btn-secondary" onClick={recordThisYear} disabled={saveSnapshot.isPending}>
            {year}년 순자산을 현재 값으로 기록
          </button>
        </div>
        <CrudTable
          rows={snapshots}
          columns={snapshotColumns}
          defaults={{ year }}
          onSave={(values) => saveSnapshot.mutateAsync(values)}
          onDelete={(id) => deleteSnapshot.mutate(id)}
        />
      </div>
    </div>
  )
}

/** 금액 카드 (음수면 빨강, 순자산은 강조) */
function Stat({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return <StatCard label={label} value={formatWon(value)} valueClass={value < 0 ? 'text-red-600' : ''} className={strong ? 'border-blue-200 bg-blue-50' : ''} />
}

function RatioCard({ title, rows, total }: { title: string; rows: { label: string; amount: number }[]; total: number }) {
  return (
    <div className="card">
      <h3 className="mb-4 font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">데이터가 없어요.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {/* 이름이 같은 계좌가 있을 수 있어서 순서를 key 에 섞는다 */}
          {rows.map((r, i) => (
            <li key={`${i}-${r.label}`} className="space-y-1">
              <div className="flex justify-between gap-2">
                <span className="truncate">{r.label}</span>
                <span className="whitespace-nowrap tabular-nums">
                  {formatWon(r.amount)} <span className="text-slate-400">{total > 0 ? `${Math.round((r.amount / total) * 100)}%` : ''}</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#2a78d6]" style={{ width: `${total > 0 ? Math.max((r.amount / total) * 100, 0) : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** 만기 지난 예적금 이름 표시 */
function maturedLabel(name: string, matured: boolean) {
  return matured ? `${name} (만기 지남)` : name
}
