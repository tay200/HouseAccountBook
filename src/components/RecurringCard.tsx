import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { recurringRulesApi } from '../api/tables'
import { useSaveTransaction } from '../api/transactions'
import { useLookups } from '../hooks/useLookups'
import { formatWon, todayString } from '../lib/format'
import { pendingAmount, recurringForMonth, type RecurringItem } from '../lib/recurring'
import type { Transaction } from '../lib/types'
import AmountInput from './AmountInput'

type Props = {
  month: string
  /** 그 달 거래 (이미 [확인]한 반복 거래를 찾는 데 쓴다) */
  transactions: Transaction[]
}

/**
 * 거래 내역 맨 위: 이번 달 반복 거래(관리비·보험·통신비 등)의 예정/완료 목록.
 * [확인]을 누르면 그 금액으로 실제 거래를 만든다. 금액이 달라졌으면 고쳐서 확인한다.
 */
export default function RecurringCard({ month, transactions }: Props) {
  const { search } = useLocation()
  const { data: rules = [], isSuccess } = recurringRulesApi.useList()
  const items = recurringForMonth(rules, transactions, month)
  const pending = items.filter((i) => !i.done)
  const settingsLink = (
    <Link to={{ pathname: '/settings', search }} className="text-xs text-blue-600 hover:underline">
      반복 거래 관리
    </Link>
  )

  if (!isSuccess) return null
  if (rules.length === 0) {
    return (
      <p className="card flex flex-wrap items-center justify-between gap-2 py-3 text-sm text-slate-500">
        매달 나가는 관리비·보험료·통신비를 반복 거래로 등록하면 여기서 한 번에 입력할 수 있어요.
        {settingsLink}
      </p>
    )
  }
  if (items.length === 0) return null

  const pendingTotal = pendingAmount(items, (r) => r.type === 'expense')
  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">
          이번 달 고정 거래
          <span className="ml-2 text-sm font-normal text-slate-500">
            {pending.length === 0 ? '모두 처리했어요' : `예정 ${pending.length}건${pendingTotal ? ` · 지출 ${formatWon(pendingTotal)}` : ''}`}
          </span>
        </h3>
        {settingsLink}
      </div>
      <ul className="divide-y divide-slate-100">
        {items.map((item) => (
          <RecurringRow key={item.rule.id} item={item} />
        ))}
      </ul>
    </div>
  )
}

function RecurringRow({ item }: { item: RecurringItem }) {
  const { rule, date, done } = item
  const { categoryLabel, memberName } = useLookups()
  const save = useSaveTransaction()
  const [amount, setAmount] = useState<number | null>(rule.amount)
  const overdue = !done && date < todayString()
  const [, mon, day] = date.split('-').map(Number)

  function confirmRule() {
    if (!amount) return
    save.mutate({
      type: rule.type,
      kind: rule.kind,
      date,
      amount,
      discount: 0,
      category_id: rule.category_id,
      payment_method_id: rule.payment_method_id,
      member_id: rule.member_id,
      memo: rule.memo,
      tags: [],
      recurring_id: rule.id,
    })
  }

  return (
    <li className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm ${done ? 'text-slate-400' : ''}`}>
      <span className={`w-12 tabular-nums ${overdue ? 'font-medium text-amber-700' : 'text-slate-500'}`}>
        {mon}/{day}
      </span>
      <span className="min-w-24 flex-1">
        {rule.memo}
        <span className="ml-2 text-xs text-slate-400">
          {categoryLabel(rule.category_id)} · {memberName(rule.member_id)}
        </span>
        {overdue && <span className="ml-2 text-xs text-amber-700">날짜 지남</span>}
      </span>
      {done ? (
        <span className="tabular-nums">
          ✓ {rule.type === 'income' ? '+' : '-'}
          {formatWon(done.amount)}
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <AmountInput className="w-32 py-1" value={amount} onChange={setAmount} disabled={save.isPending} />
          <button className="btn btn-primary py-1" disabled={!amount || save.isPending} onClick={confirmRule}>
            확인
          </button>
        </span>
      )}
    </li>
  )
}
