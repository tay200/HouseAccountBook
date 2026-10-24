import { depositsApi } from '../../api/tables'
import CrudTable, { type Column } from '../../components/CrudTable'
import { calcDeposit, daysUntil } from '../../lib/finance'
import { formatWon, todayString } from '../../lib/format'
import type { Deposit } from '../../lib/types'
import { pct, useMemberColumn } from './columns'
import { RemainCell, TabCard, TotalLine } from './parts'

export default function DepositsTab() {
  const { data = [] } = depositsApi.useList()
  const save = depositsApi.useSave()
  const remove = depositsApi.useDelete()
  const memberColumn = useMemberColumn<Deposit>()
  const columns: Column<Deposit>[] = [
    { key: 'bank', label: '은행', input: { type: 'text' } },
    { key: 'name', label: '예금명', input: { type: 'text' }, required: true },
    memberColumn,
    { key: 'start_date', label: '가입일', input: { type: 'date' }, required: true },
    { key: 'maturity_date', label: '만기일', input: { type: 'date' }, required: true },
    { key: 'principal', label: '원금', input: { type: 'money' }, required: true, align: 'right' },
    { key: 'rate', label: '금리(%)', input: { type: 'number' }, required: true, align: 'right', render: (d) => pct(d.rate) },
    { key: 'tax_rate', label: '세율(%)', input: { type: 'number' }, required: true, align: 'right', render: (d) => pct(d.tax_rate) },
    { key: 'remain', label: '남은 기간', render: (d) => <RemainCell maturity={d.maturity_date} />, sortValue: (d) => daysUntil(d.maturity_date) },
    { key: 'after', label: '세후이자', align: 'right', render: (d) => formatWon(calcDeposit(d).afterTax), sortValue: (d) => calcDeposit(d).afterTax },
    { key: 'receive', label: '예상수령액', align: 'right', render: (d) => formatWon(calcDeposit(d).maturityAmount), sortValue: (d) => calcDeposit(d).maturityAmount },
  ]
  return (
    <TabCard>
      <CrudTable rows={data} columns={columns} defaults={{ tax_rate: 15.4, start_date: todayString() }} onSave={(v) => save.mutateAsync(v)} onDelete={(id) => remove.mutate(id)} />
      <TotalLine label="원금 합계" amount={data.reduce((s, d) => s + d.principal, 0)} />
      <TotalLine label="예상수령액 합계" amount={data.reduce((s, d) => s + calcDeposit(d).maturityAmount, 0)} />
    </TabCard>
  )
}
