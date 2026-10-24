// 자산 탭들이 같이 쓰는 작은 화면 부품
import type { ReactNode } from 'react'
import { daysUntil, monthsBetween } from '../../lib/finance'
import { formatWon, todayString } from '../../lib/format'

/** 만기까지 남은 기간: 1개월 넘으면 개월, 안 되면 일. 지났으면 정리 안내 배지 */
export function RemainCell({ maturity }: { maturity: string }) {
  const days = daysUntil(maturity)
  if (days <= 0) {
    return (
      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700" title="만기금을 다른 계좌로 옮겼다면 이 항목을 정리해 주세요. 자산현황에는 세후 수령액으로 들어가요.">
        만기 지남
      </span>
    )
  }
  const months = monthsBetween(todayString(), maturity)
  return <>{months >= 1 ? `${months}개월` : `${days}일`}</>
}

export function TabCard({ note, children }: { note?: string; children: ReactNode }) {
  return (
    <div className="card space-y-3">
      {note && <p className="text-xs text-slate-500">{note}</p>}
      {children}
    </div>
  )
}

export function TotalLine({ label, amount }: { label: string; amount: number }) {
  return (
    <p className="flex justify-end gap-3 border-t border-slate-200 pt-3 text-sm tabular-nums">
      <span className="text-slate-500">{label}</span>
      <strong>{formatWon(amount)}</strong>
    </p>
  )
}
