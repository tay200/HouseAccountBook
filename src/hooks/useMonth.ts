import { useSearchParams } from 'react-router'
import { currentMonth } from '../lib/format'

/**
 * 지금 보고 있는 달('YYYY-MM')을 주소의 ?month=2026-10 에 저장한다.
 * 주소에 들어 있으므로 다른 메뉴로 이동하거나 새로고침해도 같은 달이 유지된다.
 */
export function useMonth() {
  const [params, setParams] = useSearchParams()
  const month = params.get('month') ?? currentMonth()

  function setMonth(next: string) {
    setParams((prev) => {
      prev.set('month', next)
      return prev
    })
  }

  return [month, setMonth] as const
}
