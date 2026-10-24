import { useState } from 'react'

export type SortValue = string | number | null | undefined
export type SortState = { key: string; dir: 'asc' | 'desc' } | null

/** 두 값 비교: 숫자는 크기, 글자는 가나다(숫자 섞인 글자도 자연스럽게) 순 */
function compare(a: string | number, b: string | number) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'ko', { numeric: true })
}

const isEmpty = (v: SortValue) => v === null || v === undefined || v === ''

/**
 * 표 머리글 클릭 정렬.
 * 같은 머리글을 누를 때마다 오름차순 → 내림차순 → 원래 순서.
 * 빈 값은 오름차순·내림차순 모두 맨 아래로 보낸다.
 *
 *   const { sorted, sort, toggle } = useSort(rows, (row, key) => row[key])
 */
export function useSort<T>(rows: T[], getValue: (row: T, key: string) => SortValue) {
  const [sort, setSort] = useState<SortState>(null)

  function toggle(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }

  let sorted = rows
  if (sort) {
    const sign = sort.dir === 'asc' ? 1 : -1
    sorted = [...rows].sort((x, y) => {
      const a = getValue(x, sort.key)
      const b = getValue(y, sort.key)
      if (isEmpty(a) || isEmpty(b)) return isEmpty(a) === isEmpty(b) ? 0 : isEmpty(a) ? 1 : -1
      return compare(a!, b!) * sign
    })
  }
  return { sorted, sort, toggle }
}
