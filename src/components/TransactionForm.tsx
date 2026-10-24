import { useState, type FormEvent, type ReactNode } from 'react'
import { useSaveTransaction } from '../api/transactions'
import { useLookups } from '../hooks/useLookups'
import { formatWon, todayString } from '../lib/format'
import { KIND_LABEL, KINDS_BY_TYPE, type Transaction, type TxKind, type TxType } from '../lib/types'
import AmountInput from './AmountInput'

type Props = {
  /** 수정 중인 거래. null 이면 새 거래 입력 모드 */
  editing: Transaction | null
  onDone: () => void
}

// 부모가 key 를 바꿔주면 이 컴포넌트가 새로 만들어지면서 useState 초기값이 다시 적용된다.
// (수정할 거래를 바꿀 때 폼 내용을 갈아끼우는 가장 간단한 방법)
export default function TransactionForm({ editing, onDone }: Props) {
  const { categories, majorCategories, paymentMethods, members, categoryById } = useLookups()

  // 수정 모드면 저장된 카테고리에서 대분류/소분류를 거꾸로 찾아낸다
  const editingCategory = editing?.category_id ? categoryById.get(editing.category_id) : undefined
  const initialMajor = editingCategory ? (editingCategory.parent_id ?? editingCategory.id) : ''
  const initialSub = editingCategory?.parent_id ? editingCategory.id : ''

  const [type, setType] = useState<TxType>(editing?.type ?? 'expense')
  const [kind, setKind] = useState<TxKind>(editing?.kind ?? 'variable')
  const [date, setDate] = useState(editing?.date ?? todayString())
  const [memberId, setMemberId] = useState(editing?.member_id ?? '')
  const [majorId, setMajorId] = useState(initialMajor)
  const [subId, setSubId] = useState(initialSub)
  const [paymentMethodId, setPaymentMethodId] = useState(editing?.payment_method_id ?? '')
  // 결제금액 = 실지출 + 할인
  const [payAmount, setPayAmount] = useState<number | null>(editing ? editing.amount + editing.discount : null)
  const [discount, setDiscount] = useState<number | null>(editing?.discount || null)
  const [memo, setMemo] = useState(editing?.memo ?? '')
  const save = useSaveTransaction()

  const majorOptions = majorCategories.filter((c) => c.type === type)
  const subOptions = categories.filter((c) => c.parent_id && c.parent_id === majorId)
  const netAmount = (payAmount ?? 0) - (discount ?? 0)

  function changeType(next: TxType) {
    setType(next)
    setKind(KINDS_BY_TYPE[next][0])
    setMajorId('') // 수입/지출 카테고리는 서로 다르므로 선택을 초기화
    setSubId('')
    setDiscount(null)
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
      },
      {
        onSuccess: () => {
          if (editing) {
            onDone()
          } else {
            // 연달아 입력하기 편하도록 날짜·구분·사람·결제수단은 남기고 나머지만 비운다
            setPayAmount(null)
            setDiscount(null)
            setMemo('')
          }
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        <Field label="날짜">
          <input type="date" className="input w-full" value={date} onChange={(e) => setDate(e.target.value)} required />
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
          <AmountInput className="w-full" value={payAmount} onChange={setPayAmount} />
        </Field>
        {type === 'expense' && (
          <Field label="할인">
            <AmountInput className="w-full" value={discount} onChange={setDiscount} />
          </Field>
        )}
        <Field label="내용" wide={type === 'income'}>
          <input className="input w-full" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 점심 김밥" />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-3">
        {type === 'expense' && (discount ?? 0) > 0 && (
          <span className="text-sm text-slate-500">실지출 {formatWon(Math.max(netAmount, 0))}</span>
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

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`space-y-1 ${wide ? 'xl:col-span-2' : ''}`}>
      <span className="text-xs text-slate-500">{label}</span>
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
