// Supabase Edge Function: 종목 현재가와 원/달러 환율을 조회한다.
// 브라우저에서 시세 API 를 직접 부르면 CORS 로 막히기 때문에 이 함수를 거친다.
//
// 요청:  POST { "codes": ["000660"], "us": ["AAPL", "SCHD"] }
//          codes = 한국 종목코드 6자리 (네이버 증권)
//          us    = 미국 티커 (야후 파이낸스, 실패하면 네이버 해외주식). 미국 종목이 있으면 환율도 함께 조회
// 응답:  { "results": [{ "code": "000660", "name": "SK하이닉스", "price": 1263000 },
//                      { "code": "AAPL", "price": 347.73 }, { "code": "USDKRW", "price": 1325.4 }] }
//
// 로그인한 사용자만 부를 수 있다 (공개 키만으로 부르면 401). 남이 무료 시세 프록시로 쓰다가
// 네이버·야후에서 차단당하면 우리 조회도 막히기 때문.
import { createClient } from 'jsr:@supabase/supabase-js@2'

/** 한 번에 조회할 수 있는 종목 수 (시장별) */
const MAX_CODES = 30
/** 외부 사이트에 동시에 보내는 요청 수 */
const CONCURRENCY = 6
/** 외부 요청 하나의 제한 시간 */
const TIMEOUT_MS = 5000

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const UA = { 'User-Agent': 'Mozilla/5.0' }

/** 제한 시간이 있는 fetch (응답이 없으면 5초 뒤 실패) */
const get = (url: string) => fetch(url, { headers: UA, signal: AbortSignal.timeout(TIMEOUT_MS) })

/** 작업들을 최대 limit 개씩만 동시에 실행 (결과 순서는 입력 순서와 같음) */
async function runLimited<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let next = 0
  async function worker() {
    while (next < tasks.length) {
      const i = next++
      results[i] = await tasks[i]()
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  return results
}

/** 요청 본문의 종목 목록: 문자열만, 중복 제거, 최대 MAX_CODES 개 */
function codeList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const codes = value.filter((v): v is string => typeof v === 'string').map((v) => v.trim().toUpperCase())
  return [...new Set(codes)].filter(Boolean).slice(0, MAX_CODES)
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS_HEADERS })

type Result = { code: string; name?: string; price?: number; error?: string }

const toNumber = (v: unknown) => Number(String(v).replace(/,/g, ''))

async function krPrice(code: string): Promise<Result> {
  if (!/^[0-9A-Z]{6}$/.test(code)) return { code, error: '종목코드 형식이 올바르지 않습니다' }
  try {
    const res = await get(`https://m.stock.naver.com/api/stock/${code}/basic`)
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
    const res = await get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`)
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
      const res = await get(`https://api.stock.naver.com/stock/${ticker}${suffix}/basic`)
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
    const res = await get('https://api.stock.naver.com/marketindex/exchange/FX_USDKRW')
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
  if (req.method !== 'POST') return json({ error: 'POST 로만 호출할 수 있습니다' }, 405)

  // 로그인 확인: 앱이 보내는 Authorization 헤더의 사용자 토큰을 Supabase Auth 로 검증
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return json({ error: '로그인이 필요합니다' }, 401)

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return json({ error: '요청 형식이 올바르지 않습니다' }, 400)
  const kr = codeList(body.codes)
  const us = codeList(body.us)

  const results = await runLimited<Result>(
    [
      ...kr.map((code) => () => krPrice(code)),
      ...us.map((code) => () => usPrice(code)),
      ...(us.length > 0 || body.fx ? [() => usdKrw()] : []),
    ],
    CONCURRENCY,
  )
  return json({ results })
})
