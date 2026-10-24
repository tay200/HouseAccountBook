// DB(Postgres) 오류를 사용자가 알아볼 수 있는 한국어 문구로 바꾼다.
// 오류 코드 목록: https://www.postgresql.org/docs/current/errcodes-appendix.html

const MESSAGES: Record<string, string> = {
  '23505': '이미 같은 항목이 있어요. (이름·연도 등이 겹치지 않는지 확인해 주세요)',
  '23503': '다른 기록과 연결돼 있어서 처리할 수 없어요.',
  '23502': '꼭 넣어야 하는 칸이 비어 있어요.',
  '23514': '입력한 값이 허용 범위를 벗어났어요.',
  '22003': '숫자가 너무 커요.',
  '22P02': '입력 형식이 올바르지 않아요.',
  '42501': '이 작업을 할 권한이 없어요. 다시 로그인해 보세요.',
}

export function toUserMessage(error: unknown): string {
  const e = error as { code?: string; message?: string } | null
  if (e?.code && MESSAGES[e.code]) return MESSAGES[e.code]
  if (e?.message === 'Failed to fetch') return '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.'
  // 우리 코드에서 직접 만든 한국어 오류는 그대로, 그 밖에는 원문을 덧붙인다
  return e?.message ?? '알 수 없는 오류가 났어요.'
}
