import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { favoritesApi } from '../api/tables'
import { useMemoSuggestions, useSaveTransaction, useTagSuggestions, type MemoSuggestion } from '../api/transactions'
import { useLookups } from '../hooks/useLookups'
import { formatTags, formatWon, parseTags, toDateString, todayString } from '../lib/format'
import { KIND_LABEL, KINDS_BY_TYPE, type FavoriteTransaction, type Transaction, type TxKind, type TxType } from '../lib/types'
import AmountInput from './AmountInput'

type Props = {
  /** 화면에서 보고 있는 달 'YYYY-MM'. 새 거래의 기본 날짜를 이 달로 맞춘다. */
  month: string
  /** 수정 중인 거래. null 이면 새 거래 입력 모드 */
  editing: Transaction | null
  onDone: () => void
  /** 저장이 끝난 뒤 저장된 날짜를 알려준다 (보고 있는 달과 다르면 화면을 그 달로 옮기기 위해) */
  onSaved: (date: string) => void
  /** 값이 바뀔 때마다 폼으로 스크롤하고 내용 칸에 포커스 (휴대폰 하단 (+) 버튼). 0 이면 아무것도 안 함 */
  focusRequest?: number
  /** focusRequest 와 함께 오면 날짜도 이 날로 바꾼다 (대시보드 달력에서 고른 날) */
  requestedDate?: string
}

/** 이번 달을 보고 있으면 오늘, 다른 달이면 그 달 1일 */
function defaultDate(month: string) {
  const today = todayString()
  return today.startsWith(month) ? today : `${month}-01`
}

/** 오늘에서 days 일 전 'YYYY-MM-DD' */
function daysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return toDateString(d)
}

