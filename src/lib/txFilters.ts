import type { TxKind, TxType } from './types'

/**
 * 거래 내역 화면의 필터. 다른 화면에서 숫자를 누르면 이 값을 주소(?major=...)에 담아 거래 내역으로 보낸다.
 * kind: 성격 또는 'consumption'(소비성 = 저축성이 아닌 지출)
 * major: 대분류 id 또는 'none'(미분류), payment: 결제수단 id 또는 'none', member: 사람 id 또는 'shared'(공동)
 */
export type KindFilter = TxKind | 'consumption' | ''

export type TxFilters = {
  type: TxType | ''
  kind: KindFilter
  major: string
  payment: string
  member: string
  tag: string
}

const KEYS = ['type', 'kind', 'major', 'payment', 'member', 'tag'] as const
const TYPES: readonly string[] = ['income', 'expense']
const KINDS: readonly string[] = ['fixed', 'variable', 'saving', 'extra', 'consumption']

/** 주소의 필터 값. 없거나 잘못된 값은 '' (전체) */
export function readTxFilters(params: URLSearchParams): TxFilters {
  const get = (key: (typeof KEYS)[number]) => params.get(key) ?? ''
  const type = get('type')
  const kind = get('kind')
  return {
    type: TYPES.includes(type) ? (type as TxType) : '',
    kind: KINDS.includes(kind) ? (kind as KindFilter) : '',
    major: get('major'),
    payment: get('payment'),
    member: get('member'),
    tag: get('tag'),
  }
}

/** 주소에 필터 값이 하나라도 있는지 */
export function hasTxFilters(params: URLSearchParams) {
  return KEYS.some((key) => params.has(key))
}

/** 주소에서 필터 값만 지운다 (?month=... 는 남긴다) */
export function removeTxFilters(params: URLSearchParams) {
  for (const key of KEYS) params.delete(key)
  return params
}

/** 지금 주소(?month=...)를 유지한 채 필터를 건 거래 내역으로 가는 링크 */
export function transactionsLink(search: string, filters: Partial<TxFilters>) {
  const params = removeTxFilters(new URLSearchParams(search))
  for (const key of KEYS) {
    const value = filters[key]
    if (value) params.set(key, value)
  }
  return { pathname: '/transactions', search: `?${params}` }
}
