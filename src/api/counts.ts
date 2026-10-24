import { supabase } from '../lib/supabase'

/** table 에서 column 이 ids 중 하나인 행 개수 (삭제 전 '함께 바뀌는 기록 N건' 안내용) */
export async function countRows(table: string, column: string, ids: string[]) {
  if (ids.length === 0) return 0
  // head: true = 행 내용은 받지 않고 개수만 받는다
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true }).in(column, ids)
  if (error) throw error
  return count ?? 0
}

/** '거래 3건, 통장 기록 1건' 처럼 0건은 빼고 이어 붙인다 */
export function describeCounts(items: [label: string, count: number][]) {
  return items
    .filter(([, n]) => n > 0)
    .map(([label, n]) => `${label} ${n}건`)
    .join(', ')
}
