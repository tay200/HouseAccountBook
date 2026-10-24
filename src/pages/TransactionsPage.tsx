import { useState } from 'react'
import { Link } from 'react-router'
import { useDeleteTransaction, useTransactions } from '../api/transactions'
import ColorDot from '../components/ColorDot'
import MonthPicker from '../components/MonthPicker'
import TransactionForm from '../components/TransactionForm'
import { useLookups } from '../hooks/useLookups'
import { useMonth } from '../hooks/useMonth'
import { formatWon } from '../lib/format'
import { sumByType } from '../lib/stats'
import { KIND_LABEL, type Transaction, type TxKind, type TxType } from '../lib/types'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function formatDay(date: string) {
  const d = new Date(`${date}T00:00:00`)
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`
}

const KIND_BADGE: Record<TxKind, string> = {
  fixed: 'bg-slate-100 text-slate-600',
  extra: 'bg-sky-50 text-sky-700',
  saving: 'bg-emerald-50 text-emerald-700',
  variable: 'bg-orange-50 text-orange-700',
}

export default function TransactionsPage() {
  const [month, setMonth] = useMonth()
  const { data: transactions = [], isPending } = useTransactions(month, month)
  const { categories, categoriesLoaded, majorCategories, paymentMethods, members, majorOf, categoryLabel, memberName, paymentName } =
    useLookups()
  const deleteTransaction = useDeleteTransaction()

  const [editing, setEditing] = useState<Transaction | null>(null)
  const [typeFilter, setTypeFilter] = useState<TxType | ''>('')
  const [kindFilter, setKindFilter] = useState<TxKind | ''>('')
  const [majorFilter, setMajorFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [memberFilter, setMemberFilter] = useState('')
  const [search, setSearch] = useState('')

  const filtered = transactions.filter(
    (t) =>
      (!typeFilter || t.type === typeFilter) &&
      (!kindFilter || t.kind === kindFilter) &&
      (!majorFilter || (majorFilter === 'none' ? !t.category_id : majorOf(t.category_id)?.id === majorFilter)) &&
      (!paymentFilter || t.payment_method_id === paymentFilter) &&
      (!memberFilter || (memberFilter === 'shared' ? !t.member_id : t.member_id === memberFilter)) &&
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
          에서 카테고리를 추가해 보세요.
        </p>
      )}

      <TransactionForm
        // 새 거래 폼은 달을 바꿔도 다시 만들지 않는다 (입력 중인 내용 유지, 날짜만 그 달로)
        key={editing?.id ?? 'new'}
        month={month}
        editing={editing}
        onDone={() => setEditing(null)}
        onSaved={(date) => {
          // 다른 달 날짜로 저장했으면 그 달로 이동해서 방금 저장한 거래가 보이게 한다
          if (!date.startsWith(month)) setMonth(date.slice(0, 7))
        }}
      />

      <div className="card space-y-4">
        <div className="flex flex-wrap gap-2">
          <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TxType | '')}>
            <option value="">수입+지출</option>
            <option value="expense">지출</option>
            <option value="income">수입</option>
          </select>
          <select className="input" value={kindFilter} onChange={(e) => setKindFilter(e.target.value as TxKind | '')}>
            <option value="">전체 성격</option>
            <option value="variable">변동지출</option>
            <option value="fixed">고정 (수입·지출)</option>
            <option value="saving">저축성지출</option>
            <option value="extra">부가수입</option>
          </select>
          <select className="input" value={majorFilter} onChange={(e) => setMajorFilter(e.target.value)}>
            <option value="">전체 대분류</option>
            <option value="none">미분류</option>
            <optgroup label="지출">
              {majorCategories.filter((c) => c.type === 'expense').map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
            <optgroup label="수입">
              {majorCategories.filter((c) => c.type === 'income').map((c) => (
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
          <select className="input" value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)}>
            <option value="">전체 사람</option>
            <option value="shared">공동</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <input className="input min-w-40 flex-1" placeholder="내용 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs text-slate-500">
              <tr>
                <th className="py-2 font-medium">날짜</th>
                <th className="py-2 font-medium">성격</th>
                <th className="py-2 font-medium">사람</th>
                <th className="py-2 font-medium">카테고리</th>
                <th className="py-2 font-medium">결제수단</th>
                <th className="py-2 font-medium">내용</th>
                <th className="py-2 text-right font-medium">금액</th>
                <th className="w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className={editing?.id === t.id ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                  <td className="py-2.5 pr-3 whitespace-nowrap text-slate-600">{formatDay(t.date)}</td>
                  <td className="py-2.5 pr-3">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${KIND_BADGE[t.kind]}`}>
                      {t.type === 'income' ? `${KIND_LABEL[t.kind]}수입` : KIND_LABEL[t.kind]}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 whitespace-nowrap text-slate-600">{memberName(t.member_id)}</td>
                  <td className="py-2.5 pr-3">
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <ColorDot color={majorOf(t.category_id)?.color ?? '#cbd5e1'} />
                      <span className={t.category_id ? '' : 'text-slate-400'}>{categoryLabel(t.category_id)}</span>
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 whitespace-nowrap text-slate-600">{paymentName(t.payment_method_id)}</td>
                  <td className="py-2.5 pr-3 text-slate-600">{t.memo}</td>
                  <td className="py-2.5 text-right whitespace-nowrap tabular-nums">
                    <span className={`font-medium ${t.type === 'income' ? 'text-blue-600' : 'text-slate-900'}`}>
                      {t.type === 'income' ? '+' : '-'}
                      {formatWon(t.amount)}
                    </span>
                    {t.discount > 0 && <div className="text-xs text-slate-400">할인 {formatWon(t.discount)}</div>}
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    <button className="btn btn-text" onClick={() => setEditing(t)}>수정</button>
                    <button className="btn btn-danger-text" onClick={() => handleDelete(t)}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isPending && filtered.length === 0 && <p className="py-8 text-center text-sm text-slate-400">거래 내역이 없어요.</p>}

        <div className="flex justify-end gap-6 border-t border-slate-200 pt-3 text-sm tabular-nums">
          <span className="text-slate-500">{filtered.length}건</span>
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
