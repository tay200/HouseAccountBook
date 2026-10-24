import { membersApi } from '../api/tables'
import type { Member } from '../lib/types'
import CrudTable, { type Column } from './CrudTable'

const columns: Column<Member>[] = [{ key: 'name', label: '이름', input: { type: 'text' }, required: true }]

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
        addLabel="+ 사람 추가"
      />
    </div>
  )
}
