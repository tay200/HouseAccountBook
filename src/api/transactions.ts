import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { monthStart, shiftMonth } from '../lib/format'
import { supabase } from '../lib/supabase'
import { fetchAll } from './fetchAll'
import type { Transaction, TransactionInput } from '../lib/types'

/**
 * fromMonth ~ toMonth(포함) 사이의 거래를 최신순으로 가져온다.
 * 한 달만 볼 때는 fromMonth 와 toMonth 를 같게 넘긴다.
 */
export function useTransactions(fromMonth: string, toMonth: string) {
  return useQuery({
    queryKey: ['transactions', fromMonth, toMonth],
    // 1년치(연간 리포트)는 1000건을 넘을 수 있어서 나눠 받는다
    queryFn: () =>
      fetchAll<Transaction>((from, to) =>
        supabase
          .from('transactions')
          .select('id, date, type, kind, amount, discount, category_id, payment_method_id, member_id, memo')
          .gte('date', monthStart(fromMonth))
          .lt('date', monthStart(shiftMonth(toMonth, 1)))
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id')
          .range(from, to),
      ),
  })
}

/** id 가 있으면 수정, 없으면 새로 추가 */
export function useSaveTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: TransactionInput & { id?: string }) => {
      const { error } = id
        ? await supabase.from('transactions').update(values).eq('id', id)
        : await supabase.from('transactions').insert(values)
      if (error) throw error
    },
    // ['transactions'] 로 시작하는 캐시(월별 목록, 대시보드 추이)를 모두 새로고침
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  })
}
