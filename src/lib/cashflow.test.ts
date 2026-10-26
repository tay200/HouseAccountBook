import { describe, expect, it } from 'vitest'
import { buildCashFlow } from './cashflow'
import type { Transaction } from './types'

const tx = (fields: Partial<Transaction>): Transaction => ({
  id: 'x', date: '2026-10-01', type: 'expense', kind: 'variable', amount: 0, discount: 0, category_id: null,
  payment_method_id: null, member_id: null, memo: null, recurring_id: null, tags: [], ...fields,
})
const names: Record<string, string> = { sal: '급여', food: '식비', car: '교통', fun: '여가', saving: '저축' }
const majorOf = (id: string | null) => (id ? { name: names[id] } : undefined)
/** 링크를 '출발 → 도착: 금액' 글자로 */
const describeLinks = (flow: ReturnType<typeof buildCashFlow>) =>
  flow!.links.map((l) => `${flow!.nodes[l.source].name}→${flow!.nodes[l.target].name}:${l.value}`)

describe('buildCashFlow', () => {
  it('수입 → 들어온 돈 → 저축성·소비성·남은 돈 → 대분류', () => {
    const flow = buildCashFlow(
      [
        tx({ type: 'income', kind: 'fixed', category_id: 'sal', amount: 3_000_000 }),
        tx({ kind: 'saving', category_id: 'saving', amount: 1_000_000 }),
        tx({ category_id: 'food', amount: 500_000 }),
        tx({ category_id: 'car', amount: 200_000 }),
      ],
      majorOf,
    )
    expect(describeLinks(flow)).toEqual([
      '급여→들어온 돈:3000000',
      '들어온 돈→저축성:1000000',
      '들어온 돈→소비성:700000',
      '소비성→식비:500000',
      '소비성→교통:200000',
      '들어온 돈→남은 돈:1300000',
    ])
  })
  it('지출이 더 많으면 모아 둔 돈을 더한다', () => {
    const flow = buildCashFlow([tx({ type: 'income', kind: 'extra', category_id: 'sal', amount: 100 }), tx({ category_id: 'food', amount: 300 })], majorOf)
    expect(describeLinks(flow)).toContain('모아 둔 돈→들어온 돈:200')
    expect(flow!.nodes.some((n) => n.name === '남은 돈')).toBe(false)
  })
  it('대분류가 많으면 작은 것을 기타로', () => {
    const flow = buildCashFlow(
      [tx({ category_id: 'food', amount: 300 }), tx({ category_id: 'car', amount: 200 }), tx({ category_id: 'fun', amount: 100 }), tx({ amount: 50 })],
      majorOf,
      3,
    )
    expect(describeLinks(flow)).toEqual(['모아 둔 돈→들어온 돈:650', '들어온 돈→소비성:650', '소비성→식비:300', '소비성→교통:200', '소비성→기타:150'])
  })
  it('기록이 없으면 null', () => {
    expect(buildCashFlow([], majorOf)).toBeNull()
  })
})
