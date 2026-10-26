import { Link, useLocation } from 'react-router'
import { useBudgetsRange } from '../api/budgets'
import { goalsApi, monthlySnapshotsApi, recurringRulesApi } from '../api/tables'
import { useTransactions } from '../api/transactions'
import BudgetBar from '../components/BudgetBar'
import ColorDot from '../components/ColorDot'
import MonthlyTrendChart from '../components/MonthlyTrendChart'
import MonthPicker from '../components/MonthPicker'
import NoSpendCalendar from '../components/NoSpendCalendar'
import { SignedWon, StatCard } from '../components/Numbers'
import { useAssetSummary } from '../hooks/useAssetSummary'
import { useLookups } from '../hooks/useLookups'
import { useMonth } from '../hooks/useMonth'
import { currentMonth, formatMonth, formatMonthShort, formatWon, shiftMonth, todayString } from '../lib/format'
import { pendingAmount, recurringForMonth } from '../lib/recurring'
import { changeRate, previousSnapshot, snapshotOf } from '../lib/snapshots'
import {
  budgetCarry,
  budgetUsage,
  consumptionByMonth,
  forecastMonthEnd,
  isConsumption,
  monthSummary,
  sumExpenseBy,
  sumGrouped,
  sumWhere,
} from '../lib/stats'
import type { MonthlySnapshot } from '../lib/types'

function percent(ratio: number | null) {
  return ratio === null || !Number.isFinite(ratio) ? '-' : `${Math.round(ratio * 100)}%`
}

export default function DashboardPage() {
  const [month, setMonth] = useMonth()
  const year = month.slice(0, 4)
  const january = `${year}-01`
  const prevMonth = shiftMonth(month, -1)
  // 작년 12월 ~ 올해 12월을 한 번에 받아서 이번 달 요약, 전월 대비(1월이면 작년 12월), 연간 차트 모두에 쓴다
  const { data: recent = [], isPending } = useTransactions(shiftMonth(january, -1), `${year}-12`)
  // 1월 ~ 이번 달 예산 (이번 달 예산 + 이월 계산)
  const { data: yearBudgets = [], isSuccess: budgetsLoaded } = useBudgetsRange(january, month)
  const { data: goals = [] } = goalsApi.useList()
  const { data: rules = [] } = recurringRulesApi.useList()
  const { majorCategories, majorOf, memberName, paymentName } = useLookups()

  const thisMonth = recent.filter((t) => t.date.startsWith(month))
  const lastMonth = recent.filter((t) => t.date.startsWith(prevMonth))
  const summary = monthSummary(thisMonth)
  const goal = goals.find((g) => g.year === Number(month.slice(0, 4)))

  const trend = Array.from({ length: 12 }, (_, i) => {
    const m = shiftMonth(january, i)
    const s = monthSummary(recent.filter((t) => t.date.startsWith(m)))
    return { label: formatMonthShort(m), income: s.income, expense: s.expense }
  })

  // 변동지출 달력
  const variableByDate = sumGrouped(thisMonth, (t) => t.type === 'expense' && t.kind === 'variable', (t) => t.date)

  // 소비성 지출 분석 (대분류별, 엑셀 '소비성 지출 분석')
  const byMajor = (list: typeof recent) => sumGrouped(list, isConsumption, (t) => majorOf(t.category_id)?.id ?? '')
  const thisByMajor = byMajor(thisMonth)
  const lastByMajor = byMajor(lastMonth)
  // 이월을 켠 대분류는 같은 해 지난달까지 남거나 넘친 돈을 이번 달 예산에 더한다 (예산 화면과 같은 계산)
  const majorIdOf = (t: (typeof recent)[number]) => majorOf(t.category_id)?.id ?? ''
  const carry = budgetCarry(yearBudgets, consumptionByMonth(recent, majorIdOf), month, new Set(majorCategories.filter((c) => c.rollover).map((c) => c.id)))
  const budgets = yearBudgets
    .filter((b) => b.month.startsWith(month))
    .map((b) => ({ ...b, amount: b.amount + (carry.get(b.category_id) ?? 0) }))
  const budgetByCategory = new Map(budgets.map((b) => [b.category_id, b.amount]))
  const budgetIds = new Set(budgetByCategory.keys())

  // 예산을 정한 카테고리에서 아직 [확인]하지 않은 반복 지출 (하루 금액·월말 예상에 미리 넣는다)
  const pending = pendingAmount(
    recurringForMonth(rules, thisMonth, month),
    (r) => r.type === 'expense' && r.kind !== 'saving' && budgetIds.has(majorOf(r.category_id)?.id ?? ''),
  )
  // 남은 예산 카드: 예산 화면과 같은 기준 (예산을 정한 대분류의 소비성 지출)
  const today = todayString()
  const usage = budgetUsage(budgets, thisByMajor, month, today, pending)
  const forecast = forecastMonthEnd({
    spent: usage.spent,
    variable: sumWhere(thisMonth, (t) => t.type === 'expense' && t.kind === 'variable' && budgetIds.has(majorIdOf(t))),
    pending,
    month,
    today,
  })
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
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">대시보드</h2>
        <MonthPicker month={month} onChange={setMonth} />
      </header>

      {/* 불러오기 전에 0원·무지출이 잠깐 보였다 바뀌지 않도록 */}
      {isPending ? (
        <p className="card py-16 text-center text-sm text-slate-400">불러오는 중…</p>
      ) : (
        <>
          {budgetsLoaded && <BudgetLeftCard usage={usage} forecast={forecast} month={month} />}

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
                    <thead className="border-b border-slate-200 text-xs whitespace-nowrap text-slate-500">
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
              <NoSpendCalendar month={month} spentByDate={variableByDate} hasRecords={thisMonth.length > 0} />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <BreakdownCard title="결제수단별 지출" rows={byPayment.map(([id, amount]) => ({ id, name: paymentName(id || null) || '선택 안 함', amount }))} total={summary.expense} />
              <BreakdownCard title="사람별 지출" rows={byMember.map(([id, amount]) => ({ id, name: memberName(id || null), amount }))} total={summary.expense} />
            </div>

            <AssetChangeCard month={month} />
          </div>

          <div className="card">
            <h3 className="mb-4 font-semibold">{year}년 수입·지출</h3>
            <MonthlyTrendChart data={trend} />
          </div>
        </>
      )}
    </section>
  )
}

