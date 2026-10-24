import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

// Context: props 로 일일이 넘기지 않고도 하위 컴포넌트 어디서나 꺼내 쓸 수 있는 값
export const SessionContext = createContext<Session | null>(null)

/** 로그인한 사용자 세션. AuthGate 안쪽에서만 쓰므로 항상 존재한다. */
export function useSession() {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession 은 AuthGate 안에서만 쓸 수 있습니다.')
  return session
}
