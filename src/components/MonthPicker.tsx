import { currentMonth, formatMonth, shiftMonth } from '../lib/format'

type Props = {
  month: string
  onChange: (month: string) => void
}

export default function MonthPicker({ month, onChange }: Props) {
  const isCurrent = month === currentMonth()
  return (
    <div className="flex items-center gap-1">
      <button className="btn btn-text" onClick={() => onChange(shiftMonth(month, -1))} aria-label="이전 달">
        ◀
      </button>
      <span className="w-28 text-center text-lg font-semibold">{formatMonth(month)}</span>
      <button className="btn btn-text" onClick={() => onChange(shiftMonth(month, 1))} aria-label="다음 달">
        ▶
      </button>
      {!isCurrent && (
        <button className="btn btn-text text-xs" onClick={() => onChange(currentMonth())}>
          이번 달
        </button>
      )}
    </div>
  )
}
