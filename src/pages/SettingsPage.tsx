import { useSession } from '../auth/session'
import CategorySettings from '../components/CategorySettings'
import MemberSettings from '../components/MemberSettings'
import PaymentMethodSettings from '../components/PaymentMethodSettings'
import { supabase } from '../lib/supabase'

export default function SettingsPage() {
  const session = useSession()

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">설정</h2>
      <CategorySettings />
      <div className="grid gap-6 lg:grid-cols-2">
        <PaymentMethodSettings />
        <MemberSettings />
      </div>
      <div className="card flex items-center justify-between">
        <div>
          <h3 className="font-semibold">계정</h3>
          <p className="text-sm text-slate-500">{session.user.email}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => supabase.auth.signOut()}>
          로그아웃
        </button>
      </div>
    </section>
  )
}
