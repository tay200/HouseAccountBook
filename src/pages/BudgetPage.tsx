import { useState } from 'react'
import { useBudgets, useCopyBudgets, useSaveBudget } from '../api/budgets'
import { useTransactions } from '../api/transactions'
import AmountInput from '../components/AmountInput'
import BudgetBar from '../components/BudgetBar'
import ColorDot from '../components/ColorDot'
import MonthPicker from '../components/MonthPicker'
import { useLookups } from '../hooks/useLookups'
import { useMonth } from '../hooks/useMonth'
import { formatMonthShort, formatWon, shiftMonth, todayString } from '../lib/format'
import { budgetUsage, isConsumption, sumGrouped } from '../lib/stats'
import type { Budget, Category } from '../lib/types'

export default function BudgetPage() {
  const [month, setMonth] = useMonth()
  const { majorCategories, majorOf } = useLookups()
  const { data: budgets = [], isSuccess: budgetsLoaded } = useBudgets(month)
  const { data: transactions = [] } = useTransactions(month, month)
  const copyBudgets = useCopyBudgets()
  const prevMonth = shiftMonth(month, -1)
  const { data: prevBudgets = [] } = useBudgets(prevMonth)

  // 예산은 지출 대분류 단위로 잡고, 소분류 거래는 대분류로 합산한다
  // 사용액은 대시보드 '예산 대비'와 같이 소비성 지출만 센다 (저축성 지출은 쓴 돈이 아니라 모은 돈)
  const expenseCategories = majorCategories.filter((c) => c.type === 'expense')
  const budgetByCategory = new Map(budgets.map((b) => [b.category_id, b]))
  const spentByCategory = sumGrouped(transactions, isConsumption, (t) => majorOf(t.category_id)?.id ?? '')

  // 예산을 정한 카테고리에서 쓴 돈만 합산해야 '예산 대비'가 맞다 (대시보드 '남은 예산'과 같은 계산)
  const { budget: totalBudget, spent: totalSpent } = budgetUsage(budgets, spentByCategory, month, todayString())

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">예산</h2>
        <MonthPicker month={month} onChange={setMonth} />
      </header>

      <div className="card space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{formatMonthShort(month)} 총 예산</p>
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
        {totalBudget > 0 && <BudgetBar spent={totalSpent} budget={totalBudget} />}
      </div>

      <div className="card">
        <p className="mb-2 text-sm text-slate-500">금액을 입력하고 Enter 를 누르거나 다른 곳을 클릭하면 저장돼요. 비우면 예산이 삭제돼요. 사용액에는 소비성 지출만 들어가요 (저축성 지출 제외).</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="border-b border-slate-200 text-left text-xs whitespace-nowrap text-slate-500">
              <tr>
                <th className="py-2 font-medium">카테고리</th>
                <th className="w-44 py-2 font-medium">예산</th>
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
    </section>
  )
}

type RowProps = {
  month: string
  category: Category
  budget: Budget | undefined
  spent: number
}

function BudgetRow({ month, category, budget, spent }: RowProps) {
  const save = useSaveBudget()
  const [amount, setAmount] = useState<number | null>(budget?.amount ?? null)

  function commit() {
    if ((amount ?? null) === (budget?.amount ?? null)) return // 바뀐 게 없으면 저장하지 않음
    save.mutate({ id: budget?.id, month, categoryId: category.id, amount })
  }

  return (
    <tr>
      <td className="py-2 pr-3 whitespace-nowrap">
        <span className="inline-flex items-center gap-2">
          <ColorDot color={category.color} />
          {category.name}
        </span>
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
      <td className="py-2 text-right tabular-nums">{formatWon(spent)}</td>
      <td className="py-2 pl-6">
        {budget ? <BudgetBar spent={spent} budget={budget.amount} /> : <span className="text-xs text-slate-400">-</span>}
      </td>
    </tr>
  )
}
