import { useEffect, useRef, type ReactNode } from 'react'

/** 입력 폼들이 같이 쓰는 입력칸 모양 */
export const inputCls = 'input w-full min-w-24 py-1.5'

/** 이름표 + 입력칸 */
export function Field({ label, required, className = '', children }: { label: string; required?: boolean; className?: string; children: ReactNode }) {
  return (
    <label className={`space-y-1 ${className}`}>
      <span className="text-xs text-slate-500">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  )
}

/** 소수도 넣을 수 있는 숫자 칸. 입력하는 동안은 문자열로 다룬다. */
export function NumberInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <input type="number" step="any" min="0" className={`${inputCls} text-right`} value={value} onChange={(e) => onChange(e.target.value)} />
}

type FormBoxProps = {
  title: ReactNode
  /** 제목 옆 안내 문구 */
  hint?: ReactNode
  children: ReactNode
  /** 저장 버튼 왼쪽에 보여줄 계산 미리보기 */
  preview?: ReactNode
  /** 저장할 수 없는 이유 (있으면 저장 버튼 비활성) */
  problem: string | null
  saving: boolean
  saveLabel?: string
  /** 입력칸 배치 (좁은 카드 안에서 열 때 칸 수를 줄인다) */
  gridClass?: string
  onSave: () => void
  onCancel: () => void
}

/** 표 위쪽에 열리는 입력 폼 틀 (열리면 화면을 폼으로 옮긴다) */
export function FormBox({ title, hint, children, preview, problem, saving, saveLabel = '저장', gridClass = 'grid-cols-2 md:grid-cols-4 xl:grid-cols-6', onSave, onCancel }: FormBoxProps) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])
  return (
    <div ref={ref} className="edit-form mb-4 scroll-mt-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <p className="text-sm font-semibold">{title}</p>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
      </div>
      <div className={`grid gap-3 ${gridClass}`}>{children}</div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {preview && <span className="mr-auto text-sm text-slate-600 tabular-nums">{preview}</span>}
        {problem && <span className="text-xs text-slate-500">{problem}</span>}
        <button className="btn btn-secondary" onClick={onCancel}>취소</button>
        <button className="btn btn-primary" disabled={problem !== null || saving} onClick={onSave}>{saveLabel}</button>
      </div>
    </div>
  )
}
