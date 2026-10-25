import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { monthStart, shiftMonth } from '../lib/format'
import { supabase } from '../lib/supabase'
import { fetchAll } from './fetchAll'
import type { Transaction, TransactionInput } from '../lib/types'

/** 화면에서 쓰는 거래 열 */
const SELECT_COLUMNS = 'id, date, type, kind, amount, discount, category_id, payment_method_id, member_id, memo'

/**
 * fromMonth ~ toMonth(포함) 사이의 거래를 최신순으로 가져온다.
 * 한 달만 볼 때는 fromMonth 와 toMonth 를 같게 넘긴다.
 */
export function useTransactions(fromMonth: string, toMonth: string) {
  return useQuery({
    queryKey: ['transactions', fromMonth, toMonth],
    // 1년치(연간 리포트)는 1000건을 넘을 수 있어서 나눠 받는다
    // DB 타입은 type·kind 를 그냥 문자열로 알기 때문에, 우리가 아는 좁은 타입(Transaction)으로 바꿔 쓴다
    queryFn: async () =>
      (await fetchAll((from, to) =>
        supabase
          .from('transactions')
          .select(SELECT_COLUMNS)
          .gte('date', monthStart(fromMonth))
          .lt('date', monthStart(shiftMonth(toMonth, 1)))
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id')
          .range(from, to),
      )) as Transaction[],
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

/** 내용 자동완성에 쓰는 과거 거래 한 건 (금액은 매번 달라서 채우지 않는다) */
export type MemoSuggestion = Pick<Transaction, 'memo' | 'type' | 'kind' | 'category_id' | 'payment_method_id'>

/**
 * 최근 거래 1000건의 내용(memo) → 그 내용으로 마지막에 입력한 거래.
 * 입력 폼에서 같은 내용을 고르면 분류·결제수단을 그대로 채우는 데 쓴다.
 */
export function useMemoSuggestions() {
  return useQuery({
    // 'transactions' 로 시작하므로 거래를 저장·삭제하면 함께 새로고침된다
    queryKey: ['transactions', 'memo-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('memo, type, kind, category_id, payment_method_id')
        .not('memo', 'is', null)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1000)
      if (error) throw error
      // 최신순이므로 같은 내용은 처음 나온 것(가장 최근)만 남긴다
      const byMemo = new Map<string, MemoSuggestion>()
      for (const row of data as MemoSuggestion[]) {
        const memo = row.memo?.trim()
        if (memo && !byMemo.has(memo)) byMemo.set(memo, row)
      }
      return byMemo
    },
  })
}

/** LIKE 검색에서 특수한 뜻을 가진 글자(% _ \)를 일반 글자로 바꾼다 */
function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`)
}

/**
 * 모든 달에서 거래 찾기: 내용에 term 이 들어 있거나(대소문자 무시), term 이 숫자면 금액이 같은 거래.
 * term 이 빈 문자열이면 조회하지 않는다.
 */
export function useSearchTransactions(term: string) {
  return useQuery({
    queryKey: ['transactions', 'search', term],
    enabled: term !== '',
    queryFn: async () => {
      const byMemo = fetchAll((from, to) =>
        supabase
          .from('transactions')
          .select(SELECT_COLUMNS)
          .ilike('memo', `%${escapeLike(term)}%`)
          .order('id')
          .range(from, to),
      )
      const digits = term.replace(/,/g, '')
      const byAmount = /^\d{1,15}$/.test(digits)
        ? fetchAll((from, to) =>
            supabase.from('transactions').select(SELECT_COLUMNS).eq('amount', Number(digits)).order('id').range(from, to),
          )
        : Promise.resolve([])
      // 두 조회 결과를 합치고(겹치는 거래는 한 번만) 최신순으로
      const rows = new Map((await Promise.all([byMemo, byAmount])).flat().map((t) => [t.id, t]))
      return ([...rows.values()] as Transaction[]).sort((a, b) => b.date.localeCompare(a.date))
    },
  })
}
