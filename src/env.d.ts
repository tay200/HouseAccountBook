// .env.local 에 정의한 환경변수의 타입. import.meta.env.VITE_... 에 자동완성이 붙는다.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
}
