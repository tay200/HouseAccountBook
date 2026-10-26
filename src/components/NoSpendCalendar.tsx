import { formatNumber, monthStart, todayString, toDateString } from '../lib/format'
import { noSpendStats } from '../lib/stats'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

type Props = {
  month: string
  /** 'YYYY-MM-DD' → 그날 변동지출 합계 */
  spentByDate: Map<string, number>
  /** 그 달에 기록이 하나라도 있는지. 없으면 가계부를 안 쓴 달이므로 무지출로 세지 않는다 */
  hasRecords: boolean
  /** 월 무지출 목표 일수 (0 이면 목표 없음, 연간 리포트 > 재무 목표에서 정함) */
  target?: number
}

/**
 * 변동지출 달력. 오늘 이전인데 변동지출이 없는 날은 '무지출'로 표시한다. (엑셀 '변동지출 달력')
 */
export default function NoSpendCalendar({ month, spentByDate, hasRecords, target = 0 }: Props) {
  const first = new Date(`${monthStart(month)}T00:00:00`)
  const today = todayString()
  // 달력 첫 칸 = 1일이 속한 주의 일요일
  const start = new Date(first)
  start.setDate(1 - first.getDay())

  // 필요한 주 수 = (1일 앞의 빈칸 + 그 달 일수) 를 7로 나눠 올림 (4~6주)
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const weeks = Math.ceil((first.getDay() + daysInMonth) / 7)
  const visible: { date: string; inMonth: boolean }[] = []
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    visible.push({ date: toDateString(d), inMonth: d.getMonth() === first.getMonth() })
  }
  const isNoSpend = (date: string) => hasRecords && date < today && !spentByDate.get(date)
  const stats = noSpendStats(month, spentByDate, today, hasRecords)

  return (
    <div>
      {hasRecords ? (
        <div className="mb-3 space-y-2 text-sm text-slate-500">
          <p className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span>
              무지출 성공 <strong className="text-emerald-600">{stats.days}일</strong>
              {target > 0 && <span> / 목표 {target}일{stats.days >= target && <strong className="ml-1 text-emerald-700">✓ 달성</strong>}</span>}
            </span>
            <span className="text-xs">
              연속 <strong className="text-slate-700">{stats.current}일</strong> · 이 달 최고 {stats.best}일
            </span>
          </p>
          {target > 0 && (
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[#0ca30c]" style={{ width: `${Math.min(stats.days / target, 1) * 100}%` }} />
            </div>
          )}
        </div>
      ) : (
        <p className="mb-3 text-sm text-slate-500">이 달은 아직 기록이 없어요.</p>
      )}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`py-1 font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-500'}`}>
            {w}
          </div>
        ))}
        {visible.map(({ date, inMonth }) => {
          const spent = spentByDate.get(date) ?? 0
          const noSpend = inMonth && isNoSpend(date)
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
