import { Link } from 'react-router'
import { useBudgets } from '../api/budgets'
import { useCategories } from '../api/categories'
import { usePaymentMethods } from '../api/paymentMethods'
import { useTransactions } from '../api/transactions'
import BudgetBar from '../components/BudgetBar'
import ColorDot from '../components/ColorDot'
import MonthlyTrendChart from '../components/MonthlyTrendChart'
import MonthPicker from '../components/MonthPicker'
import { useMonth } from '../hooks/useMonth'
import { formatMonthShort, formatWon, shiftMonth } from '../lib/format'
import { sumByType, sumExpenseBy } from '../lib/stats'

const TREND_MONTHS = 6

export default function DashboardPage() {
  const [month, setMonth] = useMonth()
  const firstMonth = shiftMonth(month, -(TREND_MONTHS - 1))
  // 최근 6개월치를 한 번에 받아서, 이번 달 요약과 추이 차트 모두에 쓴다
  const { data: recent = [] } = useTransactions(firstMonth, month)
  const { data: categories = [] } = useCategories()
  const { data: paymentMethods = [] } = usePaymentMethods()
  const { data: budgets = [] } = useBudgets(month)

  const thisMonth = recent.filter((t) => t.date.startsWith(month))
  const income = sumByType(thisMonth, 'income')
  const expense = sumByType(thisMonth, 'expense')

  const trend = Array.from({ length: TREND_MONTHS }, (_, i) => {
    const m = shiftMonth(firstMonth, i)
    const items = recent.filter((t) => t.date.startsWith(m))
    return { label: formatMonthShort(m), income: sumByType(items, 'income'), expense: sumByType(items, 'expense') }
  })

  const categoryById = new Map(categories.map((c) => [c.id, c]))
  const byCategory = [...sumExpenseBy(thisMonth, (t) => t.category_id ?? '')]
    .map(([id, amount]) => ({ id, amount, category: categoryById.get(id) }))
    .sort((a, b) => b.amount - a.amount)
  const maxCategoryAmount = byCategory[0]?.amount ?? 0

  const paymentById = new Map(paymentMethods.map((p) => [p.id, p]))
  const byPayment = [...sumExpenseBy(thisMonth, (t) => t.payment_method_id ?? '')]
    .map(([id, amount]) => ({ id, amount, name: paymentById.get(id)?.name ?? '선택 안 함' }))
    .sort((a, b) => b.amount - a.amount)

  const spentByCategory = sumExpenseBy(thisMonth, (t) => t.category_id ?? '')
  const budgetRows = budgets
    .map((b) => ({ ...b, spent: spentByCategory.get(b.category_id) ?? 0, category: categoryById.get(b.category_id) }))
    .sort((a, b) => b.spent / b.amount - a.spent / a.amount)

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">대시보드</h2>
        <MonthPicker month={month} onChange={setMonth} />
      </header>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="수입" value={income} valueClass="text-blue-600" />
        <StatCard label="지출" value={expense} />
        <StatCard label="잔액" value={income - expense} valueClass={income - expense < 0 ? 'text-red-600' : ''} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card">
          <h3 className="mb-4 font-semibold">카테고리별 지출</h3>
          {byCategory.length === 0 ? (
            <Empty />
          ) : (
            <ul className="space-y-3">
              {byCategory.map(({ id, amount, category }) => (
                <li key={id} className="grid grid-cols-[7rem_1fr_6.5rem_3rem] items-center gap-3 text-sm">
                  <span className="flex items-center gap-2 truncate">
                    <ColorDot color={category?.color ?? '#cbd5e1'} />
                    {category?.name ?? '미분류'}
                  </span>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#2a78d6]"
                      style={{ width: `${(amount / maxCategoryAmount) * 100}%` }}
                    />
                  </div>
                  <span className="text-right tabular-nums">{formatWon(amount)}</span>
                  <span className="text-right text-slate-500 tabular-nums">{Math.round((amount / expense) * 100)}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h3 className="mb-4 font-semibold">최근 {TREND_MONTHS}개월 수입·지출</h3>
          <MonthlyTrendChart data={trend} />
        </div>

        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">예산 현황</h3>
            <Link to={{ pathname: '/budget', search: `?month=${month}` }} className="text-sm text-blue-600 hover:underline">
              예산 관리 →
            </Link>
          </div>
          {budgetRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">이번 달 예산이 없어요.</p>
          ) : (
            <ul className="space-y-4">
              {budgetRows.map((b) => (
                <li key={b.id} className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2">
                      <ColorDot color={b.category?.color ?? '#cbd5e1'} />
                      {b.category?.name}
                    </span>
                    <span className="text-slate-500 tabular-nums">
                      {formatWon(b.spent)} / {formatWon(b.amount)}
                    </span>
                  </div>
                  <BudgetBar spent={b.spent} budget={b.amount} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h3 className="mb-4 font-semibold">결제수단별 지출</h3>
          {byPayment.length === 0 ? (
            <Empty />
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {byPayment.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2">{p.name}</td>
                    <td className="py-2 text-right tabular-nums">{formatWon(p.amount)}</td>
                    <td className="w-16 py-2 text-right text-slate-500 tabular-nums">
                      {Math.round((p.amount / expense) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  )
}

function StatCard({ label, value, valueClass = '' }: { label: string; value: number; valueClass?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{formatWon(value)}</p>
    </div>
  )
}

function Empty() {
  return <p className="py-6 text-center text-sm text-slate-400">이번 달 지출이 없어요.</p>
}
