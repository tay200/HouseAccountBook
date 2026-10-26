import { formatNumber } from '../lib/format'
import type { Transaction } from '../lib/types'

/** 'YYYY-MM-DD' → '3/14' */
function shortDate(date: string) {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`
}

/**
 * 연간 리포트 '태그별': 태그마다 기간(첫 거래 ~ 마지막 거래), 건수, 지출·수입 합계.
 * 거래 하나에 태그가 여러 개면 각 태그에 모두 들어가므로 합계를 더하면 총지출보다 클 수 있다.
 */
export default function TagTable({ transactions }: { transactions: Transaction[] }) {
  const byTag = new Map<string, { first: string; last: string; count: number; expense: number; income: number }>()
  for (const t of transactions) {
    for (const tag of t.tags) {
      const row = byTag.get(tag) ?? { first: t.date, last: t.date, count: 0, expense: 0, income: 0 }
      if (t.date < row.first) row.first = t.date
      if (t.date > row.last) row.last = t.date
      row.count += 1
      if (t.type === 'expense') row.expense += t.amount
      else row.income += t.amount
      byTag.set(tag, row)
    }
  }
  const rows = [...byTag.entries()].sort((a, b) => b[1].expense - a[1].expense)

  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">태그를 붙인 거래가 없어요. 거래를 입력할 때 #제주여행 처럼 태그를 붙여 보세요.</p>
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead className="border-b border-slate-200 text-xs whitespace-nowrap text-slate-500">
            <tr>
              <th className="py-2 pr-3 text-left font-medium">태그</th>
              <th className="py-2 pr-3 text-left font-medium">기간</th>
              <th className="py-2 pr-3 text-right font-medium">건수</th>
              <th className="py-2 pr-3 text-right font-medium">지출</th>
              <th className="py-2 text-right font-medium">수입</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(([tag, r]) => (
              <tr key={tag} className="hover:bg-slate-50">
                <td className="py-2 pr-3 whitespace-nowrap text-violet-700">#{tag}</td>
                <td className="py-2 pr-3 whitespace-nowrap text-slate-600">
                  {r.first === r.last ? shortDate(r.first) : `${shortDate(r.first)} ~ ${shortDate(r.last)}`}
                </td>
                <td className="py-2 pr-3 text-right">{r.count}</td>
                <td className="py-2 pr-3 text-right font-medium">{r.expense ? formatNumber(r.expense) : '-'}</td>
                <td className="py-2 text-right text-blue-600">{r.income ? formatNumber(r.income) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">태그가 여러 개인 거래는 각 태그에 모두 들어가요.</p>
    </div>
  )
}
