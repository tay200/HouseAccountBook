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
      {/* 이번 달이면 숨기기만 하고 자리는 남겨서, ◀ ▶ 위치가 바뀌지 않게 한다 (연속 클릭이 엇나가지 않도록) */}
      <button
        className={`btn btn-text text-xs ${isCurrent ? 'invisible' : ''}`}
        onClick={() => onChange(currentMonth())}
        tabIndex={isCurrent ? -1 : undefined}
      >
        이번 달
      </button>
    </div>
  )
}
