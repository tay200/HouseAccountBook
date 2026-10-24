import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('.env.local 에 VITE_SUPABASE_URL 과 VITE_SUPABASE_PUBLISHABLE_KEY 를 설정하세요.')
}

// 앱 전체에서 이 객체 하나로 DB 조회와 로그인을 처리한다.
export const supabase = createClient(url, key, {
  auth: {
    // 이메일+비밀번호 로그인만 쓰므로, 주소의 #... 를 로그인 토큰으로 해석하지 않게 한다
    // (Hash 라우터의 '#/budget' 같은 주소와 충돌 방지)
    detectSessionInUrl: false,
  },
})
