import { describe, expect, it } from 'vitest'
import { giftSummaryByPerson, matchesGift } from './gifts'
import type { GiftEvent } from './types'

const gift = (fields: Partial<GiftEvent>): GiftEvent => ({
  id: 'g', date: '2026-01-01', counterpart: '김철수', relation: null, event_type: 'wedding', direction: 'give',
  amount: 100_000, member_id: null, transaction_id: null, memo: null, ...fields,
})

describe('giftSummaryByPerson', () => {
  const rows = giftSummaryByPerson([
    gift({ date: '2025-05-01', amount: 100_000, relation: '친구' }),
    gift({ date: '2026-03-01', counterpart: ' 김철수 ', direction: 'receive', amount: 50_000, relation: '대학 친구' }),
    gift({ date: '2026-02-01', counterpart: '이영희', amount: 50_000 }),
  ])

  it('상대방별로 보낸·받은 돈을 합치고 최근 기록 순', () => {
    expect(rows.map((r) => r.counterpart)).toEqual(['김철수', '이영희'])
    expect(rows[0]).toMatchObject({ given: 100_000, givenCount: 1, received: 50_000, receivedCount: 1, balance: -50_000, lastDate: '2026-03-01' })
  })
  it('관계는 가장 최근 기록 것', () => {
    expect(rows[0].relation).toBe('대학 친구')
  })
})

describe('matchesGift', () => {
  it('상대방·관계·메모에서 찾는다', () => {
    const e = gift({ relation: '직장', memo: '팀장님 결혼' })
    expect(matchesGift(e, '철수')).toBe(true)
    expect(matchesGift(e, '직장')).toBe(true)
    expect(matchesGift(e, '팀장')).toBe(true)
    expect(matchesGift(e, '영희')).toBe(false)
    expect(matchesGift(e, ' ')).toBe(true)
  })
})
