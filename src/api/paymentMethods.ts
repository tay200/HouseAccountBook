import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PaymentMethod, PaymentMethodInput } from '../lib/types'

const KEY = ['paymentMethods']

export function usePaymentMethods() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('id, name, kind')
        .order('created_at')
      if (error) throw error
      return data as PaymentMethod[]
    },
  })
}

/** id 가 있으면 수정, 없으면 새로 추가 */
export function useSavePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: PaymentMethodInput & { id?: string }) => {
      const { error } = id
        ? await supabase.from('payment_methods').update(values).eq('id', id)
        : await supabase.from('payment_methods').insert(values)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payment_methods').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      // 이 결제수단을 쓰던 반복 거래·즐겨찾기도 결제수단이 비워진다
      queryClient.invalidateQueries({ queryKey: ['recurring_rules'] })
      queryClient.invalidateQueries({ queryKey: ['favorite_transactions'] })
    },
  })
}
