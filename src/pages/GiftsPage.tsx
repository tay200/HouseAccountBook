import { useState } from 'react'
import { useDeleteGift, useSaveGift, type GiftTransaction } from '../api/gifts'
import { giftEventsApi } from '../api/tables'
import AmountInput from '../components/AmountInput'
import CrudTable, { type Column } from '../components/CrudTable'
import { Field, FormBox, inputCls } from '../components/FormFields'
import { useLookups } from '../hooks/useLookups'
import { formatWon, todayString } from '../lib/format'
import { giftSummaryByPerson, matchesGift } from '../lib/gifts'
import {
  GIFT_DIRECTION_LABEL,
  GIFT_EVENT_LABEL,
  type GiftDirection,
  type GiftEvent,
  type GiftEventType,
} from '../lib/types'

const EVENT_TYPES = Object.keys(GIFT_EVENT_LABEL) as GiftEventType[]
const eventLabel = (e: Pick<GiftEvent, 'event_type'>) => GIFT_EVENT_LABEL[e.event_type]

/**
 * 경조사비 장부: 누구에게 얼마를 보냈고 받았는지.
 * 상대방별 합계로 "그때 얼마 받았지?"를 바로 찾고, 보낼 때는 가계부 지출로도 기록할 수 있다.
 */
export default function GiftsPage() {
  const { data: events = [], isPending } = giftEventsApi.useList()
  const deleteGift = useDeleteGift()
  const { memberName } = useLookups()
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)

  const filtered = events.filter((e) => matchesGift(e, search))
  const people = giftSummaryByPerson(filtered)
  const given = filtered.filter((e) => e.direction === 'give').reduce((s, e) => s + e.amount, 0)
  const received = filtered.filter((e) => e.direction === 'receive').reduce((s, e) => s + e.amount, 0)

  function handleDelete(id: string) {
    const gift = events.find((e) => e.id === id)
    if (!gift) return
    // 가계부 거래와 연결돼 있으면 거래도 지울지 따로 묻는다
    const alsoTransaction = !!gift.transaction_id && confirm('가계부에 함께 기록한 지출 거래도 삭제할까요?\n[취소]를 누르면 거래는 남겨 둬요.')
    deleteGift.mutate({ gift, alsoTransaction })
  }

  const columns: Column<GiftEvent>[] = [
    { key: 'date', label: '날짜' },
    {
      key: 'direction',
      label: '구분',
      render: (e) => (
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${e.direction === 'give' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
          {GIFT_DIRECTION_LABEL[e.direction]}
        </span>
      ),
      sortValue: (e) => e.direction,
    },
    { key: 'counterpart', label: '상대방' },
    { key: 'relation', label: '관계' },
    { key: 'event_type', label: '행사', render: eventLabel, sortValue: eventLabel },
    { key: 'member_id', label: '우리 쪽', render: (e) => memberName(e.member_id), sortValue: (e) => memberName(e.member_id) },
    { key: 'amount', label: '금액', align: 'right', render: (e) => formatWon(e.amount), sortValue: (e) => e.amount },
    {
      key: 'memo',
      label: '메모',
      render: (e) => (
        <>
          {e.memo}
          {e.transaction_id && <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">가계부 기록</span>}
        </>
      ),
    },
  ]

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">경조사</h2>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="보낸 돈" value={given} className="text-red-600" />
        <Stat label="받은 돈" value={received} className="text-blue-600" />
        <Stat label="받은 돈 − 보낸 돈" value={received - given} className={received - given < 0 ? 'text-red-600' : ''} />
      </div>

      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">상대방별</h3>
          <input
            className="input w-full sm:w-72"
            placeholder="이름·관계·메모로 찾기"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {people.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">{search ? '찾는 기록이 없어요.' : '아직 기록이 없어요.'}</p>
        ) : (
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm tabular-nums">
              <thead className="sticky top-0 border-b border-slate-200 bg-white text-xs whitespace-nowrap text-slate-500">
                <tr>
                  <th className="py-2 pr-3 text-left font-medium">상대방</th>
                  <th className="py-2 pr-3 text-left font-medium">관계</th>
                  <th className="py-2 pr-3 text-right font-medium">보낸 돈</th>
                  <th className="py-2 pr-3 text-right font-medium">받은 돈</th>
                  <th className="py-2 pr-3 text-right font-medium">차이</th>
                  <th className="py-2 text-right font-medium">마지막</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {people.map((p) => (
                  <tr key={p.counterpart} className="cursor-pointer whitespace-nowrap hover:bg-slate-50" onClick={() => setSearch(p.counterpart)} title="이 사람 기록만 보기">
                    <td className="py-2 pr-3 font-medium">{p.counterpart}</td>
                    <td className="py-2 pr-3 text-slate-600">{p.relation}</td>
                    <td className="py-2 pr-3 text-right">{p.given ? `${formatWon(p.given)} (${p.givenCount})` : '-'}</td>
                    <td className="py-2 pr-3 text-right">{p.received ? `${formatWon(p.received)} (${p.receivedCount})` : '-'}</td>
                    <td className={`py-2 pr-3 text-right ${p.balance < 0 ? 'text-red-600' : p.balance > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                      {p.balance === 0 ? '-' : `${p.balance > 0 ? '+' : '−'}${formatWon(Math.abs(p.balance))}`}
                    </td>
                    <td className="py-2 text-right text-slate-500">{p.lastDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-slate-400">차이: 받은 돈이 더 많으면 +, 보낸 돈이 더 많으면 −. 줄을 누르면 그 사람 기록만 보여요.</p>
      </div>

      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">기록{search && <span className="ml-2 text-sm font-normal text-slate-500">‘{search}’ 검색 중</span>}</h3>
          <div className="flex gap-2">
            {search && (
              <button className="btn btn-text" onClick={() => setSearch('')}>
                전체 보기
              </button>
            )}
            {!adding && (
              <button className="btn btn-primary" onClick={() => setAdding(true)}>
                + 경조사 추가
              </button>
            )}
          </div>
        </div>
        {isPending ? (
          <p className="py-8 text-center text-sm text-slate-400">불러오는 중…</p>
        ) : (
          <CrudTable
            rows={filtered}
            columns={columns}
            // 저장은 전용 폼(GiftForm)이 가계부 거래와 함께 처리한다
            onSave={async () => undefined}
            onDelete={handleDelete}
            confirmDelete={(e) => confirm(`${e.counterpart} ${eventLabel(e)} ${formatWon(e.amount)} 기록을 삭제할까요?`)}
            adding={adding}
            onAddingChange={setAdding}
            emptyText="아직 기록이 없어요."
            renderForm={({ row, onDone, onCancel }) => <GiftForm row={row} events={events} onDone={onDone} onCancel={onCancel} />}
          />
        )}
      </div>
    </section>
  )
}

function Stat({ label, value, className = '' }: { label: string; value: number; className?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums sm:text-xl ${className}`}>{formatWon(value)}</p>
    </div>
  )
}

type FormProps = {
  row?: GiftEvent
  /** 전체 기록 (상대방·관계 자동완성) */
  events: GiftEvent[]
  onDone: () => void
  onCancel: () => void
}

function GiftForm({ row, events, onDone, onCancel }: FormProps) {
  const { categories, majorCategories, paymentMethods, members } = useLookups()
  const save = useSaveGift(eventLabel)
  // 가계부 지출 카테고리 기본값: 이름에 '경조'가 들어간 지출 카테고리 (없으면 미분류)
  const defaultCategory = categories.find((c) => c.type === 'expense' && c.name.includes('경조'))?.id ?? ''
  const [v, setV] = useState(() => ({
    date: row?.date ?? todayString(),
    direction: (row?.direction ?? 'give') as GiftDirection,
    counterpart: row?.counterpart ?? '',
    relation: row?.relation ?? '',
    event_type: (row?.event_type ?? 'wedding') as GiftEventType,
    amount: row?.amount ?? null,
    member_id: row?.member_id ?? '',
    memo: row?.memo ?? '',
    // 가계부 지출로도 기록 (새로 보낼 때만 기본으로 켬)
    addTransaction: !row,
    category_id: defaultCategory,
    payment_method_id: '',
  }))
  const set = <K extends keyof typeof v>(key: K, value: (typeof v)[K]) => setV((prev) => ({ ...prev, [key]: value }))

  const counterparts = [...new Set(events.map((e) => e.counterpart.trim()))]
  const relations = [...new Set(events.map((e) => e.relation?.trim()).filter(Boolean))] as string[]
  const linked = !!row?.transaction_id
  // 보낸 기록이고 아직 가계부 거래와 연결되지 않았을 때만 새로 기록할 수 있다
  const canAddTransaction = v.direction === 'give' && !linked
  const categoryOptions = majorCategories
    .filter((c) => c.type === 'expense')
    .flatMap((major) => [
      { id: major.id, label: major.name },
      ...categories.filter((c) => c.parent_id === major.id).map((c) => ({ id: c.id, label: `${major.name} › ${c.name}` })),
    ])

  /** 예전에 기록한 상대방을 고르면 관계를 채운다 */
  function changeCounterpart(name: string) {
    const prev = events.find((e) => e.counterpart.trim() === name.trim() && e.relation)
    setV((p) => ({ ...p, counterpart: name, relation: p.relation || prev?.relation || '' }))
  }

  let problem: string | null = null
  if (!v.date) problem = '날짜를 넣어 주세요'
  else if (!v.counterpart.trim()) problem = '상대방을 넣어 주세요'
  else if (!v.amount) problem = '금액을 넣어 주세요'

  async function handleSave() {
    const addTransaction: GiftTransaction | undefined =
      canAddTransaction && v.addTransaction
        ? { category_id: v.category_id || null, payment_method_id: v.payment_method_id || null }
        : undefined
    try {
      await save.mutateAsync({
        id: row?.id,
        values: {
          date: v.date,
          direction: v.direction,
          counterpart: v.counterpart.trim(),
          relation: v.relation.trim() || null,
          event_type: v.event_type,
          amount: v.amount!,
          member_id: v.member_id || null,
          memo: v.memo.trim() || null,
          transaction_id: row?.transaction_id ?? null,
        },
        addTransaction,
      })
      onDone()
    } catch {
      // 오류 알림은 main.tsx 의 MutationCache 가 띄운다. 폼은 열어 둔다.
    }
  }

  return (
    <FormBox
      title={row ? '경조사 수정' : '경조사 추가'}
      hint={linked ? '가계부 거래와 연결된 기록이에요. 날짜·금액·사람을 고치면 거래도 함께 바뀌어요.' : undefined}
      problem={problem}
      saving={save.isPending}
      onSave={handleSave}
      onCancel={onCancel}
    >
      <Field label="날짜" required>
        <input type="date" className={inputCls} value={v.date} onChange={(e) => set('date', e.target.value)} />
      </Field>
      <Field label="구분" required>
        <select className={inputCls} value={v.direction} onChange={(e) => set('direction', e.target.value as GiftDirection)}>
          <option value="give">보냄</option>
          <option value="receive">받음</option>
        </select>
      </Field>
      <Field label="상대방" required>
        <input className={inputCls} list="gift-counterparts" placeholder="예: 김철수" value={v.counterpart} onChange={(e) => changeCounterpart(e.target.value)} />
        <datalist id="gift-counterparts">
          {counterparts.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Field label="관계">
        <input className={inputCls} list="gift-relations" placeholder="예: 대학 친구, 직장" value={v.relation} onChange={(e) => set('relation', e.target.value)} />
        <datalist id="gift-relations">
          {relations.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </Field>
      <Field label="행사" required>
        <select className={inputCls} value={v.event_type} onChange={(e) => set('event_type', e.target.value as GiftEventType)}>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{GIFT_EVENT_LABEL[t]}</option>
          ))}
        </select>
      </Field>
      <Field label="금액" required>
        <AmountInput className={inputCls} value={v.amount} onChange={(x) => set('amount', x)} />
      </Field>
      <Field label="우리 쪽">
        <select className={inputCls} value={v.member_id} onChange={(e) => set('member_id', e.target.value)}>
          <option value="">공동</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </Field>
      <Field label="메모" className="col-span-2">
        <input className={inputCls} value={v.memo} onChange={(e) => set('memo', e.target.value)} />
      </Field>
      {canAddTransaction && (
        <div className="col-span-2 space-y-2 rounded-lg border border-slate-200 bg-white p-3 md:col-span-4 xl:col-span-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={v.addTransaction} onChange={(e) => set('addTransaction', e.target.checked)} />
            가계부 지출(변동)로도 기록
          </label>
          {v.addTransaction && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Field label="카테고리">
                <select className={inputCls} value={v.category_id} onChange={(e) => set('category_id', e.target.value)}>
                  <option value="">미분류</option>
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="결제수단">
                <select className={inputCls} value={v.payment_method_id} onChange={(e) => set('payment_method_id', e.target.value)}>
                  <option value="">선택 안 함</option>
                  {paymentMethods.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
            </div>
          )}
        </div>
      )}
    </FormBox>
  )
}
