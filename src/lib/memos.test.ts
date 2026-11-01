import { describe, expect, it } from 'vitest'
import { matchesMemo, sortMemos } from './memos'
import type { Memo } from './types'

const memo = (fields: Partial<Memo>): Memo => ({
  id: 'm', title: '고정비', content: '', pinned: false, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', ...fields,
})

describe('matchesMemo', () => {
  it('제목·내용에서 찾는다', () => {
    const m = memo({ title: '용돈 입금', content: '국민은행 123-45' })
    expect(matchesMemo(m, '용돈')).toBe(true)
    expect(matchesMemo(m, '국민')).toBe(true)
    expect(matchesMemo(m, '신한')).toBe(false)
  })
  it('빈 검색어는 모두 보여주고, 영문은 대소문자를 가리지 않는다', () => {
    expect(matchesMemo(memo({}), '  ')).toBe(true)
    expect(matchesMemo(memo({ content: 'Netflix 17,000' }), 'netflix')).toBe(true)
  })
})

describe('sortMemos', () => {
  it('고정한 글이 먼저, 그 안에서는 최근에 고친 순서', () => {
    const rows = sortMemos([
      memo({ id: 'old', updated_at: '2026-01-01T00:00:00Z' }),
      memo({ id: 'pinOld', pinned: true, updated_at: '2026-01-02T00:00:00Z' }),
      memo({ id: 'new', updated_at: '2026-03-01T00:00:00Z' }),
      memo({ id: 'pinNew', pinned: true, updated_at: '2026-02-01T00:00:00Z' }),
    ])
    expect(rows.map((r) => r.id)).toEqual(['pinNew', 'pinOld', 'new', 'old'])
  })
})
