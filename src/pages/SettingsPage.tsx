import { useState } from 'react'
import { downloadBackup } from '../api/backup'
import { useSession } from '../auth/session'
import BigSpendSettings from '../components/BigSpendSettings'
import CategorySettings from '../components/CategorySettings'
import MemberSettings from '../components/MemberSettings'
import PaymentMethodSettings from '../components/PaymentMethodSettings'
import RecurringSettings from '../components/RecurringSettings'
import { toUserMessage } from '../lib/errors'
import { supabase } from '../lib/supabase'

export default function SettingsPage() {
  const session = useSession()
  const [backingUp, setBackingUp] = useState(false)

  async function handleBackup() {
    setBackingUp(true)
    try {
      await downloadBackup()
    } catch (e) {
      alert(`백업하지 못했습니다.\n${toUserMessage(e)}`)
    } finally {
      setBackingUp(false)
    }
  }

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">설정</h2>
      <CategorySettings />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PaymentMethodSettings />
        <MemberSettings />
      </div>
      <RecurringSettings />
      <BigSpendSettings />
      <div className="card flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold">데이터 백업</h3>
          <p className="text-sm text-slate-500">
            모든 기록을 CSV 파일(엑셀에서 열림)로 묶은 zip 을 내려받아요. 실수로 지우는 일에 대비해 가끔 받아 두세요.
          </p>
        </div>
        <button className="btn btn-primary whitespace-nowrap" onClick={handleBackup} disabled={backingUp}>
          {backingUp ? '만드는 중…' : '전체 데이터 내보내기'}
        </button>
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
