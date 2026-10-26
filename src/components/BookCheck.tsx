import { useState } from 'react'
import { ledgerApi, reconciliationsApi } from '../api/tables'
import { formatWon, todayString } from '../lib/format'
import type { LedgerEntry } from '../lib/types'
import AmountInput from './AmountInput'
import { Field, inputCls } from './FormFields'

type Props = {
  book: string
  /** 이 통장의 입출금 기록 */
  entries: LedgerEntry[]
}

/**
 * 통장 기록 > 잔액 맞추기: 실제 통장 잔액을 넣으면 장부 잔액과의 차이를 보여준다.
 * 차이가 있으면 그만큼 '잔액 조정' 입출금을 넣어 맞출 수 있고, 맞춰 본 기록은 아래에 남는다.
 */
export default function BookCheck({ book, entries }: Props) {
  const { data: checks = [] } = reconciliationsApi.useList()
  const saveCheck = reconciliationsApi.useSave()
  const saveEntry = ledgerApi.useSave()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(todayString())
  const [actual, setActual] = useState<number | null>(null)

  // 그 날짜까지의 장부 잔액 (그날 기록 포함)
  const recorded = entries.filter((e) => e.date <= date).reduce((s, e) => s + (e.direction === 'in' ? e.amount : -e.amount), 0)
  const diff = actual === null ? null : actual - recorded
  const history = checks.filter((c) => c.target === 'book' && c.book === book).slice(0, 5)
  const busy = saveCheck.isPending || saveEntry.isPending

  async function record(adjust: boolean) {
    if (actual === null || diff === null) return
    try {
      if (adjust && diff !== 0) {
        await saveEntry.mutateAsync({ book, date, direction: diff > 0 ? 'in' : 'out', amount: Math.abs(diff), member_id: null, memo: '잔액 조정' })
      }
      await saveCheck.mutateAsync({ target: 'book', book, date, actual, recorded })
      setActual(null)
      setOpen(false)
    } catch {
      // 오류 알림은 main.tsx 의 MutationCache 가 띄운다
    }
  }

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">잔액 맞추기</h3>
          <p className="text-sm text-slate-500">은행 앱의 실제 잔액을 넣으면 장부와 다른지 알려드려요. 빠뜨린 입출금을 찾는 데 써요.</p>
        </div>
        {!open && (
          <button className="btn btn-secondary" onClick={() => setOpen(true)}>
            잔액 맞추기
          </button>
        )}
      </div>

      {open && (
        <div className="edit-form space-y-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="기준 날짜">
              <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="실제 통장 잔액">
              <AmountInput className={inputCls} value={actual} onChange={setActual} />
            </Field>
            <div className="space-y-1 text-sm">
              <span className="text-xs text-slate-500">장부 잔액 ({date.slice(5).replace('-', '/')}까지)</span>
              <p className="py-1.5 font-medium tabular-nums">{formatWon(recorded)}</p>
            </div>
            <div className="space-y-1 text-sm">
              <span className="text-xs text-slate-500">차이</span>
              <p className={`py-1.5 font-medium tabular-nums ${diff === null ? 'text-slate-300' : diff === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {diff === null ? '-' : diff === 0 ? '✓ 맞아요' : `실제가 ${formatWon(Math.abs(diff))} ${diff > 0 ? '많아요' : '적어요'}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button className="btn btn-secondary" onClick={() => setOpen(false)}>
              취소
            </button>
            <button className="btn btn-secondary" disabled={actual === null || busy} onClick={() => record(false)}>
              기록만 저장
            </button>
            {diff !== null && diff !== 0 && (
              <button className="btn btn-primary" disabled={busy} onClick={() => record(true)}>
                {formatWon(Math.abs(diff))} {diff > 0 ? '입금' : '출금'}으로 조정
              </button>
            )}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="border-b border-slate-200 text-xs whitespace-nowrap text-slate-500">
              <tr>
                <th className="py-2 pr-3 text-left font-medium">맞춘 날짜</th>
                <th className="py-2 pr-3 text-right font-medium">실제 잔액</th>
                <th className="py-2 pr-3 text-right font-medium">그때 장부</th>
                <th className="py-2 text-right font-medium">차이</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((c) => {
                const d = c.actual - c.recorded
                return (
                  <tr key={c.id} className="whitespace-nowrap">
                    <td className="py-2 pr-3">{c.date}</td>
                    <td className="py-2 pr-3 text-right">{formatWon(c.actual)}</td>
                    <td className="py-2 pr-3 text-right">{formatWon(c.recorded)}</td>
                    <td className={`py-2 text-right ${d === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{d === 0 ? '✓' : `${d > 0 ? '+' : '−'}${formatWon(Math.abs(d))}`}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
