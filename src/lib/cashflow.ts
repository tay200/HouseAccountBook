import { isConsumption, isSaving } from './stats'
import type { Transaction } from './types'

/** Sankey 칸 종류 (색을 고르는 데 쓴다) */
export type FlowKind = 'income' | 'shortfall' | 'hub' | 'saving' | 'consumption' | 'left' | 'category'

export type FlowNode = { name: string; kind: FlowKind; /** 맨 오른쪽 열이면 이름표를 칸 왼쪽에 */ last: boolean }
export type FlowLink = { source: number; target: number; value: number }

/**
 * 현금흐름 Sankey 데이터: 수입 대분류 → 들어온 돈 → 저축성 / 소비성 / 남은 돈 → 소비성 대분류
 * 지출이 수입보다 많으면 '모아 둔 돈'을 들어온 돈 쪽에 더한다.
 * 소비성 대분류가 maxCategories 개보다 많으면 작은 것들을 '기타'로 묶는다. 기록이 없으면 null.
 */
export function buildCashFlow(
  transactions: Transaction[],
  majorOf: (categoryId: string | null) => { name: string } | undefined,
  maxCategories = 6,
): { nodes: FlowNode[]; links: FlowLink[] } | null {
  const sumBy = (predicate: (t: Transaction) => boolean) => {
    const totals = new Map<string, number>()
    for (const t of transactions) {
      if (!predicate(t)) continue
      const name = majorOf(t.category_id)?.name ?? '미분류'
      totals.set(name, (totals.get(name) ?? 0) + t.amount)
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1])
  }
  const incomes = sumBy((t) => t.type === 'income')
  const categories = sumBy(isConsumption)
  const income = incomes.reduce((s, [, v]) => s + v, 0)
  const consumption = categories.reduce((s, [, v]) => s + v, 0)
  const saving = transactions.filter(isSaving).reduce((s, t) => s + t.amount, 0)
  if (income === 0 && consumption + saving === 0) return null

  const nodes: FlowNode[] = []
  const links: FlowLink[] = []
  const add = (name: string, kind: FlowKind, last = false) => nodes.push({ name, kind, last }) - 1
  const link = (source: number, target: number, value: number) => value > 0 && links.push({ source, target, value })

  // 왼쪽: 수입원 (+ 모자란 돈)
  const sources = incomes.map(([name, value]) => [add(name, 'income'), value] as const)
  const shortfall = consumption + saving - income
  const shortfallNode = shortfall > 0 ? add('모아 둔 돈', 'shortfall') : -1
  const hub = add('들어온 돈', 'hub')
  for (const [node, value] of sources) link(node, hub, value)
  if (shortfallNode >= 0) link(shortfallNode, hub, shortfall)

  // 가운데: 어디로 갔나
  const hasCategories = consumption > 0
  if (saving > 0) link(hub, add('저축성', 'saving', true), saving)
  if (hasCategories) {
    const consumptionNode = add('소비성', 'consumption')
    link(hub, consumptionNode, consumption)
    // 오른쪽: 소비성 대분류 (많으면 작은 것들을 '기타'로)
    const shown = categories.length > maxCategories ? categories.slice(0, maxCategories - 1) : categories
    const rest = categories.slice(shown.length).reduce((s, [, v]) => s + v, 0)
    for (const [name, value] of shown) link(consumptionNode, add(name, 'category', true), value)
    if (rest > 0) link(consumptionNode, add('기타', 'category', true), rest)
  }
  if (income - consumption - saving > 0) link(hub, add('남은 돈', 'left', true), income - consumption - saving)
  return { nodes, links }
}
