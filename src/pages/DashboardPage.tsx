import { useBudgets } from '../api/budgets'
import { goalsApi } from '../api/tables'
import { useTransactions } from '../api/transactions'
import ColorDot from '../components/ColorDot'
import MonthlyTrendChart from '../components/MonthlyTrendChart'
import MonthPicker from '../components/MonthPicker'
import NoSpendCalendar from '../components/NoSpendCalendar'
import { useLookups } from '../hooks/useLookups'
import { useMonth } from '../hooks/useMonth'
import { formatMonthShort, formatWon, shiftMonth } from '../lib/format'
import { isConsumption, monthSummary, sumExpenseBy, sumGrouped } from '../lib/stats'

const TREND_MONTHS = 6

function percent(ratio: number | null) {
  return ratio === null || !Number.isFinite(ratio) ? '-' : `${Math.round(ratio * 100)}%`
}

export default function DashboardPage() {
  const [month, setMonth] = useMonth()
  const firstMonth = shiftMonth(month, -(TREND_MONTHS - 1))
  const prevMonth = shiftMonth(month, -1)
  // 최근 6개월치를 한 번에 받아서 이번 달 요약, 전월 대비, 추이 차트 모두에 쓴다
  const { data: recent = [] } = useTransactions(firstMonth, month)
  const { data: budgets = [] } = useBudgets(month)
  const { data: goals = [] } = goalsApi.useList()
  const { majorOf, memberName, paymentName } = useLookups()

  const thisMonth = recent.filter((t) => t.date.startsWith(month))
  const lastMonth = recent.filter((t) => t.date.startsWith(prevMonth))
  const summary = monthSummary(thisMonth)
  const goal = goals.find((g) => g.year === Number(month.slice(0, 4)))

  const trend = Array.from({ length: TREND_MONTHS }, (_, i) => {
    const m = shiftMonth(firstMonth, i)
    const s = monthSummary(recent.filter((t) => t.date.startsWith(m)))
    return { label: formatMonthShort(m), income: s.income, expense: s.expense }
  })

  // 변동지출 달력
  const variableByDate = sumGrouped(thisMonth, (t) => t.type === 'expense' && t.kind === 'variable', (t) => t.date)

  // 소비성 지출 분석 (대분류별, 엑셀 '소비성 지출 분석')
  const byMajor = (list: typeof recent) => sumGrouped(list, isConsumption, (t) => majorOf(t.category_id)?.id ?? '')
  const thisByMajor = byMajor(thisMonth)
  const lastByMajor = byMajor(lastMonth)
  const budgetByCategory = new Map(budgets.map((b) => [b.category_id, b.amount]))
  const analysisRows = [...new Set([...thisByMajor.keys(), ...lastByMajor.keys()])]
    .map((id) => {
      const category = majorOf(id || null)
      return {
        id,
        name: category?.name ?? '미분류',
        color: category?.color ?? '#cbd5e1',
        spent: thisByMajor.get(id) ?? 0,
        budget: budgetByCategory.get(id) ?? null,
        last: lastByMajor.get(id) ?? 0,
      }
    })
    .sort((a, b) => b.spent - a.spent)
  const maxSpent = Math.max(...analysisRows.map((r) => r.spent), 1)

  const byPayment = [...sumExpenseBy(thisMonth, (t) => t.payment_method_id ?? '')].sort((a, b) => b[1] - a[1])
  const byMember = [...sumExpenseBy(thisMonth, (t) => t.member_id ?? '')].sort((a, b) => b[1] - a[1])

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">대시보드</h2>
        <MonthPicker month={month} onChange={setMonth} />
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="총 수입" value={formatWon(summary.income)} valueClass="text-blue-600" />
        <StatCard label="총 지출" value={formatWon(summary.expense)} />
        <StatCard label="소비성 지출" value={formatWon(summary.consumption)} />
        <StatCard
          label="저축성 지출"
          value={formatWon(summary.saving)}
          sub={goal?.monthly_saving_target ? `목표 ${formatWon(goal.monthly_saving_target)} 중 ${percent(summary.saving / goal.monthly_saving_target)}` : undefined}
        />
        <StatCard
          label="저축률"
          value={percent(summary.savingRate)}
          sub={goal?.saving_rate_target ? `목표 ${goal.saving_rate_target}%` : undefined}
        />
        <StatCard label="차액" value={formatWon(summary.balance)} valueClass={summary.balance < 0 ? 'text-red-600' : ''} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card">
          <h3 className="mb-4 font-semibold">소비성 지출 분석</h3>
          {analysisRows.length === 0 ? (
            <Empty />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead className="border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="py-2 text-left font-medium">항목</th>
                    <th className="py-2 text-right font-medium">지출</th>
                    <th className="w-24 py-2" />
                    <th className="py-2 text-right font-medium">예산 대비</th>
                    <th className="py-2 text-right font-medium">전월 대비</th>
                    <th className="py-2 text-right font-medium">비율</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analysisRows.map((r) => {
                    const budgetLeft = r.budget === null ? null : r.budget - r.spent
                    const diff = r.spent - r.last
                    return (
                      <tr key={r.id}>
                        <td className="py-2 pr-2 whitespace-nowrap">
                          <span className="inline-flex items-center gap-2">
                            <ColorDot color={r.color} />
                            {r.name}
                          </span>
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">{formatWon(r.spent)}</td>
                        <td className="py-2 pl-3">
                          <div className="h-1.5 rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-[#2a78d6]" style={{ width: `${(r.spent / maxSpent) * 100}%` }} />
                          </div>
                        </td>
                        <td className={`py-2 text-right whitespace-nowrap ${budgetLeft !== null && budgetLeft < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                          {budgetLeft === null ? '-' : budgetLeft >= 0 ? `${formatWon(budgetLeft)} 남음` : `${formatWon(-budgetLeft)} 초과`}
                        </td>
                        <td className="py-2 text-right whitespace-nowrap text-slate-600">
                          {diff === 0 ? '-' : `${diff > 0 ? '▲' : '▼'} ${formatWon(Math.abs(diff))}`}
                        </td>
                        <td className="py-2 text-right text-slate-500">{percent(r.spent / summary.consumption)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="mb-2 font-semibold">변동지출 달력</h3>
          <NoSpendCalendar month={month} spentByDate={variableByDate} />
        </div>

        <div className="card">
          <h3 className="mb-4 font-semibold">최근 {TREND_MONTHS}개월 수입·지출</h3>
          <MonthlyTrendChart data={trend} />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <BreakdownCard title="결제수단별 지출" rows={byPayment.map(([id, amount]) => ({ id, name: paymentName(id || null) || '선택 안 함', amount }))} total={summary.expense} />
          <BreakdownCard title="사람별 지출" rows={byMember.map(([id, amount]) => ({ id, name: memberName(id || null), amount }))} total={summary.expense} />
        </div>
      </div>
    </section>
  )
}

function StatCard({ label, value, valueClass = '', sub }: { label: string; value: string; valueClass?: string; sub?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${valueClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function BreakdownCard({ title, rows, total }: { title: string; rows: { id: string; name: string; amount: number }[]; total: number }) {
  return (
    <div className="card">
      <h3 className="mb-4 font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <table className="w-full text-sm tabular-nums">
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="py-2">{r.name}</td>
                <td className="py-2 text-right">{formatWon(r.amount)}</td>
                <td className="w-12 py-2 text-right text-slate-500">{percent(r.amount / total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Empty() {
  return <p className="py-6 text-center text-sm text-slate-400">이번 달 지출이 없어요.</p>
}
