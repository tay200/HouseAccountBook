import { describe, expect, it } from 'vitest'
import { analyzeInvest, codeProblem, investSummary, normalizeCode, oversellProblem } from './invest'
import type { StockHolding, StockPrice, StockTrade } from './types'

// 테스트용 매매 기록을 짧게 만드는 도우미
let seq = 0
function trade(fields: Partial<StockTrade> & Pick<StockTrade, 'side' | 'price' | 'quantity'>): StockTrade {
  seq += 1
  return {
    id: `t${seq}`,
    account_id: 'A',
    market: 'KR',
    stock_code: '005930',
    stock_name: '삼성전자',
    trade_date: null,
    fx_rate: null,
    fee: 0,
    memo: null,
    created_at: `2026-01-01T00:00:${String(seq).padStart(2, '0')}`,
    ...fields,
  }
}

function prices(entries: [string, number][]) {
  return new Map<string, StockPrice>(entries.map(([code, price]) => [code, { stock_code: code, price, updated_at: '' }]))
}

const noPrices = new Map<string, StockPrice>()

describe('analyzeInvest: 이동평균', () => {
  it('수수료를 포함한 평균단가로 일부 매도의 실현손익을 계산한다', () => {
    const trades = [
      trade({ side: 'buy', price: 100, quantity: 10, fee: 10, trade_date: '2026-01-01' }),
      trade({ side: 'buy', price: 200, quantity: 10, fee: 10, trade_date: '2026-02-01' }),
      trade({ side: 'sell', price: 300, quantity: 5, fee: 5, trade_date: '2026-03-01' }),
    ]
    const [p] = analyzeInvest([], trades, noPrices).positions
    // 평균원가 = (1010 + 2010) / 20 = 151, 실현 = 1500 - 5 - 151 × 5 = 740
    expect(p.realized).toBeCloseTo(740)
    expect(p.quantity).toBe(15)
    expect(p.cost).toBeCloseTo(2265)
  })

  it('다 판 뒤 다시 사면 원가를 새로 시작한다', () => {
    const trades = [
      trade({ side: 'buy', price: 100, quantity: 10, trade_date: '2026-01-01' }),
      trade({ side: 'sell', price: 150, quantity: 10, trade_date: '2026-02-01' }),
      trade({ side: 'buy', price: 300, quantity: 2, trade_date: '2026-03-01' }),
    ]
    const [p] = analyzeInvest([], trades, noPrices).positions
    expect(p.realized).toBe(500)
    expect(p.quantity).toBe(2)
    expect(p.cost).toBe(600)
  })

  it('직접 넣은 보유분에서 시작해 매수·매도를 더하고 뺀다', () => {
    const holding: StockHolding = { id: 'h', account_id: 'A', market: 'KR', stock_code: '005930', stock_name: '삼성전자', quantity: 10, avg_price: 24000, avg_fx_rate: null, memo: null }
    const trades = [
      trade({ side: 'buy', price: 26000, quantity: 5, trade_date: '2026-10-01' }),
      trade({ side: 'sell', price: 27000, quantity: 12, fee: 1200, trade_date: '2026-10-20' }),
    ]
    const [p] = analyzeInvest([holding], trades, noPrices).positions
    expect(Math.round(p.realized)).toBe(26800)
    expect(p.quantity).toBe(3)
  })
})

describe('analyzeInvest: 보유보다 많이 판 기록', () => {
  it('매도일이 매수일보다 빠르면 판 수량을 손익에 넣지 않고 표시한다', () => {
    const buy = trade({ side: 'buy', price: 70000, quantity: 10, trade_date: '2026-10-20' })
    const sell = trade({ side: 'sell', price: 80000, quantity: 10, trade_date: '2026-10-01' })
    const r = analyzeInvest([], [buy, sell], noPrices)
    expect(r.realizedByTrade.get(sell.id)).toBe(0)
    expect(r.oversold.get(sell.id)).toBe(0)
    expect(r.open[0].quantity).toBe(10)
  })

  it('넘게 판 수량은 매도금액과 수수료에서도 뺀다', () => {
    const buy = trade({ side: 'buy', price: 100, quantity: 10, trade_date: '2026-01-01' })
    const sell = trade({ side: 'sell', price: 150, quantity: 15, fee: 15, trade_date: '2026-02-01' })
    // 가진 10주만 판 것으로: 1500 - 10 - 1000 = 490
    expect(analyzeInvest([], [buy, sell], noPrices).realizedByTrade.get(sell.id)).toBeCloseTo(490)
  })
})

describe('oversellProblem: 저장 전 검사', () => {
  const buy = trade({ side: 'buy', price: 70000, quantity: 10, trade_date: '2026-10-01' })
  const sell = trade({ side: 'sell', price: 80000, quantity: 10, trade_date: '2026-10-20' })
  const before = { holdings: [], trades: [buy, sell] }

  it('매도가 걸린 매수의 수량을 줄이면 막는다', () => {
    expect(oversellProblem(before, { holdings: [], trades: [{ ...buy, quantity: 5 }, sell] })).toContain('5주뿐이에요')
  })
  it('매도가 걸린 매수를 지우면 막는다', () => {
    expect(oversellProblem(before, { holdings: [], trades: [sell] })).not.toBeNull()
  })
  it('문제가 없으면 통과한다', () => {
    expect(oversellProblem(before, { holdings: [], trades: [{ ...buy, quantity: 12 }, sell] })).toBeNull()
  })
  it('원래 있던 문제는 다른 수정을 막지 않는다', () => {
    const bad = trade({ side: 'sell', price: 1, quantity: 99, trade_date: '2026-01-01', stock_code: '000660' })
    const withBad = { holdings: [], trades: [buy, sell, bad] }
    expect(oversellProblem(withBad, { holdings: [], trades: [{ ...buy, memo: '메모' }, sell, bad] })).toBeNull()
  })
})

describe('미국 주식 환율', () => {
  const holding: StockHolding = { id: 'h', account_id: 'A', market: 'US', stock_code: 'AAPL', stock_name: 'Apple', quantity: 1, avg_price: 200, avg_fx_rate: 1400, memo: null }
  const kr = trade({ side: 'buy', price: 70000, quantity: 1, trade_date: '2026-01-01' })

  it('현재 환율을 모르면 미국 종목은 합계에서 뺀다', () => {
    const r = analyzeInvest([holding], [kr], prices([['AAPL', 210], ['005930', 80000]]))
    expect(r.positions.find((p) => p.code === 'AAPL')!.fxMissing).toBe(true)
    expect(investSummary(r.positions)).toMatchObject({ cost: 70000, value: 80000 })
  })

  it('환율이 있으면 매수 환율로 원가, 현재 환율로 평가한다', () => {
    const r = analyzeInvest([holding], [], prices([['AAPL', 210], ['USDKRW', 1300]]))
    expect(investSummary(r.positions)).toMatchObject({ cost: 280000, value: 273000, unrealized: -7000 })
  })
})

describe('종목코드', () => {
  it('한국 종목은 앞자리 0을 채운다', () => {
    expect(normalizeCode('KR', ' 5930 ')).toBe('005930')
    expect(normalizeCode('KR', '0001a0')).toBe('0001A0')
  })
  it('형식이 틀리면 문구를 돌려준다', () => {
    expect(codeProblem('KR', '1234567')).not.toBeNull()
    expect(codeProblem('KR', '005930')).toBeNull()
    expect(codeProblem('US', normalizeCode('US', 'brk.b'))).toBeNull()
    expect(codeProblem('US', '1234')).not.toBeNull()
  })
})
