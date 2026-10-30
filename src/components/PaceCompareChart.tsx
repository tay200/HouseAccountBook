import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatManwon, formatMonthShort, formatWon } from '../lib/format'

// 이번 달 = 소비 색(주황, 앱 차트와 같은 팔레트), 지난달 = 비교 기준이라 회색 점선
const COLORS = { current: '#eb6834', last: '#94a3b8' }
const INK_MUTED = '#898781'
const GRID = '#e1e0d9'

type Props = {
  month: string
  lastMonth: string
  /** 날마다 누적한 소비성 지출 (index 0 = 1일까지) */
  current: number[]
  last: number[]
  /** 이번 달이면 오늘이 며칠인지. 이번 달 선은 오늘까지만 그린다. 지난 달이면 null (끝까지) */
  todayDay: number | null
}

/** 이번 달과 지난달의 소비성 지출을 1일부터 누적해 겹쳐 그린다 (같은 날끼리 비교) */
export default function PaceCompareChart({ month, lastMonth, current, last, todayDay }: Props) {
  const upTo = todayDay ?? current.length
  // 지난달이 더 짧으면(30일 vs 31일) 남는 날은 지난달 말일 값으로
  const lastAt = (day: number) => last[Math.min(day, last.length) - 1] ?? 0
  const data = Array.from({ length: Math.max(current.length, last.length) }, (_, i) => ({
    day: i + 1,
    current: i < upTo && i < current.length ? current[i] : null,
    last: i < last.length ? last[i] : null,
  }))
  const nowSpent = current[upTo - 1] ?? 0
  const thenSpent = lastAt(upTo)
  const diff = nowSpent - thenSpent

  if (nowSpent === 0 && last.every((v) => v === 0)) {
    return <p className="py-16 text-center text-sm text-slate-400">이 기간에는 기록이 없어요.</p>
  }
  const currentName = formatMonthShort(month)
  const lastName = formatMonthShort(lastMonth)
  return (
    <div>
      <p className="mb-3 text-sm text-slate-600">
        {todayDay ? `오늘(${todayDay}일)까지` : '한 달 동안'} <strong className="tabular-nums">{formatWon(nowSpent)}</strong>
        <span className="text-slate-500">
          {' · '}
          {lastName} 같은 날보다{' '}
          {diff === 0 ? '같아요' : (
            <strong className={diff > 0 ? 'text-red-600' : 'text-emerald-700'}>
              {formatWon(Math.abs(diff))} {diff > 0 ? '▲ 더 씀' : '▼ 덜 씀'}
            </strong>
          )}
        </span>
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={{ stroke: GRID }}
            tick={{ fill: INK_MUTED, fontSize: 12 }}
            ticks={[1, 5, 10, 15, 20, 25, data.length]}
            tickFormatter={(d) => `${d}일`}
          />
          <YAxis width={56} tickLine={false} axisLine={false} tick={{ fill: INK_MUTED, fontSize: 12 }} tickFormatter={formatManwon} />
          <Tooltip
            formatter={(value) => formatWon(Number(value))}
            labelFormatter={(d) => `${d}일까지`}
            contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 13 }}
          />
          <Legend iconType="plainline" iconSize={14} wrapperStyle={{ fontSize: 13 }} />
          <Line dataKey="last" name={lastName} stroke={COLORS.last} strokeWidth={2} strokeDasharray="4 3" dot={false} activeDot={{ r: 4 }} />
          <Line dataKey="current" name={currentName} stroke={COLORS.current} strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
