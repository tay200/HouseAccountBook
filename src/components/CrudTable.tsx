import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { formatNumber, formatWon } from '../lib/format'
import { useSort, type SortValue } from '../hooks/useSort'
import AmountInput from './AmountInput'
import SortHeader from './SortHeader'

/** 입력칸 종류 */
export type FieldInput =
  | { type: 'text'; placeholder?: string }
  | { type: 'money' } // 원 단위 정수, 쉼표 표시
  | { type: 'number'; step?: string } // 소수 가능 (금리, 수량 등)
  | { type: 'date' }
  | { type: 'select'; options: { value: string; label: string }[]; emptyLabel?: string }

export type Column<T> = {
  /** 수정 가능한 열이면 DB 컬럼 이름, 계산 열이면 아무 고유 이름 */
  key: string
  label: string
  /** 입력 폼에서만 쓸 더 자세한 이름표 (없으면 label) */
  formLabel?: string
  /** 있으면 수정 가능한 열 */
  input?: FieldInput
  required?: boolean
  /** 화면 표시 방법 (없으면 입력 종류에 맞춰 기본 표시) */
  render?: (row: T) => ReactNode
  align?: 'left' | 'right'
  width?: string
  /** 머리글 클릭 정렬에 쓸 값 (없으면 DB 값, 선택 칸은 화면 이름). 계산 열은 꼭 지정 */
  sortValue?: (row: T) => SortValue
}

type Values = Record<string, unknown>

type Props<T extends { id: string }> = {
  rows: T[]
  columns: Column<T>[]
  /** 새 행을 추가할 때 채워둘 기본값 */
  defaults?: Values
  onSave: (values: Values) => Promise<unknown>
  onDelete: (id: string) => void
  addLabel?: string
  emptyText?: string
  /** 행 아래에 펼쳐서 보여줄 상세 내용 (예: 대출 상환 스케줄) */
  renderDetail?: (row: T) => ReactNode
  /**
   * 새 행 입력 중인지 바깥에서 제어하고 싶을 때 (예: 표 바깥의 '+ 추가' 버튼).
   * 넘기지 않으면 표가 스스로 관리하고 아래쪽에 '+ 추가' 버튼을 보여준다.
   */
  adding?: boolean
  onAddingChange?: (adding: boolean) => void
  /**
   * 열 정의로 만드는 기본 폼 대신 쓸 전용 입력 폼 (예: 매수/매도를 골라 입력하는 매매 폼).
   * row 가 없으면 새 항목, 있으면 그 행 수정. 저장을 마치면 onDone, 취소하면 onCancel 을 부른다.
   */
  renderForm?: (props: { row?: T; onDone: () => void; onCancel: () => void }) => ReactNode
  /**
   * 삭제 전 확인 (기본: '삭제할까요?'). 함께 지워지거나 바뀌는 기록이 있으면 건수를 보여줄 때 쓴다.
   * true 를 돌려주면 삭제한다.
   */
  confirmDelete?: (row: T) => boolean | Promise<boolean>
}

function display(value: unknown, input?: FieldInput): ReactNode {
  if (value === null || value === undefined || value === '') return <span className="text-slate-300">-</span>
  if (!input) return String(value)
  switch (input.type) {
    case 'money':
      return formatWon(Number(value))
    case 'number':
      return formatNumber(Number(value))
    case 'select':
      return input.options.find((o) => o.value === value)?.label ?? String(value)
    default:
      return String(value)
  }
}

/**
 * 목록을 표로 보여주고, 행마다 [수정]/[삭제], [+ 추가]를 제공하는 공용 표.
 * 열 정의(columns)만 바꿔서 예금, 적금, 대출, 매매 내역 등 여러 화면에서 재사용한다.
 * 새 행 입력 줄은 목록이 길어도 바로 보이도록 표 맨 위에 연다.
 */
