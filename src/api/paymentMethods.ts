import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DEFAULT_PAYMENT_METHODS } from '../lib/defaults'
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
    },
  })
}

export function useAddDefaultPaymentMethods() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('payment_methods').insert(DEFAULT_PAYMENT_METHODS)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
