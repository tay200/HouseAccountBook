// Supabase Edge Function: 종목 현재가와 원/달러 환율을 조회한다.
// 브라우저에서 시세 API 를 직접 부르면 CORS 로 막히기 때문에 이 함수를 거친다.
//
// 요청:  POST { "codes": ["000660"], "us": ["AAPL", "SCHD"] }
//          codes = 한국 종목코드 6자리 (네이버 증권)
//          us    = 미국 티커 (야후 파이낸스, 실패하면 네이버 해외주식). 미국 종목이 있으면 환율도 함께 조회
// 응답:  { "results": [{ "code": "000660", "name": "SK하이닉스", "price": 1263000 },
//                      { "code": "AAPL", "price": 347.73 }, { "code": "USDKRW", "price": 1325.4 }] }

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const UA = { 'User-Agent': 'Mozilla/5.0' }

type Result = { code: string; name?: string; price?: number; error?: string }

const toNumber = (v: unknown) => Number(String(v).replace(/,/g, ''))

async function krPrice(code: string): Promise<Result> {
  if (!/^[0-9A-Z]{6}$/.test(code)) return { code, error: '종목코드 형식이 올바르지 않습니다' }
  try {
    const res = await fetch(`https://m.stock.naver.com/api/stock/${code}/basic`, { headers: UA })
    if (!res.ok) return { code, error: `HTTP ${res.status}` }
    const data = await res.json()
    const price = toNumber(data.closePrice)
    if (!Number.isFinite(price)) return { code, error: '가격 정보 없음' }
    return { code, name: data.stockName, price }
  } catch (e) {
    return { code, error: String(e) }
  }
}

/** 야후 파이낸스 시세 (미국 티커, 환율 'KRW=X') */
async function yahooPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`, { headers: UA })
    if (!res.ok) return null
    const data = await res.json()
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
    return typeof price === 'number' ? price : null
  } catch {
    return null
  }
}

/** 네이버 해외주식: 거래소 접미사(.O 나스닥, .K 아멕스 등)를 차례로 시도 */
async function naverUsPrice(ticker: string): Promise<{ name: string; price: number } | null> {
  for (const suffix of ['', '.O', '.K', '.N']) {
    try {
      const res = await fetch(`https://api.stock.naver.com/stock/${ticker}${suffix}/basic`, { headers: UA })
      if (!res.ok) continue
      const data = await res.json()
      const price = toNumber(data.closePrice)
      if (Number.isFinite(price)) return { name: data.stockName, price }
    } catch {
      // 다음 접미사로
    }
  }
  return null
}

async function usPrice(ticker: string): Promise<Result> {
  const code = ticker.toUpperCase()
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(code)) return { code, error: '티커 형식이 올바르지 않습니다' }
  // 야후는 클래스 주식을 BRK-B 처럼 '-' 로 쓴다
  const yahoo = await yahooPrice(code.replace('.', '-'))
  if (yahoo !== null) return { code, price: yahoo }
  const naver = await naverUsPrice(code)
  return naver ? { code, ...naver } : { code, error: '시세를 찾지 못했습니다' }
}

async function usdKrw(): Promise<Result> {
  const code = 'USDKRW'
  const yahoo = await yahooPrice('KRW=X')
  if (yahoo !== null) return { code, price: yahoo }
  try {
    const res = await fetch('https://api.stock.naver.com/marketindex/exchange/FX_USDKRW', { headers: UA })
    const data = await res.json()
    const price = toNumber(data?.exchangeInfo?.closePrice)
    if (Number.isFinite(price)) return { code, price }
  } catch {
    // 아래 오류 반환
  }
  return { code, error: '환율을 찾지 못했습니다' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  const body = await req.json().catch(() => ({}))
  const kr: string[] = Array.isArray(body.codes) ? [...new Set(body.codes.map(String))].slice(0, 100) : []
  const us: string[] = Array.isArray(body.us) ? [...new Set(body.us.map(String))].slice(0, 100) : []

  const results = await Promise.all([
    ...kr.map(krPrice),
    ...us.map(usPrice),
    ...(us.length > 0 || body.fx ? [usdKrw()] : []),
  ])
  return Response.json({ results }, { headers: CORS_HEADERS })
})
