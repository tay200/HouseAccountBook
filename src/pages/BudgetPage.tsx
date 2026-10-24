import { useState } from 'react'
import { useBudgets, useCopyBudgets, useSaveBudget } from '../api/budgets'
import { useCategories } from '../api/categories'
import { useTransactions } from '../api/transactions'
import AmountInput from '../components/AmountInput'
import BudgetBar from '../components/BudgetBar'
import ColorDot from '../components/ColorDot'
import MonthPicker from '../components/MonthPicker'
import { useMonth } from '../hooks/useMonth'
import { formatWon, shiftMonth } from '../lib/format'
import { sumExpenseBy } from '../lib/stats'
import type { Budget, Category } from '../lib/types'

export default function BudgetPage() {
  const [month, setMonth] = useMonth()
  const { data: categories = [] } = useCategories()
  const { data: budgets = [], isSuccess: budgetsLoaded } = useBudgets(month)
  const { data: transactions = [] } = useTransactions(month, month)
  const copyBudgets = useCopyBudgets()

  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const budgetByCategory = new Map(budgets.map((b) => [b.category_id, b]))
  const spentByCategory = sumExpenseBy(transactions, (t) => t.category_id ?? '')

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0)
  // 예산을 정한 카테고리에서 쓴 돈만 합산해야 '예산 대비'가 맞다
  const totalSpent = budgets.reduce((sum, b) => sum + (spentByCategory.get(b.category_id) ?? 0), 0)

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">예산</h2>
        <MonthPicker month={month} onChange={setMonth} />
      </header>

      <div className="card space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">이번 달 총 예산</p>
            <p className="text-2xl font-bold tabular-nums">{formatWon(totalBudget)}</p>
          </div>
          {budgetsLoaded && budgets.length === 0 && (
            <button
              className="btn btn-secondary"
              disabled={copyBudgets.isPending}
              onClick={() => copyBudgets.mutate({ fromMonth: shiftMonth(month, -1), toMonth: month })}
            >
              지난달 예산 복사
            </button>
          )}
        </div>
        {totalBudget > 0 && <BudgetBar spent={totalSpent} budget={totalBudget} />}
      </div>

      <div className="card">
        <p className="mb-2 text-sm text-slate-500">금액을 입력하고 Enter 를 누르거나 다른 곳을 클릭하면 저장돼요. 비우면 예산이 삭제돼요.</p>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs text-slate-500">
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
      <td className="py-2">
        <span className="inline-flex items-center gap-2">
          <ColorDot color={category.color} />
          {category.name}
        </span>
      </td>
      <td className="py-2">
        <AmountInput
          className="w-40 py-1.5"
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
