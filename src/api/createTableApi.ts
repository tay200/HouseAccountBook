import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

type Options = {
  /** 가져올 열 (기본: 전체) */
  select?: string
  /** 정렬 순서 */
  order?: { column: string; ascending?: boolean }[]
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
      queryFn: async () => {
        let query = supabase.from(table).select(select)
        for (const o of order) query = query.order(o.column, { ascending: o.ascending ?? true })
        const { data, error } = await query
        if (error) throw error
        return data as unknown as Row[]
      },
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
    const invalidate = useInvalidate()
    return useMutation({
      mutationFn: async ({ id, ...values }: Record<string, unknown>) => {
        const { error } = id
          ? await supabase.from(table).update(values).eq('id', id as string)
          : await supabase.from(table).insert(values)
        if (error) throw error
      },
      onSuccess: invalidate,
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
