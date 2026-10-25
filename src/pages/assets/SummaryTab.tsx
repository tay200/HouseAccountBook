import { snapshotsApi } from '../../api/tables'
import CrudTable, { type Column } from '../../components/CrudTable'
import { StatCard } from '../../components/Numbers'
import { useAssetSummary } from '../../hooks/useAssetSummary'
import { formatWon, todayString } from '../../lib/format'
import { TERM_LABEL, type NetWorthSnapshot } from '../../lib/types'

// ─────────────────────────────────────────────
// 자산현황 (엑셀 '자산현황')
// ─────────────────────────────────────────────
export default function SummaryTab() {
  const { items, financial, real, debt, total, net } = useAssetSummary()
  const { data: snapshots = [] } = snapshotsApi.useList()
  const saveSnapshot = snapshotsApi.useSave()
  const deleteSnapshot = snapshotsApi.useDelete()
  const year = Number(todayString().slice(0, 4))

  const byTerm = (['long', 'mid', 'short'] as const).map((t) => ({
    label: TERM_LABEL[t],
    amount: items.filter((i) => i.term === t).reduce((s, i) => s + i.amount, 0),
  }))
  const byRisk = [
    { label: '안정 (입출금·예적금·비상금)', amount: items.filter((i) => !i.risky).reduce((s, i) => s + i.amount, 0) },
    { label: '위험 (투자 자산)', amount: items.filter((i) => i.risky).reduce((s, i) => s + i.amount, 0) },
  ]

  function recordThisYear() {
    const existing = snapshots.find((s) => s.year === year)
    saveSnapshot.mutate({ id: existing?.id, year, amount: net, memo: existing?.memo ?? null })
  }

  const snapshotColumns: Column<NetWorthSnapshot>[] = [
    { key: 'year', label: '연도', input: { type: 'number', step: '1' }, required: true, render: (s) => `${s.year}년` },
    { key: 'amount', label: '순자산', input: { type: 'money' }, required: true, align: 'right' },
    {
      key: 'change',
      label: '전년 대비',
      align: 'right',
      sortValue: (s) => {
        const prev = snapshots.find((p) => p.year === s.year - 1)
        return prev ? s.amount - prev.amount : null
      },
      render: (s) => {
        const prev = snapshots.find((p) => p.year === s.year - 1)
        if (!prev) return '-'
        const diff = s.amount - prev.amount
        const rate = prev.amount !== 0 ? ` (${((diff / Math.abs(prev.amount)) * 100).toFixed(1)}%)` : ''
        return `${diff >= 0 ? '+' : ''}${formatWon(diff)}${rate}`
      },
    },
    { key: 'memo', label: '메모', input: { type: 'text' } },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="금융자산" value={financial} />
        <Stat label="부동자산" value={real} />
        <Stat label="총자산" value={total} />
        <Stat label="부채" value={debt} />
        <Stat label="순자산" value={net} strong />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <RatioCard title="기간별 금융자산" rows={byTerm} total={financial} />
        <RatioCard title="위험자산 비율" rows={byRisk} total={financial} />
        <RatioCard title="금융자산 구성" rows={items.map((i) => ({ label: `${i.group} · ${i.label}`, amount: i.amount }))} total={financial} />
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">연도별 순자산</h3>
          <button className="btn btn-secondary" onClick={recordThisYear} disabled={saveSnapshot.isPending}>
            {year}년 순자산을 현재 값으로 기록
          </button>
        </div>
        <CrudTable
          rows={snapshots}
          columns={snapshotColumns}
          defaults={{ year }}
          onSave={(values) => saveSnapshot.mutateAsync(values)}
          onDelete={(id) => deleteSnapshot.mutate(id)}
        />
      </div>
    </div>
  )
}

/** 금액 카드 (음수면 빨강, 순자산은 강조) */
function Stat({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return <StatCard label={label} value={formatWon(value)} valueClass={value < 0 ? 'text-red-600' : ''} className={strong ? 'border-blue-200 bg-blue-50' : ''} />
}

function RatioCard({ title, rows, total }: { title: string; rows: { label: string; amount: number }[]; total: number }) {
  return (
    <div className="card">
      <h3 className="mb-4 font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">데이터가 없어요.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {/* 이름이 같은 계좌가 있을 수 있어서 순서를 key 에 섞는다 */}
          {rows.map((r, i) => (
            <li key={`${i}-${r.label}`} className="space-y-1">
              <div className="flex justify-between gap-2">
                <span className="truncate">{r.label}</span>
                <span className="whitespace-nowrap tabular-nums">
                  {formatWon(r.amount)} <span className="text-slate-400">{total > 0 ? `${Math.round((r.amount / total) * 100)}%` : ''}</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#2a78d6]" style={{ width: `${total > 0 ? Math.max((r.amount / total) * 100, 0) : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
