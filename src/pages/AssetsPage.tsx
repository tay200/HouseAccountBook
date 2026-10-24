import { useState, type ReactNode } from 'react'
import {
  bankAccountsApi,
  depositsApi,
  ledgerApi,
  loansApi,
  realAssetsApi,
  savingsApi,
  snapshotsApi,
  stockHoldingsApi,
  stockTradesApi,
  useStockPrices,
} from '../api/tables'
import CrudTable, { type Column } from '../components/CrudTable'
import { useLookups } from '../hooks/useLookups'
import { formatWon, todayString } from '../lib/format'
import { calcDeposit, calcLoan, calcSaving, termByMonths } from '../lib/finance'
import { analyzeInvest, investSummary } from '../lib/invest'
import {
  LOAN_METHOD_LABEL,
  SAVING_METHOD_LABEL,
  TERM_LABEL,
  type BankAccount,
  type Deposit,
  type InstallmentSaving,
  type Loan,
  type NetWorthSnapshot,
  type RealAsset,
  type Term,
} from '../lib/types'

const TABS = [
  { key: 'summary', label: '자산현황' },
  { key: 'accounts', label: '계좌' },
  { key: 'deposits', label: '예금' },
  { key: 'savings', label: '적금' },
  { key: 'loans', label: '대출' },
  { key: 'real', label: '부동자산' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function AssetsPage() {
  const [tab, setTab] = useState<TabKey>('summary')

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">자산 · 부채</h2>
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'summary' && <SummaryTab />}
      {tab === 'accounts' && <AccountsTab />}
      {tab === 'deposits' && <DepositsTab />}
      {tab === 'savings' && <SavingsTab />}
      {tab === 'loans' && <LoansTab />}
      {tab === 'real' && <RealAssetsTab />}
    </section>
  )
}

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
  const { data: stockHoldings = [] } = stockHoldingsApi.useList()
  const { data: trades = [] } = stockTradesApi.useList()
  const { data: prices = [] } = useStockPrices()

  const items: AssetItem[] = [
    ...accounts.map((a) => ({ label: a.name, group: '계좌', amount: a.balance, term: a.term, risky: false })),
    ...deposits.map((d) => {
      const c = calcDeposit(d)
      return { label: d.name, group: '예금', amount: c.current, term: termByMonths(c.total), risky: false }
    }),
    ...savings.map((s) => {
      const c = calcSaving(s)
      return { label: s.name, group: '적금', amount: c.current, term: termByMonths(c.total), risky: false }
    }),
  ]

  // 통장 기록(공동통장, 비상금 등)의 잔액도 단기 안정 자산으로 본다
  const books = new Map<string, number>()
  for (const e of ledger) books.set(e.book, (books.get(e.book) ?? 0) + (e.direction === 'in' ? e.amount : -e.amount))
  for (const [book, balance] of books) items.push({ label: book, group: '통장 기록', amount: balance, term: 'short', risky: false })

  const invest = investSummary(analyzeInvest(stockHoldings, trades, new Map(prices.map((p) => [p.stock_code, p]))).positions)
  if (invest.value > 0) items.push({ label: '투자 평가금액', group: '투자', amount: invest.value, term: 'mid', risky: true })

  const financial = items.reduce((s, i) => s + i.amount, 0)
  const real = realAssets.reduce((s, r) => s + r.amount, 0)
  const debt = loans.reduce((s, l) => s + calcLoan(l).balance, 0)
  return { items, financial, real, debt, total: financial + real, net: financial + real - debt }
}

function SummaryTab() {
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

function Stat({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`card ${strong ? 'border-blue-200 bg-blue-50' : ''}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${value < 0 ? 'text-red-600' : ''}`}>{formatWon(value)}</p>
    </div>
  )
}

