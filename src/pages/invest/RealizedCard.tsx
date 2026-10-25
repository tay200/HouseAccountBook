import { useState } from 'react'
import { SignedWon } from '../../components/Numbers'
import { formatNumber } from '../../lib/format'
import { isIncluded } from '../../lib/invest'
import type { InvestAccount, StockTrade } from '../../lib/types'
import { StockName } from './common'

const TOTAL = ''

type Props = {
  accounts: InvestAccount[]
  trades: StockTrade[]
  /** 매도 기록 id → 그 매도의 실현손익 (analyzeInvest 결과) */
  realizedByTrade: Map<string, number>
}

/** 실현손익 내역: 매도 1건 = 1줄, 최신순. 길면 카드 안에서 스크롤 */
export default function RealizedCard({ accounts, trades, realizedByTrade }: Props) {
  const [accountId, setAccountId] = useState(TOTAL)
  const includedIds = new Set(accounts.filter(isIncluded).map((a) => a.id))
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? ''

  const rows = trades
    .filter((t) => t.side === 'sell' && (accountId ? t.account_id === accountId : includedIds.has(t.account_id)))
    .map((t) => ({ trade: t, realized: Math.round(realizedByTrade.get(t.id) ?? 0) }))
    // 날짜 없는 기록(엑셀에서 옮긴 것)은 가장 오래된 것으로 보고 맨 아래
    .sort((a, b) => (b.trade.trade_date ?? '').localeCompare(a.trade.trade_date ?? '') || b.trade.created_at.localeCompare(a.trade.created_at))
  const total = rows.reduce((sum, r) => sum + r.realized, 0)

  return (
    <div className="card flex flex-col">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">실현손익 내역</h3>
        <select className="input py-1.5" value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label="실현손익 계좌 선택">
          <option value={TOTAL}>선택 합계</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>
      <p className="mb-3 text-sm">
        합계 <span className="font-semibold tabular-nums"><SignedWon value={total} /></span>
        <span className="text-xs text-slate-400"> · 매도 {rows.length}건</span>
      </p>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">아직 매도 기록이 없어요.</p>
      ) : (
        // 넓은 화면: 옆 카드(종목별 비중) 높이에 맞추고 넘치면 스크롤
        //   (목록을 absolute 로 띄워서 목록 길이가 카드 높이를 늘리지 않게 한다)
        // 좁은 화면: 최대 높이까지만 보이고 스크롤
        <div className="relative xl:min-h-60 xl:flex-1">
          <div className="max-h-96 overflow-y-auto xl:absolute xl:inset-0 xl:max-h-none">
            <table className="w-full text-sm tabular-nums">
              <thead className="sticky top-0 border-b border-slate-200 bg-white text-xs whitespace-nowrap text-slate-500">
                <tr>
                  <th className="py-2 text-left font-medium">날짜</th>
                  <th className="hidden py-2 text-left font-medium sm:table-cell">계좌</th>
                  <th className="py-2 text-left font-medium">종목</th>
                  <th className="py-2 text-right font-medium">수량</th>
                  <th className="py-2 text-right font-medium">실현손익</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ trade: t, realized }) => (
                  <tr key={t.id}>
                    <td className="py-2 pr-2 whitespace-nowrap text-slate-600">{t.trade_date ?? '-'}</td>
                    <td className="hidden py-2 pr-2 whitespace-nowrap text-slate-600 sm:table-cell">{accountName(t.account_id)}</td>
                    <td className="py-2 pr-2">
                      <StockName position={{ market: t.market, name: t.stock_name, code: t.stock_code }} />
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">{formatNumber(t.quantity)}</td>
                    <td className="py-2 pl-2 text-right whitespace-nowrap"><SignedWon value={realized} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
