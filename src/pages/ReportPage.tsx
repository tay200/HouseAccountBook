import { useState } from 'react'
import { goalsApi } from '../api/tables'
import { useTransactions } from '../api/transactions'
import AmountInput from '../components/AmountInput'
import MonthlyTrendChart from '../components/MonthlyTrendChart'
import PivotTable from '../components/PivotTable'
import { useLookups } from '../hooks/useLookups'
import { formatNumber, todayString } from '../lib/format'
import { monthSummary } from '../lib/stats'
import type { Goal, Transaction } from '../lib/types'

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

type Tab = { key: string; label: string }
const TABS: Tab[] = [
  { key: 'income', label: '항목별 수입' },
  { key: 'expense', label: '항목별 지출' },
  { key: 'expenseDetail', label: '세부항목별 지출' },
  { key: 'payment', label: '카드별 지출' },
  { key: 'member', label: '사람별 지출' },
]

function percent(ratio: number | null) {
  return ratio === null || !Number.isFinite(ratio) ? '-' : `${Math.round(ratio * 100)}%`
}

export default function ReportPage() {
  const [year, setYear] = useState(Number(todayString().slice(0, 4)))
  const [tab, setTab] = useState('expense')
  const { data: transactions = [] } = useTransactions(`${year}-01`, `${year}-12`)
  const { data: goals = [] } = goalsApi.useList()
  const { majorOf, categoryLabel, memberName, paymentName } = useLookups()
  const goal = goals.find((g) => g.year === year)

  // 월별 요약 (엑셀 '메인 > 월별 리포트')
  const monthly = MONTHS.map((m) => monthSummary(transactions.filter((t) => Number(t.date.slice(5, 7)) === m)))
  const activeMonths = monthly.filter((s) => s.income > 0 || s.expense > 0).length || 1
  const total = monthSummary(transactions)

  const reportRows: { label: string; get: (s: ReturnType<typeof monthSummary>) => number | null; isRate?: boolean }[] = [
    { label: '수입', get: (s) => s.income },
    { label: '총 지출', get: (s) => s.expense },
    { label: '└ 저축성 지출', get: (s) => s.saving },
    { label: '└ 소비성 지출', get: (s) => s.consumption },
    { label: '차액', get: (s) => s.balance },
    { label: '저축률', get: (s) => s.savingRate, isRate: true },
  ]

  const isExpense = (t: Transaction) => t.type === 'expense'
  const pivot = {
    income: { filter: (t: Transaction) => t.type === 'income', rowKey: (t: Transaction) => majorOf(t.category_id)?.id ?? '', rowLabel: (k: string) => majorOf(k || null)?.name ?? '미분류' },
    expense: { filter: isExpense, rowKey: (t: Transaction) => majorOf(t.category_id)?.id ?? '', rowLabel: (k: string) => majorOf(k || null)?.name ?? '미분류' },
    expenseDetail: { filter: isExpense, rowKey: (t: Transaction) => t.category_id ?? '', rowLabel: (k: string) => categoryLabel(k || null) },
    payment: { filter: isExpense, rowKey: (t: Transaction) => t.payment_method_id ?? '', rowLabel: (k: string) => paymentName(k || null) || '선택 안 함' },
    member: { filter: isExpense, rowKey: (t: Transaction) => t.member_id ?? '', rowLabel: (k: string) => memberName(k || null) },
  }[tab]!

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">연간 리포트</h2>
        <div className="flex items-center gap-1">
          <button className="btn btn-text" onClick={() => setYear(year - 1)} aria-label="이전 해">◀</button>
          <span className="w-20 text-center text-lg font-semibold">{year}년</span>
          <button className="btn btn-text" onClick={() => setYear(year + 1)} aria-label="다음 해">▶</button>
        </div>
      </header>

      <GoalCard key={`${year}-${goal?.id ?? ''}`} year={year} goal={goal} />

      <div className="card space-y-4">
        <h3 className="font-semibold">월별 리포트</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2 pr-3 text-left font-medium">구분</th>
                {MONTHS.map((m) => (
                  <th key={m} className="px-2 py-2 text-right font-medium">{m}월</th>
                ))}
                <th className="px-2 py-2 text-right font-semibold text-slate-700">계</th>
                <th className="py-2 pl-2 text-right font-medium">평균</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportRows.map((r) => (
                <tr key={r.label}>
                  <td className="py-2 pr-3 whitespace-nowrap">{r.label}</td>
                  {monthly.map((s, i) => {
                    const v = r.get(s)
                    return (
                      <td key={i} className={`px-2 py-2 text-right ${!v ? 'text-slate-300' : v < 0 ? 'text-red-600' : ''}`}>
                        {r.isRate ? percent(v) : v ? formatNumber(v) : '-'}
                      </td>
                    )
                  })}
                  <td className="px-2 py-2 text-right font-semibold">{r.isRate ? percent(r.get(total)) : formatNumber(r.get(total) ?? 0)}</td>
                  <td className="py-2 pl-2 text-right text-slate-500">
                    {r.isRate ? '' : formatNumber(Math.round((r.get(total) ?? 0) / activeMonths))}
                  </td>
                </tr>
              ))}
              {goal?.monthly_saving_target ? (
                <tr>
                  <td className="py-2 pr-3 whitespace-nowrap">저축 목표 달성</td>
                  {monthly.map((s, i) => (
                    <td key={i} className={`px-2 py-2 text-right ${s.saving === 0 ? 'text-slate-300' : s.saving >= goal.monthly_saving_target ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {s.saving === 0 ? '-' : percent(s.saving / goal.monthly_saving_target)}
                    </td>
                  ))}
                  <td colSpan={2} />
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <MonthlyTrendChart data={monthly.map((s, i) => ({ label: `${i + 1}월`, income: s.income, expense: s.expense }))} />
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap gap-1 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <PivotTable transactions={transactions} {...pivot} />
      </div>
    </section>
  )
}

/** 연도별 재무 목표 입력 (엑셀 '메인 > 재무목표') */
function GoalCard({ year, goal }: { year: number; goal: Goal | undefined }) {
  const save = goalsApi.useSave()
  const [target, setTarget] = useState<number | null>(goal?.monthly_saving_target || null)
  const [rate, setRate] = useState(goal?.saving_rate_target ? String(goal.saving_rate_target) : '')
  const changed = (target ?? 0) !== (goal?.monthly_saving_target ?? 0) || Number(rate || 0) !== (goal?.saving_rate_target ?? 0)

  return (
    <div className="card flex flex-wrap items-end gap-4">
      <h3 className="mr-auto self-center font-semibold">{year}년 재무 목표</h3>
      <label className="space-y-1">
        <span className="text-xs text-slate-500">월 목표 저축액</span>
        <AmountInput className="w-40" value={target} onChange={setTarget} />
      </label>
      <label className="space-y-1">
        <span className="text-xs text-slate-500">목표 저축률 (%)</span>
        <input type="number" className="input w-28 text-right" value={rate} onChange={(e) => setRate(e.target.value)} />
      </label>
      <button
        className="btn btn-primary"
        disabled={!changed || save.isPending}
        onClick={() => save.mutate({ id: goal?.id, year, monthly_saving_target: target ?? 0, saving_rate_target: Number(rate || 0) })}
      >
        저장
      </button>
    </div>
  )
}
