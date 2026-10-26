const numberFormat = new Intl.NumberFormat('ko-KR')

/** 12345 → '12,345' */
export function formatNumber(value: number) {
  return numberFormat.format(value)
}

/** 12345 → '12,345원' */
export function formatWon(value: number) {
  return `${numberFormat.format(value)}원`
}

/** 1234567 → '123만' (차트 축 눈금처럼 짧게). 1만 원 미만은 원 단위로 */
export function formatManwon(value: number) {
  if (value === 0) return '0'
  if (Math.abs(value) < 10000) return formatNumber(value)
  return `${formatNumber(Math.round(value / 10000))}만`
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

/** 'YYYY-MM' 달의 날짜 수 */
export function daysInMonth(month: string) {
  const [year, mon] = month.split('-').map(Number)
  return new Date(year, mon, 0).getDate() // 다음 달의 0일 = 이번 달 마지막 날
}

/** from 에서 to 까지 몇 달 차이인지 ('2026-01' → '2026-03' = 2). 'YYYY-MM-DD' 를 넣어도 달만 본다 */
export function monthDiff(from: string, to: string) {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
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

/** '#제주여행 #가족, 이사' → ['제주여행', '가족', '이사'] (공백·쉼표로 나누고 # 은 뗀다, 중복 제거) */
export function parseTags(text: string) {
  return [...new Set(text.split(/[\s,]+/).map((t) => t.replace(/^#+/, '').trim()).filter(Boolean))]
}

/** ['제주여행', '가족'] → '#제주여행 #가족' */
export function formatTags(tags: string[]) {
  return tags.map((t) => `#${t}`).join(' ')
}
