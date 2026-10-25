// 월별 자산 기록(monthly_snapshots) 계산
import { monthStart } from './format'
import type { MonthlySnapshot, SnapshotAccount } from './types'

export type SnapshotValues = Omit<MonthlySnapshot, 'id' | 'saved_at'>

type InvestTotals = { value: number; cost: number; realized: number }

/** 지금 값을 DB 에 넣을 모양으로 (bigint 열이라 원 단위로 반올림) */
export function toSnapshotValues(
  month: string,
  s: { financial: number; real: number; debt: number; net: number; invest: InvestTotals; investByAccount: SnapshotAccount[] },
): SnapshotValues {
  const r = Math.round
  return {
    month: monthStart(month),
    financial: r(s.financial),
    real_assets: r(s.real),
    debt: r(s.debt),
    net_worth: r(s.net),
    invest_value: r(s.invest.value),
    invest_cost: r(s.invest.cost),
    invest_realized: r(s.invest.realized),
    invest_accounts: s.investByAccount.map((a) => ({ ...a, value: r(a.value), cost: r(a.cost), realized: r(a.realized) })),
  }
}

/** 저장된 기록과 지금 값이 같으면 다시 저장하지 않는다 */
export function isSameSnapshot(saved: MonthlySnapshot | undefined, next: SnapshotValues) {
  if (!saved) return false
  const keys = ['financial', 'real_assets', 'debt', 'net_worth', 'invest_value', 'invest_cost', 'invest_realized'] as const
  if (keys.some((k) => Number(saved[k]) !== next[k])) return false
  return JSON.stringify(sortAccounts(saved.invest_accounts)) === JSON.stringify(sortAccounts(next.invest_accounts))
}

function sortAccounts(list: SnapshotAccount[]) {
  return [...list]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((a) => ({ id: a.id, name: a.name, included: a.included, value: Number(a.value), cost: Number(a.cost), realized: Number(a.realized) }))
}

/** month('YYYY-MM') 보다 앞선 기록 중 가장 최근 것 (지난달 기록이 없으면 그 전 기록) */
export function previousSnapshot(list: MonthlySnapshot[], month: string) {
  const start = monthStart(month)
  return list.filter((s) => s.month < start).reduce<MonthlySnapshot | undefined>((latest, s) => (!latest || s.month > latest.month ? s : latest), undefined)
}

/** month('YYYY-MM') 의 기록 */
export function snapshotOf(list: MonthlySnapshot[], month: string) {
  return list.find((s) => s.month === monthStart(month))
}

/**
 * 투자 증감을 '내 돈을 넣고 뺀 것'과 '투자 수익'으로 나눈다.
 *   수익   = 평가손익 변화(평가금액 - 원금) + 실현손익 변화
 *   순투입 = 평가금액 변화 - 수익 (= 원금 변화 - 실현손익 변화)
 * 예: 100에 산 주식을 110에 팔면 평가금액 -110, 원금 -100, 실현 +10 → 수익 0, 순투입 -110 (110을 빼 감)
 */
export function investChange(prev: InvestTotals, cur: InvestTotals) {
  const valueDiff = cur.value - prev.value
  const profit = valueDiff - (cur.cost - prev.cost) + (cur.realized - prev.realized)
  return { valueDiff, profit, netFlow: valueDiff - profit }
}

export type InvestPoint = InvestTotals & { month: string /* 'YYYY-MM' */ }

/**
 * 투자 월별 추이. accountId 가 없으면 합계('합계 포함' 계좌), 있으면 그 계좌만.
 * 이번 달은 저장된 기록 대신 지금 값(live)을 쓴다. 그 계좌가 없던 달은 건너뛴다.
 */
export function investSeries(
  snapshots: MonthlySnapshot[],
  live: { month: string; total: InvestTotals; accounts: SnapshotAccount[] },
  accountId: string | null,
): InvestPoint[] {
  const pick = (total: InvestTotals, accounts: SnapshotAccount[]) => (accountId ? accounts.find((a) => a.id === accountId) : total)
  const points: InvestPoint[] = []
  for (const s of snapshots) {
    const month = s.month.slice(0, 7)
    if (month >= live.month) continue
    const p = pick({ value: s.invest_value, cost: s.invest_cost, realized: s.invest_realized }, s.invest_accounts)
    if (p) points.push({ month, value: Number(p.value), cost: Number(p.cost), realized: Number(p.realized) })
  }
  const now = pick(live.total, live.accounts)
  if (now) points.push({ month: live.month, value: now.value, cost: now.cost, realized: now.realized })
  return points.sort((a, b) => a.month.localeCompare(b.month))
}

/** 증감률 (이전 값이 0 이면 계산할 수 없어 null) */
export function changeRate(prev: number, cur: number) {
  return prev === 0 ? null : (cur - prev) / Math.abs(prev)
}
