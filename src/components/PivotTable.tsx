import { formatNumber } from '../lib/format'
import type { Transaction } from '../lib/types'

type Props = {
  transactions: Transaction[]
  /** 이 표에 포함할 거래 */
  filter: (t: Transaction) => boolean
  /** 행을 나누는 기준 (예: 대분류 id) */
  rowKey: (t: Transaction) => string
  rowLabel: (key: string) => string
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

/** 행 = 항목, 열 = 1~12월 인 연간 집계표 (엑셀 '연간_항목별지출' 등) */
export default function PivotTable({ transactions, filter, rowKey, rowLabel }: Props) {
  // key → [1월 합계, 2월 합계, …, 12월 합계]
  const table = new Map<string, number[]>()
  for (const t of transactions) {
    if (!filter(t)) continue
    const key = rowKey(t)
    const row = table.get(key) ?? Array<number>(12).fill(0)
    row[Number(t.date.slice(5, 7)) - 1] += t.amount
    table.set(key, row)
  }
  const rows = [...table.entries()]
    .map(([key, values]) => ({ key, label: rowLabel(key), values, total: values.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total)
  const monthTotals = MONTHS.map((_, i) => rows.reduce((sum, r) => sum + r.values[i], 0))
  const grandTotal = monthTotals.reduce((a, b) => a + b, 0)

  if (rows.length === 0) return <p className="py-6 text-center text-sm text-slate-400">데이터가 없어요.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs tabular-nums">
        <thead className="border-b border-slate-200 text-slate-500">
          <tr>
            <th className="sticky left-0 bg-white py-2 pr-3 text-left font-medium">항목</th>
            {MONTHS.map((m) => (
              <th key={m} className="px-2 py-2 text-right font-medium">{m}월</th>
            ))}
            <th className="px-2 py-2 text-right font-semibold text-slate-700">계</th>
            <th className="py-2 pl-2 text-right font-medium">비율</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.key} className="hover:bg-slate-50">
              <td className="sticky left-0 bg-white py-2 pr-3 whitespace-nowrap">{r.label}</td>
              {r.values.map((v, i) => (
                <td key={i} className={`px-2 py-2 text-right ${v === 0 ? 'text-slate-300' : ''}`}>{v === 0 ? '-' : formatNumber(v)}</td>
              ))}
              <td className="px-2 py-2 text-right font-semibold">{formatNumber(r.total)}</td>
              <td className="py-2 pl-2 text-right text-slate-500">{Math.round((r.total / grandTotal) * 100)}%</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-slate-300 font-semibold">
          <tr>
            <td className="sticky left-0 bg-white py-2 pr-3">합계</td>
            {monthTotals.map((v, i) => (
              <td key={i} className="px-2 py-2 text-right">{v === 0 ? '-' : formatNumber(v)}</td>
            ))}
            <td className="px-2 py-2 text-right">{formatNumber(grandTotal)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