export default function CrudTable<T extends { id: string }>({
  rows,
  columns,
  defaults = {},
  onSave,
  onDelete,
  addLabel = '+ 추가',
  emptyText = '아직 항목이 없어요.',
  renderDetail,
  adding: addingProp,
  onAddingChange,
  renderForm,
  confirmDelete,
}: Props<T>) {
  // 지금 수정 중인 기존 행 id
  const [editingId, setEditingId] = useState<string | null>(null)
  const [openDetailId, setOpenDetailId] = useState<string | null>(null)
  // 새 행 입력 중인지: 바깥에서 adding 을 넘기면 그 값을, 아니면 내부 상태를 쓴다
  const [addingState, setAddingState] = useState(false)
  const controlled = addingProp !== undefined
  const adding = controlled ? addingProp : addingState
  const setAdding = (value: boolean) => (onAddingChange ?? setAddingState)(value)

  // 새 항목 추가와 기존 항목 수정은 동시에 하나만 연다
  const editingRow = adding ? undefined : rows.find((r) => r.id === editingId)

  // 머리글 클릭 정렬
  const { sorted, sort, toggle } = useSort(rows, (row, key) => {
    const c = columns.find((col) => col.key === key)
    if (c?.sortValue) return c.sortValue(row)
    const v = (row as unknown as Values)[key]
    // 선택 칸은 저장된 값(id 등) 대신 화면에 보이는 이름으로
    if (c?.input?.type === 'select') return c.input.options.find((o) => o.value === v)?.label ?? (v ? String(v) : c.input.emptyLabel)
    return v as SortValue
  })

  return (
    <div>
      {adding && renderForm && (
        <Fragment key="new">{renderForm({ onDone: () => setAdding(false), onCancel: () => setAdding(false) })}</Fragment>
      )}
      {editingRow && renderForm && (
        <Fragment key={editingRow.id}>
          {renderForm({ row: editingRow, onDone: () => setEditingId(null), onCancel: () => setEditingId(null) })}
        </Fragment>
      )}
      {adding && !renderForm && (
        <EditForm
          key="new"
          title="새 항목"
          columns={columns}
          initial={defaults}
          onCancel={() => setAdding(false)}
          onSave={(values) => onSave(values).then(() => setAdding(false))}
        />
      )}
      {editingRow && !renderForm && (
        <EditForm
          key={editingRow.id}
          title="수정"
          columns={columns}
          initial={editingRow as unknown as Values}
          onCancel={() => setEditingId(null)}
          onSave={(values) => onSave({ ...values, id: editingRow.id }).then(() => setEditingId(null))}
        />
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs text-slate-500">
            <tr>
              {columns.map((c) => (
                <SortHeader key={c.key} label={c.label} sortKey={c.key} sort={sort} onToggle={toggle} align={c.align} width={c.width} className="pr-3" />
              ))}
              <th className="w-28" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((row) => (
              <DisplayRow
                key={row.id}
                row={row}
                columns={columns}
                highlighted={editingRow?.id === row.id}
                detailOpen={openDetailId === row.id}
                hasDetail={!!renderDetail}
                onToggleDetail={() => setOpenDetailId(openDetailId === row.id ? null : row.id)}
                onEdit={() => {
                  setAdding(false)
                  setEditingId(row.id)
                }}
                onDelete={async () => {
                  const ok = confirmDelete ? await confirmDelete(row) : confirm('삭제할까요?')
                  if (ok) onDelete(row.id)
                }}
                detail={renderDetail && openDetailId === row.id ? renderDetail(row) : null}
              />
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="py-6 text-center text-sm text-slate-400">{emptyText}</p>}
      {!controlled && !adding && (
        <button className="btn btn-secondary mt-3" onClick={() => setAdding(true)}>
          {addLabel}
        </button>
      )}
    </div>
  )
}

type DisplayRowProps<T> = {
  row: T
  columns: Column<T>[]
  /** 위쪽 폼에서 수정 중인 행 */
  highlighted: boolean
  hasDetail: boolean
  detailOpen: boolean
  detail: ReactNode
  onToggleDetail: () => void
  onEdit: () => void
  onDelete: () => void
}

function DisplayRow<T>({ row, columns, highlighted, hasDetail, detailOpen, detail, onToggleDetail, onEdit, onDelete }: DisplayRowProps<T>) {
  const values = row as unknown as Values
  return (
    <>
      <tr className={highlighted ? 'bg-blue-50' : 'hover:bg-slate-50'}>
        {columns.map((c) => (
          <td key={c.key} className={`py-2.5 pr-3 whitespace-nowrap ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
            {c.render ? c.render(row) : display(values[c.key], c.input)}
          </td>
        ))}
        <td className="py-2.5 text-right whitespace-nowrap">
          {hasDetail && (
            <button className="btn btn-text" onClick={onToggleDetail}>
              {detailOpen ? '접기' : '상세'}
            </button>
          )}
          <button className="btn btn-text" onClick={onEdit}>수정</button>
          <button className="btn btn-danger-text" onClick={onDelete}>삭제</button>
        </td>
      </tr>
      {detailOpen && (
        <tr>
          <td colSpan={columns.length + 1} className="bg-slate-50 p-4">
            {detail}
          </td>
        </tr>
      )}
    </>
  )
}

type EditFormProps<T> = {
  title: string
  columns: Column<T>[]
  initial: Values
  onSave: (values: Values) => Promise<unknown>
  onCancel: () => void
}

/**
 * 추가/수정 폼. 표 줄 안에 넣으면 칸이 많은 표(매매 내역 등)에서 저장 버튼이 화면 밖으로 밀려나므로
 * 표 위쪽에 이름표가 붙은 입력칸들을 여러 줄로 배치한다.
 */
function EditForm<T>({ title, columns, initial, onSave, onCancel }: EditFormProps<T>) {
  const formRef = useRef<HTMLDivElement>(null)
  // 목록 아래쪽 행의 [수정]을 눌러도 폼이 보이도록 화면을 폼으로 옮긴다
  useEffect(() => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])
  const editable = columns.filter((c) => c.input)
  // 입력 중인 값. 숫자도 입력하는 동안은 문자열로 들고 있다가 저장할 때 변환한다.
  const [draft, setDraft] = useState<Values>(() =>
    Object.fromEntries(editable.map((c) => [c.key, initial[c.key] ?? (c.input!.type === 'money' ? null : '')])),
  )
  const [saving, setSaving] = useState(false)
  const missing = editable.some((c) => c.required && (draft[c.key] === '' || draft[c.key] === null))

  function set(key: string, value: unknown) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    // 빈 문자열은 null 로, number 입력은 숫자로 바꿔서 저장
    const values: Values = {}
    for (const c of editable) {
      const v = draft[c.key]
      if (v === '' || v === undefined) values[c.key] = null
      else if (c.input!.type === 'number') values[c.key] = Number(v)
      else values[c.key] = v
    }
    setSaving(true)
    try {
      await onSave(values)
    } catch {
      // 오류 알림은 main.tsx 의 MutationCache 가 띄운다. 폼은 열어 둔 채로 고쳐서 다시 저장할 수 있게 한다.
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={formRef} className="edit-form mb-4 scroll-mt-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
      <p className="mb-3 text-sm font-semibold text-blue-800">{title}</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        {editable.map((c) => (
          <label key={c.key} className="space-y-1">
            <span className="text-xs text-slate-500">
              {c.formLabel ?? c.label}
              {c.required && <span className="text-red-500"> *</span>}
            </span>
            <FieldEditor input={c.input!} value={draft[c.key]} onChange={(v) => set(c.key, v)} />
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        {missing && <span className="text-xs text-slate-500">* 표시 칸을 채워 주세요</span>}
        <button className="btn btn-secondary" onClick={onCancel}>취소</button>
        <button className="btn btn-primary" disabled={missing || saving} onClick={handleSave}>저장</button>
      </div>
    </div>
  )
}

function FieldEditor({ input, value, onChange }: { input: FieldInput; value: unknown; onChange: (v: unknown) => void }) {
  const cls = 'input w-full min-w-24 py-1.5'
  switch (input.type) {
    case 'money':
      return <AmountInput className={`${cls} min-w-28`} value={(value as number | null) ?? null} onChange={onChange} />
    case 'number':
      return (
        <input type="number" step={input.step ?? 'any'} className={`${cls} text-right`} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
      )
    case 'date':
      return <input type="date" className={cls} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
    case 'select':
      return (
        <select className={cls} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          {input.emptyLabel !== undefined ? (
            <option value="">{input.emptyLabel}</option>
          ) : (
            <option value="" disabled>선택</option>
          )}
          {input.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )
    default:
      return <input className={cls} placeholder={input.placeholder} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
  }
}
