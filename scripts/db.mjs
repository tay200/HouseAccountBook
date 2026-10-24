// Supabase 관리 API 로 SQL 을 실행한다. (SQL Editor 에 붙여넣고 Run 하는 것과 같음)
//
//   node scripts/db.mjs supabase/migrations/004_invest_account_included.sql
//   node scripts/db.mjs -e "select count(*) from public.transactions"
//
// 필요한 것: 환경변수 SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens 에서 발급)
// 토큰은 계정 전체 권한이므로 코드나 Git 에 절대 넣지 않는다.
import { readFileSync } from 'node:fs'

const PROJECT_REF = 'fbofoxysgphtpkgfgqbi'
const token = process.env.SUPABASE_ACCESS_TOKEN
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN 환경변수가 없습니다.')
  process.exit(1)
}

const [arg, inline] = process.argv.slice(2)
const query = arg === '-e' ? inline : readFileSync(arg, 'utf8')
if (!query) {
  console.error('사용법: node scripts/db.mjs <파일.sql> 또는 node scripts/db.mjs -e "SQL"')
  process.exit(1)
}

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }),
})
const text = await res.text()
if (!res.ok) {
  console.error(`실패 (HTTP ${res.status}): ${text}`)
  process.exit(1)
}
const rows = JSON.parse(text)
if (Array.isArray(rows) && rows.length > 0) console.table(rows)
else console.log('완료')
