import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DEFAULT_CATEGORIES } from '../lib/defaults'
import { supabase } from '../lib/supabase'
import type { Category, CategoryInput } from '../lib/types'

// queryKey 는 캐시의 이름표. 같은 키를 쓰는 화면들은 같은 데이터를 공유한다.
const KEY = ['categories']

export function useCategories() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, type, color')
        .order('created_at')
      if (error) throw error
      return data as Category[]
    },
  })
}

/** id 가 있으면 수정, 없으면 새로 추가 */
export function useSaveCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: CategoryInput & { id?: string }) => {
      const { error } = id
        ? await supabase.from('categories').update(values).eq('id', id)
        : await supabase.from('categories').insert(values)
      if (error) throw error
    },
    // 저장이 끝나면 캐시를 '오래됨'으로 표시 → 이 데이터를 쓰는 화면이 자동으로 다시 불러온다
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY })
      // 카테고리를 지우면 거래는 '미분류'가 되고 예산은 함께 삭제되므로 같이 새로고침
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}

export function useAddDefaultCategories() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('categories').insert(DEFAULT_CATEGORIES)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
