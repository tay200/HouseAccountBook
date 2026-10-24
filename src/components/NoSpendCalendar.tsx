import { formatNumber, monthStart, todayString, toDateString } from '../lib/format'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

type Props = {
  month: string
  /** 'YYYY-MM-DD' → 그날 변동지출 합계 */
  spentByDate: Map<string, number>
}

/**
 * 변동지출 달력. 오늘 이전인데 변동지출이 없는 날은 '무지출'로 표시한다. (엑셀 '변동지출 달력')
 */
export default function NoSpendCalendar({ month, spentByDate }: Props) {
  const first = new Date(`${monthStart(month)}T00:00:00`)
  const today = todayString()
  // 달력 첫 칸 = 1일이 속한 주의 일요일
  const start = new Date(first)
  start.setDate(1 - first.getDay())

  const days: { date: string; inMonth: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push({ date: toDateString(d), inMonth: d.getMonth() === first.getMonth() })
  }
  // 마지막 주가 통째로 다음 달이면 잘라낸다
  const weeks = days[35].inMonth ? 6 : 5
  const visible = days.slice(0, weeks * 7)
  const noSpendDays = visible.filter((d) => d.inMonth && d.date < today && !spentByDate.get(d.date)).length

  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">
        무지출 성공 <strong className="text-emerald-600">{noSpendDays}일</strong>
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`py-1 font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-500'}`}>
            {w}
          </div>
        ))}
        {visible.map(({ date, inMonth }) => {
          const spent = spentByDate.get(date) ?? 0
          const noSpend = inMonth && date < today && spent === 0
          return (
            <div
              key={date}
              className={`flex h-14 flex-col items-center justify-start rounded-md pt-1 ${
                !inMonth ? 'opacity-0' : noSpend ? 'bg-emerald-50' : date === today ? 'ring-1 ring-blue-300' : 'bg-slate-50'
              }`}
            >
              <span className="text-slate-500">{Number(date.slice(8))}</span>
              {inMonth && spent > 0 && <span className="mt-0.5 font-medium tabular-nums">{formatNumber(spent)}</span>}
              {noSpend && <span className="mt-0.5 font-medium text-emerald-700">무지출</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