/** 맨 위 카드: 이번 달 남은 예산, 하루에 쓸 수 있는 금액, 이 속도면 월말에 얼마를 쓸지 */
function BudgetLeftCard({ usage, forecast, month }: { usage: ReturnType<typeof budgetUsage>; forecast: number | null; month: string }) {
  const { search } = useLocation()

  if (usage.budget === 0) {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">예산을 정하면 남은 돈과 하루에 쓸 수 있는 금액을 알려드려요.</p>
        <Link to={{ pathname: '/budget', search }} className="btn btn-secondary">
          예산 정하기
        </Link>
      </div>
    )
  }

  const over = usage.left < 0
  const isPast = month < currentMonth()
  const title = usage.daysLeft !== null ? '이번 달 남은 예산' : isPast ? `${formatMonthShort(month)} 예산 결과` : `${formatMonthShort(month)} 예산`
  return (
    <div className="card flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className={`mt-1 text-2xl font-bold tabular-nums ${over ? 'text-red-600' : ''}`}>
          {over ? `${formatWon(-usage.left)} 초과` : `${formatWon(usage.left)} ${isPast ? '남김' : '남음'}`}
        </p>
        {usage.daysLeft !== null && (
          <p className="mt-1 text-sm text-slate-600">
            {over ? (
              '예산을 넘었어요'
            ) : usage.perDay === 0 ? (
              '나갈 고정 지출을 빼면 더 쓸 돈이 없어요'
            ) : (
              <>하루 <strong className="tabular-nums">{formatWon(usage.perDay ?? 0)}</strong>씩 쓸 수 있어요</>
            )}
            <span className="text-slate-400">
              {' '}
              · 남은 {usage.daysLeft}일{usage.pending > 0 && ` · 나갈 고정 지출 ${formatWon(usage.pending)} 미리 뺌`}
            </span>
          </p>
        )}
        {forecast !== null && (
          <p className={`mt-1 text-sm ${forecast > usage.budget ? 'text-red-600' : 'text-slate-600'}`}>
            이 속도면 월말 <strong className="tabular-nums">{formatWon(forecast)}</strong>
            {forecast > usage.budget ? ` · 예산보다 ${formatWon(forecast - usage.budget)} 초과 예상` : ` · ${formatWon(usage.budget - forecast)} 남을 예상`}
          </p>
        )}
      </div>
      <div className="w-full sm:w-80">
        <BudgetBar spent={usage.spent} budget={usage.budget} />
      </div>
    </div>
  )
}

