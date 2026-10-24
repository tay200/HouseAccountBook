import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { monthStart } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Budget } from '../lib/types'

async function fetchBudgets(month: string) {
  const { data, error } = await supabase
    .from('budgets')
    .select('id, month, category_id, amount')
    .eq('month', monthStart(month))
  if (error) throw error
  return data as Budget[]
}

export function useBudgets(month: string) {
  return useQuery({
    queryKey: ['budgets', month],
    queryFn: () => fetchBudgets(month),
  })
}

type SaveBudgetArgs = {
  id?: string
  month: string
  categoryId: string
  amount: number | null
}

/** 금액이 비어 있거나 0이면 예산 삭제, 기존 예산이 있으면 수정, 없으면 추가 */
export function useSaveBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, month, categoryId, amount }: SaveBudgetArgs) => {
      const table = supabase.from('budgets')
      let result
      if (!amount) {
        if (!id) return
        result = await table.delete().eq('id', id)
      } else if (id) {
        result = await table.update({ amount }).eq('id', id)
      } else {
        result = await table.insert({ month: monthStart(month), category_id: categoryId, amount })
      }
      if (result.error) throw result.error
    },
    onSuccess: (_data, { month }) => queryClient.invalidateQueries({ queryKey: ['budgets', month] }),
  })
}

/** fromMonth 의 예산을 toMonth 로 복사 (toMonth 에 아직 예산이 없을 때 사용) */
export function useCopyBudgets() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ fromMonth, toMonth }: { fromMonth: string; toMonth: string }) => {
      const source = await fetchBudgets(fromMonth)
      if (source.length === 0) throw new Error('복사할 지난달 예산이 없습니다.')
      const { error } = await supabase.from('budgets').insert(
        source.map((b) => ({ month: monthStart(toMonth), category_id: b.category_id, amount: b.amount })),
      )
      if (error) throw error
    },
    onSuccess: (_data, { toMonth }) => queryClient.invalidateQueries({ queryKey: ['budgets', toMonth] }),
  })
}
