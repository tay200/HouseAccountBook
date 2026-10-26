import type { GiftEvent } from './types'

export type GiftPersonSummary = {
  counterpart: string
  /** 가장 최근 기록의 관계 */
  relation: string | null
  given: number
  givenCount: number
  received: number
  receivedCount: number
  /** 받은 돈 − 보낸 돈 (양수면 더 받음) */
  balance: number
  lastDate: string
}

/** 상대방별 보낸·받은 합계 (최근 기록 순). 이름 앞뒤 공백은 무시하고 같은 사람으로 본다 */
export function giftSummaryByPerson(events: GiftEvent[]): GiftPersonSummary[] {
  const byName = new Map<string, GiftPersonSummary>()
  // 날짜순으로 돌면 마지막에 본 관계가 가장 최근 관계가 된다
  for (const e of [...events].sort((a, b) => a.date.localeCompare(b.date))) {
    const name = e.counterpart.trim()
    const s = byName.get(name) ?? { counterpart: name, relation: null, given: 0, givenCount: 0, received: 0, receivedCount: 0, balance: 0, lastDate: e.date }
    if (e.direction === 'give') {
      s.given += e.amount
      s.givenCount += 1
    } else {
      s.received += e.amount
      s.receivedCount += 1
    }
    s.balance = s.received - s.given
    s.relation = e.relation || s.relation
    s.lastDate = e.date
    byName.set(name, s)
  }
  return [...byName.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate))
}

/** 상대방·관계·메모에 검색어가 들어 있는지 (대소문자 무시) */
export function matchesGift(e: GiftEvent, term: string) {
  const t = term.trim().toLowerCase()
  if (!t) return true
  return [e.counterpart, e.relation, e.memo].some((v) => v?.toLowerCase().includes(t))
}
