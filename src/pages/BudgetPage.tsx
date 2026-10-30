import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useBudgets, useBudgetsRange, useCopyBudgets, useSaveBudget } from '../api/budgets'
import { useSetRollover } from '../api/categories'
import { useTransactions } from '../api/transactions'
import AmountInput from '../components/AmountInput'
import BudgetBar from '../components/BudgetBar'
import ColorDot from '../components/ColorDot'
import MonthPicker from '../components/MonthPicker'
import SavingGoalsCard from '../components/SavingGoalsCard'
import { useLookups } from '../hooks/useLookups'
import { useMonth } from '../hooks/useMonth'
import { formatMonthShort, formatWon, shiftMonth, todayString } from '../lib/format'
import { budgetCarry, budgetUsage, consumptionByMonth, isConsumption, monthElapsed, sumGrouped } from '../lib/stats'
import { transactionsLink } from '../lib/txFilters'
import type { Budget, Category } from '../lib/types'

export default function BudgetPage() {
  const [month, setMonth] = useMonth()
  const january = `${month.slice(0, 4)}-01`
  const { majorCategories, majorOf } = useLookups()
  // 이월 계산을 위해 1월 ~ 이번 달 예산·거래를 받는다
  const { data: yearBudgets = [], isSuccess: budgetsLoaded } = useBudgetsRange(january, month)
  const { data: yearTransactions = [] } = useTransactions(january, month)
  const copyBudgets = useCopyBudgets()
  const prevMonth = shiftMonth(month, -1)
  const { data: prevBudgets = [] } = useBudgets(prevMonth)

  // 예산은 지출 대분류 단위로 잡고, 소분류 거래는 대분류로 합산한다
  // 사용액은 대시보드 '예산 대비'와 같이 소비성 지출만 센다 (저축성 지출은 쓴 돈이 아니라 모은 돈)
  const expenseCategories = majorCategories.filter((c) => c.type === 'expense')
  const budgets = yearBudgets.filter((b) => b.month.startsWith(month))
  const budgetByCategory = new Map(budgets.map((b) => [b.category_id, b]))
  const majorIdOf = (t: (typeof yearTransactions)[number]) => majorOf(t.category_id)?.id ?? ''
  const thisMonth = yearTransactions.filter((t) => t.date.startsWith(month))
  const spentByCategory = sumGrouped(thisMonth, isConsumption, majorIdOf)

  // 이월: 켠 대분류는 같은 해 지난달까지 남거나 넘친 돈을 이번 달 예산에 더한다
  const rolloverIds = new Set(expenseCategories.filter((c) => c.rollover).map((c) => c.id))
  const carry = budgetCarry(yearBudgets, consumptionByMonth(yearTransactions, majorIdOf), month, rolloverIds)
  const effective = budgets.map((b) => ({ ...b, amount: b.amount + (carry.get(b.category_id) ?? 0) }))

  // 예산을 정한 카테고리에서 쓴 돈만 합산해야 '예산 대비'가 맞다 (대시보드 '남은 예산'과 같은 계산)
  const { budget: totalBudget, spent: totalSpent } = budgetUsage(effective, spentByCategory, month, todayString())

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">예산</h2>
        <MonthPicker month={month} onChange={setMonth} />
      </header>

      <div className="card space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{formatMonthShort(month)} 총 예산{carry.size > 0 && ' (이월 포함)'}</p>
            <p className="text-2xl font-bold tabular-nums">{formatWon(totalBudget)}</p>
          </div>
          {/* 이 달 예산이 비어 있고 지난달 예산이 있을 때만 복사 버튼 */}
          {budgetsLoaded && budgets.length === 0 && prevBudgets.length > 0 && (
            <button
              className="btn btn-secondary"
              disabled={copyBudgets.isPending}
              onClick={() => copyBudgets.mutate({ fromMonth: prevMonth, toMonth: month })}
            >
              {formatMonthShort(prevMonth)} 예산 {prevBudgets.length}개 복사
            </button>
          )}
        </div>
        {totalBudget > 0 && <BudgetBar spent={totalSpent} budget={totalBudget} elapsed={monthElapsed(month, todayString())} />}
      </div>

      <div className="card">
        <p className="mb-2 text-sm text-slate-500">
          금액을 입력하고 Enter 를 누르거나 다른 곳을 클릭하면 저장돼요. 비우면 예산이 삭제돼요. 사용액에는 소비성 지출만 들어가요 (저축성 지출 제외).
        </p>
        <p className="mb-2 text-sm text-slate-500">
          <strong className="font-medium text-slate-700">이월</strong>을 켜면 올해 1월부터 지난달까지 남은 돈은 더하고 넘친 돈은 빼서 이번 달 예산에 반영해요. 매년 1월에 새로 시작하고, 이번 달 예산을 정한 카테고리에만 적용돼요.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-sm">
            <thead className="border-b border-slate-200 text-left text-xs whitespace-nowrap text-slate-500">
              <tr>
                <th className="py-2 font-medium">카테고리</th>
                <th className="w-44 py-2 font-medium">예산</th>
                <th className="w-32 py-2 font-medium">이월</th>
                <th className="w-32 py-2 text-right font-medium">사용</th>
                <th className="w-72 py-2 pl-6 font-medium">진행</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenseCategories.map((c) => {
                const budget = budgetByCategory.get(c.id)
                return (
                  <BudgetRow
                    // 서버 값이 바뀌면(예: 지난달 복사) 입력칸을 새 값으로 초기화하기 위해 key 에 금액을 포함
                    key={`${c.id}-${budget?.amount ?? ''}`}
                    month={month}
                    category={c}
                    budget={budget}
                    carry={carry.get(c.id) ?? 0}
                    spent={spentByCategory.get(c.id) ?? 0}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
        {expenseCategories.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">설정에서 지출 카테고리를 먼저 추가해 주세요.</p>
        )}
      </div>

      <SavingGoalsCard month={month} />
    </section>
  )
}

type RowProps = {
  month: string
  category: Category
  budget: Budget | undefined
  /** 이번 달 예산에 더할 이월액 (초과했으면 음수) */
  carry: number
  spent: number
}

function BudgetRow({ month, category, budget, carry, spent }: RowProps) {
  const save = useSaveBudget()
  const setRollover = useSetRollover()
  const { search } = useLocation()
  const [amount, setAmount] = useState<number | null>(budget?.amount ?? null)

  function commit() {
    if ((amount ?? null) === (budget?.amount ?? null)) return // 바뀐 게 없으면 저장하지 않음
    save.mutate({ id: budget?.id, month, categoryId: category.id, amount })
  }

  return (
    <tr>
      <td className="py-2 pr-3 whitespace-nowrap">
        <Link
          to={transactionsLink(search, { kind: 'consumption', major: category.id })}
          className="inline-flex items-center gap-2 hover:text-blue-700 hover:underline"
        >
          <ColorDot color={category.color} />
          {category.name}
        </Link>
      </td>
      <td className="py-2">
        <AmountInput
          className="w-40 py-1.5"
          // 저장하는 동안은 잠가서, 저장이 끝나기 전에 다시 고쳐 쓴 값이 사라지지 않게 한다
          disabled={save.isPending}
          value={amount}
          onChange={setAmount}
          placeholder="예산 없음"
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </td>
      <td className="py-2 whitespace-nowrap">
        <label className="inline-flex items-center gap-1.5 text-xs tabular-nums">
          <input
            type="checkbox"
            checked={category.rollover}
            onChange={(e) => setRollover.mutate({ id: category.id, rollover: e.target.checked })}
            aria-label={`${category.name} 이월`}
          />
          {category.rollover && budget ? (
            <span className={carry < 0 ? 'text-red-600' : carry > 0 ? 'text-emerald-700' : 'text-slate-400'}>
              {carry > 0 ? '+' : carry < 0 ? '−' : ''}
              {formatWon(Math.abs(carry))}
            </span>
          ) : (
            <span className="text-slate-400">{category.rollover ? '이월' : '끔'}</span>
          )}
        </label>
      </td>
      <td className="py-2 text-right tabular-nums">{formatWon(spent)}</td>
      <td className="py-2 pl-6">
        {budget ? <BudgetBar spent={spent} budget={budget.amount + carry} elapsed={monthElapsed(month, todayString())} /> :<span className="text-xs text-slate-400">-</span>}
      </td>
    </tr>
  )
}
