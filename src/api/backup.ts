import { strToU8, zipSync } from 'fflate'
import { BOM, toCsv } from '../lib/csv'
import { supabase } from '../lib/supabase'
import { todayString } from '../lib/format'
import { fetchAll } from './fetchAll'

/** 백업할 테이블: [DB 이름, 파일 설명, 정렬 기준(고유)] */
const TABLES: [table: string, label: string, orderBy: string][] = [
  ['transactions', '거래 내역', 'id'],
  ['categories', '카테고리', 'id'],
  ['payment_methods', '결제수단', 'id'],
  ['members', '사람', 'id'],
  ['budgets', '예산', 'id'],
  ['goals', '저축 목표', 'id'],
  ['invest_accounts', '투자 계좌', 'id'],
  ['stock_holdings', '보유 종목 (직접 입력)', 'id'],
  ['stock_trades', '매수·매도 기록', 'id'],
  ['stock_prices', '현재가·환율', 'stock_code'],
  ['bank_accounts', '계좌', 'id'],
  ['deposits', '예금', 'id'],
  ['installment_savings', '적금', 'id'],
  ['loans', '대출', 'id'],
  ['real_assets', '부동자산', 'id'],
  ['net_worth_snapshots', '연도별 순자산', 'id'],
  ['ledger_entries', '통장 기록', 'id'],
]

type Row = Record<string, unknown>

/**
 * 모든 테이블을 CSV 로 만들어 zip 파일 하나로 내려받는다.
 * 다시 넣을 때 쓸 수 있게 id 는 그대로 두고, 엑셀에서 보기 편하도록 연결된 이름 열(category_name 등)을 덧붙인다.
 */
export async function downloadBackup() {
  const data = new Map<string, Row[]>()
  for (const [table, , orderBy] of TABLES) {
    const rows = await fetchAll<Row>((from, to) => supabase.from(table).select('*').order(orderBy).range(from, to))
    // user_id 는 가계부 주인을 가리키는 내부 값이라 뺀다
    for (const r of rows) delete r.user_id
    data.set(table, rows)
  }

  // id → 이름 (엑셀에서 볼 때 id 대신 이름이 보이도록)
  const nameOf = (table: string) => new Map((data.get(table) ?? []).map((r) => [r.id, r.name]))
  const names: Record<string, Map<unknown, unknown>> = {
    category_id: nameOf('categories'),
    parent_id: nameOf('categories'),
    payment_method_id: nameOf('payment_methods'),
    member_id: nameOf('members'),
    account_id: nameOf('invest_accounts'),
  }
  const withNames = (rows: Row[]) =>
    rows.map((r) => {
      const out: Row = { ...r }
      for (const [col, map] of Object.entries(names)) {
        if (col in r) out[col.replace(/_id$/, '_name')] = r[col] ? (map.get(r[col]) ?? '') : ''
      }
      return out
    })

  const files: Record<string, Uint8Array> = {}
  const readme = [`가계부 백업 (${todayString()})`, '', '파일마다 테이블 하나예요. 엑셀에서 바로 열 수 있어요.', '']
  for (const [table, label] of TABLES) {
    const rows = data.get(table) ?? []
    files[`${table}.csv`] = strToU8(toCsv(withNames(rows)))
    readme.push(`${table}.csv — ${label} (${rows.length}건)`)
  }
  files['README.txt'] = strToU8(BOM + readme.join('\r\n'))

  const zip = zipSync(files)
  const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `가계부_백업_${todayString()}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
