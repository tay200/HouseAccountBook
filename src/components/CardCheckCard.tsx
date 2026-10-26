import { useState } from 'react'
import { usePaymentMethods } from '../api/paymentMethods'
import { reconciliationsApi, useSavePaymentCheck } from '../api/tables'
import { formatMonthShort, formatWon, monthStart } from '../lib/format'
import type { PaymentMethod, Transaction } from '../lib/types'
import AmountInput from './AmountInput'

type Props = {
  month: string
  /** 그 달 거래 */
  transactions: Transaction[]
}

/**
 * 거래 내역 아래: 카드 사용액 대조.
 * 카드별 이번 달 가계부 합계 옆에 카드사 앱의 이용금액을 넣으면 차이를 보여준다 (빠뜨린 입력 찾기).
 */
export default function CardCheckCard({ month, transactions }: Props) {
  const { data: paymentMethods = [] } = usePaymentMethods()
  const { data: checks = [], isSuccess } = reconciliationsApi.useList()
  const cards = paymentMethods.filter((p) => p.kind === 'card')
  if (cards.length === 0 || !isSuccess) return null

  const date = monthStart(month)
  const savedFor = (id: string) => checks.find((c) => c.target === 'payment' && c.payment_method_id === id && c.date === date)
  const recordedFor = (id: string) =>
    transactions.filter((t) => t.type === 'expense' && t.payment_method_id === id).reduce((s, t) => s + t.amount, 0)

  return (
    <div className="card space-y-3">
      <div>
        <h3 className="font-semibold">카드 사용액 대조 ({formatMonthShort(month)})</h3>
        <p className="text-sm text-slate-500">
          카드사 앱의 {formatMonthShort(month)} 이용금액을 넣으면 가계부와 비교해요. 차이가 나면 빠뜨린 입력이 있는지 확인해 보세요.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead className="border-b border-slate-200 text-xs whitespace-nowrap text-slate-500">
            <tr>
              <th className="py-2 pr-3 text-left font-medium">카드</th>
              <th className="py-2 pr-3 text-right font-medium">가계부 합계</th>
              <th className="py-2 pr-3 text-right font-medium">카드사 이용금액</th>
              <th className="py-2 text-left font-medium">차이</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cards.map((card) => {
              const saved = savedFor(card.id)
              return (
                <CardRow
                  // 저장된 값이 바뀌면(다른 달로 이동 등) 입력칸을 새 값으로
                  key={`${card.id}-${month}-${saved?.actual ?? ''}`}
                  card={card}
                  month={month}
                  recorded={recordedFor(card.id)}
                  savedActual={saved?.actual ?? null}
                />
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">할부·해외결제·결제 취소·청구할인은 카드사 금액과 기준이 달라 차이가 날 수 있어요. 가계부 합계는 할인 뒤 실지출이에요.</p>
    </div>
  )
}

type RowProps = { card: PaymentMethod; month: string; recorded: number; savedActual: number | null }

function CardRow({ card, month, recorded, savedActual }: RowProps) {
  const save = useSavePaymentCheck()
  const [actual, setActual] = useState<number | null>(savedActual)
  // 저장된 카드사 금액과 지금 가계부 합계를 비교 (입력 중이면 입력 값으로)
  const diff = actual === null ? null : actual - recorded

  function commit() {
    if (actual === null || actual === savedActual) return
    save.mutate({ payment_method_id: card.id, date: monthStart(month), actual, recorded })
  }

  return (
    <tr className="whitespace-nowrap">
      <td className="py-2 pr-3">{card.name}</td>
      <td className="py-2 pr-3 text-right">{formatWon(recorded)}</td>
      <td className="py-2 pr-3 text-right">
        <AmountInput
          className="w-36 py-1"
          placeholder="입력"
          value={actual}
          onChange={setActual}
          disabled={save.isPending}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </td>
      <td className="py-2 text-sm">
        {diff === null ? (
          <span className="text-slate-300">-</span>
        ) : diff === 0 ? (
          <span className="text-emerald-700">✓ 맞아요</span>
        ) : diff > 0 ? (
          <span className="text-amber-700">가계부가 {formatWon(diff)} 적어요 (빠뜨린 입력?)</span>
        ) : (
          <span className="text-amber-700">가계부가 {formatWon(-diff)} 많아요</span>
        )}
      </td>
    </tr>
  )
}
