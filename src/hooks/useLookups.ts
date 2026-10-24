import { useCategories } from '../api/categories'
import { usePaymentMethods } from '../api/paymentMethods'
import { membersApi } from '../api/tables'
import type { Category } from '../lib/types'

/**
 * 카테고리·결제수단·사람 목록과, id 로 이름을 찾는 도우미 함수들을 한 번에 제공한다.
 * 거래를 보여주는 화면마다 같은 코드를 반복하지 않으려고 만든 훅.
 */
export function useLookups() {
  const { data: categories = [], isSuccess: categoriesLoaded } = useCategories()
  const { data: paymentMethods = [] } = usePaymentMethods()
  const { data: members = [] } = membersApi.useList()

  const categoryById = new Map(categories.map((c) => [c.id, c]))
  const paymentById = new Map(paymentMethods.map((p) => [p.id, p]))
  const memberById = new Map(members.map((m) => [m.id, m]))

  /** 소분류면 부모 대분류를, 대분류면 자기 자신을 돌려준다 */
  function majorOf(categoryId: string | null): Category | undefined {
    const c = categoryId ? categoryById.get(categoryId) : undefined
    if (!c) return undefined
    return c.parent_id ? categoryById.get(c.parent_id) : c
  }

  /** '식비 › 시장/마트' 형태의 이름 */
  function categoryLabel(categoryId: string | null) {
    const c = categoryId ? categoryById.get(categoryId) : undefined
    if (!c) return '미분류'
    const parent = c.parent_id ? categoryById.get(c.parent_id) : undefined
    return parent ? `${parent.name} › ${c.name}` : c.name
  }

  function memberName(memberId: string | null) {
    return memberId ? (memberById.get(memberId)?.name ?? '') : '공동'
  }

  function paymentName(paymentId: string | null) {
    return paymentId ? (paymentById.get(paymentId)?.name ?? '') : ''
  }

  return {
    categories,
    categoriesLoaded,
    majorCategories: categories.filter((c) => !c.parent_id),
    paymentMethods,
    members,
    categoryById,
    majorOf,
    categoryLabel,
    memberName,
    paymentName,
  }
}
