import { FX_CODE, type Market, type StockHolding, type StockPrice, type StockTrade } from './types'

/** 현재 원/달러 환율 (아직 조회 전이면 null) */
export function currentFx(priceByCode: Map<string, StockPrice>) {
  return priceByCode.get(FX_CODE)?.price ?? null
}

/** 계좌+시장+종목코드로 같은 종목을 묶는 키 */
export const positionKey = (x: { account_id: string; market: Market; stock_code: string }) =>
  `${x.account_id}:${x.market}:${x.stock_code}`

/** 보유 종목 1개 (직접 넣은 보유분 + 매수 - 매도) */
export type Position = {
  key: string
  accountId: string
  market: Market
  code: string
  name: string
  quantity: number
  /** 남은 수량의 매수원가 (해당 통화, 수수료 제외) — 평균단가 표시용 */
  costLocal: number
  /** 남은 수량의 매수원가 (원화, 매수 수수료 포함) */
  cost: number
  /** 평가금액 (원화) */
  value: number
  unrealized: number
  /** 이 종목에서 지금까지 판 실현손익 (원화) */
  realized: number
  /** 해당 통화 현재가 */
  currentPrice: number | null
  /** 직접 넣은 보유분 (있으면 수정·삭제 가능) */
  holding: StockHolding | null
}

// 수량 계산의 소수점 오차 여유 (미국 소수점 거래)
const EPS = 1e-9

/**
 * 보유 종목과 매수·매도 기록으로 종목별 현황을 계산한다. 금액은 원화.
 *
 * 이동평균법: 매수하면 원가가 더해지고, 매도하면 그때의 평균단가 × 판 수량만큼 원가가 빠진다.
 *   실현손익 = 매도금액 - 매도 수수료 - 평균단가 × 판 수량
 * 미국 주식은 거래마다 그때 환율로 원화 원가를 쌓으므로 환율 변동도 손익에 들어간다.
 * 환율을 비워 둔 거래는 현재 환율을 쓴다.
 *
 * realizedByTrade: 매도 기록 id → 그 매도의 실현손익 (매매 내역 표시용)
 */
export function analyzeInvest(holdings: StockHolding[], trades: StockTrade[], priceByCode: Map<string, StockPrice>) {
  const fxNow = currentFx(priceByCode)
  const fxOf = (market: Market, rate: number | null) => (market === 'US' ? (rate ?? fxNow ?? 0) : 1)
  const map = new Map<string, Position>()
  const realizedByTrade = new Map<string, number>()

  function get(x: { account_id: string; market: Market; stock_code: string; stock_name: string }) {
    const key = positionKey(x)
    let p = map.get(key)
    if (!p) {
      p = {
        key,
        accountId: x.account_id,
        market: x.market,
        code: x.stock_code,
        name: x.stock_name,
        quantity: 0,
        costLocal: 0,
        cost: 0,
        value: 0,
        unrealized: 0,
        realized: 0,
        currentPrice: priceByCode.get(x.stock_code)?.price ?? null,
        holding: null,
      }
      map.set(key, p)
    }
    return p
  }

  // 직접 넣은 보유분이 출발점
  for (const h of holdings) {
    const p = get(h)
    p.holding = h
    p.quantity += h.quantity
    p.costLocal += h.avg_price * h.quantity
    p.cost += h.avg_price * h.quantity * fxOf(h.market, h.avg_fx_rate)
  }

  // 거래는 날짜 순서대로 (날짜 없는 기록은 가장 오래된 것으로)
  const sorted = [...trades].sort(
    (a, b) => (a.trade_date ?? '').localeCompare(b.trade_date ?? '') || a.created_at.localeCompare(b.created_at),
  )
  for (const t of sorted) {
    const p = get(t)
    const fx = fxOf(t.market, t.fx_rate)
    if (t.side === 'buy') {
      p.quantity += t.quantity
      p.costLocal += t.price * t.quantity
      p.cost += (t.price * t.quantity + t.fee) * fx
    } else {
      // 기록이 맞지 않아 보유보다 많이 판 경우에도 가진 만큼만 원가를 뺀다
      const qty = Math.min(t.quantity, p.quantity)
      const avgCost = p.quantity > EPS ? p.cost / p.quantity : 0
      const avgLocal = p.quantity > EPS ? p.costLocal / p.quantity : 0
      const realized = (t.price * t.quantity - t.fee) * fx - avgCost * qty
      realizedByTrade.set(t.id, realized)
      p.realized += realized
      p.quantity -= qty
      p.cost -= avgCost * qty
      p.costLocal -= avgLocal * qty
      if (p.quantity < EPS) {
        p.quantity = 0
        p.cost = 0
        p.costLocal = 0
      }
    }
  }

  for (const p of map.values()) {
    if (p.quantity === 0) continue
    // 현재가를 모르면 평균단가로 평가 (손익 0)
    const price = p.currentPrice ?? p.costLocal / p.quantity
    p.value = price * p.quantity * fxOf(p.market, null)
    p.unrealized = p.value - p.cost
  }

  const positions = [...map.values()]
  return {
    positions,
    /** 지금 가지고 있는 종목만 */
    open: positions.filter((p) => p.quantity > 0),
    realizedByTrade,
  }
}

/** 종목 현황 합계 (원 단위 반올림) */
export function investSummary(positions: Position[]) {
  let cost = 0
  let value = 0
  let unrealized = 0
  let realized = 0
  for (const p of positions) {
    cost += p.cost
    value += p.value
    unrealized += p.unrealized
    realized += p.realized
  }
  return {
    cost: Math.round(cost),
    value: Math.round(value),
    unrealized: Math.round(unrealized),
    realized: Math.round(realized),
    rate: cost > 0 ? unrealized / cost : 0,
  }
}

/** 거래 1건의 원화 금액 (단가 × 수량 × 환율) */
export function tradeAmount(t: StockTrade, priceByCode: Map<string, StockPrice>) {
  const fx = t.market === 'US' ? (t.fx_rate ?? currentFx(priceByCode) ?? 0) : 1
  return t.price * t.quantity * fx
}
