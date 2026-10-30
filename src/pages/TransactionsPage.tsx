import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAppSettings } from '../api/settings'
import { useDeleteTransaction, useSearchTransactions, useTagSuggestions, useTransactions } from '../api/transactions'
import CardCheckCard from '../components/CardCheckCard'
import type { NewTransactionState } from '../components/Layout'
import ColorDot from '../components/ColorDot'
import MonthPicker from '../components/MonthPicker'
import RecurringCard from '../components/RecurringCard'
import TransactionForm from '../components/TransactionForm'
import { useLookups } from '../hooks/useLookups'
import { useMonth } from '../hooks/useMonth'
import { formatWon } from '../lib/format'
import { isBigSpend, sumByType } from '../lib/stats'
import { hasTxFilters, readTxFilters, removeTxFilters } from '../lib/txFilters'
import { KIND_LABEL, type Transaction, type TxKind, type TxType } from '../lib/types'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** '10/25 (일)'. withYear 면 '2026.10/25 (일)' (모든 달에서 찾을 때) */
function formatDay(date: string, withYear = false) {
  const d = new Date(`${date}T00:00:00`)
  return `${withYear ? `${d.getFullYear()}.` : ''}${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`
}

/** 검색어와 맞는 거래: 내용에 들어 있거나(대소문자 무시), 검색어가 숫자면 금액이 같은 것 */
function matchesSearch(t: Transaction, term: string) {
  if (!term) return true
  if ((t.memo ?? '').toLowerCase().includes(term.toLowerCase())) return true
  const digits = term.replace(/,/g, '')
  return /^\d+$/.test(digits) && t.amount === Number(digits)
}

const KIND_BADGE: Record<TxKind, string> = {
  fixed: 'bg-slate-100 text-slate-600',
  extra: 'bg-sky-50 text-sky-700',
  saving: 'bg-emerald-50 text-emerald-700',
  variable: 'bg-orange-50 text-orange-700',
}

