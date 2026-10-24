import type { ReactNode } from 'react'
import { ProfitRate, SignedWon } from '../../components/Numbers'
import SortHeader from '../../components/SortHeader'
import { useSort } from '../../hooks/useSort'
import { formatNumber, formatWon } from '../../lib/format'
import { currentFx, type Position } from '../../lib/invest'
import type { StockHolding, StockPrice } from '../../lib/types'
import { StockName } from './common'
import { formatLocal } from './format'
import PriceCell from './PriceCell'

type Props = {
  positions: Position[]
  priceByCode: Map<string, StockPrice>
  accountName: (id: string) => string
  /** 위쪽 폼에서 수정 중인 보유분 (줄을 파랗게) */
  editingHoldingId?: string
  onSell: (positionKey: string) => void
  /** 직접 넣은 보유분의 [수정] [삭제] 버튼 */
  holdingButtons: (h: StockHolding) => ReactNode
}

const HEADERS: { key: string; label: string; align?: 'right' }[] = [
  { key: 'account', label: '계좌' },
  { key: 'name', label: '종목' },
  { key: 'quantity', label: '수량', align: 'right' },
  { key: 'avg', label: '평균단가', align: 'right' },
  { key: 'price', label: '현재가', align: 'right' },
  { key: 'value', label: '평가금액', align: 'right' },
  { key: 'unrealized', label: '평가손익', align: 'right' },
  { key: 'rate', label: '수익률', align: 'right' },
]

/** 보유 종목 표 (머리글 정렬) + 아래에 접힌 '청산 종목' */
export default function HoldingsTable({ positions, priceByCode, accountName, editingHoldingId, onSell, holdingButtons }: Props) {
  const open = positions.filter((p) => p.quantity > 0)
  const closed = positions.filter((p) => p.quantity === 0)

  // 단가는 한국·미국 종목을 같이 비교할 수 있게 원화로 정렬
  const fxNow = currentFx(priceByCode) ?? 0
  const { sorted, sort, toggle } = useSort(open, (p, key) => {
    switch (key) {
      case 'account': return accountName(p.accountId)
      case 'name': return p.name
      case 'quantity': return p.quantity
      case 'avg': return p.cost / p.quantity
      case 'price': return p.currentPrice === null ? null : p.currentPrice * (p.market === 'US' ? fxNow : 1)
      case 'value': return p.value
      case 'unrealized': return p.unrealized
      case 'rate': return p.cost > 0 ? p.unrealized / p.cost : null
    }
  })

  return (
    <>
      <table className="w-full text-sm tabular-nums">
        <thead className="border-b border-slate-200 text-xs text-slate-500">
          <tr>
            {HEADERS.map((h) => (
              <SortHeader key={h.key} label={h.label} sortKey={h.key} sort={sort} onToggle={toggle} align={h.align} />
            ))}
            <th className="w-44" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((p) => {
            const avg = p.costLocal / p.quantity
            return (
              <tr key={p.key} className={editingHoldingId && editingHoldingId === p.holding?.id ? 'bg-blue-50' : ''}>
                <td className="py-2">{accountName(p.accountId)}</td>
                <td className="py-2"><StockName position={p} /></td>
                <td className="py-2 text-right">{formatNumber(p.quantity)}</td>
                <td className="py-2 text-right">{formatLocal(p.market === 'US' ? avg : Math.round(avg), p.market)}</td>
                <td className="py-2 text-right">
                  <PriceCell code={p.code} price={priceByCode.get(p.code)} market={p.market} format={(v) => formatLocal(v, p.market)} />
                </td>
                {p.fxMissing ? (
                  // 현재 환율을 몰라 평가할 수 없음 (0원으로 보이면 손실처럼 보이므로)
                  <td colSpan={3} className="py-2 text-right text-amber-600">환율 필요</td>
                ) : (
                  <>
                    <td className="py-2 text-right">{formatWon(Math.round(p.value))}</td>
                    <td className="py-2 text-right"><SignedWon value={Math.round(p.unrealized)} /></td>
                    <td className="py-2 text-right"><ProfitRate value={p.unrealized} base={p.cost} /></td>
                  </>
                )}
                <td className="py-2 text-right whitespace-nowrap">
                  <button className="btn btn-text text-blue-600" onClick={() => onSell(p.key)}>매도</button>
                  {/* 직접 넣은 보유분이 있는 종목만 수정·삭제 (매매 기록은 매매 내역에서) */}
                  {p.holding && holdingButtons(p.holding)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {open.length === 0 && <p className="py-6 text-center text-sm text-slate-400">보유 종목이 없어요.</p>}
      {closed.length > 0 && (
        // 다 판 종목: 실현손익을 보고, 직접 넣었던 보유분이 있으면 여기서 고치거나 지울 수 있다
        <details className="mt-4 rounded-lg border border-slate-200 px-4 py-2">
          <summary className="cursor-pointer text-sm text-slate-600">청산 종목 {closed.length}개 (다 판 종목)</summary>
          <table className="mt-2 w-full text-sm tabular-nums">
            <tbody className="divide-y divide-slate-100">
              {closed.map((p) => (
                <tr key={p.key}>
                  <td className="py-2">{accountName(p.accountId)}</td>
                  <td className="py-2"><StockName position={p} /></td>
                  <td className="py-2 text-right">실현손익 <SignedWon value={Math.round(p.realized)} /></td>
                  <td className="w-44 py-2 text-right whitespace-nowrap">{p.holding && holdingButtons(p.holding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </>
  )
}
