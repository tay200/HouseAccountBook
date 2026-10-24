// 입력 폼에서 숫자 칸은 입력하는 동안 문자열로 다루고 저장할 때 숫자로 바꾼다

/** 입력칸 문자열 → 숫자 (비어 있으면 null) */
export function toNumber(value: string): number | null {
  return value.trim() === '' ? null : Number(value)
}

/** 숫자 → 입력칸 문자열 */
export const toText = (value: number | string | null | undefined) => (value === null || value === undefined ? '' : String(value))
