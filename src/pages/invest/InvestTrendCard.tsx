import { useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { monthlySnapshotsApi } from '../../api/tables'
import { ProfitRate, SignedWon } from '../../components/Numbers'
import { currentMonth, formatManwon, formatMonth, formatWon } from '../../lib/format'
import { investSummary, isIncluded, withIncomes, type Position } from '../../lib/invest'
import { investChange, investSeries } from '../../lib/snapshots'
import type { InvestAccount, InvestIncome, SnapshotAccount } from '../../lib/types'

// 평가금액=파랑, 원금=주황 (대시보드 차트와 같은 팔레트)
const COLORS = { value: '#2a78d6', cost: '#eb6834' }
const INK_MUTED = '#898781'
const GRID = '#e1e0d9'
const TOTAL = ''

type Props = {
  accounts: InvestAccount[]
  positions: Position[]
  /** 직접 입력한 판매수익·배당금 */
  incomes: InvestIncome[]
  /** 체크한 계좌들의 합계 */
  summary: ReturnType<typeof withIncomes>
}

/**
 * 투자 월별 추이 (합계 또는 계좌 하나). 지난달까지는 월별 기록, 이번 달은 지금 값.
 * 평가금액 증감을 '순투입(매수·매도로 넣고 뺀 돈)'과 '수익(평가손익+실현손익 변화)'으로 나눠 보여준다.
 */
export default function InvestTrendCard({ accounts, positions, incomes, summary }: Props) {
  const { data: snapshots = [] } = monthlySnapshotsApi.useList()
  const [accountId, setAccountId] = useState(TOTAL)

  // 월별 기록과 같은 기준: realized = 실현손익 + 판매수익 + 배당 누계 (earned)
  const liveAccounts: SnapshotAccount[] = accounts.map((a) => {
    const s = withIncomes(investSummary(positions.filter((p) => p.accountId === a.id)), incomes.filter((i) => i.account_id === a.id))
    return { id: a.id, name: a.name, included: isIncluded(a), value: s.value, cost: s.cost, realized: s.earned }
  })
  // 지금 있는 계좌 + 지난 기록에만 남은(삭제한) 계좌
  const options = new Map(liveAccounts.map((a) => [a.id, a.name]))
  for (const s of snapshots) for (const a of s.invest_accounts) if (!options.has(a.id)) options.set(a.id, `${a.name} (삭제됨)`)

  const total = { value: summary.value, cost: summary.cost, realized: summary.earned }
  const series = investSeries(snapshots, { month: currentMonth(), total, accounts: liveAccounts }, accountId || null)
  const rows = series.map((p, i) => ({ ...p, prev: i > 0 ? series[i - 1] : undefined })).reverse()
  const chartData = series.map((p) => ({ label: formatMonth(p.month), value: p.value, cost: p.cost }))

  return (
    <div className="card">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">월별 추이</h3>
        <select className="input py-1.5" value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label="계좌 선택">
          <option value={TOTAL}>선택 합계</option>
          {[...options].map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        매달 마지막으로 앱을 연 시점의 값으로 기록해요 (이번 달은 지금 값). 순투입 = 매수·매도로 넣고 뺀 돈, 수익 = 평가손익 + 실현손익 + 배당 변화.
      </p>

      {series.length < 2 ? (
        <p className="py-6 text-center text-sm text-slate-400">기록이 두 달 이상 쌓이면 추이와 지난달 대비 증감이 보여요.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: INK_MUTED, fontSize: 12 }} />
            <YAxis width={56} tickLine={false} axisLine={false} tick={{ fill: INK_MUTED, fontSize: 12 }} tickFormatter={formatManwon} />
            <Tooltip formatter={(value) => formatWon(Number(value))} contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 13 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13 }} />
            <Line dataKey="value" name="평가금액" stroke={COLORS.value} strokeWidth={2} dot={{ r: 3 }} />
            <Line dataKey="cost" name="원금 (보유 매수금액)" stroke={COLORS.cost} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}

      {rows.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="border-b border-slate-200 text-xs whitespace-nowrap text-slate-500">
              <tr>
                <th className="py-2 text-left font-medium">월</th>
                <th className="py-2 text-right font-medium">평가금액</th>
                <th className="py-2 text-right font-medium">원금</th>
                <th className="py-2 text-right font-medium">전월 대비</th>
                <th className="py-2 text-right font-medium">순투입</th>
                <th className="py-2 text-right font-medium">수익</th>
                <th className="py-2 text-right font-medium">월 수익률</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const c = r.prev && investChange(r.prev, r)
                return (
                  <tr key={r.month} className="whitespace-nowrap">
                    <td className="py-2">{formatMonth(r.month)}</td>
                    <td className="py-2 text-right">{formatWon(r.value)}</td>
                    <td className="py-2 text-right text-slate-600">{formatWon(r.cost)}</td>
                    <td className="py-2 text-right">{c ? <SignedWon value={c.valueDiff} /> : '-'}</td>
                    <td className="py-2 text-right text-slate-600">{c ? `${c.netFlow > 0 ? '+' : ''}${formatWon(c.netFlow)}` : '-'}</td>
                    <td className="py-2 text-right">{c ? <SignedWon value={c.profit} /> : '-'}</td>
                    <td className="py-2 text-right">{c && r.prev ? <ProfitRate value={c.profit} base={r.prev.value} /> : '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
