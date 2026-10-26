import { monthDiff, shiftMonth } from './format'
import type { BankAccount, LedgerEntry, SavingGoal } from './types'

export type GoalStatus = 'done' | 'onTrack' | 'behind' | 'overdue'

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  done: '달성',
  onTrack: '순조로움',
  behind: '뒤처짐',
  overdue: '기한 지남',
}

/** 통장 기록의 통장 이름 → 잔액 */
export function bookBalances(entries: LedgerEntry[]) {
  const balances = new Map<string, number>()
  for (const e of entries) balances.set(e.book, (balances.get(e.book) ?? 0) + (e.direction === 'in' ? e.amount : -e.amount))
  return balances
}

/** 모은 돈: 직접 입력 / 통장 기록 잔액 / 계좌 잔액 (음수는 0) */
export function savedOf(goal: SavingGoal, books: Map<string, number>, accounts: BankAccount[]) {
  const value =
    goal.source === 'book'
      ? (books.get(goal.book ?? '') ?? 0)
      : goal.source === 'account'
        ? (accounts.find((a) => a.id === goal.bank_account_id)?.balance ?? 0)
        : goal.saved_amount
  return Math.max(value, 0)
}

/**
 * 'YYYY-MM' 달에 보는 목표 기간. 매년 반복이면 기한이 지난 만큼 1년씩 뒤로 옮긴다.
 * 돌려주는 값은 'YYYY-MM'
 */
export function goalPeriod(goal: Pick<SavingGoal, 'start_month' | 'due_month' | 'repeat_yearly'>, month: string) {
  let start = goal.start_month.slice(0, 7)
  let due = goal.due_month.slice(0, 7)
  if (goal.repeat_yearly && due < month) {
    const years = Math.ceil(monthDiff(due, month) / 12)
    start = shiftMonth(start, years * 12)
    due = shiftMonth(due, years * 12)
  }
  return { start, due }
}

/**
 * 'YYYY-MM' 달 기준 진행 상황.
 *   월 필요액 = (목표 − 모은 돈) ÷ 남은 개월(이번 달 포함), 원 단위 올림
 *   순조로움 = 지난달까지 모았어야 할 돈(목표 × 지난 개월 ÷ 전체 개월) 이상 모음
 */
export function goalProgress(goal: SavingGoal, saved: number, month: string) {
  const { start, due } = goalPeriod(goal, month)
  const target = goal.target_amount
  const remaining = Math.max(target - saved, 0)
  const totalMonths = monthDiff(start, due) + 1
  const monthsLeft = Math.max(monthDiff(month, due) + 1, 0)
  // 이번 달 전까지 지난 개월 수 (시작 전이면 0, 기한이 지났으면 전체)
  const elapsed = Math.min(Math.max(monthDiff(start, month), 0), totalMonths)
  const expected = Math.round((target * elapsed) / totalMonths)

  let status: GoalStatus
  if (saved >= target) status = 'done'
  else if (monthsLeft === 0) status = 'overdue'
  else status = saved >= expected ? 'onTrack' : 'behind'

  return {
    start,
    due,
    saved,
    remaining,
    monthsLeft,
    expected,
    ratio: Math.min(saved / target, 1),
    /** 이번 달에 모아야 할 돈 (달성했거나 기한이 지났으면 0) */
    monthlyNeed: status === 'done' || monthsLeft === 0 ? 0 : Math.ceil(remaining / monthsLeft),
    status,
  }
}
