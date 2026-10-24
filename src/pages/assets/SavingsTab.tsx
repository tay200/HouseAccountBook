import { savingsApi } from '../../api/tables'
import CrudTable, { type Column } from '../../components/CrudTable'
import { calcSaving, daysUntil } from '../../lib/finance'
import { formatWon, todayString } from '../../lib/format'
import { SAVING_METHOD_LABEL, type InstallmentSaving } from '../../lib/types'
import { pct, useMemberColumn } from './columns'
import { RemainCell, TabCard, TotalLine } from './parts'

export default function SavingsTab() {
  const { data = [] } = savingsApi.useList()
  const save = savingsApi.useSave()
  const remove = savingsApi.useDelete()
  const memberColumn = useMemberColumn<InstallmentSaving>()
  const columns: Column<InstallmentSaving>[] = [
    { key: 'bank', label: '은행', input: { type: 'text' } },
    { key: 'name', label: '적금명', input: { type: 'text' }, required: true },
    memberColumn,
    { key: 'start_date', label: '가입일', input: { type: 'date' }, required: true },
    { key: 'maturity_date', label: '만기일', input: { type: 'date' }, required: true },
    { key: 'monthly_amount', label: '월 적립액', input: { type: 'money' }, required: true, align: 'right' },
    { key: 'rate', label: '금리(%)', input: { type: 'number' }, required: true, align: 'right', render: (s) => pct(s.rate) },
    { key: 'tax_rate', label: '세율(%)', input: { type: 'number' }, required: true, align: 'right', render: (s) => pct(s.tax_rate) },
    {
      key: 'method',
      label: '방식',
      input: { type: 'select', options: Object.entries(SAVING_METHOD_LABEL).map(([value, label]) => ({ value, label })) },
      required: true,
    },
    { key: 'remain', label: '남은 기간', render: (s) => <RemainCell maturity={s.maturity_date} />, sortValue: (s) => daysUntil(s.maturity_date) },
    { key: 'current', label: '현재저축액', align: 'right', render: (s) => formatWon(calcSaving(s).current), sortValue: (s) => calcSaving(s).current },
    { key: 'after', label: '세후이자', align: 'right', render: (s) => formatWon(calcSaving(s).afterTax), sortValue: (s) => calcSaving(s).afterTax },
    { key: 'receive', label: '예상수령액', align: 'right', render: (s) => formatWon(calcSaving(s).maturityAmount), sortValue: (s) => calcSaving(s).maturityAmount },
  ]
  return (
    <TabCard note="현재저축액은 가입일부터 매달 빠짐없이 납입했다고 가정해서 계산해요.">
      <CrudTable rows={data} columns={columns} defaults={{ tax_rate: 15.4, method: 'simple', start_date: todayString() }} onSave={(v) => save.mutateAsync(v)} onDelete={(id) => remove.mutate(id)} />
      <TotalLine label="현재저축액 합계" amount={data.reduce((s, x) => s + calcSaving(x).current, 0)} />
    </TabCard>
  )
}
