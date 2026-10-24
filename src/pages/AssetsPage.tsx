import { useState } from 'react'
import AccountsTab from './assets/AccountsTab'
import DepositsTab from './assets/DepositsTab'
import LoansTab from './assets/LoansTab'
import RealAssetsTab from './assets/RealAssetsTab'
import SavingsTab from './assets/SavingsTab'
import SummaryTab from './assets/SummaryTab'

const TABS = [
  { key: 'summary', label: '자산현황' },
  { key: 'accounts', label: '계좌' },
  { key: 'deposits', label: '예금' },
  { key: 'savings', label: '적금' },
  { key: 'loans', label: '대출' },
  { key: 'real', label: '부동자산' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function AssetsPage() {
  const [tab, setTab] = useState<TabKey>('summary')

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">자산 · 부채</h2>
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'summary' && <SummaryTab />}
      {tab === 'accounts' && <AccountsTab />}
      {tab === 'deposits' && <DepositsTab />}
      {tab === 'savings' && <SavingsTab />}
      {tab === 'loans' && <LoansTab />}
      {tab === 'real' && <RealAssetsTab />}
    </section>
  )
}
