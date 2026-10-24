import type { KeyboardEvent } from 'react'
import { formatNumber } from '../lib/format'

type Props = {
  value: number | null
  onChange: (value: number | null) => void
  className?: string
  placeholder?: string
  onBlur?: () => void
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  disabled?: boolean
}

/** 입력하는 동안 '12,345' 처럼 쉼표를 찍어 보여주는 금액 입력칸. 값은 숫자로 다룬다. */
export default function AmountInput({ value, onChange, className = '', placeholder = '0', onBlur, onKeyDown, disabled }: Props) {
  return (
    <input
      type="text"
      inputMode="numeric"
      className={`input text-right tabular-nums ${className}`}
      placeholder={placeholder}
      value={value === null ? '' : formatNumber(value)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '') // 숫자가 아닌 글자는 모두 제거
        onChange(digits === '' ? null : Number(digits))
      }}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      disabled={disabled}
    />
  )
}
