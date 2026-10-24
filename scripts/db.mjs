// Supabase 관리 API 로 SQL 을 실행한다. (SQL Editor 에 붙여넣고 Run 하는 것과 같음)
//
//   node scripts/db.mjs --migrate          supabase/migrations 중 아직 적용 안 한 파일만 순서대로 실행 (권장)
//   node scripts/db.mjs --status           적용한 파일 / 아직 안 한 파일 목록만 보기
//   node scripts/db.mjs 파일.sql            파일 하나 실행 (기록은 남지 않음)
//   node scripts/db.mjs -e "select count(*) from public.transactions"
//
// 필요한 것: 환경변수 SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens 에서 발급)
// 토큰은 계정 전체 권한이므로 코드나 Git 에 절대 넣지 않는다.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const PROJECT_REF = 'fbofoxysgphtpkgfgqbi'
const MIGRATIONS_DIR = 'supabase/migrations'
const token = process.env.SUPABASE_ACCESS_TOKEN
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN 환경변수가 없습니다.')
  process.exit(1)
}

/** SQL 을 실행하고 결과 행을 돌려준다. 실패하면 프로그램을 끝낸다. */
async function run(query) {
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
  return JSON.parse(text)
}

function show(rows) {
  if (Array.isArray(rows) && rows.length > 0) console.table(rows)
  else console.log('완료')
}

/** 적용 기록(schema_migrations)과 파일 목록을 비교해 아직 적용하지 않은 파일을 찾는다 */
async function pendingMigrations() {
  const [exists] = await run(`select to_regclass('public.schema_migrations') is not null as ok`)
  if (!exists.ok) {
    console.error('schema_migrations 표가 없습니다. 먼저 008 파일을 직접 실행하세요:\n  node scripts/db.mjs supabase/migrations/008_migration_log_and_indexes.sql')
    process.exit(1)
  }
  const applied = new Set((await run('select version from public.schema_migrations')).map((r) => r.version))
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()
  return { applied, pending: files.filter((f) => !applied.has(f)) }
}

const [arg, inline] = process.argv.slice(2)

if (arg === '--status' || arg === '--migrate') {
  const { applied, pending } = await pendingMigrations()
  console.log(`적용됨 ${applied.size}개, 남은 파일 ${pending.length}개${pending.length ? ': ' + pending.join(', ') : ''}`)
  if (arg === '--migrate') {
    for (const file of pending) {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
      // 파일 실행과 기록을 한 트랜잭션으로: 중간에 실패하면 둘 다 취소된다
      await run(`begin;\n${sql}\n;insert into public.schema_migrations (version) values ('${file.replace(/'/g, "''")}');\ncommit;`)
      console.log(`적용: ${file}`)
    }
    if (pending.length === 0) console.log('새로 적용할 파일이 없습니다.')
  }
} else {
  const query = arg === '-e' ? inline : arg ? readFileSync(arg, 'utf8') : ''
  if (!query) {
    console.error('사용법: node scripts/db.mjs --migrate | --status | <파일.sql> | -e "SQL"')
    process.exit(1)
  }
  show(await run(query))
}