function RatioCard({ title, rows, total }: { title: string; rows: { label: string; amount: number }[]; total: number }) {
  return (
    <div className="card">
      <h3 className="mb-4 font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">데이터가 없어요.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {rows.map((r) => (
            <li key={r.label} className="space-y-1">
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

// ─────────────────────────────────────────────
// 탭별 목록
// ─────────────────────────────────────────────
function useMemberColumn<T extends { member_id: string | null }>(): Column<T> {
  const { members, memberName } = useLookups()
  return {
    key: 'member_id',
    label: '사람',
    input: { type: 'select', options: members.map((m) => ({ value: m.id, label: m.name })), emptyLabel: '공동' },
    render: (row) => memberName(row.member_id),
  }
}

const TERM_OPTIONS = (['long', 'mid', 'short'] as const).map((t) => ({ value: t, label: TERM_LABEL[t] }))
const pct = (v: number) => `${v}%`

function AccountsTab() {
  const { data = [] } = bankAccountsApi.useList()
  const save = bankAccountsApi.useSave()
  const remove = bankAccountsApi.useDelete()
  const memberColumn = useMemberColumn<BankAccount>()
  const columns: Column<BankAccount>[] = [
    { key: 'bank', label: '은행', input: { type: 'text' } },
    { key: 'kind', label: '종류', input: { type: 'text', placeholder: '입출금, 청약, 연금…' } },
    { key: 'term', label: '기간', input: { type: 'select', options: TERM_OPTIONS }, required: true },
    { key: 'name', label: '계좌명', input: { type: 'text' }, required: true },
    { key: 'account_number', label: '계좌번호', input: { type: 'text' } },
    { key: 'purpose', label: '용도', input: { type: 'text' } },
    memberColumn,
    { key: 'opened_on', label: '가입일', input: { type: 'date' } },
    { key: 'balance', label: '현재금액', input: { type: 'money' }, required: true, align: 'right' },
    { key: 'memo', label: '비고', input: { type: 'text' } },
  ]
  return (
    <TabCard note="예금·적금·투자·통장 기록에 이미 넣은 돈은 여기에 중복으로 넣지 마세요.">
      <CrudTable rows={data} columns={columns} defaults={{ term: 'short', balance: 0 }} onSave={(v) => save.mutateAsync(v)} onDelete={(id) => remove.mutate(id)} />
      <TotalLine label="계좌 합계" amount={data.reduce((s, a) => s + a.balance, 0)} />
    </TabCard>
  )
}

function DepositsTab() {
  const { data = [] } = depositsApi.useList()
  const save = depositsApi.useSave()
  const remove = depositsApi.useDelete()
  const memberColumn = useMemberColumn<Deposit>()
  const columns: Column<Deposit>[] = [
    { key: 'bank', label: '은행', input: { type: 'text' } },
    { key: 'name', label: '예금명', input: { type: 'text' }, required: true },
    memberColumn,
    { key: 'start_date', label: '가입일', input: { type: 'date' }, required: true },
    { key: 'maturity_date', label: '만기일', input: { type: 'date' }, required: true },
    { key: 'principal', label: '원금', input: { type: 'money' }, required: true, align: 'right' },
    { key: 'rate', label: '금리(%)', input: { type: 'number' }, required: true, align: 'right', render: (d) => pct(d.rate) },
    { key: 'tax_rate', label: '세율(%)', input: { type: 'number' }, required: true, align: 'right', render: (d) => pct(d.tax_rate) },
    { key: 'remain', label: '남은 기간', render: (d) => (calcDeposit(d).matured ? '만기' : `${calcDeposit(d).remaining}개월`) },
    { key: 'after', label: '세후이자', align: 'right', render: (d) => formatWon(calcDeposit(d).afterTax) },
    { key: 'receive', label: '예상수령액', align: 'right', render: (d) => formatWon(calcDeposit(d).maturityAmount) },
  ]
  return (
    <TabCard>
      <CrudTable rows={data} columns={columns} defaults={{ tax_rate: 15.4, start_date: todayString() }} onSave={(v) => save.mutateAsync(v)} onDelete={(id) => remove.mutate(id)} />
      <TotalLine label="원금 합계" amount={data.reduce((s, d) => s + d.principal, 0)} />
      <TotalLine label="예상수령액 합계" amount={data.reduce((s, d) => s + calcDeposit(d).maturityAmount, 0)} />
    </TabCard>
  )
}

function SavingsTab() {
  const { data = [] } = savingsApi.useList()
  const save = savingsApi.useSave()
  const remove = savingsApi.useDelete()
  const memberColumn = useMemberColumn<InstallmentSaving>()
  const columns: Column<InstallmentSaving>[] = [
    { key: 'bank', label: '은행', input: { type: 'text' } },
    { key: 'name', label: '적금명', input: { type: 'text' }, required: true },
    memberColumn,
    { key: 'start_date', label: '가입일', input: { type: 'date' }, required: true },
    { key: 'maturity_date', label: '만기일', input: { type: 'date' }, required: true },
    { key: 'monthly_amount', label: '월 적립액', input: { type: 'money' }, required: true, align: 'right' },
    { key: 'rate', label: '금리(%)', input: { type: 'number' }, required: true, align: 'right', render: (s) => pct(s.rate) },
    { key: 'tax_rate', label: '세율(%)', input: { type: 'number' }, required: true, align: 'right', render: (s) => pct(s.tax_rate) },
    {
      key: 'method',
      label: '방식',
      input: { type: 'select', options: Object.entries(SAVING_METHOD_LABEL).map(([value, label]) => ({ value, label })) },
      required: true,
    },
    { key: 'current', label: '현재저축액', align: 'right', render: (s) => formatWon(calcSaving(s).current) },
    { key: 'after', label: '세후이자', align: 'right', render: (s) => formatWon(calcSaving(s).afterTax) },
    { key: 'receive', label: '예상수령액', align: 'right', render: (s) => formatWon(calcSaving(s).maturityAmount) },
  ]
  return (
    <TabCard note="현재저축액은 가입일부터 매달 빠짐없이 납입했다고 가정해서 계산해요.">
      <CrudTable rows={data} columns={columns} defaults={{ tax_rate: 15.4, method: 'simple', start_date: todayString() }} onSave={(v) => save.mutateAsync(v)} onDelete={(id) => remove.mutate(id)} />
      <TotalLine label="현재저축액 합계" amount={data.reduce((s, x) => s + calcSaving(x).current, 0)} />
    </TabCard>
  )
}

function LoansTab() {
  const { data = [] } = loansApi.useList()
  const save = loansApi.useSave()
  const remove = loansApi.useDelete()
  const columns: Column<Loan>[] = [
    { key: 'lender', label: '기관', input: { type: 'text' } },
    { key: 'name', label: '대출명', input: { type: 'text' }, required: true },
    { key: 'start_date', label: '대출일', input: { type: 'date' }, required: true },
    { key: 'maturity_date', label: '만기일', input: { type: 'date' }, required: true },
    { key: 'principal', label: '대출금액', input: { type: 'money' }, required: true, align: 'right' },
    { key: 'rate', label: '금리(%)', input: { type: 'number' }, required: true, align: 'right', render: (l) => pct(l.rate) },
    {
      key: 'method',
      label: '상환방식',
      input: { type: 'select', options: Object.entries(LOAN_METHOD_LABEL).map(([value, label]) => ({ value, label })) },
      required: true,
    },
    { key: 'monthly', label: '이번 달 상환액', align: 'right', render: (l) => formatWon(calcLoan(l).nextPayment) },
    { key: 'interest', label: '총 이자', align: 'right', render: (l) => formatWon(calcLoan(l).totalInterest) },
    { key: 'paid', label: '누적상환', align: 'right', render: (l) => formatWon(calcLoan(l).paid) },
    { key: 'balance', label: '대출잔금', align: 'right', render: (l) => formatWon(calcLoan(l).balance) },
  ]
  return (
    <TabCard note="'상세'를 누르면 월별 상환 스케줄을 볼 수 있어요.">
      <CrudTable
        rows={data}
        columns={columns}
        defaults={{ method: 'equal_payment', start_date: todayString() }}
        onSave={(v) => save.mutateAsync(v)}
        onDelete={(id) => remove.mutate(id)}
        renderDetail={(loan) => <LoanScheduleTable loan={loan} />}
      />
      <TotalLine label="대출잔금 합계" amount={data.reduce((s, l) => s + calcLoan(l).balance, 0)} />
    </TabCard>
  )
}

function LoanScheduleTable({ loan }: { loan: Loan }) {
  const { rows, elapsed } = calcLoan(loan)
  return (
    <div className="max-h-80 overflow-y-auto">
      <table className="w-full text-xs tabular-nums">
        <thead className="sticky top-0 bg-slate-50 text-slate-500">
          <tr>
            <th className="py-1 text-left font-medium">회차</th>
            <th className="py-1 text-right font-medium">상환액</th>
            <th className="py-1 text-right font-medium">원금</th>
            <th className="py-1 text-right font-medium">이자</th>
            <th className="py-1 text-right font-medium">잔금</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month} className={r.month <= elapsed ? 'text-slate-400' : ''}>
              <td className="py-0.5">{r.month}</td>
              <td className="py-0.5 text-right">{formatWon(r.payment)}</td>
              <td className="py-0.5 text-right">{formatWon(r.principal)}</td>
              <td className="py-0.5 text-right">{formatWon(r.interest)}</td>
              <td className="py-0.5 text-right">{formatWon(r.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RealAssetsTab() {
  const { data = [] } = realAssetsApi.useList()
  const save = realAssetsApi.useSave()
  const remove = realAssetsApi.useDelete()
  const columns: Column<RealAsset>[] = [
    { key: 'name', label: '내용', input: { type: 'text', placeholder: '전세보증금, 차량 평가액…' }, required: true },
    { key: 'amount', label: '금액', input: { type: 'money' }, required: true, align: 'right' },
    { key: 'memo', label: '메모', input: { type: 'text' } },
  ]
  return (
    <TabCard>
      <CrudTable rows={data} columns={columns} onSave={(v) => save.mutateAsync(v)} onDelete={(id) => remove.mutate(id)} />
      <TotalLine label="부동자산 합계" amount={data.reduce((s, r) => s + r.amount, 0)} />
    </TabCard>
  )
}

function TabCard({ note, children }: { note?: string; children: ReactNode }) {
  return (
    <div className="card space-y-3">
      {note && <p className="text-xs text-slate-500">{note}</p>}
      {children}
    </div>
  )
}

function TotalLine({ label, amount }: { label: string; amount: number }) {
  return (
    <p className="flex justify-end gap-3 border-t border-slate-200 pt-3 text-sm tabular-nums">
      <span className="text-slate-500">{label}</span>
      <strong>{formatWon(amount)}</strong>
    </p>
  )
}
