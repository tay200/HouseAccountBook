import { useState, type FormEvent } from 'react'
import { useSaveTransaction } from '../api/transactions'
import { todayString } from '../lib/format'
import type { Category, PaymentMethod, Transaction, TxType } from '../lib/types'
import AmountInput from './AmountInput'

type Props = {
  categories: Category[]
  paymentMethods: PaymentMethod[]
  /** 수정 중인 거래. null 이면 새 거래 입력 모드 */
  editing: Transaction | null
  onDone: () => void
}

// 부모가 key 를 바꿔주면 이 컴포넌트가 새로 만들어지면서 useState 초기값이 다시 적용된다.
// (수정할 거래를 바꿀 때 폼 내용을 갈아끼우는 가장 간단한 방법)
export default function TransactionForm({ categories, paymentMethods, editing, onDone }: Props) {
  const [type, setType] = useState<TxType>(editing?.type ?? 'expense')
  const [date, setDate] = useState(editing?.date ?? todayString())
  const [amount, setAmount] = useState<number | null>(editing?.amount ?? null)
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? '')
  const [paymentMethodId, setPaymentMethodId] = useState(editing?.payment_method_id ?? '')
  const [memo, setMemo] = useState(editing?.memo ?? '')
  const save = useSaveTransaction()

  const categoryOptions = categories.filter((c) => c.type === type)

  function changeType(next: TxType) {
    setType(next)
    setCategoryId('') // 수입/지출 카테고리는 서로 다르므로 선택을 초기화
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!amount) return
    save.mutate(
      {
        id: editing?.id,
        type,
        date,
        amount,
        category_id: categoryId || null,
        payment_method_id: paymentMethodId || null,
        memo: memo.trim() || null,
      },
      {
        onSuccess: () => {
          if (editing) {
            onDone()
          } else {
            // 연달아 입력하기 편하도록 날짜·구분·결제수단은 남기고 나머지만 비운다
            setAmount(null)
            setMemo('')
          }
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{editing ? '거래 수정' : '새 거래'}</h3>
        <div className="flex rounded-lg bg-slate-100 p-1">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => changeType(t)}
              className={`rounded-md px-4 py-1 text-sm font-medium ${
                type === t ? (t === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-500'
              }`}
            >
              {t === 'expense' ? '지출' : '수입'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <label className="space-y-1">
          <span className="text-xs text-slate-500">날짜</span>
          <input type="date" className="input w-full" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-slate-500">금액</span>
          <AmountInput className="w-full" value={amount} onChange={setAmount} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-slate-500">카테고리</span>
          <select className="input w-full" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">미분류</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-slate-500">결제수단</span>
          <select className="input w-full" value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}>
            <option value="">선택 안 함</option>
            {paymentMethods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 space-y-1">
          <span className="text-xs text-slate-500">메모</span>
          <input className="input w-full" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 점심 김밥" />
        </label>
      </div>

      <div className="flex justify-end gap-2">
        {editing && (
          <button type="button" className="btn btn-secondary" onClick={onDone}>
            취소
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={!amount || save.isPending}>
          {editing ? '수정 저장' : '추가'}
        </button>
      </div>
    </form>
  )
}
