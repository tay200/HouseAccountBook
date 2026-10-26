import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { DEFAULT_APP_SETTINGS, type AppSettings } from '../lib/types'

const KEY = ['app_settings']

/** 가계부 설정. 아직 저장한 적이 없으면 기본값 */
export function useAppSettings() {
  const query = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('big_spend_threshold').maybeSingle()
      if (error) throw error
      return { ...DEFAULT_APP_SETTINGS, ...data } as AppSettings
    },
  })
  return { ...query, settings: query.data ?? DEFAULT_APP_SETTINGS }
}

/** 설정 저장 (가계부마다 1줄이라 있으면 덮어쓰기: upsert) */
export function useSaveAppSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<AppSettings>) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ ...values, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
