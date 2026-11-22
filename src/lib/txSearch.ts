import type { Transaction } from './types'

/**
 * 거래 내역 검색칸에 넣은 검색어.
 * '#유럽여행' 처럼 # 으로 시작하면 태그 검색(이름이 정확히 같은 태그), 아니면 내용·금액 검색.
 */
export type TxSearch = { kind: 'tag'; tag: string } | { kind: 'text'; text: string }

/** 검색어를 읽는다. 비어 있거나 '#' 만 있으면 null (검색 안 함) */
export function parseSearch(term: string): TxSearch | null {
  const trimmed = term.trim()
  if (trimmed.startsWith('#')) {
    const tag = trimmed.replace(/^#+/, '').trim()
    return tag ? { kind: 'tag', tag } : null
  }
  return trimmed ? { kind: 'text', text: trimmed } : null
}

/** 검색과 맞는 거래: 태그 검색이면 그 태그가 붙은 것, 내용 검색이면 내용에 들어 있거나(대소문자 무시) 숫자면 금액이 같은 것 */
export function matchesSearch(t: Transaction, search: TxSearch | null) {
  if (!search) return true
  if (search.kind === 'tag') return t.tags.includes(search.tag)
  if ((t.memo ?? '').toLowerCase().includes(search.text.toLowerCase())) return true
  const digits = search.text.replace(/,/g, '')
  return /^\d+$/.test(digits) && t.amount === Number(digits)
}

/** 안내 문구에 보여줄 검색어 ('#유럽여행' 또는 '스타벅스') */
export function searchLabel(search: TxSearch) {
  return search.kind === 'tag' ? `#${search.tag}` : search.text
}
