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

export type SellInput = {
  quantity: number
  sell_date: string
  sell_price: number
  sell_fx_rate: number | null
  /** 이번 매도의 수수료·세금 (해당 통화) */
  fee: number
}

// 소수 주식(미국 소수점 거래)의 계산 오차를 감안한 비교 여유
const EPS = 1e-9
const round = (v: number, digits: number) => Math.round(v * 10 ** digits) / 10 ** digits

/**
 * 매도 입력을 DB 에 저장할 변경 목록으로 바꾼다. (id 있음 = 수정, 없음 = 새 줄)
 * 매매 내역은 '매수 1번 = 1줄' 구조라서, 먼저 산 줄부터 차례로 매도 정보를 채운다 (선입선출).
 * 한 줄의 일부만 팔면 판 만큼을 새 줄로 떼어 내고 원래 줄은 수량을 줄인다.
 * 매수 수수료는 수량 비율로 나누고, 매도 수수료는 판 수량 비율로 각 줄에 더한다.
 */
export function planSell(lots: Trade[], sell: SellInput): Record<string, unknown>[] {
  // 매수일 순 (같은 날이면 입력한 순서 유지)
  const sorted = [...lots].sort((a, b) => (a.buy_date ?? '').localeCompare(b.buy_date ?? ''))
  const soldFields = { sell_date: sell.sell_date, sell_price: sell.sell_price, sell_fx_rate: sell.sell_fx_rate }
  const sellFee = (quantity: number) => (sell.fee * quantity) / sell.quantity
  const writes: Record<string, unknown>[] = []
  let remaining = sell.quantity
  for (const lot of sorted) {
    if (remaining <= EPS) break
    if (lot.quantity <= remaining + EPS) {
      // 이 줄은 전부 판다
      writes.push({ id: lot.id, ...soldFields, fee: round(lot.fee + sellFee(lot.quantity), 2) })
      remaining -= lot.quantity
    } else {
      // 일부만 판다: 판 부분을 새 줄로 먼저 만들고 (실패해도 보유 수량이 사라지지 않도록) 원래 줄을 줄인다
      const buyFee = (lot.fee * remaining) / lot.quantity
      writes.push({
        account_id: lot.account_id,
        market: lot.market,
        stock_code: lot.stock_code,
        stock_name: lot.stock_name,
        buy_date: lot.buy_date,
        buy_price: lot.buy_price,
        buy_fx_rate: lot.buy_fx_rate,
        memo: lot.memo,
        quantity: round(remaining, 8),
        ...soldFields,
        fee: round(buyFee + sellFee(remaining), 2),
      })
      writes.push({ id: lot.id, quantity: round(lot.quantity - remaining, 8), fee: round(lot.fee - buyFee, 2) })
      remaining = 0
    }
  }
  return writes
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
