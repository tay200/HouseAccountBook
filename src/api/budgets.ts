import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { monthStart, shiftMonth } from '../lib/format'
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

/** fromMonth ~ toMonth(포함) 의 예산 (이월 계산용: 1월 ~ 이번 달) */
export function useBudgetsRange(fromMonth: string, toMonth: string) {
  return useQuery({
    queryKey: ['budgets', 'range', fromMonth, toMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('id, month, category_id, amount')
        .gte('month', monthStart(fromMonth))
        .lt('month', monthStart(shiftMonth(toMonth, 1)))
      if (error) throw error
      return data as Budget[]
    },
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
        // 같은 달·카테고리 예산이 이미 있으면 덮어쓴다 (빠르게 두 번 저장하거나 두 사람이 동시에 넣어도 중복 오류 없음)
        result = await table.upsert(
          { month: monthStart(month), category_id: categoryId, amount },
          { onConflict: 'user_id,month,category_id' },
        )
      }
      if (result.error) throw result.error
    },
    // ['budgets'] 로 시작하는 캐시(그 달 예산, 이월 계산용 기간 예산)를 모두 새로고침
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgets'] }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgets'] }),
  })
}
