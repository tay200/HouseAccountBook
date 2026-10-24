import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import AuthGate from './auth/AuthGate.tsx'
import './index.css'
import { router } from './router.tsx'

// 서버(Supabase)에서 가져온 데이터를 캐싱하고 관리하는 TanStack Query의 중심 객체
const queryClient = new QueryClient({
  // 조회/저장 중 에러가 나면 어느 화면이든 한 곳에서 알려준다
  queryCache: new QueryCache({
    onError: (error) => alert(`데이터를 불러오지 못했습니다.\n${error.message}`),
  }),
  mutationCache: new MutationCache({
    onError: (error) => alert(`저장하지 못했습니다.\n${error.message}`),
  }),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <RouterProvider router={router} />
      </AuthGate>
    </QueryClientProvider>
  </StrictMode>,
)
