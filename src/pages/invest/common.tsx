// 투자 화면 여러 곳에서 쓰는 작은 표시 부품
import type { Position } from '../../lib/invest'
import { SIDE_LABEL, type TradeSide } from '../../lib/types'

/** 매수는 빨강, 매도는 파랑 */
export function SideBadge({ side }: { side: TradeSide }) {
  const color = side === 'buy' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${color}`}>{SIDE_LABEL[side]}</span>
}

/** 종목 이름 칸: 미국 종목이면 US 표시 + 이름 + 회색 종목코드 */
export function StockName({ position: p }: { position: Pick<Position, 'market' | 'name' | 'code'> }) {
  return (
    <>
      {p.market === 'US' && <span className="mr-1 rounded bg-slate-100 px-1 text-xs text-slate-500">US</span>}
      {p.name} <span className="text-xs text-slate-400">{p.code}</span>
    </>
  )
}
