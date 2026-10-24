import { useState } from 'react'
import { Link } from 'react-router'
import { useCategories } from '../api/categories'
import { usePaymentMethods } from '../api/paymentMethods'
import { useDeleteTransaction, useTransactions } from '../api/transactions'
import ColorDot from '../components/ColorDot'
import MonthPicker from '../components/MonthPicker'
import TransactionForm from '../components/TransactionForm'
import { useMonth } from '../hooks/useMonth'
import { formatWon } from '../lib/format'
import { sumByType } from '../lib/stats'
import type { Transaction, TxType } from '../lib/types'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function formatDay(date: string) {
  const d = new Date(`${date}T00:00:00`)
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`
}

export default function TransactionsPage() {
  const [month, setMonth] = useMonth()
  const { data: transactions = [], isPending } = useTransactions(month, month)
  const { data: categories = [], isSuccess: categoriesLoaded } = useCategories()
  const { data: paymentMethods = [] } = usePaymentMethods()
  const deleteTransaction = useDeleteTransaction()

  const [editing, setEditing] = useState<Transaction | null>(null)
  const [typeFilter, setTypeFilter] = useState<TxType | ''>('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [search, setSearch] = useState('')

  // id → 객체 를 빠르게 찾기 위한 Map
  const categoryById = new Map(categories.map((c) => [c.id, c]))
  const paymentById = new Map(paymentMethods.map((p) => [p.id, p]))

  const filtered = transactions.filter(
    (t) =>
      (!typeFilter || t.type === typeFilter) &&
      (!categoryFilter || (categoryFilter === 'none' ? !t.category_id : t.category_id === categoryFilter)) &&
      (!paymentFilter || t.payment_method_id === paymentFilter) &&
      (!search || (t.memo ?? '').includes(search)),
  )
  const incomeTotal = sumByType(filtered, 'income')
  const expenseTotal = sumByType(filtered, 'expense')

  function handleDelete(t: Transaction) {
    if (!confirm(`${formatDay(t.date)} ${formatWon(t.amount)} 거래를 삭제할까요?`)) return
    deleteTransaction.mutate(t.id)
    if (editing?.id === t.id) setEditing(null)
  }

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">거래 내역</h2>
        <MonthPicker month={month} onChange={setMonth} />
      </header>

      {categoriesLoaded && categories.length === 0 && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          아직 카테고리가 없어요.{' '}
          <Link to="/settings" className="font-medium underline">
            설정
          </Link>
          에서 기본 카테고리를 추가해 보세요.
        </p>
      )}

      <TransactionForm
        key={editing?.id ?? 'new'}
        categories={categories}
        paymentMethods={paymentMethods}
        editing={editing}
        onDone={() => setEditing(null)}
      />

      <div className="card space-y-4">
        <div className="flex flex-wrap gap-2">
          <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TxType | '')}>
            <option value="">전체 구분</option>
            <option value="expense">지출</option>
            <option value="income">수입</option>
          </select>
          <select className="input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">전체 카테고리</option>
            <option value="none">미분류</option>
            <optgroup label="지출">
              {categories.filter((c) => c.type === 'expense').map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
            <optgroup label="수입">
              {categories.filter((c) => c.type === 'income').map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
          </select>
          <select className="input" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
            <option value="">전체 결제수단</option>
            {paymentMethods.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input className="input flex-1" placeholder="메모 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs text-slate-500">
            <tr>
              <th className="py-2 font-medium">날짜</th>
              <th className="py-2 font-medium">카테고리</th>
              <th className="py-2 font-medium">결제수단</th>
              <th className="py-2 font-medium">메모</th>
              <th className="py-2 text-right font-medium">금액</th>
              <th className="w-28" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((t) => {
              const category = t.category_id ? categoryById.get(t.category_id) : undefined
              return (
                <tr key={t.id} className={editing?.id === t.id ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                  <td className="py-2.5 whitespace-nowrap text-slate-600">{formatDay(t.date)}</td>
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-2">
                      <ColorDot color={category?.color ?? '#cbd5e1'} />
                      {category?.name ?? <span className="text-slate-400">미분류</span>}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-600">
                    {t.payment_method_id ? paymentById.get(t.payment_method_id)?.name : ''}
                  </td>
                  <td className="py-2.5 text-slate-600">{t.memo}</td>
                  <td
                    className={`py-2.5 text-right font-medium whitespace-nowrap tabular-nums ${
                      t.type === 'income' ? 'text-blue-600' : 'text-slate-900'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '-'}
                    {formatWon(t.amount)}
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    <button className="btn btn-text" onClick={() => setEditing(t)}>수정</button>
                    <button className="btn btn-danger-text" onClick={() => handleDelete(t)}>삭제</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {!isPending && filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">거래 내역이 없어요.</p>
        )}

        <div className="flex justify-end gap-6 border-t border-slate-200 pt-3 text-sm tabular-nums">
          <span>
            수입 <strong className="text-blue-600">{formatWon(incomeTotal)}</strong>
          </span>
          <span>
            지출 <strong>{formatWon(expenseTotal)}</strong>
          </span>
        </div>
      </div>
    </section>
  )
}
