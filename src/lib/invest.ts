import type { StockPrice, Trade } from './types'

/** 매매 1건(매수 1회 + 선택적으로 매도)의 계산 결과 */
export function calcTrade(t: Trade, priceByCode: Map<string, StockPrice>) {
  const cost = t.buy_price * t.quantity
  const sold = t.sell_date !== null && t.sell_price !== null
  if (sold) {
    const proceeds = t.sell_price! * t.quantity - t.fee
    return { cost, sold, value: 0, unrealized: 0, realized: proceeds - cost, currentPrice: null }
  }
  const currentPrice = priceByCode.get(t.stock_code)?.price ?? null
  // 현재가를 모르면 매수가로 평가 (손익 0)
  const value = (currentPrice ?? t.buy_price) * t.quantity
  return { cost, sold, value, unrealized: value - cost - t.fee, realized: 0, currentPrice }
}

export type Holding = {
  key: string
  accountId: string
  code: string
  name: string
  quantity: number
  cost: number
  value: number
  unrealized: number
  currentPrice: number | null
}

/** 아직 팔지 않은 매매를 계좌+종목별로 묶어 보유 현황을 만든다 */
export function holdings(trades: Trade[], priceByCode: Map<string, StockPrice>): Holding[] {
  const map = new Map<string, Holding>()
  for (const t of trades) {
    const r = calcTrade(t, priceByCode)
    if (r.sold) continue
    const key = `${t.account_id}:${t.stock_code}`
    const h = map.get(key) ?? {
      key,
      accountId: t.account_id,
      code: t.stock_code,
      name: t.stock_name,
      quantity: 0,
      cost: 0,
      value: 0,
      unrealized: 0,
      currentPrice: r.currentPrice,
    }
    h.quantity += t.quantity
    h.cost += r.cost
    h.value += r.value
    h.unrealized += r.unrealized
    map.set(key, h)
  }
  return [...map.values()]
}

/** 투자 전체 요약 */
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
  return { cost, value, unrealized, realized, rate: cost > 0 ? unrealized / cost : 0 }
}