// 부모가 key 를 바꿔주면 이 컴포넌트가 새로 만들어지면서 useState 초기값이 다시 적용된다.
// (수정할 거래가 바뀔 때 폼 내용을 갈아끼우는 가장 간단한 방법)
export default function TransactionForm({ month, editing, onDone, onSaved, focusRequest = 0, requestedDate }: Props) {
  const { categories, majorCategories, paymentMethods, members, categoryById, categoryLabel } = useLookups()
  const { data: suggestions } = useMemoSuggestions()
  const { data: tagSuggestions = [] } = useTagSuggestions()
  const { data: favorites = [] } = favoritesApi.useList()
  const saveFavorite = favoritesApi.useSave()
  const removeFavorite = favoritesApi.useDelete()

  // 수정 모드면 저장된 카테고리에서 대분류/소분류를 거꾸로 찾아낸다
  const editingCategory = editing?.category_id ? categoryById.get(editing.category_id) : undefined
  const initialMajor = editingCategory ? (editingCategory.parent_id ?? editingCategory.id) : ''
  const initialSub = editingCategory?.parent_id ? editingCategory.id : ''

  const [type, setType] = useState<TxType>(editing?.type ?? 'expense')
  const [kind, setKind] = useState<TxKind>(editing?.kind ?? 'variable')
  const [date, setDate] = useState(editing?.date ?? defaultDate(month))
  const [memberId, setMemberId] = useState(editing?.member_id ?? '')
  const [majorId, setMajorId] = useState(initialMajor)
  const [subId, setSubId] = useState(initialSub)
  const [paymentMethodId, setPaymentMethodId] = useState(editing?.payment_method_id ?? '')
  // 결제금액 = 실지출 + 할인
  const [payAmount, setPayAmount] = useState<number | null>(editing ? editing.amount + editing.discount : null)
  const [discount, setDiscount] = useState<number | null>(editing?.discount || null)
  const [memo, setMemo] = useState(editing?.memo ?? '')
  // 태그는 '#제주여행 #가족' 처럼 글자로 입력받고 저장할 때 나눈다
  const [tagsText, setTagsText] = useState(editing ? formatTags(editing.tags) : '')
  const save = useSaveTransaction()
  const formRef = useRef<HTMLFormElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)
  const memoRef = useRef<HTMLInputElement>(null)
  // 저장 직후 잠깐 보여줄 '저장됨' 표시
  const [justSaved, setJustSaved] = useState(false)

  // 보고 있는 달을 바꾸면 (입력 중인 내용은 두고) 새 거래의 날짜만 그 달로 맞춘다
  const [shownMonth, setShownMonth] = useState(month)
  if (shownMonth !== month) {
    setShownMonth(month)
    if (!editing && !date.startsWith(month)) setDate(defaultDate(month))
  }

  // 표 아래쪽 거래의 [수정]을 눌러도 폼이 보이도록 화면을 옮기고 금액 칸에 포커스
  useEffect(() => {
    if (!editing) return
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    amountRef.current?.focus({ preventScroll: true })
  }, [editing])

  // 하단 (+) 버튼: 폼으로 화면을 옮기고 내용 칸부터 입력하게 한다
  // 0 부터 시작: 다른 화면에서 들어와 처음부터 focusRequest 가 1 이어도 날짜를 반영하도록
  const [handledFocus, setHandledFocus] = useState(0)
  if (focusRequest !== handledFocus) {
    setHandledFocus(focusRequest)
    if (requestedDate) setDate(requestedDate)
  }
  useEffect(() => {
    if (!focusRequest) return
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    memoRef.current?.focus({ preventScroll: true })
  }, [focusRequest])

  useEffect(() => {
    if (!justSaved) return
    const timer = setTimeout(() => setJustSaved(false), 2000)
    return () => clearTimeout(timer)
  }, [justSaved])

  const majorOptions = majorCategories.filter((c) => c.type === type)
  const subOptions = categories.filter((c) => c.parent_id && c.parent_id === majorId)
  const netAmount = (payAmount ?? 0) - (discount ?? 0)
  const tags = parseTags(tagsText)
  // 아직 붙이지 않은 태그 중 많이 쓴 것 몇 개를 추천 칩으로
  const tagChips = tagSuggestions.filter((t) => !tags.includes(t)).slice(0, 8)

  function changeType(next: TxType) {
    setType(next)
    setKind(KINDS_BY_TYPE[next][0])
    setMajorId('') // 수입/지출 카테고리는 서로 다르므로 선택을 초기화
    setSubId('')
    setDiscount(null)
  }

  /** 내용을 바꿀 때, 예전에 같은 내용으로 입력한 거래가 있으면 그 분류·결제수단을 채운다 (새 거래만) */
  function changeMemo(next: string) {
    setMemo(next)
    const found = editing ? undefined : suggestions?.get(next.trim())
    if (found) applySuggestion(found)
  }

  function applySuggestion(s: MemoSuggestion) {
    if (s.type !== type) changeType(s.type)
    setKind(s.kind)
    const c = s.category_id ? categoryById.get(s.category_id) : undefined
    setMajorId(c ? (c.parent_id ?? c.id) : '')
    setSubId(c?.parent_id ? c.id : '')
    setPaymentMethodId(s.payment_method_id ?? '')
  }

  /** 즐겨찾기를 누르면 폼을 채우고 금액 칸으로 (저장은 [추가]를 눌러야 한다) */
  function applyFavorite(f: FavoriteTransaction) {
    if (f.type !== type) changeType(f.type)
    setKind(f.kind)
    const c = f.category_id ? categoryById.get(f.category_id) : undefined
    setMajorId(c ? (c.parent_id ?? c.id) : '')
    setSubId(c?.parent_id ? c.id : '')
    setPaymentMethodId(f.payment_method_id ?? '')
    setMemberId(f.member_id ?? '')
    setMemo(f.memo ?? '')
    setTagsText(formatTags(f.tags))
    setPayAmount(f.amount)
    setDiscount(null)
    amountRef.current?.focus()
  }

  /** 지금 폼 내용(날짜 제외)을 즐겨찾기로. 금액을 비워 두면 금액 없이 저장된다 */
  function saveAsFavorite() {
    const categoryId = subId || majorId || null
    const name = prompt('즐겨찾기 이름 (칩에 보여요)', memo.trim() || (categoryId ? categoryLabel(categoryId) : ''))?.trim()
    if (!name) return
    saveFavorite.mutate({
      name,
      type,
      kind,
      amount: netAmount > 0 ? netAmount : null,
      category_id: categoryId,
      payment_method_id: paymentMethodId || null,
      member_id: memberId || null,
      memo: memo.trim() || null,
      tags,
    })
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (netAmount <= 0) return
    save.mutate(
      {
        id: editing?.id,
        type,
        kind,
        date,
        amount: netAmount,
        discount: discount ?? 0,
        category_id: subId || majorId || null,
        payment_method_id: paymentMethodId || null,
        member_id: memberId || null,
        memo: memo.trim() || null,
        tags,
      },
      {
        onSuccess: () => {
          onSaved(date)
          if (editing) {
            onDone()
          } else {
            // 연달아 입력하기 편하도록 날짜·구분·사람·카테고리·결제수단·태그는 남기고 금액·내용만 비운 뒤 내용 칸으로
            // (내용을 고르면 자동완성이 분류·결제수단을 채워 준다)
            setPayAmount(null)
            setDiscount(null)
            setMemo('')
            setJustSaved(true)
            memoRef.current?.focus()
          }
        },
      },
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="card scroll-mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">{editing ? '거래 수정' : '새 거래'}</h3>
        <div className="flex gap-3">
          <SegmentedControl
            options={(['expense', 'income'] as const).map((t) => ({ value: t, label: t === 'expense' ? '지출' : '수입' }))}
            value={type}
            onChange={changeType}
            activeClass={type === 'expense' ? 'text-red-600' : 'text-blue-600'}
          />
          <SegmentedControl
            options={KINDS_BY_TYPE[type].map((k) => ({ value: k, label: KIND_LABEL[k] }))}
            value={kind}
            onChange={setKind}
          />
        </div>
      </div>

      {!editing && favorites.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500">즐겨찾기</span>
          {favorites.map((f) => (
            <span key={f.id} className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-sm text-amber-900">
              <button
                type="button"
                className="rounded-l-full py-0.5 pr-1 pl-2.5 hover:bg-amber-100"
                title={f.amount ? formatWon(f.amount) : '금액은 직접 입력'}
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
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        <Field
          label="날짜"
          extra={
            <span className="flex gap-1">
              {[
                { label: '오늘', value: daysAgo(0) },
                { label: '어제', value: daysAgo(1) },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setDate(chip.value)}
                  className={`rounded px-1.5 text-xs ${date === chip.value ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  {chip.label}
                </button>
              ))}
            </span>
          }
        >
          <input type="date" className="input w-full" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="내용" wide={type === 'income'}>
          {/* list 로 연결한 datalist 가 과거 내용을 자동완성 목록으로 보여준다 */}
          <input
            ref={memoRef}
            className="input w-full"
            list="memo-suggestions"
            value={memo}
            onChange={(e) => changeMemo(e.target.value)}
            placeholder="예: 점심 김밥"
          />
          <datalist id="memo-suggestions">
            {[...(suggestions?.values() ?? [])].map((s) => (
              <option key={s.memo} value={s.memo!} label={categoryLabel(s.category_id)} />
            ))}
          </datalist>
        </Field>
        <Field label="사람">
          <select className="input w-full" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">공동</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </Field>
        <Field label="대분류">
          <select
            className="input w-full"
            value={majorId}
            onChange={(e) => {
              setMajorId(e.target.value)
              setSubId('')
            }}
          >
            <option value="">미분류</option>
            {majorOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="소분류">
          <select className="input w-full" value={subId} onChange={(e) => setSubId(e.target.value)} disabled={subOptions.length === 0}>
            <option value="">-</option>
            {subOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="결제수단">
          <select className="input w-full" value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}>
            <option value="">선택 안 함</option>
            {paymentMethods.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
        <Field label={type === 'expense' ? '결제금액' : '금액'}>
          <AmountInput ref={amountRef} className="w-full" value={payAmount} onChange={setPayAmount} />
        </Field>
        {type === 'expense' && (
          <Field label="할인">
            <AmountInput className="w-full" value={discount} onChange={setDiscount} />
          </Field>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-60 flex-1 items-center gap-2">
          <span className="shrink-0 text-xs text-slate-500">태그</span>
          <input
            className="input min-w-0 flex-1"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="#제주여행 #이사 (카테고리와 상관없이 묶어 볼 때)"
          />
        </label>
        {tagChips.map((t) => (
          <button
            key={t}
            type="button"
            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-200"
            onClick={() => setTagsText(formatTags([...tags, t]))}
          >
            +#{t}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3">
        {justSaved && <span className="text-sm font-medium text-emerald-600">✓ 저장됨</span>}
        {type === 'expense' && (discount ?? 0) > 0 && (
          <span className="text-sm text-slate-500">실지출 {formatWon(Math.max(netAmount, 0))}</span>
        )}
        {payAmount !== null && netAmount <= 0 && (
          <span className="text-xs text-red-600">{(discount ?? 0) > 0 ? '할인이 결제금액보다 크거나 같아요' : '금액을 넣어 주세요'}</span>
        )}
        {!editing && (
          <button
            type="button"
            className="btn btn-text mr-auto text-sm"
            title="지금 입력한 내용으로 즐겨찾기를 만들어요. 금액을 비워 두면 금액은 매번 입력해요."
            disabled={(!memo.trim() && !majorId) || saveFavorite.isPending}
            onClick={saveAsFavorite}
          >
            ☆ 즐겨찾기로 저장
          </button>
        )}
        {editing && (
          <button type="button" className="btn btn-secondary" onClick={onDone}>
            취소
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={netAmount <= 0 || save.isPending}>
          {editing ? '수정 저장' : '추가'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, children, wide, extra }: { label: string; children: ReactNode; wide?: boolean; extra?: ReactNode }) {
  return (
    <label className={`space-y-1 ${wide ? 'xl:col-span-2' : ''}`}>
      <span className="flex items-center justify-between text-xs text-slate-500">
        {label}
        {extra}
      </span>
      {children}
    </label>
  )
}

type SegmentedProps<V extends string> = {
  options: { value: V; label: string }[]
  value: V
  onChange: (value: V) => void
  activeClass?: string
}

function SegmentedControl<V extends string>({ options, value, onChange, activeClass = 'text-slate-900' }: SegmentedProps<V>) {
  return (
    <div className="flex rounded-lg bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1 text-sm font-medium ${value === o.value ? `bg-white shadow-sm ${activeClass}` : 'text-slate-500'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
