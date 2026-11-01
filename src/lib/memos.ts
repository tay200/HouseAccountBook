import type { Memo } from './types'

/** 제목·내용에 찾는 글자가 있는지 (대소문자 무시) */
export function matchesMemo(m: Pick<Memo, 'title' | 'content'>, term: string) {
  const t = term.trim().toLowerCase()
  if (!t) return true
  return [m.title, m.content].some((v) => v.toLowerCase().includes(t))
}

/**
 * 고정한 글이 먼저, 그 안에서는 최근에 고친 순서.
 * 서버도 같은 순서로 주지만, 고정을 누르면 화면(캐시)만 먼저 바뀌므로 화면에서도 다시 정렬한다.
 */
export function sortMemos(memos: Memo[]) {
  return [...memos].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at))
}
