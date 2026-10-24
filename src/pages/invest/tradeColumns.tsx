import type { Column } from '../../components/CrudTable'
import { SignedWon } from '../../components/Numbers'
import { formatNumber, formatWon } from '../../lib/format'
import { tradeAmount } from '../../lib/invest'
import { SIDE_LABEL, type StockPrice, type StockTrade } from '../../lib/types'
import { SideBadge } from './common'
import { formatLocal, marketLabel } from './format'

type Args = {
  accountName: (id: string) => string
  priceByCode: Map<string, StockPrice>
  /** 매도 기록 id → 실현손익 */
  realizedByTrade: Map<string, number>
  /** 매도 기록 id → 그 시점에 실제로 가진 수량 (보유보다 많이 판 기록) */
  oversold: Map<string, number>
}

const dash = <span className="text-slate-300">-</span>

/** 매매 내역 표의 열 정의 (입력은 TradeForm 이 맡으므로 표시·정렬용) */
export function tradeColumns({ accountName, priceByCode, realizedByTrade, oversold }: Args): Column<StockTrade>[] {
  return [
    {
      key: 'side',
      label: '구분',
      render: (t) => (
        <>
          <SideBadge side={t.side} />
          {oversold.has(t.id) && (
            <span
              className="ml-1 cursor-help text-xs text-amber-600"
              title={`이 매도 시점에 가진 수량은 ${formatNumber(oversold.get(t.id)!)}주예요. 넘게 판 수량은 손익 계산에서 뺐어요. 날짜나 수량을 확인해 주세요.`}
            >
              ⚠ 수량 초과
            </span>
          )}
        </>
      ),
      sortValue: (t) => SIDE_LABEL[t.side],
    },
    { key: 'trade_date', label: '날짜' },
    { key: 'account_id', label: '계좌', render: (t) => accountName(t.account_id), sortValue: (t) => accountName(t.account_id) },
    { key: 'market', label: '시장', render: (t) => marketLabel(t.market), sortValue: (t) => marketLabel(t.market) },
    { key: 'stock_code', label: '종목코드' },
    { key: 'stock_name', label: '종목명' },
    { key: 'price', label: '단가', align: 'right', render: (t) => formatLocal(t.price, t.market) },
    { key: 'quantity', label: '수량', align: 'right', render: (t) => formatNumber(t.quantity) },
    {
      key: 'fx_rate',
      label: '환율',
      align: 'right',
      render: (t) =>
        t.market !== 'US' ? (
          dash
        ) : t.fx_rate ? (
          formatNumber(t.fx_rate)
        ) : (
          <span className="cursor-help text-amber-600" title="환율이 비어 있어 현재 환율로 계산 중이에요. [수정]에서 거래 당시 환율을 넣어 주세요.">
            환율 없음
          </span>
        ),
    },
    { key: 'fee', label: '수수료·세금', align: 'right', render: (t) => formatLocal(t.fee, t.market) },
    {
      key: 'amount',
      label: '거래금액(원)',
      align: 'right',
      render: (t) => formatWon(Math.round(tradeAmount(t, priceByCode))),
      sortValue: (t) => tradeAmount(t, priceByCode),
    },
    {
      key: 'realized',
      label: '실현손익',
      align: 'right',
      render: (t) => (t.side === 'sell' ? <SignedWon value={Math.round(realizedByTrade.get(t.id) ?? 0)} /> : dash),
      sortValue: (t) => (t.side === 'sell' ? (realizedByTrade.get(t.id) ?? 0) : null),
    },
    { key: 'memo', label: '메모' },
  ]
}
