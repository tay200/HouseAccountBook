import { useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import ColorDot from '../../components/ColorDot'
import { formatWon } from '../../lib/format'
import { isIncluded, type Position } from '../../lib/invest'
import type { InvestAccount } from '../../lib/types'

// 색각이상자도 구분되도록 검증된 범주형 팔레트 8색 (순서 고정). 9번째부터는 '기타'로 묶는다
const COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']
const OTHER_COLOR = '#c3c2b7'
const TOTAL = ''

type Slice = { key: string; name: string; value: number; color: string; count?: number }

type Props = {
  accounts: InvestAccount[]
  positions: Position[]
}

/** 종목별 평가금액 비중 (합계 또는 계좌 하나). 여러 계좌에 있는 같은 종목은 하나로 합친다 */
export default function HoldingsPieCard({ accounts, positions }: Props) {
  const [accountId, setAccountId] = useState(TOTAL)
  const includedIds = new Set(accounts.filter(isIncluded).map((a) => a.id))
  const inView = (id: string) => (accountId ? id === accountId : includedIds.has(id))

  // 환율을 몰라 평가할 수 없는 미국 종목은 다른 합계처럼 뺀다
  const byStock = new Map<string, { name: string; value: number }>()
  for (const p of positions) {
    if (p.quantity <= 0 || p.fxMissing || p.value <= 0 || !inView(p.accountId)) continue
    const key = `${p.market}:${p.code}`
    const s = byStock.get(key) ?? { name: p.name, value: 0 }
    s.value += p.value
    byStock.set(key, s)
  }
  const sorted = [...byStock].map(([key, s]) => ({ key, ...s })).sort((a, b) => b.value - a.value)
  const top = sorted.length > COLORS.length ? sorted.slice(0, COLORS.length) : sorted
  const rest = sorted.slice(top.length)
  const slices: Slice[] = top.map((s, i) => ({ ...s, color: COLORS[i] }))
  if (rest.length > 0) {
    slices.push({ key: 'other', name: '기타', value: rest.reduce((sum, s) => sum + s.value, 0), color: OTHER_COLOR, count: rest.length })
  }
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  const share = (value: number) => (total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '-')

  return (
    <div className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">종목별 비중</h3>
        <select className="input py-1.5" value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label="종목별 비중 계좌 선택">
          <option value={TOTAL}>선택 합계</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {slices.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">보유 중인 종목이 없어요.</p>
      ) : (
        <div className="grid items-center gap-6 md:grid-cols-[240px_1fr]">
          <div className="relative h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {/* 조각 사이 2px 흰 틈으로 경계를 구분한다 (한 조각뿐이면 틈이 이음매처럼 보여서 뺀다) */}
                <Pie data={slices} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="100%" stroke="#fff" strokeWidth={slices.length > 1 ? 2 : 0} startAngle={90} endAngle={-270}>
                  {slices.map((s) => (
                    <Cell key={s.key} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${formatWon(Number(value))} (${share(Number(value))})`, '평가금액']}
                  contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 13 }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* 도넛 가운데: 총 평가금액 */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-slate-500">평가금액</span>
              <span className="text-sm font-bold tabular-nums">{formatWon(total)}</span>
            </div>
          </div>

          <table className="w-full text-sm tabular-nums">
            <tbody className="divide-y divide-slate-100">
              {slices.map((s) => (
                <tr key={s.key}>
                  <td className="py-2 pr-2">
                    <span className="inline-flex items-center gap-2">
                      <ColorDot color={s.color} />
                      {s.name}
                      {s.count && <span className="text-xs text-slate-400">{s.count}종목</span>}
                    </span>
                  </td>
                  <td className="py-2 text-right whitespace-nowrap">{formatWon(s.value)}</td>
                  <td className="w-16 py-2 text-right text-slate-500">{share(s.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
