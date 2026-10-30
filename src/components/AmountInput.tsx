import { useState, type KeyboardEvent, type Ref } from 'react'
import { evaluateAmount, hasOperator } from '../lib/calc'
import { formatNumber } from '../lib/format'

type Props = {
  value: number | null
  onChange: (value: number | null) => void
  className?: string
  placeholder?: string
  onBlur?: () => void
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  disabled?: boolean
  autoFocus?: boolean
  /** 바깥에서 포커스를 옮길 때 (예: 저장 후 금액 칸으로) */
  ref?: Ref<HTMLInputElement>
}

/** 원 단위 금액 최대 자릿수 (DB bigint 와 JS 숫자 정밀도 안쪽) */
const MAX_DIGITS = 15

/**
 * 입력하는 동안 '12,345' 처럼 쉼표를 찍어 보여주는 금액 입력칸. 값은 숫자로 다룬다.
 * '12000+3500', '45000/2' 처럼 계산식을 쓰면 계산한 값이 바로 들어가고, 칸을 벗어나면 결과만 보인다.
 */
export default function AmountInput({ value, onChange, className = '', placeholder = '0', onBlur, onKeyDown, disabled, autoFocus, ref }: Props) {
  // 계산식을 입력하는 중이면 그 글자 그대로. 바깥에서 값이 바뀌면(저장 후 비우기 등) 식은 버리고 값을 보여준다
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft !== null && evaluateAmount(draft) === value ? draft : value === null ? '' : formatNumber(value)

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      className={`input text-right tabular-nums ${className}`}
      placeholder={placeholder}
      title="12000+3500, 45000/2 처럼 계산식도 돼요"
      value={shown}
      onChange={(e) => {
        const text = e.target.value
        if (hasOperator(text)) {
          setDraft(text)
          onChange(evaluateAmount(text))
          return
        }
        setDraft(null)
        const digits = text.replace(/\D/g, '').slice(0, MAX_DIGITS) // 숫자가 아닌 글자는 모두 제거
        onChange(digits === '' ? null : Number(digits))
      }}
      onBlur={() => {
        setDraft(null)
        onBlur?.()
      }}
      onKeyDown={onKeyDown}
      disabled={disabled}
      autoFocus={autoFocus}
    />
  )
}