/**
 * 순자산과 지난 기록 대비 증감. 이번 달은 지금 값, 지난달은 그 달 기록(마지막으로 앱을 연 시점)으로 보여준다.
 * 지난달 기록이 없으면 그 전 기록과 비교한다.
 */
function AssetChangeCard({ month }: { month: string }) {
  const { search } = useLocation()
  const live = useAssetSummary()
  const { data: snapshots = [], isSuccess } = monthlySnapshotsApi.useList()
  const isCurrent = month === currentMonth()
  const saved = snapshotOf(snapshots, month)
  const prev = previousSnapshot(snapshots, month)

  const cur = isCurrent
    ? { net: live.net, total: live.total, debt: live.debt, invest: live.invest.value }
    : saved && { net: saved.net_worth, total: saved.financial + saved.real_assets, debt: saved.debt, invest: saved.invest_value }
  const prevLabel = prev && (prev.month.slice(0, 7) === shiftMonth(month, -1) ? '지난달' : formatMonth(prev.month.slice(0, 7)))
  const savedDate = (s: MonthlySnapshot) => new Date(s.saved_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
  const rate = cur && prev ? changeRate(prev.net_worth, cur.net) : null

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-semibold">{isCurrent ? '순자산' : `${formatMonthShort(month)} 순자산`}</h3>
        <Link to={{ pathname: '/assets', search }} className="text-xs text-blue-600 hover:underline">
          자산 · 부채 보기
        </Link>
      </div>
      {!(isCurrent ? live.isLoaded && isSuccess : isSuccess) ? (
        <p className="py-6 text-center text-sm text-slate-400">불러오는 중…</p>
      ) : !cur ? (
        <p className="py-6 text-center text-sm text-slate-400">이 달에는 자산 기록이 없어요.</p>
      ) : (
        <>
          <p className={`text-2xl font-bold tabular-nums ${cur.net < 0 ? 'text-red-600' : ''}`}>{formatWon(cur.net)}</p>
          <p className="mt-1 text-sm">
            {prev ? (
              <>
                {prevLabel} 대비 <SignedWon value={cur.net - prev.net_worth} />
                {rate !== null && <span className="text-slate-500"> ({rate > 0 ? '+' : ''}{(rate * 100).toFixed(1)}%)</span>}
              </>
            ) : (
              <span className="text-slate-500">다음 달부터 지난달 대비 증감이 보여요.</span>
            )}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {isCurrent || !saved ? '오늘 기준' : `${savedDate(saved)} 기록`}
            {prev && ` · 비교: ${savedDate(prev)} 기록`}
            {isCurrent && live.fxMissing && ' · 환율을 몰라 미국 종목 제외'}
          </p>
          <table className="mt-4 w-full text-sm tabular-nums">
            <tbody className="divide-y divide-slate-100">
              <AssetRow label="총자산" value={cur.total} prev={prev && prev.financial + prev.real_assets} />
              <AssetRow label="부채" value={cur.debt} prev={prev?.debt} />
              <AssetRow label="투자 평가금액" value={cur.invest} prev={prev?.invest_value} />
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

function AssetRow({ label, value, prev }: { label: string; value: number; prev: number | undefined }) {
  return (
    <tr className="whitespace-nowrap">
      <td className="py-2 pr-2 text-slate-600">{label}</td>
      <td className="py-2 text-right">{formatWon(value)}</td>
      <td className="py-2 pl-3 text-right text-xs">{prev === undefined ? '' : <SignedWon value={value - prev} />}</td>
    </tr>
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
