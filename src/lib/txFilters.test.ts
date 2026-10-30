import { describe, expect, it } from 'vitest'
import { readTxFilters, removeTxFilters, transactionsLink } from './txFilters'

describe('transactionsLink', () => {
  it('?month 는 남기고 필터를 붙인다 (빈 값은 빼고)', () => {
    expect(transactionsLink('?month=2026-10', { type: 'expense', major: 'abc', payment: '' })).toEqual({
      pathname: '/transactions',
      search: '?month=2026-10&type=expense&major=abc',
    })
  })

  it('예전 필터는 지우고 새 필터로', () => {
    expect(transactionsLink('?month=2026-10&major=old', { member: 'shared' }).search).toBe('?month=2026-10&member=shared')
  })
})

describe('readTxFilters', () => {
  it('주소의 값을 읽고, 잘못된 구분·성격은 전체로', () => {
    expect(readTxFilters(new URLSearchParams('type=expense&kind=variable&payment=none'))).toEqual({
      type: 'expense', kind: 'variable', major: '', payment: 'none', member: '', tag: '',
    })
    expect(readTxFilters(new URLSearchParams('type=abc&kind=zzz'))).toMatchObject({ type: '', kind: '' })
  })
})

describe('removeTxFilters', () => {
  it('필터만 지운다', () => {
    expect(removeTxFilters(new URLSearchParams('month=2026-10&major=a&tag=b')).toString()).toBe('month=2026-10')
  })
})
