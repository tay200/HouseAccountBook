/** 'YYYY-MM-DD' 기간. 빈 문자열은 그쪽 끝을 정하지 않음 (둘 다 비면 전체) */
export type DateRange = { from: string; to: string }

export const ALL_DATES: DateRange = { from: '', to: '' }

/** 날짜가 기간 안인지. 기간이 정해져 있으면 날짜 없는 기록은 뺀다 */
export function inDateRange(date: string | null, range: DateRange) {
  if (!range.from && !range.to) return true
  if (!date) return false
  return (!range.from || date >= range.from) && (!range.to || date <= range.to)
}
