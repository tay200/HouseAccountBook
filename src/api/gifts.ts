import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { GiftEvent } from '../lib/types'

const KEY = ['gift_events']

/** 경조사 저장 시 '가계부 지출로도 기록'에 쓸 거래 정보 */
export type GiftTransaction = { category_id: string | null; payment_method_id: string | null }

type SaveArgs = {
  id?: string
  values: Omit<GiftEvent, 'id'>
  /** 있으면 보낸 돈을 가계부 지출(변동)로도 새로 기록한다 */
  addTransaction?: GiftTransaction
}

/** 거래 내용: '결혼 김철수' 처럼 */
const txMemo = (label: string, counterpart: string) => `${label} ${counterpart}`.trim()

/**
 * 경조사 추가/수정.
 * - addTransaction 이 있으면 거래를 먼저 만들고 그 id 를 함께 저장한다.
 * - 이미 거래와 연결된 기록을 고치면 거래의 날짜·금액·사람·내용도 같이 바꾼다 (둘이 어긋나지 않게).
 */
export function useSaveGift(eventLabel: (e: Omit<GiftEvent, 'id'>) => string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values, addTransaction }: SaveArgs) => {
      let transactionId = values.transaction_id
      const txFields = {
        date: values.date,
        amount: values.amount,
        member_id: values.member_id,
        memo: txMemo(eventLabel(values), values.counterpart),
      }
      if (addTransaction) {
        const { data, error } = await supabase
          .from('transactions')
          .insert({ ...txFields, type: 'expense', kind: 'variable', discount: 0, tags: [], ...addTransaction })
          .select('id')
          .single()
        if (error) throw error
        transactionId = data.id
      } else if (id && transactionId) {
        const { error } = await supabase.from('transactions').update(txFields).eq('id', transactionId)
        if (error) throw error
      }
      const row = { ...values, transaction_id: transactionId }
      const { error } = id ? await supabase.from('gift_events').update(row).eq('id', id) : await supabase.from('gift_events').insert(row)
      if (error) throw error
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: KEY })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

/** 경조사 삭제. alsoTransaction 이면 연결된 가계부 거래도 지운다 */
export function useDeleteGift() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ gift, alsoTransaction }: { gift: GiftEvent; alsoTransaction: boolean }) => {
      const { error } = await supabase.from('gift_events').delete().eq('id', gift.id)
      if (error) throw error
      if (alsoTransaction && gift.transaction_id) {
        const { error: txError } = await supabase.from('transactions').delete().eq('id', gift.transaction_id)
        if (txError) throw txError
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: KEY })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
