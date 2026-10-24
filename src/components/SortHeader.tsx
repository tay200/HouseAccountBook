import type { ReactNode } from 'react'
import type { SortState } from '../hooks/useSort'

type Props = {
  label: ReactNode
  sortKey: string
  sort: SortState
  onToggle: (key: string) => void
  align?: 'left' | 'right'
  className?: string
  width?: string
}

/** 클릭하면 그 열로 정렬하는 표 머리글. 지금 정렬 중이면 ▲(오름) / ▼(내림) 표시 */
export default function SortHeader({ label, sortKey, sort, onToggle, align, className = '', width }: Props) {
  const active = sort?.key === sortKey
  const right = align === 'right'
  // 오른쪽 정렬 열은 화살표를 왼쪽에 둬서 머리글 글자 끝이 숫자 끝과 맞게 한다
  const arrow = <span className="inline-block w-3 text-center text-[10px]">{active ? (sort!.dir === 'asc' ? '▲' : '▼') : ''}</span>
  return (
    <th
      className={`py-2 font-medium whitespace-nowrap ${right ? 'text-right' : 'text-left'} ${className}`}
      style={{ width }}
      aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      <button type="button" className={`cursor-pointer hover:text-slate-800 ${active ? 'text-slate-800' : ''}`} onClick={() => onToggle(sortKey)}>
        {right && arrow}
        {label}
        {!right && arrow}
      </button>
    </th>
  )
}
