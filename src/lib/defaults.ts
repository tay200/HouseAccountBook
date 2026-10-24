import type { CategoryInput, PaymentMethodInput } from './types'

// 처음 시작할 때 한 번에 넣어줄 기본 카테고리
// 색은 색각이상자도 구분하기 쉽게 검증된 순서의 8색을 쓰고, 나머지는 회색으로 둔다.
const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']
const GRAY = '#94a3b8'

const EXPENSE_NAMES = ['식비', '카페/간식', '교통', '주거/통신', '생활용품', '쇼핑', '문화/여가', '의료/건강', '경조사/선물', '기타']
const INCOME_NAMES = ['월급', '부수입', '용돈', '금융수입', '기타']

export const DEFAULT_CATEGORIES: CategoryInput[] = [
  ...EXPENSE_NAMES.map((name, i) => ({ name, type: 'expense' as const, color: PALETTE[i] ?? GRAY })),
  ...INCOME_NAMES.map((name, i) => ({ name, type: 'income' as const, color: PALETTE[i] ?? GRAY })),
]

export const DEFAULT_PAYMENT_METHODS: PaymentMethodInput[] = [{ name: '현금', kind: 'cash' }]

export const NEW_CATEGORY_COLOR = GRAY
