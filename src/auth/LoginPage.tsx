import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault() // 폼 제출 시 페이지가 새로고침되는 브라우저 기본 동작을 막는다
    setSubmitting(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    // 성공하면 AuthGate 가 세션 변화를 감지해서 앱 화면으로 바꿔준다
    if (error) setError('이메일 또는 비밀번호가 올바르지 않습니다.')
    setSubmitting(false)
  }

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold">가계부 로그인</h1>
        <label className="block space-y-1">
          <span className="text-sm text-slate-600">이메일</span>
          <input
            type="email"
            className="input w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-slate-600">비밀번호</span>
          <input
            type="password"
            className="input w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
          {submitting ? '로그인 중…' : '로그인'}
        </button>
      </form>
    </div>
  )
}
