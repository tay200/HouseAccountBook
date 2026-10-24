import { useState, type FormEvent } from 'react'
import { useAddDefaultCategories, useCategories, useDeleteCategory, useSaveCategory } from '../api/categories'
import { NEW_CATEGORY_COLOR } from '../lib/defaults'
import { TX_TYPE_LABEL, type Category, type TxType } from '../lib/types'

export default function CategorySettings() {
  const { data: categories = [], isSuccess } = useCategories()
  const addDefaults = useAddDefaultCategories()

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">카테고리</h3>
        {isSuccess && categories.length === 0 && (
          <button className="btn btn-primary" onClick={() => addDefaults.mutate()} disabled={addDefaults.isPending}>
            기본 카테고리 추가
          </button>
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {(['expense', 'income'] as const).map((type) => (
          <CategoryColumn key={type} type={type} categories={categories.filter((c) => c.type === type)} />
        ))}
      </div>
    </div>
  )
}

function CategoryColumn({ type, categories }: { type: TxType; categories: Category[] }) {
  const save = useSaveCategory()
  const [name, setName] = useState('')
  const [color, setColor] = useState(NEW_CATEGORY_COLOR)

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    save.mutate({ name: name.trim(), type, color }, { onSuccess: () => setName('') })
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-slate-500">{TX_TYPE_LABEL[type]}</h4>
      <ul className="divide-y divide-slate-100">
        {categories.map((c) => (
          <CategoryRow key={c.id} category={c} />
        ))}
      </ul>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input type="color" className="h-9 w-10 cursor-pointer rounded" value={color} onChange={(e) => setColor(e.target.value)} />
        <input className="input flex-1" placeholder="새 카테고리 이름" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-secondary" disabled={!name.trim() || save.isPending}>추가</button>
      </form>
    </div>
  )
}

/** 이름/색을 고치면 '저장' 버튼이 나타나는 한 줄 */
function CategoryRow({ category }: { category: Category }) {
  const save = useSaveCategory()
  const remove = useDeleteCategory()
  const [name, setName] = useState(category.name)
  const [color, setColor] = useState(category.color)
  const changed = name.trim() !== category.name || color !== category.color

  function handleDelete() {
    if (!confirm(`'${category.name}' 카테고리를 삭제할까요?\n이 카테고리의 거래는 '미분류'가 되고, 예산은 함께 삭제됩니다.`)) return
    remove.mutate(category.id)
  }

  return (
    <li className="flex items-center gap-2 py-1.5">
      <input type="color" className="h-8 w-8 cursor-pointer rounded" value={color} onChange={(e) => setColor(e.target.value)} />
      <input className="input flex-1 py-1.5" value={name} onChange={(e) => setName(e.target.value)} />
      {changed && (
        <button
          className="btn btn-primary py-1.5"
          disabled={!name.trim() || save.isPending}
          onClick={() => save.mutate({ id: category.id, name: name.trim(), type: category.type, color })}
        >
          저장
        </button>
      )}
      <button className="btn btn-danger-text" onClick={handleDelete}>삭제</button>
    </li>
  )
}
