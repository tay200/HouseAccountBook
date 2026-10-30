/** 금액 칸에서 계산식으로 볼 글자 (곱하기·나누기는 ×÷ 도 받는다) */
const OPERATOR = /[+\-*/×÷]/

/** 입력한 글자에 계산 기호가 들어 있는지 (있으면 계산식으로 다룬다) */
export function hasOperator(text: string) {
  return OPERATOR.test(text)
}

/**
 * '12,000+3500', '45000/2' 같은 사칙연산 식을 계산한다. 곱하기·나누기를 먼저 한다.
 * 입력하는 중이라 끝에 붙은 기호('12000+')는 무시한다. 결과는 원 단위로 반올림.
 * 식이 아니거나, 0으로 나누거나, 결과가 음수·너무 큰 수면 null.
 */
export function evaluateAmount(text: string): number | null {
  const normalized = text
    .replace(/[,\s]/g, '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[+\-*/]+$/, '')
  const tokens = normalized.match(/\d+(?:\.\d+)?|[+\-*/]/g)
  // 숫자·기호가 번갈아 나와야 하고, 모르는 글자가 섞이면(합친 결과가 원래와 다르면) 식이 아니다
  if (!tokens || tokens.join('') !== normalized || tokens.length % 2 === 0) return null
  if (tokens.some((token, i) => (i % 2 === 0) !== /\d/.test(token))) return null

  // 더하기·빼기로 나뉜 항을 모은다. 곱하기·나누기는 지금 항에 바로 계산
  const terms: number[] = []
  let current = Number(tokens[0])
  for (let i = 1; i < tokens.length; i += 2) {
    const n = Number(tokens[i + 1])
    const op = tokens[i]
    if (op === '*') current *= n
    else if (op === '/') current /= n
    else {
      terms.push(current)
      current = op === '-' ? -n : n
    }
  }
  terms.push(current)
  const result = Math.round(terms.reduce((sum, v) => sum + v, 0))
  return Number.isSafeInteger(result) && result >= 0 ? result : null
}
