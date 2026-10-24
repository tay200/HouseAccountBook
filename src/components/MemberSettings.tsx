import { countRows, describeCounts } from '../api/counts'
import { membersApi } from '../api/tables'
import type { Member } from '../lib/types'
import CrudTable, { type Column } from './CrudTable'

const columns: Column<Member>[] = [{ key: 'name', label: '이름', input: { type: 'text' }, required: true }]

/** 사람을 지우면 그 사람으로 표시된 기록이 모두 '공동'으로 바뀐다 (DB: on delete set null) */
async function confirmDeleteMember(member: Member) {
  const ids = [member.id]
  const [tx, ledger, bank, deposits, savings, invest] = await Promise.all([
    countRows('transactions', 'member_id', ids),
    countRows('ledger_entries', 'member_id', ids),
    countRows('bank_accounts', 'member_id', ids),
    countRows('deposits', 'member_id', ids),
    countRows('installment_savings', 'member_id', ids),
    countRows('invest_accounts', 'member_id', ids),
  ])
  const linked = describeCounts([
    ['거래', tx],
    ['통장 기록', ledger],
    ['계좌', bank],
    ['예금', deposits],
    ['적금', savings],
    ['투자 계좌', invest],
  ])
  const effect = linked ? `\n${linked}이(가) '공동'으로 바뀝니다. 되돌릴 수 없어요.` : ''
  return confirm(`'${member.name}'을(를) 삭제할까요?${effect}`)
}

export default function MemberSettings() {
  const { data: members = [] } = membersApi.useList()
  const save = membersApi.useSave()
  const remove = membersApi.useDelete()

  return (
    <div className="card space-y-2">
      <h3 className="font-semibold">사람</h3>
      <p className="text-xs text-slate-500">거래마다 누구의 수입·지출인지 고를 수 있어요. 고르지 않으면 '공동'이에요.</p>
      <CrudTable
        rows={members}
        columns={columns}
        onSave={(values) => save.mutateAsync(values)}
        onDelete={(id) => remove.mutate(id)}
        confirmDelete={confirmDeleteMember}
        addLabel="+ 사람 추가"
      />
    </div>
  )
}
