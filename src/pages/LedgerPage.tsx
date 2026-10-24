import { useState } from 'react'
import { ledgerApi } from '../api/tables'
import CrudTable, { type Column } from '../components/CrudTable'
import { useLookups } from '../hooks/useLookups'
import { formatWon, todayString } from '../lib/format'
import type { LedgerEntry } from '../lib/types'

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

  const rows = entries.filter((e) => e.book === book)
  // 날짜순으로 쌓아가며 잔액 계산
  const balanceById = new Map<string, number>()
  let running = 0
  for (const e of rows) {
    running += e.direction === 'in' ? e.amount : -e.amount
    balanceById.set(e.id, running)
  }
  const totalIn = rows.filter((e) => e.direction === 'in').reduce((s, e) => s + e.amount, 0)
  const totalOut = rows.filter((e) => e.direction === 'out').reduce((s, e) => s + e.amount, 0)

  function addBook() {
    const name = prompt('새 통장 이름')?.trim()
    if (!name) return
    setExtraBooks([...extraBooks, name])
    setBook(name)
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
            onClick={() => setBook(b)}
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

      <div className="card">
        <CrudTable
          // 통장을 바꾸면 수정 중이던 행을 초기화하기 위해 key 로 다시 만든다
          key={book}
          rows={rows}
          columns={columns}
          defaults={{ date: todayString(), direction: 'in', book }}
          onSave={(values) => save.mutateAsync({ ...values, book })}
          onDelete={(id) => remove.mutate(id)}
          addLabel="+ 입출금 추가"
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
