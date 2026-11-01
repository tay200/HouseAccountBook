import { useState } from 'react'
import { ledgerApi, ledgerFavoritesApi } from '../api/tables'
import AmountInput from '../components/AmountInput'
import BookCheck from '../components/BookCheck'
import CrudTable, { type Column } from '../components/CrudTable'
import { Field, FormBox, inputCls } from '../components/FormFields'
import { useLookups } from '../hooks/useLookups'
import { formatWon, todayString } from '../lib/format'
import type { LedgerEntry, LedgerFavorite } from '../lib/types'

const DEFAULT_BOOKS = ['공동통장', '비상금']

/**
 * 통장 기록: 공동통장·비상금처럼 입출금과 잔액만 따로 관리하는 장부.
 * 가계부 수입/지출 합계에는 들어가지 않고, 잔액은 자산현황에 포함된다.
 */
export default function LedgerPage() {
  const { data: entries = [] } = ledgerApi.useList()
  const save = ledgerApi.useSave()
  const remove = ledgerApi.useDelete()
  const { members, memberName } = useLookups()
  const [extraBooks, setExtraBooks] = useState<string[]>([])
  const books = [...new Set([...DEFAULT_BOOKS, ...entries.map((e) => e.book), ...extraBooks])]
  const [book, setBook] = useState(books[0])
  const { data: allFavorites = [] } = ledgerFavoritesApi.useList()
  const removeFavorite = ledgerFavoritesApi.useDelete()
  const favorites = allFavorites.filter((f) => f.book === book)
  const [adding, setAdding] = useState(false)
  const [addingFavorite, setAddingFavorite] = useState(false)
  // 새 입출금 폼에 채워 둘 값. 즐겨찾기를 누를 때마다 formSeq 를 올려 폼을 새로 연다
  const [defaults, setDefaults] = useState<Record<string, unknown>>({})
  const [formSeq, setFormSeq] = useState(0)

  const rows = entries.filter((e) => e.book === book)
  // 날짜순으로 쌓아가며 잔액 계산 (화면에는 최근 날짜가 위로 오게 뒤집어 보여준다)
  const balanceById = new Map<string, number>()
  let running = 0
  for (const e of rows) {
    running += e.direction === 'in' ? e.amount : -e.amount
    balanceById.set(e.id, running)
  }
  const totalIn = rows.filter((e) => e.direction === 'in').reduce((s, e) => s + e.amount, 0)
  const totalOut = rows.filter((e) => e.direction === 'out').reduce((s, e) => s + e.amount, 0)
  const newestFirst = [...rows].reverse()

  function changeBook(name: string) {
    setBook(name)
    setAdding(false)
    setAddingFavorite(false)
  }

  function addBook() {
    const name = prompt('새 통장 이름')?.trim()
    if (!name) return
    setExtraBooks([...extraBooks, name])
    changeBook(name)
  }

  function openAdd(values: Record<string, unknown> = {}) {
    setAddingFavorite(false)
    setDefaults({ date: todayString(), direction: 'in', ...values })
    setFormSeq((n) => n + 1)
    setAdding(true)
  }

  /** 즐겨찾기를 누르면 날짜는 오늘, 나머지는 즐겨찾기 값으로 폼을 연다 (저장은 [저장]을 눌러야 한다) */
  function applyFavorite(f: LedgerFavorite) {
    openAdd({ direction: f.direction, member_id: f.member_id, memo: f.memo, amount: f.amount })
  }

  const columns: Column<LedgerEntry>[] = [
    { key: 'date', label: '날짜', input: { type: 'date' }, required: true },
    {
      key: 'direction',
      label: '입출금',
      input: { type: 'select', options: [{ value: 'in', label: '입금' }, { value: 'out', label: '출금' }] },
      required: true,
      render: (e) => <span className={e.direction === 'in' ? 'text-blue-600' : 'text-red-600'}>{e.direction === 'in' ? '입금' : '출금'}</span>,
    },
    {
      key: 'member_id',
      label: '사람',
      input: { type: 'select', options: members.map((m) => ({ value: m.id, label: m.name })), emptyLabel: '공동' },
      render: (e) => memberName(e.member_id),
    },
    { key: 'memo', label: '내역', input: { type: 'text' } },
    { key: 'amount', label: '금액', input: { type: 'money' }, required: true, align: 'right' },
    { key: 'balance', label: '잔액', align: 'right', render: (e) => formatWon(balanceById.get(e.id) ?? 0), sortValue: (e) => balanceById.get(e.id) ?? 0 },
  ]

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">통장 기록</h2>
      <p className="text-sm text-slate-500">
        공동통장·비상금처럼 입출금과 잔액만 따로 기록해요. 가계부 수입·지출 합계에는 들어가지 않고, 잔액은 자산현황에 포함돼요.
      </p>

      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200">
        {books.map((b) => (
          <button
            key={b}
            onClick={() => changeBook(b)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${book === b ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {b}
          </button>
        ))}
        <button className="btn btn-text text-xs" onClick={addBook}>+ 통장 추가</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="입금 합계" value={totalIn} />
        <Stat label="출금 합계" value={totalOut} />
        <Stat label="현재 잔액" value={running} />
      </div>

      {/* 통장을 바꾸면 입력 중이던 값을 비우기 위해 key 로 다시 만든다 */}
      <BookCheck key={book} book={book} entries={rows} />

      <div className="card space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {!adding && (
            <button className="btn btn-primary" onClick={() => openAdd()}>
              + 입출금 추가
            </button>
          )}
          {favorites.map((f) => (
            <span key={f.id} className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-sm text-amber-900">
              <button
                type="button"
                className="rounded-l-full py-0.5 pr-1 pl-2.5 hover:bg-amber-100"
                title={`${f.direction === 'in' ? '입금' : '출금'} ${f.amount ? formatWon(f.amount) : '(금액은 직접 입력)'}`}
                onClick={() => applyFavorite(f)}
              >
                ⭐ {f.name}
              </button>
              <button
                type="button"
                className="rounded-r-full px-1.5 py-0.5 text-amber-700/60 hover:bg-amber-100 hover:text-amber-900"
                aria-label={`${f.name} 즐겨찾기 삭제`}
                onClick={() => confirm(`'${f.name}' 즐겨찾기를 삭제할까요?`) && removeFavorite.mutate(f.id)}
              >
                ×
              </button>
            </span>
          ))}
          {!addingFavorite && (
            <button
              className="btn btn-text text-xs"
              title="자주 쓰는 입출금을 저장해 두고 누르면 입력 폼을 채워요"
              onClick={() => {
                setAdding(false)
                setAddingFavorite(true)
              }}
            >
              ☆ 즐겨찾기 추가
            </button>
          )}
        </div>

        {addingFavorite && <FavoriteForm book={book} onDone={() => setAddingFavorite(false)} />}

        <CrudTable
          // 통장을 바꾸거나 즐겨찾기로 폼을 다시 열면 입력 중이던 값을 초기화하기 위해 key 로 다시 만든다
          key={`${book}-${formSeq}`}
          rows={newestFirst}
          columns={columns}
          defaults={defaults}
          onSave={(values) => save.mutateAsync({ ...values, book })}
          onDelete={(id) => remove.mutate(id)}
          adding={adding}
          onAddingChange={setAdding}
        />
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${value < 0 ? 'text-red-600' : ''}`}>{formatWon(value)}</p>
    </div>
  )
}

/** 즐겨찾기 만들기. 금액을 비워 두면 누를 때마다 금액만 입력한다 */
function FavoriteForm({ book, onDone }: { book: string; onDone: () => void }) {
  const save = ledgerFavoritesApi.useSave()
  const { members } = useLookups()
  const [name, setName] = useState('')
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [memberId, setMemberId] = useState('')
  const [memo, setMemo] = useState('')
  const [amount, setAmount] = useState<number | null>(null)

  function handleSave() {
    save.mutate(
      { book, name: name.trim(), direction, member_id: memberId || null, memo: memo.trim() || null, amount: amount || null },
      { onSuccess: onDone },
    )
  }

  return (
    <FormBox
      title={`즐겨찾기 추가 (${book})`}
      hint="금액을 비워 두면 금액만 매번 입력해요"
      gridClass="grid-cols-2 md:grid-cols-5"
      problem={name.trim() ? null : '이름을 입력하세요'}
      saving={save.isPending}
      onSave={handleSave}
      onCancel={onDone}
    >
      <Field label="이름 (칩에 보여요)" required>
        <input className={inputCls} value={name} placeholder="예: 월급 입금" onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label="입출금" required>
        <select className={inputCls} value={direction} onChange={(e) => setDirection(e.target.value as 'in' | 'out')}>
          <option value="in">입금</option>
          <option value="out">출금</option>
        </select>
      </Field>
      <Field label="사람">
        <select className={inputCls} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          <option value="">공동</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </Field>
      <Field label="내역">
        <input className={inputCls} value={memo} onChange={(e) => setMemo(e.target.value)} />
      </Field>
      <Field label="금액">
        <AmountInput className={inputCls} value={amount} placeholder="비우면 매번 입력" onChange={setAmount} />
      </Field>
    </FormBox>
  )
}
