import { useState, type FormEvent } from 'react'
import {
  useAddDefaultPaymentMethods,
  useDeletePaymentMethod,
  usePaymentMethods,
  useSavePaymentMethod,
} from '../api/paymentMethods'
import { PAYMENT_KIND_LABEL, type PaymentKind, type PaymentMethod } from '../lib/types'

const KINDS = Object.keys(PAYMENT_KIND_LABEL) as PaymentKind[]

function KindSelect({ value, onChange }: { value: PaymentKind; onChange: (kind: PaymentKind) => void }) {
  return (
    <select className="input py-1.5" value={value} onChange={(e) => onChange(e.target.value as PaymentKind)}>
      {KINDS.map((k) => (
        <option key={k} value={k}>{PAYMENT_KIND_LABEL[k]}</option>
      ))}
    </select>
  )
}

export default function PaymentMethodSettings() {
  const { data: paymentMethods = [], isSuccess } = usePaymentMethods()
  const addDefaults = useAddDefaultPaymentMethods()
  const save = useSavePaymentMethod()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<PaymentKind>('card')

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    save.mutate({ name: name.trim(), kind }, { onSuccess: () => setName('') })
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">결제수단 / 계좌</h3>
        {isSuccess && paymentMethods.length === 0 && (
          <button className="btn btn-primary" onClick={() => addDefaults.mutate()} disabled={addDefaults.isPending}>
            '현금' 추가
          </button>
        )}
      </div>
      <ul className="divide-y divide-slate-100 md:max-w-xl">
        {paymentMethods.map((p) => (
          <PaymentMethodRow key={p.id} paymentMethod={p} />
        ))}
      </ul>
      <form onSubmit={handleAdd} className="flex gap-2 md:max-w-xl">
        <KindSelect value={kind} onChange={setKind} />
        <input className="input flex-1" placeholder="예: 신한카드, 국민은행 월급통장" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-secondary" disabled={!name.trim() || save.isPending}>추가</button>
      </form>
    </div>
  )
}

function PaymentMethodRow({ paymentMethod }: { paymentMethod: PaymentMethod }) {
  const save = useSavePaymentMethod()
  const remove = useDeletePaymentMethod()
  const [name, setName] = useState(paymentMethod.name)
  const [kind, setKind] = useState(paymentMethod.kind)
  const changed = name.trim() !== paymentMethod.name || kind !== paymentMethod.kind

  function handleDelete() {
    if (!confirm(`'${paymentMethod.name}'을(를) 삭제할까요?\n이 결제수단을 쓴 거래는 결제수단이 비워집니다.`)) return
    remove.mutate(paymentMethod.id)
  }

  return (
    <li className="flex items-center gap-2 py-1.5">
      <KindSelect value={kind} onChange={setKind} />
      <input className="input flex-1 py-1.5" value={name} onChange={(e) => setName(e.target.value)} />
      {changed && (
        <button
          className="btn btn-primary py-1.5"
          disabled={!name.trim() || save.isPending}
          onClick={() => save.mutate({ id: paymentMethod.id, name: name.trim(), kind })}
        >
          저장
        </button>
      )}
      <button className="btn btn-danger-text" onClick={handleDelete}>삭제</button>
    </li>
  )
}
