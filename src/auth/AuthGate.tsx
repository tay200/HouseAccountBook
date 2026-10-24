import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import LoginPage from './LoginPage'
import { SessionContext } from './session'

/** 로그인 전에는 로그인 화면을, 로그인 후에는 children(앱 본문)을 보여준다. */
export default function AuthGate({ children }: { children: ReactNode }) {
  // undefined = 아직 확인 중, null = 로그아웃 상태
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const queryClient = useQueryClient()

  useEffect(() => {
    // 로그인/로그아웃/토큰 갱신이 일어날 때마다 호출된다 (처음 구독할 때도 한 번 호출됨)
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      // 로그아웃하면 캐시에 남은 데이터를 지운다
      if (!newSession) queryClient.clear()
    })
    // 컴포넌트가 사라질 때 구독 해제 (useEffect 의 정리 함수)
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  if (session === undefined) {
    return <div className="grid min-h-screen place-items-center text-slate-500">불러오는 중…</div>
  }
  if (!session) return <LoginPage />

  return <SessionContext value={session}>{children}</SessionContext>
}
