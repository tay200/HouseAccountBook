// 표 데이터를 CSV(엑셀에서 열 수 있는 쉼표 구분 텍스트)로 바꾼다

/** 파일 맨 앞에 붙이는 BOM 문자 (U+FEFF). 엑셀이 한글을 UTF-8 로 읽게 한다 */
export const BOM = String.fromCharCode(0xfeff)

/** 값 하나를 CSV 칸으로: 쉼표·따옴표·줄바꿈이 있으면 따옴표로 감싸고 안의 따옴표는 두 번 쓴다 */
function cell(value: unknown) {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * 객체 목록 → CSV 문자열. 첫 줄은 열 이름.
 * 맨 앞의 BOM 문자(U+FEFF)는 엑셀이 한글을 UTF-8 로 제대로 읽게 하는 표시.
 */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]) {
  const cols = columns ?? [...new Set(rows.flatMap((r) => Object.keys(r)))]
  const lines = [cols.map(cell).join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))]
  return BOM + lines.join('\r\n')
}
