import { useState } from 'react'
import { recurringRulesApi } from '../api/tables'
import { useLookups } from '../hooks/useLookups'
import { currentMonth, formatMonth, formatWon } from '../lib/format'
import { KIND_LABEL, type RecurringRule, type TxKind, type TxType } from '../lib/types'
import AmountInput from './AmountInput'
import CrudTable, { type Column } from './CrudTable'
import { Field, FormBox, inputCls } from './FormFields'

/** 구분 선택칸: 수입/지출 + 성격을 한 칸에서 고른다 */
const KIND_OPTIONS: { value: `${TxType}:${TxKind}`; label: string }[] = [
  { value: 'expense:fixed', label: '고정지출' },
  { value: 'expense:variable', label: '변동지출' },
  { value: 'expense:saving', label: '저축성지출' },
  { value: 'income:fixed', label: '고정수입' },
  { value: 'income:extra', label: '부가수입' },
]

function kindLabel(rule: Pick<RecurringRule, 'type' | 'kind'>) {
  return rule.type === 'income' ? `${KIND_LABEL[rule.kind]}수입` : `${KIND_LABEL[rule.kind]}지출`
}

/** 설정 > 반복 거래: 매달 같은 날 나가는(들어오는) 거래 규칙 목록 */
export default function RecurringSettings() {
  const { data: rules = [] } = recurringRulesApi.useList()
  const save = recurringRulesApi.useSave()
  const remove = recurringRulesApi.useDelete()
  const { categoryLabel, memberName, paymentName } = useLookups()

  const columns: Column<RecurringRule>[] = [
    { key: 'day', label: '날짜', render: (r) => `매월 ${r.day}일`, sortValue: (r) => r.day },
    { key: 'memo', label: '내용', render: (r) => <span className={r.active ? '' : 'text-slate-400 line-through'}>{r.memo}</span> },
    { key: 'kind', label: '구분', render: kindLabel, sortValue: kindLabel },
    { key: 'category_id', label: '카테고리', render: (r) => categoryLabel(r.category_id), sortValue: (r) => categoryLabel(r.category_id) },
    { key: 'member_id', label: '사람', render: (r) => memberName(r.member_id), sortValue: (r) => memberName(r.member_id) },
    { key: 'payment_method_id', label: '결제수단', render: (r) => paymentName(r.payment_method_id), sortValue: (r) => paymentName(r.payment_method_id) },
    { key: 'amount', label: '금액', align: 'right', render: (r) => formatWon(r.amount), sortValue: (r) => r.amount },
    {
      key: 'period',
      label: '기간',
      render: (r) => `${formatMonth(r.start_month.slice(0, 7))} ~ ${r.end_month ? formatMonth(r.end_month.slice(0, 7)) : ''}`,
      sortValue: (r) => r.start_month,
    },
  ]

  return (
    <div className="card space-y-3">
      <div>
        <h3 className="font-semibold">반복 거래</h3>
        <p className="text-sm text-slate-500">
          관리비·보험료·통신비·적금 이체처럼 매달 나가는 거래를 등록하면, 거래 내역 맨 위에 그 달의 예정 거래로 보여요. [확인]을 누르면 실제 거래가 돼요.
        </p>
      </div>
      <CrudTable
        rows={rules}
        columns={columns}
        onSave={(values) => save.mutateAsync(values)}
        onDelete={(id) => remove.mutate(id)}
        confirmDelete={(r) => confirm(`'${r.memo}' 반복 거래를 삭제할까요?\n이미 [확인]해서 만든 거래는 그대로 남아요.`)}
        addLabel="+ 반복 거래 추가"
        emptyText="아직 반복 거래가 없어요."
        renderForm={({ row, onDone, onCancel }) => (
          <RecurringForm row={row} onSave={(values) => save.mutateAsync(values)} onDone={onDone} onCancel={onCancel} />
        )}
      />
    </div>
  )
}

type FormProps = {
  row?: RecurringRule
  onSave: (values: Record<string, unknown>) => Promise<unknown>
  onDone: () => void
  onCancel: () => void
}

