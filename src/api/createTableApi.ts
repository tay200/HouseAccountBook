import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { fetchAll } from './fetchAll'

type Options = {
  /** 가져올 열 (기본: 전체) */
  select?: string
  /** 정렬 순서 */
  order?: { column: string; ascending?: boolean; nullsFirst?: boolean }[]
  /** 저장/삭제 후 함께 새로고침할 다른 캐시 키 */
  alsoInvalidate?: string[][]
}

/**
 * 테이블 하나에 대한 목록 조회 / 저장(추가·수정) / 삭제 훅을 한 번에 만든다.
 * 자산, 투자처럼 '목록 + 추가/수정/삭제'만 하는 테이블이 많아서 반복을 줄이기 위한 공장 함수.
 *
 *   export const depositsApi = createTableApi<Deposit>('deposits')
 *   const { data } = depositsApi.useList()
 */
export function createTableApi<Row extends { id: string }>(table: string, options: Options = {}) {
  const key = [table]
  const { select = '*', order = [{ column: 'created_at' }], alsoInvalidate = [] } = options

  function useList() {
    return useQuery({
      queryKey: key,
      // 통장 기록처럼 계속 쌓이는 테이블은 1000행을 넘을 수 있어서 나눠 받는다
      queryFn: () =>
        fetchAll<Row>((from, to) => {
          let query = supabase.from(table).select(select)
          for (const o of order) query = query.order(o.column, { ascending: o.ascending ?? true, nullsFirst: o.nullsFirst })
          // 마지막에 id 로 정렬해서 페이지 사이 순서가 흔들리지 않게 한다
          return query.order('id').range(from, to) as unknown as PromiseLike<{ data: Row[] | null; error: unknown }>
        }),
    })
  }

  function useInvalidate() {
    const queryClient = useQueryClient()
    return () => {
      queryClient.invalidateQueries({ queryKey: key })
      for (const k of alsoInvalidate) queryClient.invalidateQueries({ queryKey: k })
    }
  }

  /** id 가 있으면 수정, 없으면 새로 추가 */
  function useSave() {
    const queryClient = useQueryClient()
    const invalidate = useInvalidate()
    return useMutation({
      mutationFn: async ({ id, ...values }: Record<string, unknown>) => {
        const { error } = id
          ? await supabase.from(table).update(values).eq('id', id as string)
          : await supabase.from(table).insert(values)
        if (error) throw error
      },
      // 낙관적 업데이트: 수정은 서버 응답을 기다리지 않고 화면(캐시)부터 바꿔서 바로 반응하게 한다
      onMutate: ({ id, ...values }) => {
        if (!id) return
        // 진행 중인 조회가 있으면 그 결과가 바꾼 값을 덮어쓰지 않도록 취소 (revert: false = 지금 데이터는 그대로 둠)
        void queryClient.cancelQueries({ queryKey: key }, { revert: false })
        queryClient.setQueryData<Row[]>(key, (rows) => rows?.map((r) => (r.id === id ? { ...r, ...values } : r)))
      },
      // 성공이든 실패든 서버 값으로 다시 맞춘다 (실패하면 화면이 원래 값으로 돌아감)
      onSettled: invalidate,
    })
  }

  function useDelete() {
    const invalidate = useInvalidate()
    return useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from(table).delete().eq('id', id)
        if (error) throw error
      },
      onSuccess: invalidate,
    })
  }

  return { key, useList, useSave, useDelete }
}