export default function TransactionsPage() {
  const [month, setMonth] = useMonth()
  const monthQuery = useTransactions(month, month)
  const { categories, categoriesLoaded, majorCategories, paymentMethods, members, majorOf, categoryLabel, memberName, paymentName } =
    useLookups()
  const deleteTransaction = useDeleteTransaction()
  const { settings } = useAppSettings()

  const location = useLocation()
  const navigate = useNavigate()

  const [editing, setEditing] = useState<Transaction | null>(null)
  // 대시보드·예산에서 숫자를 누르고 들어오면 주소에 담긴 필터로 시작한다
  const [initial] = useState(() => readTxFilters(new URLSearchParams(location.search)))
  const [typeFilter, setTypeFilter] = useState<TxType | ''>(initial.type)
  const [kindFilter, setKindFilter] = useState<TxKind | ''>(initial.kind)
  const [majorFilter, setMajorFilter] = useState(initial.major)
  const [paymentFilter, setPaymentFilter] = useState(initial.payment)
  const [memberFilter, setMemberFilter] = useState(initial.member)
  const [tagFilter, setTagFilter] = useState(initial.tag)
  const hasFilter = Boolean(typeFilter || kindFilter || majorFilter || paymentFilter || memberFilter || tagFilter)
  // 필터는 처음에만 주소에서 읽고 지운다 (메뉴를 옮겨 다녀도 따라다니지 않게, ?month 는 유지)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (hasTxFilters(params)) navigate({ pathname: location.pathname, search: `?${removeTxFilters(params)}` }, { replace: true })
  }, [location.search, location.pathname, navigate])

  function clearFilters() {
    setTypeFilter('')
    setKindFilter('')
    setMajorFilter('')
    setPaymentFilter('')
    setMemberFilter('')
    setTagFilter('')
  }
  const { data: tagOptions = [] } = useTagSuggestions()
  const [search, setSearch] = useState('')
  const [searchAllMonths, setSearchAllMonths] = useState(false)
  // 모든 달에서 찾을 때는 글자를 칠 때마다 조회하지 않도록, 입력이 0.3초 멈추면 검색어로 확정한다
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])
  const searchingAll = searchAllMonths && debouncedSearch !== ''
  const searchQuery = useSearchTransactions(searchingAll ? debouncedSearch : '')
  const { data: transactions = [], isPending } = searchingAll ? searchQuery : monthQuery

  // 휴대폰 하단 (+) 버튼으로 들어오면: 수정 중이던 것을 닫고 새 거래 폼에 포커스
  const wantsNew = (location.state as NewTransactionState | null)?.newTransaction === true
  const [focusRequest, setFocusRequest] = useState(0)
  const [handledKey, setHandledKey] = useState<string | null>(null)
  if (wantsNew && handledKey !== location.key) {
    // 같은 이동(location.key)은 한 번만 처리한다
    setHandledKey(location.key)
    setEditing(null)
    setFocusRequest((n) => n + 1)
  }
  useEffect(() => {
    // 표시를 지워서 새로고침하거나 뒤로 가기 했을 때 다시 포커스되지 않게 한다
    if (wantsNew) navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null })
  }, [wantsNew, location.pathname, location.search, navigate])

  const filtered = transactions.filter(
    (t) =>
      (!typeFilter || t.type === typeFilter) &&
      (!kindFilter || t.kind === kindFilter) &&
      (!majorFilter || (majorFilter === 'none' ? !t.category_id : majorOf(t.category_id)?.id === majorFilter)) &&
      (!paymentFilter || (paymentFilter === 'none' ? !t.payment_method_id : t.payment_method_id === paymentFilter)) &&
      (!memberFilter || (memberFilter === 'shared' ? !t.member_id : t.member_id === memberFilter)) &&
      (!tagFilter || t.tags.includes(tagFilter)) &&
      matchesSearch(t, search.trim()),
  )
  const incomeTotal = sumByType(filtered, 'income')
  const expenseTotal = sumByType(filtered, 'expense')

  function handleDelete(t: Transaction) {
    if (!confirm(`${formatDay(t.date, searchingAll)} ${formatWon(t.amount)} 거래를 삭제할까요?`)) return
    deleteTransaction.mutate(t.id)
    if (editing?.id === t.id) setEditing(null)
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
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

      <RecurringCard month={month} transactions={monthQuery.data ?? []} />

      <TransactionForm
        // 새 거래 폼은 달을 바꿔도 다시 만들지 않는다 (입력 중인 내용 유지, 날짜만 그 달로)
        key={editing?.id ?? 'new'}
        month={month}
        editing={editing}
        onDone={() => setEditing(null)}
        focusRequest={focusRequest}
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
            <option value="none">선택 안 함</option>
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
          {tagOptions.length > 0 && (
            <select className="input" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
              <option value="">전체 태그</option>
              {tagOptions.map((t) => (
                <option key={t} value={t}>#{t}</option>
              ))}
            </select>
          )}
          <div className="flex min-w-60 flex-1 items-center gap-2">
            <input className="input min-w-0 flex-1" placeholder="내용 또는 금액 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
            <label className="flex shrink-0 items-center gap-1 text-sm text-slate-600">
              <input type="checkbox" checked={searchAllMonths} onChange={(e) => setSearchAllMonths(e.target.checked)} />
              모든 달
            </label>
          </div>
          {hasFilter && (
            <button type="button" className="btn btn-text text-sm" onClick={clearFilters}>
              필터 초기화
            </button>
          )}
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
                  <td className="py-2.5 pr-3 whitespace-nowrap text-slate-600">{formatDay(t.date, searchingAll)}</td>
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
                  <td className="py-2.5 pr-3 text-slate-600">
                    {t.memo}
                    {t.tags.map((tag) => (
                      <span key={tag} className="ml-1.5 rounded-full bg-violet-50 px-1.5 py-0.5 text-xs whitespace-nowrap text-violet-700">#{tag}</span>
                    ))}
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap tabular-nums">
                    {isBigSpend(t, settings.big_spend_threshold) && (
                      <span className="mr-1.5 rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700">큰 지출</span>
                    )}
                    <span
                      className={`font-medium ${t.type === 'income' ? 'text-blue-600' : isBigSpend(t, settings.big_spend_threshold) ? 'text-red-600' : 'text-slate-900'}`}
                    >
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

        {searchingAll && <p className="text-xs text-slate-500">모든 달에서 ‘{debouncedSearch}’ 검색 결과예요. 위의 달 선택과 상관없이 보여줘요.</p>}
        {isPending ? (
          <p className="py-8 text-center text-sm text-slate-400">불러오는 중…</p>
        ) : (
          filtered.length === 0 && <p className="py-8 text-center text-sm text-slate-400">{search ? '찾는 거래가 없어요.' : '거래 내역이 없어요.'}</p>
        )}

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

      <CardCheckCard month={month} transactions={monthQuery.data ?? []} />
    </section>
  )
}