function RecurringForm({ row, onSave, onDone, onCancel }: FormProps) {
  const { categories, majorCategories, paymentMethods, members } = useLookups()
  const [saving, setSaving] = useState(false)
  const [v, setV] = useState(() => ({
    typeKind: `${row?.type ?? 'expense'}:${row?.kind ?? 'fixed'}`,
    memo: row?.memo ?? '',
    amount: row?.amount ?? null,
    day: String(row?.day ?? 1),
    category_id: row?.category_id ?? '',
    payment_method_id: row?.payment_method_id ?? '',
    member_id: row?.member_id ?? '',
    // <input type="month"> 는 'YYYY-MM' 을 쓴다 (DB 에는 'YYYY-MM-01')
    start_month: row?.start_month.slice(0, 7) ?? currentMonth(),
    end_month: row?.end_month?.slice(0, 7) ?? '',
    active: row?.active ?? true,
  }))
  const set = <K extends keyof typeof v>(key: K, value: (typeof v)[K]) => setV((prev) => ({ ...prev, [key]: value }))

  const [type, kind] = v.typeKind.split(':') as [TxType, TxKind]
  // 대분류 아래에 소분류를 이어서 보여준다 (거래와 같이 소분류까지 고를 수 있게)
  const categoryOptions = majorCategories
    .filter((c) => c.type === type)
    .flatMap((major) => [
      { id: major.id, label: major.name },
      ...categories.filter((c) => c.parent_id === major.id).map((c) => ({ id: c.id, label: `${major.name} › ${c.name}` })),
    ])
  const day = Number(v.day)

  let problem: string | null = null
  if (!v.memo.trim()) problem = '내용을 넣어 주세요'
  else if (!v.amount) problem = '금액을 넣어 주세요'
  else if (!Number.isInteger(day) || day < 1 || day > 31) problem = '날짜는 1~31 사이로 넣어 주세요'
  else if (!v.start_month) problem = '시작 월을 골라 주세요'
  else if (v.end_month && v.end_month < v.start_month) problem = '끝 월이 시작 월보다 빨라요'

  function changeTypeKind(next: string) {
    // 수입/지출이 바뀌면 카테고리가 맞지 않으므로 비운다
    setV((prev) => ({ ...prev, typeKind: next, category_id: next.split(':')[0] === type ? prev.category_id : '' }))
  }

  async function handleSave() {
    const values: Record<string, unknown> = {
      type,
      kind,
      memo: v.memo.trim(),
      amount: v.amount,
      day,
      category_id: v.category_id || null,
      payment_method_id: v.payment_method_id || null,
      member_id: v.member_id || null,
      start_month: `${v.start_month}-01`,
      end_month: v.end_month ? `${v.end_month}-01` : null,
      active: v.active,
    }
    setSaving(true)
    try {
      await onSave(row ? { ...values, id: row.id } : values)
      onDone()
    } catch {
      // 오류 알림은 main.tsx 의 MutationCache 가 띄운다. 폼은 열어 둔다.
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormBox
      title={row ? '반복 거래 수정' : '반복 거래 추가'}
      hint="금액이 매달 조금씩 다르면 평소 금액을 넣고, 확인할 때 고치면 돼요."
      problem={problem}
      saving={saving}
      onSave={handleSave}
      onCancel={onCancel}
    >
      <Field label="구분" required>
        <select className={inputCls} value={v.typeKind} onChange={(e) => changeTypeKind(e.target.value)}>
          {KIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>
      <Field label="내용" required>
        <input className={inputCls} placeholder="예: 아파트 관리비" value={v.memo} onChange={(e) => set('memo', e.target.value)} />
      </Field>
      <Field label="금액" required>
        <AmountInput className={inputCls} value={v.amount} onChange={(x) => set('amount', x)} />
      </Field>
      <Field label="매월 며칠" required>
        <input type="number" min="1" max="31" className={`${inputCls} text-right`} value={v.day} onChange={(e) => set('day', e.target.value)} />
      </Field>
      <Field label="카테고리">
        <select className={inputCls} value={v.category_id} onChange={(e) => set('category_id', e.target.value)}>
          <option value="">미분류</option>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </Field>
      <Field label="결제수단">
        <select className={inputCls} value={v.payment_method_id} onChange={(e) => set('payment_method_id', e.target.value)}>
          <option value="">선택 안 함</option>
          {paymentMethods.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </Field>
      <Field label="사람">
        <select className={inputCls} value={v.member_id} onChange={(e) => set('member_id', e.target.value)}>
          <option value="">공동</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </Field>
      <Field label="시작 월" required>
        <input type="month" className={inputCls} value={v.start_month} onChange={(e) => set('start_month', e.target.value)} />
      </Field>
      <Field label="끝 월 (비우면 계속)">
        <input type="month" className={inputCls} value={v.end_month} onChange={(e) => set('end_month', e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" checked={v.active} onChange={(e) => set('active', e.target.checked)} />
        사용 (끄면 예정 목록에 안 나와요)
      </label>
    </FormBox>
  )
}
