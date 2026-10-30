import { describe, expect, it } from 'vitest'
import { evaluateAmount, hasOperator } from './calc'

describe('evaluateAmount', () => {
  it('더하기·빼기·곱하기·나누기 (곱하기·나누기 먼저)', () => {
    expect(evaluateAmount('12000+3500')).toBe(15500)
    expect(evaluateAmount('20000-1500')).toBe(18500)
    expect(evaluateAmount('3000*4')).toBe(12000)
    expect(evaluateAmount('10000+3000*2')).toBe(16000)
    expect(evaluateAmount('45000÷2')).toBe(22500)
    expect(evaluateAmount('5000×3')).toBe(15000)
  })

  it('쉼표·공백은 무시하고, 나누기 결과는 원 단위로 반올림', () => {
    expect(evaluateAmount('12,000 + 3,500')).toBe(15500)
    expect(evaluateAmount('10000/3')).toBe(3333)
    expect(evaluateAmount('1.5*1000')).toBe(1500)
  })

  it('입력 중이라 끝에 붙은 기호는 무시', () => {
    expect(evaluateAmount('12000+')).toBe(12000)
    expect(evaluateAmount('12000*')).toBe(12000)
  })

  it('식이 아니거나 결과가 이상하면 null', () => {
    expect(evaluateAmount('')).toBeNull()
    expect(evaluateAmount('-')).toBeNull()
    expect(evaluateAmount('+3000')).toBeNull()
    expect(evaluateAmount('12000++3')).toBeNull()
    expect(evaluateAmount('1..2+3')).toBeNull()
    expect(evaluateAmount('3000+abc')).toBeNull()
    expect(evaluateAmount('1000/0')).toBeNull()
    expect(evaluateAmount('1000-5000')).toBeNull()
    expect(evaluateAmount('999999999999999*99')).toBeNull()
  })
})

describe('hasOperator', () => {
  it('계산 기호가 있으면 true', () => {
    expect(hasOperator('12,000')).toBe(false)
    expect(hasOperator('12000+')).toBe(true)
    expect(hasOperator('45000÷2')).toBe(true)
  })
})
