import { ALL_DATES, type DateRange } from '../lib/dateRange'
import { toDateString, todayString } from '../lib/format'

/** 은행 앱처럼 오늘부터 거슬러 올라가는 빠른 기간 */
const PRESETS: { label: string; days?: number; months?: number }[] = [
  { label: '1주일', days: 7 },
  { label: '1개월', months: 1 },
  { label: '3개월', months: 3 },
  { label: '6개월', months: 6 },
  { label: '1년', months: 12 },
]

function presetRange(p: { days?: number; months?: number }): DateRange {
  const start = new Date()
  if (p.days) start.setDate(start.getDate() - p.days)
  if (p.months) start.setMonth(start.getMonth() - p.months)
  return { from: toDateString(start), to: todayString() }
}

type Props = {
  value: DateRange
  onChange: (range: DateRange) => void
}

/** 기간 검색: [1주일] [1개월] … [전체] 빠른 버튼 + 시작일 ~ 종료일 직접 고르기 */
export default function DateRangeFilter({ value, onChange }: Props) {
  const isAll = !value.from && !value.to
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${active ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => {
        const range = presetRange(p)
        const active = value.from === range.from && value.to === range.to
        return (
          <button key={p.label} className={chip(active)} onClick={() => onChange(range)}>
            {p.label}
          </button>
        )
      })}
      <button className={chip(isAll)} onClick={() => onChange(ALL_DATES)}>전체</button>
      <span className="flex items-center gap-1">
        <input type="date" className="input py-1 text-sm" value={value.from} max={value.to || undefined} onChange={(e) => onChange({ ...value, from: e.target.value })} aria-label="시작일" />
        <span className="text-slate-400">~</span>
        <input type="date" className="input py-1 text-sm" value={value.to} min={value.from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value })} aria-label="종료일" />
      </span>
    </div>
  )
}
