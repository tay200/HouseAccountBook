import { FX_CODE, type Market, type StockPrice, type Trade } from './types'

/** 현재 원/달러 환율 (아직 조회 전이면 null) */
export function currentFx(priceByCode: Map<string, StockPrice>) {
  return priceByCode.get(FX_CODE)?.price ?? null
}

/**
 * 매매 1건(매수 1회 + 선택적으로 매도)의 계산 결과. 금액은 모두 원화.
 * 미국 주식: 매수금액 = 단가 × 수량 × 매수 환율, 평가금액 = 현재가 × 수량 × 현재 환율
 *           매수 환율을 비워 두면 현재 환율을 써서, 환율 변동은 손익에 넣지 않는다.
 */
export function calcTrade(t: Trade, priceByCode: Map<string, StockPrice>) {
  const isUs = t.market === 'US'
  const fxNow = isUs ? (currentFx(priceByCode) ?? t.buy_fx_rate ?? 0) : 1
  const fxBuy = isUs ? (t.buy_fx_rate ?? fxNow) : 1
  const cost = t.buy_price * t.quantity * fxBuy
  const sold = t.sell_date !== null && t.sell_price !== null
  // 수수료·세금(fee)은 해당 통화로 입력하므로 원화로 바꾼다
  if (sold) {
    const fxSell = isUs ? (t.sell_fx_rate ?? fxNow) : 1
    const proceeds = t.sell_price! * t.quantity * fxSell - t.fee * fxSell
    return { cost, sold, value: 0, unrealized: 0, realized: proceeds - cost, currentPrice: null }
  }
  const currentPrice = priceByCode.get(t.stock_code)?.price ?? null
  // 현재가를 모르면 매수가로 평가 (손익 0)
  const value = (currentPrice ?? t.buy_price) * t.quantity * fxNow
  return { cost, sold, value, unrealized: value - cost - t.fee * fxBuy, realized: 0, currentPrice }
}

export type Holding = {
  key: string
  accountId: string
  market: Market
  code: string
  name: string
  quantity: number
  /** 매수금액 합계 (해당 통화: KR=원, US=달러) — 평균단가 계산용 */
  costLocal: number
  /** 원화 */
  cost: number
  value: number
  unrealized: number
  /** 해당 통화 현재가 */
  currentPrice: number | null
}

/** 아직 팔지 않은 매매를 계좌+종목별로 묶어 보유 현황을 만든다 */
export function holdings(trades: Trade[], priceByCode: Map<string, StockPrice>): Holding[] {
  const map = new Map<string, Holding>()
  for (const t of trades) {
    const r = calcTrade(t, priceByCode)
    if (r.sold) continue
    const key = `${t.account_id}:${t.market}:${t.stock_code}`
    const h = map.get(key) ?? {
      key,
      accountId: t.account_id,
      market: t.market,
      code: t.stock_code,
      name: t.stock_name,
      quantity: 0,
      costLocal: 0,
      cost: 0,
      value: 0,
      unrealized: 0,
      currentPrice: r.currentPrice,
    }
    h.quantity += t.quantity
    h.costLocal += t.buy_price * t.quantity
    h.cost += r.cost
    h.value += r.value
    h.unrealized += r.unrealized
    map.set(key, h)
  }
  return [...map.values()]
}

/** 투자 전체 요약 (원화) */
export function investSummary(trades: Trade[], priceByCode: Map<string, StockPrice>) {
  let cost = 0
  let value = 0
  let unrealized = 0
  let realized = 0
  for (const t of trades) {
    const r = calcTrade(t, priceByCode)
    if (r.sold) realized += r.realized
    else {
      cost += r.cost
      value += r.value
      unrealized += r.unrealized
    }
  }
  // 달러 계산이 섞이면 소수점이 생기므로 원 단위로 반올림
  return {
    cost: Math.round(cost),
    value: Math.round(value),
    unrealized: Math.round(unrealized),
    realized: Math.round(realized),
    rate: cost > 0 ? unrealized / cost : 0,
  }
}
