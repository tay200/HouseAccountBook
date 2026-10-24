import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatNumber, formatWon } from '../lib/format'

export type MonthlyTotal = {
  label: string // '10월'
  income: number
  expense: number
}

// 수입=파랑, 지출=주황: 색각이상자도 구분되도록 검증된 팔레트의 1·2번 색
const COLORS = { income: '#2a78d6', expense: '#eb6834' }
const INK_MUTED = '#898781'
const GRID = '#e1e0d9'

/** 1234567 → '123만' (축 눈금은 짧게) */
function formatManwon(value: number) {
  return value === 0 ? '0' : `${formatNumber(Math.round(value / 10000))}만`
}

export default function MonthlyTrendChart({ data }: { data: MonthlyTotal[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barGap={2} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: INK_MUTED, fontSize: 12 }} />
        <YAxis
          width={56}
          tickLine={false}
          axisLine={false}
          tick={{ fill: INK_MUTED, fontSize: 12 }}
          tickFormatter={formatManwon}
        />
        <Tooltip
          cursor={{ fill: '#f1f5f9' }}
          formatter={(value) => formatWon(Number(value))}
          contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 13 }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="income" name="수입" fill={COLORS.income} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expense" name="지출" fill={COLORS.expense} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}
