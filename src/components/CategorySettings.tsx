import { useState, type FormEvent } from 'react'
import { useCategories, useDeleteCategory, useSaveCategory } from '../api/categories'
import { countRows } from '../api/counts'
import { NEW_CATEGORY_COLOR } from '../lib/defaults'
import { TX_TYPE_LABEL, type Category, type TxType } from '../lib/types'

export default function CategorySettings() {
  const { data: categories = [] } = useCategories()

  return (
    <div className="card space-y-4">
      <div>
        <h3 className="font-semibold">카테고리</h3>
        <p className="text-xs text-slate-500">대분류 아래에 소분류를 둘 수 있어요. 예산과 분석은 대분류 기준으로 합산돼요.</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        {(['expense', 'income'] as const).map((type) => (
          <CategoryColumn key={type} type={type} categories={categories.filter((c) => c.type === type)} />
        ))}
      </div>
    </div>
  )
}

function CategoryColumn({ type, categories }: { type: TxType; categories: Category[] }) {
  const majors = categories.filter((c) => !c.parent_id)
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-slate-500">{TX_TYPE_LABEL[type]}</h4>
      <ul className="space-y-1">
        {majors.map((major) => (
          <MajorItem key={major.id} major={major} subs={categories.filter((c) => c.parent_id === major.id)} />
        ))}
      </ul>
      <AddCategoryForm type={type} parentId={null} placeholder="새 대분류 이름" />
    </div>
  )
}

/** 대분류 한 줄 + 펼치면 소분류 목록 */
function MajorItem({ major, subs }: { major: Category; subs: Category[] }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="rounded-lg border border-slate-100">
      <div className="flex items-center gap-1 px-1">
        <button className="btn btn-text w-8 px-0" onClick={() => setOpen(!open)} aria-label={open ? '접기' : '펼치기'}>
          {open ? '▾' : '▸'}
        </button>
        <CategoryRow category={major} subIds={subs.map((s) => s.id)} />
        <span className="w-10 text-right text-xs text-slate-400">{subs.length || ''}</span>
      </div>
      {open && (
        <div className="space-y-1 border-t border-slate-100 py-2 pr-1 pl-10">
          {subs.map((sub) => (
            <div key={sub.id} className="flex items-center">
              <CategoryRow category={sub} />
            </div>
          ))}
          <AddCategoryForm type={major.type} parentId={major.id} placeholder={`'${major.name}' 소분류 추가`} />
        </div>
      )}
    </li>
  )
}

/** 이름/색을 고치면 '저장' 버튼이 나타나는 한 줄 (소분류는 대분류 색을 따라가므로 색 없음) */
function CategoryRow({ category, subIds = [] }: { category: Category; subIds?: string[] }) {
  const save = useSaveCategory()
  const remove = useDeleteCategory()
  const [name, setName] = useState(category.name)
  const [color, setColor] = useState(category.color)
  const isMajor = !category.parent_id
  const changed = name.trim() !== category.name || color !== category.color

  async function handleDelete() {
    // 대분류를 지우면 소분류도 함께 지워진다 (DB: on delete cascade)
    const ids = [category.id, ...subIds]
    const [tx, budgets] = await Promise.all([countRows('transactions', 'category_id', ids), countRows('budgets', 'category_id', ids)])
    const lines = [`'${category.name}'을(를) 삭제할까요?`]
    if (subIds.length > 0) lines.push(`소분류 ${subIds.length}개도 함께 삭제됩니다.`)
    if (tx > 0) lines.push(`거래 ${tx}건은 '미분류'가 됩니다.`)
    if (budgets > 0) lines.push(`예산 ${budgets}건이 삭제됩니다.`)
    if (!confirm(lines.join('\n'))) return
    remove.mutate(category.id)
  }

  return (
    <div className="flex flex-1 items-center gap-2 py-1">
      {isMajor && <input type="color" className="h-7 w-7 cursor-pointer rounded" value={color} onChange={(e) => setColor(e.target.value)} />}
      <input className="input flex-1 py-1" value={name} onChange={(e) => setName(e.target.value)} />
      {changed && (
        <button
          className="btn btn-primary py-1"
          disabled={!name.trim() || save.isPending}
          onClick={() => save.mutate({ id: category.id, name: name.trim(), type: category.type, color, parent_id: category.parent_id })}
        >
          저장
        </button>
      )}
      <button className="btn btn-danger-text" onClick={handleDelete}>삭제</button>
    </div>
  )
}

function AddCategoryForm({ type, parentId, placeholder }: { type: TxType; parentId: string | null; placeholder: string }) {
  const save = useSaveCategory()
  const [name, setName] = useState('')

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    save.mutate({ name: name.trim(), type, color: NEW_CATEGORY_COLOR, parent_id: parentId }, { onSuccess: () => setName('') })
  }

  return (
    <form onSubmit={handleAdd} className="flex gap-2">
      <input className="input flex-1 py-1.5" placeholder={placeholder} value={name} onChange={(e) => setName(e.target.value)} />
      <button className="btn btn-secondary py-1.5" disabled={!name.trim() || save.isPending}>추가</button>
    </form>
  )
}
