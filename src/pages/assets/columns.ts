// 자산 탭들이 같이 쓰는 열 정의·값
import type { Column } from '../../components/CrudTable'
import { useLookups } from '../../hooks/useLookups'
import { TERM_LABEL } from '../../lib/types'

/** '사람' 열 (비우면 공동) */
export function useMemberColumn<T extends { member_id: string | null }>(): Column<T> {
  const { members, memberName } = useLookups()
  return {
    key: 'member_id',
    label: '사람',
    input: { type: 'select', options: members.map((m) => ({ value: m.id, label: m.name })), emptyLabel: '공동' },
    render: (row) => memberName(row.member_id),
  }
}

export const TERM_OPTIONS = (['long', 'mid', 'short'] as const).map((t) => ({ value: t, label: TERM_LABEL[t] }))
export const pct = (v: number) => `${v}%`
