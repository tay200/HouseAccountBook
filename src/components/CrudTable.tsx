import { useState, type ReactNode } from 'react'
import { formatNumber, formatWon } from '../lib/format'
import AmountInput from './AmountInput'

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
  /** 있으면 수정 가능한 열 */
  input?: FieldInput
  required?: boolean
  /** 화면 표시 방법 (없으면 입력 종류에 맞춰 기본 표시) */
  render?: (row: T) => ReactNode
  align?: 'left' | 'right'
  width?: string
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
 * 목록을 표로 보여주고, 행마다 [수정]/[삭제], 맨 아래 [+ 추가]를 제공하는 공용 표.
 * 열 정의(columns)만 바꿔서 예금, 적금, 대출, 매매 내역 등 여러 화면에서 재사용한다.
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
}: Props<T>) {
  // 지금 수정 중인 행 id ('new' = 새 행 추가 중)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [openDetailId, setOpenDetailId] = useState<string | null>(null)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 text-left text-xs text-slate-500">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`py-2 pr-3 font-medium whitespace-nowrap ${c.align === 'right' ? 'text-right' : ''}`} style={{ width: c.width }}>
                {c.label}
              </th>
            ))}
            <th className="w-28" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) =>
            editingId === row.id ? (
              <EditRow
                key={row.id}
                columns={columns}
                initial={row as unknown as Values}
                onCancel={() => setEditingId(null)}
                onSave={(values) => onSave({ ...values, id: row.id }).then(() => setEditingId(null))}
              />
            ) : (
              <DisplayRow
                key={row.id}
                row={row}
                columns={columns}
                detailOpen={openDetailId === row.id}
                hasDetail={!!renderDetail}
                onToggleDetail={() => setOpenDetailId(openDetailId === row.id ? null : row.id)}
                onEdit={() => setEditingId(row.id)}
                onDelete={() => confirm('삭제할까요?') && onDelete(row.id)}
                detail={renderDetail && openDetailId === row.id ? renderDetail(row) : null}
              />
            ),
          )}
          {editingId === 'new' && (
            <EditRow
              columns={columns}
              initial={defaults}
              onCancel={() => setEditingId(null)}
              onSave={(values) => onSave(values).then(() => setEditingId(null))}
            />
          )}
        </tbody>
      </table>
      {rows.length === 0 && editingId !== 'new' && <p className="py-6 text-center text-sm text-slate-400">{emptyText}</p>}
      {editingId !== 'new' && (
        <button className="btn btn-text mt-2" onClick={() => setEditingId('new')}>
          {addLabel}
        </button>
      )}
    </div>
  )
}

type DisplayRowProps<T> = {
  row: T
  columns: Column<T>[]
  hasDetail: boolean
  detailOpen: boolean
  detail: ReactNode
  onToggleDetail: () => void
  onEdit: () => void
  onDelete: () => void
}

function DisplayRow<T>({ row, columns, hasDetail, detailOpen, detail, onToggleDetail, onEdit, onDelete }: DisplayRowProps<T>) {
  const values = row as unknown as Values
  return (
    <>
      <tr className="hover:bg-slate-50">
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

type EditRowProps<T> = {
  columns: Column<T>[]
  initial: Values
  onSave: (values: Values) => Promise<unknown>
  onCancel: () => void
}

function EditRow<T>({ columns, initial, onSave, onCancel }: EditRowProps<T>) {
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
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className="bg-blue-50/50">
      {columns.map((c) => (
        <td key={c.key} className="py-2 pr-2 align-top">
          {c.input ? (
            <FieldEditor input={c.input} value={draft[c.key]} onChange={(v) => set(c.key, v)} />
          ) : (
            <span className="text-xs text-slate-400">자동</span>
          )}
        </td>
      ))}
      <td className="py-2 text-right whitespace-nowrap">
        <button className="btn btn-primary px-3 py-1.5" disabled={missing || saving} onClick={handleSave}>저장</button>
        <button className="btn btn-text" onClick={onCancel}>취소</button>
      </td>
    </tr>
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
