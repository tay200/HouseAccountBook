import { realAssetsApi } from '../../api/tables'
import CrudTable, { type Column } from '../../components/CrudTable'
import type { RealAsset } from '../../lib/types'
import { TabCard, TotalLine } from './parts'

export default function RealAssetsTab() {
  const { data = [] } = realAssetsApi.useList()
  const save = realAssetsApi.useSave()
  const remove = realAssetsApi.useDelete()
  const columns: Column<RealAsset>[] = [
    { key: 'name', label: '내용', input: { type: 'text', placeholder: '전세보증금, 차량 평가액…' }, required: true },
    { key: 'amount', label: '금액', input: { type: 'money' }, required: true, align: 'right' },
    { key: 'memo', label: '메모', input: { type: 'text' } },
  ]
  return (
    <TabCard>
      <CrudTable rows={data} columns={columns} onSave={(v) => save.mutateAsync(v)} onDelete={(id) => remove.mutate(id)} />
      <TotalLine label="부동자산 합계" amount={data.reduce((s, r) => s + r.amount, 0)} />
    </TabCard>
  )
}
