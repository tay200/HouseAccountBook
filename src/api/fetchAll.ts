const PAGE_SIZE = 1000

type PageResult<T> = { data: T[] | null; error: unknown }

/**
 * Supabase 는 한 번 조회에 최대 1000행까지만 돌려준다 (넘는 행은 오류 없이 빠짐).
 * 1000행씩 나눠서 끝까지 받아 하나로 합친다.
 * page(from, to) 는 같은 조건의 조회에 .range(from, to) 를 붙여 실행하는 함수.
 * 페이지 사이에 순서가 흔들리지 않도록 조회에 고유한 정렬(마지막에 id)을 넣어야 한다.
 *
 *   fetchAll((from, to) => supabase.from('transactions').select('*').order('date').order('id').range(from, to))
 */
export async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<PageResult<T>>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}
