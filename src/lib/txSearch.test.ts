import { describe, expect, it } from 'vitest'
import { matchesSearch, parseSearch } from './txSearch'
import type { Transaction } from './types'

const tx = (fields: Partial<Transaction>): Transaction => ({
  id: '1', date: '2026-11-01', type: 'expense', kind: 'variable', amount: 10000, discount: 0,
  category_id: null, payment_method_id: null, member_id: null, memo: null, recurring_id: null, tags: [], ...fields,
})

describe('parseSearch', () => {
  it('# 으로 시작하면 태그 검색', () => {
    expect(parseSearch('  #유럽여행 ')).toEqual({ kind: 'tag', tag: '유럽여행' })
    expect(parseSearch('##유럽여행')).toEqual({ kind: 'tag', tag: '유럽여행' })
  })

  it('그 밖에는 내용·금액 검색', () => {
    expect(parseSearch(' 스타벅스 ')).toEqual({ kind: 'text', text: '스타벅스' })
  })

  it('비어 있거나 # 만 있으면 검색 안 함', () => {
    expect(parseSearch('  ')).toBeNull()
    expect(parseSearch('#')).toBeNull()
    expect(parseSearch('# ')).toBeNull()
  })
})

describe('matchesSearch', () => {
  it('태그 검색은 이름이 같은 태그가 붙은 거래만 (내용은 보지 않는다)', () => {
    const search = parseSearch('#유럽여행')
    expect(matchesSearch(tx({ tags: ['유럽여행', '가족'] }), search)).toBe(true)
    expect(matchesSearch(tx({ tags: ['유럽'] }), search)).toBe(false)
    expect(matchesSearch(tx({ memo: '#유럽여행 숙소' }), search)).toBe(false)
  })

  it('내용 검색은 대소문자를 무시하고, 숫자면 금액도 본다', () => {
    expect(matchesSearch(tx({ memo: 'Starbucks 강남' }), parseSearch('starbucks'))).toBe(true)
    expect(matchesSearch(tx({ amount: 12000 }), parseSearch('12,000'))).toBe(true)
    expect(matchesSearch(tx({ amount: 12000 }), parseSearch('13000'))).toBe(false)
  })

  it('검색어가 없으면 모두', () => {
    expect(matchesSearch(tx({}), null)).toBe(true)
  })
})
