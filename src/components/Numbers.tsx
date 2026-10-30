import type { ReactNode } from 'react'
import { Link, type To } from 'react-router'
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

type StatCardProps = {
  label: string
  value: ReactNode
  sub?: ReactNode
  valueClass?: string
  className?: string
  /** 있으면 카드를 누를 때 이 주소로 (예: 그 금액의 내역) */
  to?: To
}

/** 화면 위쪽 요약 숫자 카드 (대시보드, 투자, 자산 공용) */
export function StatCard({ label, value, sub, valueClass = '', className = '', to }: StatCardProps) {
  const body = (
    <>
      <p className="text-sm text-slate-500">
        {label}
        {to && <span className="ml-1 text-slate-400">›</span>}
      </p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${valueClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </>
  )
  return to ? (
    <Link to={to} className={`card block hover:border-blue-300 hover:bg-blue-50/40 ${className}`}>
      {body}
    </Link>
  ) : (
    <div className={`card ${className}`}>{body}</div>
  )
}
