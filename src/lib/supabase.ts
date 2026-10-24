import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/** DB 테이블 이름 (자동 생성 타입에서). 오타가 있으면 빌드할 때 잡힌다 */
export type TableName = keyof Database['public']['Tables']

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('.env.local 에 VITE_SUPABASE_URL 과 VITE_SUPABASE_PUBLISHABLE_KEY 를 설정하세요.')
}

// 앱 전체에서 이 객체 하나로 DB 조회와 로그인을 처리한다.
// <Database> = DB 구조에서 자동 생성한 타입 (npm run gen:types). 테이블·열 이름이 틀리면 빌드할 때 알려준다.
export const supabase = createClient<Database>(url, key, {
  auth: {
    // 이메일+비밀번호 로그인만 쓰므로, 주소의 #... 를 로그인 토큰으로 해석하지 않게 한다
    // (Hash 라우터의 '#/budget' 같은 주소와 충돌 방지)
    detectSessionInUrl: false,
  },
})

/**
 * 테이블 이름을 변수로 받는 공용 함수(createTableApi, 백업 등)용.
 * 자동 생성 타입은 이름이 고정된 조회에서만 정확해서, 이름이 변수인 곳에서는 타입 검사를 느슨하게 한다.
 * 이런 곳에서도 테이블 이름 자체는 TableName 으로 검사한다.
 */
export const untypedDb = supabase as unknown as SupabaseClient
