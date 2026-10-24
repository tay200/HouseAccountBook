import { bankAccountsApi } from '../../api/tables'
import CrudTable, { type Column } from '../../components/CrudTable'
import type { BankAccount } from '../../lib/types'
import { TERM_OPTIONS, useMemberColumn } from './columns'
import { TabCard, TotalLine } from './parts'

export default function AccountsTab() {
  const { data = [] } = bankAccountsApi.useList()
  const save = bankAccountsApi.useSave()
  const remove = bankAccountsApi.useDelete()
  const memberColumn = useMemberColumn<BankAccount>()
  const columns: Column<BankAccount>[] = [
    { key: 'bank', label: '은행', input: { type: 'text' } },
    { key: 'kind', label: '종류', input: { type: 'text', placeholder: '입출금, 청약, 연금…' } },
    { key: 'term', label: '기간', input: { type: 'select', options: TERM_OPTIONS }, required: true },
    { key: 'name', label: '계좌명', input: { type: 'text' }, required: true },
    { key: 'account_number', label: '계좌번호', input: { type: 'text' } },
    { key: 'purpose', label: '용도', input: { type: 'text' } },
    memberColumn,
    { key: 'opened_on', label: '가입일', input: { type: 'date' } },
    { key: 'balance', label: '현재금액', input: { type: 'money' }, required: true, align: 'right' },
    { key: 'memo', label: '비고', input: { type: 'text' } },
  ]
  return (
    <TabCard note="예금·적금·투자·통장 기록에 이미 넣은 돈은 여기에 중복으로 넣지 마세요.">
      <CrudTable rows={data} columns={columns} defaults={{ term: 'short', balance: 0 }} onSave={(v) => save.mutateAsync(v)} onDelete={(id) => remove.mutate(id)} />
      <TotalLine label="계좌 합계" amount={data.reduce((s, a) => s + a.balance, 0)} />
    </TabCard>
  )
}
