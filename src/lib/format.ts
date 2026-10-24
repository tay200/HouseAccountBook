const numberFormat = new Intl.NumberFormat('ko-KR')

/** 12345 → '12,345' */
export function formatNumber(value: number) {
  return numberFormat.format(value)
}

/** 12345 → '12,345원' */
export function formatWon(value: number) {
  return `${numberFormat.format(value)}원`
}

const usdFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 347.7 → '$347.70' */
export function formatUsd(value: number) {
  return `$${usdFormat.format(value)}`
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** 내 PC 시간대 기준 'YYYY-MM-DD' (toISOString 은 UTC 라 자정 근처에 날짜가 틀어진다) */
export function toDateString(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayString() {
  return toDateString(new Date())
}

/** 이번 달 'YYYY-MM' */
export function currentMonth() {
  return todayString().slice(0, 7)
}

/** shiftMonth('2026-01', -1) → '2025-12' */
export function shiftMonth(month: string, delta: number) {
  const [year, mon] = month.split('-').map(Number)
  const date = new Date(year, mon - 1 + delta, 1)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

/** '2026-10' → '2026-10-01' */
export function monthStart(month: string) {
  return `${month}-01`
}

/** '2026-10' → '2026년 10월' */
export function formatMonth(month: string) {
  const [year, mon] = month.split('-').map(Number)
  return `${year}년 ${mon}월`
}

/** '2026-10' → '10월' */
export function formatMonthShort(month: string) {
  return `${Number(month.split('-')[1])}월`
}
