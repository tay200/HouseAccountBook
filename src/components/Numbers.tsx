import type { ReactNode } from 'react'
import { formatWon } from '../lib/format'

/** 손익 금액: 이익은 빨강 +, 손실은 파랑 (국내 증권 앱 관례) */
export function SignedWon({ value }: { value: number }) {
  return (
    <span className={value > 0 ? 'text-red-600' : value < 0 ? 'text-blue-600' : ''}>
      {value > 0 ? '+' : ''}
      {formatWon(value)}
    </span>
  )
}

/** 수익률 = value / base. base 가 0 이면 '-' */
export function ProfitRate({ value, base }: { value: number; base: number }) {
  if (base === 0) return <>-</>
  const r = (value / base) * 100
  return (
    <span className={r > 0 ? 'text-red-600' : r < 0 ? 'text-blue-600' : ''}>
      {r > 0 ? '+' : ''}
      {r.toFixed(2)}%
    </span>
  )
}

type StatCardProps = { label: string; value: ReactNode; sub?: ReactNode; valueClass?: string; className?: string }

/** 화면 위쪽 요약 숫자 카드 (대시보드, 투자, 자산 공용) */
export function StatCard({ label, value, sub, valueClass = '', className = '' }: StatCardProps) {
  return (
    <div className={`card ${className}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${valueClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}
