// 투자 화면 표시용 함수
import { formatUsd, formatWon } from '../../lib/format'
import type { Market } from '../../lib/types'

/** 해당 통화로 금액 표시 (KR=원, US=달러) */
export function formatLocal(value: number, market: Market) {
  return market === 'US' ? formatUsd(value) : formatWon(value)
}

export const marketLabel = (market: Market) => (market === 'US' ? '미국' : '한국')
