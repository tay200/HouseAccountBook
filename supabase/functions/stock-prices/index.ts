// Supabase Edge Function: 종목코드 목록을 받아 네이버 증권에서 현재가를 조회한다.
// 브라우저에서 네이버 API 를 직접 부르면 CORS 로 막히기 때문에 이 함수를 거친다.
//
// 요청:  POST { "codes": ["000660", "360750"] }
// 응답:  { "results": [{ "code": "000660", "name": "SK하이닉스", "price": 1263000 }, ...] }

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Result = { code: string; name?: string; price?: number; error?: string }

async function fetchPrice(code: string): Promise<Result> {
  if (!/^[0-9A-Z]{6}$/.test(code)) return { code, error: '종목코드 형식이 올바르지 않습니다' }
  try {
    const res = await fetch(`https://m.stock.naver.com/api/stock/${code}/basic`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!res.ok) return { code, error: `HTTP ${res.status}` }
    const data = await res.json()
    const price = Number(String(data.closePrice).replace(/,/g, ''))
    if (!Number.isFinite(price)) return { code, error: '가격 정보 없음' }
    return { code, name: data.stockName, price }
  } catch (e) {
    return { code, error: String(e) }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  const { codes } = await req.json().catch(() => ({ codes: [] }))
  if (!Array.isArray(codes)) {
    return Response.json({ error: 'codes 배열이 필요합니다' }, { status: 400, headers: CORS_HEADERS })
  }
  const unique = [...new Set(codes.map(String))].slice(0, 100)
  const results = await Promise.all(unique.map(fetchPrice))
  return Response.json({ results }, { headers: CORS_HEADERS })
})
