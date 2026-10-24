import { loansApi } from '../../api/tables'
import CrudTable, { type Column } from '../../components/CrudTable'
import { calcLoan } from '../../lib/finance'
import { formatWon, todayString } from '../../lib/format'
import { LOAN_METHOD_LABEL, type Loan } from '../../lib/types'
import { pct } from './columns'
import { TabCard, TotalLine } from './parts'

export default function LoansTab() {
  const { data = [] } = loansApi.useList()
  const save = loansApi.useSave()
  const remove = loansApi.useDelete()
  const columns: Column<Loan>[] = [
    { key: 'lender', label: '기관', input: { type: 'text' } },
    { key: 'name', label: '대출명', input: { type: 'text' }, required: true },
    { key: 'start_date', label: '대출일', input: { type: 'date' }, required: true },
    { key: 'maturity_date', label: '만기일', input: { type: 'date' }, required: true },
    { key: 'principal', label: '대출금액', input: { type: 'money' }, required: true, align: 'right' },
    { key: 'rate', label: '금리(%)', input: { type: 'number' }, required: true, align: 'right', render: (l) => pct(l.rate) },
    {
      key: 'method',
      label: '상환방식',
      input: { type: 'select', options: Object.entries(LOAN_METHOD_LABEL).map(([value, label]) => ({ value, label })) },
      required: true,
    },
    {
      key: 'monthly',
      label: '다음 상환',
      align: 'right',
      render: (l) => {
        const c = calcLoan(l)
        if (!c.nextDate) return <span className="text-slate-400">상환 끝</span>
        return (
          <>
            {formatWon(c.nextPayment)}
            <div className="text-xs text-slate-400">{c.nextDate}</div>
          </>
        )
      },
      sortValue: (l) => calcLoan(l).nextPayment,
    },
    { key: 'interest', label: '총 이자', align: 'right', render: (l) => formatWon(calcLoan(l).totalInterest), sortValue: (l) => calcLoan(l).totalInterest },
    { key: 'paid', label: '누적상환', align: 'right', render: (l) => formatWon(calcLoan(l).paid), sortValue: (l) => calcLoan(l).paid },
    { key: 'balance', label: '대출잔금', align: 'right', render: (l) => formatWon(calcLoan(l).balance), sortValue: (l) => calcLoan(l).balance },
  ]
  return (
    <TabCard note="'상세'를 누르면 월별 상환 스케줄을 볼 수 있어요.">
      <CrudTable
        rows={data}
        columns={columns}
        defaults={{ method: 'equal_payment', start_date: todayString() }}
        onSave={(v) => save.mutateAsync(v)}
        onDelete={(id) => remove.mutate(id)}
        renderDetail={(loan) => <LoanScheduleTable loan={loan} />}
      />
      <TotalLine label="대출잔금 합계" amount={data.reduce((s, l) => s + calcLoan(l).balance, 0)} />
    </TabCard>
  )
}

function LoanScheduleTable({ loan }: { loan: Loan }) {
  const { rows, elapsed } = calcLoan(loan)
  return (
    <div className="max-h-80 overflow-y-auto">
      <table className="w-full text-xs tabular-nums">
        <thead className="sticky top-0 bg-slate-50 text-slate-500">
          <tr>
            <th className="py-1 text-left font-medium">회차</th>
            <th className="py-1 text-right font-medium">상환액</th>
            <th className="py-1 text-right font-medium">원금</th>
            <th className="py-1 text-right font-medium">이자</th>
            <th className="py-1 text-right font-medium">잔금</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month} className={r.month <= elapsed ? 'text-slate-400' : ''}>
              <td className="py-0.5">{r.month}</td>
              <td className="py-0.5 text-right">{formatWon(r.payment)}</td>
              <td className="py-0.5 text-right">{formatWon(r.principal)}</td>
              <td className="py-0.5 text-right">{formatWon(r.interest)}</td>
              <td className="py-0.5 text-right">{formatWon(r.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
