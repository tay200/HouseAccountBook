import { daysInMonth } from './format'
import type { RecurringRule, Transaction } from './types'

/** 이 규칙이 'YYYY-MM' 달에 해당하는지 (사용 중 + 시작~끝 월 안) */
export function isRuleInMonth(rule: RecurringRule, month: string) {
  return rule.active && rule.start_month.slice(0, 7) <= month && (!rule.end_month || rule.end_month.slice(0, 7) >= month)
}

/** 그 달에 이 규칙이 나가는 날 'YYYY-MM-DD'. 31일 규칙이면 2월은 28(29)일 */
export function ruleDate(rule: Pick<RecurringRule, 'day'>, month: string) {
  const day = Math.min(rule.day, daysInMonth(month))
  return `${month}-${String(day).padStart(2, '0')}`
}

export type RecurringItem = {
  rule: RecurringRule
  /** 이 달에 나가는 날 */
  date: string
  /** [확인]으로 만든 실제 거래 (없으면 아직 예정) */
  done: Transaction | undefined
}

/**
 * 'YYYY-MM' 달의 반복 거래 목록 (날짜순). transactions 는 그 달 거래.
 * 그 달 거래 중 recurring_id 가 규칙을 가리키는 것이 있으면 처리 완료로 본다.
 */
export function recurringForMonth(rules: RecurringRule[], transactions: Transaction[], month: string): RecurringItem[] {
  const doneByRule = new Map<string, Transaction>()
  for (const t of transactions) if (t.recurring_id && t.date.startsWith(month)) doneByRule.set(t.recurring_id, t)
  return rules
    .filter((r) => isRuleInMonth(r, month))
    .map((rule) => ({ rule, date: ruleDate(rule, month), done: doneByRule.get(rule.id) }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.rule.memo.localeCompare(b.rule.memo))
}

/** 아직 확인하지 않은 반복 지출 중 조건에 맞는 것의 합계 (예: 소비성, 예산을 정한 카테고리) */
export function pendingAmount(items: RecurringItem[], predicate: (rule: RecurringRule) => boolean) {
  return items.filter((i) => !i.done && predicate(i.rule)).reduce((sum, i) => sum + i.rule.amount, 0)
}
