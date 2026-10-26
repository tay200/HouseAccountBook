import { useState } from 'react'
import { bankAccountsApi, ledgerApi, savingGoalsApi } from '../api/tables'
import { currentMonth, formatWon } from '../lib/format'
import { bookBalances, GOAL_STATUS_LABEL, goalProgress, savedOf, type GoalStatus } from '../lib/goals'
import {
  SAVING_GOAL_KIND_LABEL,
  SAVING_SOURCE_LABEL,
  type BankAccount,
  type SavingGoal,
  type SavingGoalKind,
  type SavingSource,
} from '../lib/types'
import AmountInput from './AmountInput'
import CrudTable, { type Column } from './CrudTable'
import { Field, FormBox, inputCls } from './FormFields'

// 상태 색은 글자 라벨과 함께 쓴다 (색만으로 전달하지 않기)
const STATUS_STYLE: Record<GoalStatus, { bar: string; text: string }> = {
  done: { bar: '#0ca30c', text: 'text-emerald-700' },
  onTrack: { bar: '#2a78d6', text: 'text-slate-600' },
  behind: { bar: '#fab219', text: 'text-amber-700' },
  overdue: { bar: '#d03b3b', text: 'text-red-600' },
}

/** '2026-03' → '26.3' */
function shortMonth(month: string) {
  return `${month.slice(2, 4)}.${Number(month.slice(5, 7))}`
}

/**
 * 예산 화면 아래: 모으기 목표 (특별비 적립 + 저축 목표).
 * 목표마다 진행률·이번 달 필요액을 보여주고, 맨 위에 이번 달에 모아야 할 돈 합계를 보여준다.
 */
export default function SavingGoalsCard({ month }: { month: string }) {
  const { data: goals = [] } = savingGoalsApi.useList()
  const { data: ledger = [] } = ledgerApi.useList()
  const { data: accounts = [] } = bankAccountsApi.useList()
  const save = savingGoalsApi.useSave()
  const remove = savingGoalsApi.useDelete()
  const [adding, setAdding] = useState(false)

  const books = bookBalances(ledger)
  const progressOf = (g: SavingGoal) => goalProgress(g, savedOf(g, books, accounts), month)
  const totalNeed = goals.reduce((sum, g) => sum + progressOf(g).monthlyNeed, 0)

  const columns: Column<SavingGoal>[] = [
    {
      key: 'name',
      label: '이름',
      render: (g) => (
        <span className="inline-flex items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${g.kind === 'sinking' ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {SAVING_GOAL_KIND_LABEL[g.kind]}
          </span>
          {g.name}
          {g.repeat_yearly && <span className="text-xs text-slate-400">매년</span>}
        </span>
      ),
      sortValue: (g) => g.name,
    },
    {
      key: 'period',
      label: '기간',
      render: (g) => {
        const p = progressOf(g)
        return `${shortMonth(p.start)} ~ ${shortMonth(p.due)}`
      },
      sortValue: (g) => progressOf(g).due,
    },
    { key: 'target_amount', label: '목표', align: 'right', render: (g) => formatWon(g.target_amount), sortValue: (g) => g.target_amount },
    {
      key: 'saved',
      label: '모은 돈',
      align: 'right',
      render: (g) => (
        <>
          {formatWon(progressOf(g).saved)}
          <div className="text-xs text-slate-400">{g.source === 'book' ? g.book : g.source === 'account' ? (accounts.find((a) => a.id === g.bank_account_id)?.name ?? '계좌 없음') : SAVING_SOURCE_LABEL.manual}</div>
        </>
      ),
      sortValue: (g) => progressOf(g).saved,
    },
    {
      key: 'progress',
      label: '진행',
      render: (g) => {
        const p = progressOf(g)
        const style = STATUS_STYLE[p.status]
        return (
          <div className="w-40 space-y-1">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${p.ratio * 100}%`, backgroundColor: style.bar }} />
            </div>
            <div className={`flex justify-between text-xs tabular-nums ${style.text}`}>
              <span>{Math.round(p.ratio * 100)}%</span>
              <span>{GOAL_STATUS_LABEL[p.status]}</span>
            </div>
          </div>
        )
      },
      sortValue: (g) => progressOf(g).ratio,
    },
    {
      key: 'need',
      label: '이번 달 필요',
      align: 'right',
      render: (g) => {
        const p = progressOf(g)
        return p.monthlyNeed > 0 ? (
          <>
            {formatWon(p.monthlyNeed)}
            <div className="text-xs text-slate-400">남은 {p.monthsLeft}개월</div>
          </>
        ) : (
          <span className="text-slate-300">-</span>
        )
      },
      sortValue: (g) => progressOf(g).monthlyNeed,
    },
  ]

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">모으기 목표</h3>
          <p className="text-sm text-slate-500">
            명절·자동차세처럼 가끔 나가는 돈(쓸 돈)이나 전세·차처럼 모으려는 돈(목표)을 등록하면, 매달 얼마씩 모아야 하는지 알려드려요.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">이번 달 모아야 할 돈</p>
          <p className="text-xl font-bold tabular-nums">{formatWon(totalNeed)}</p>
        </div>
      </div>
      {!adding && (
        <button className="btn btn-secondary" onClick={() => setAdding(true)}>
          + 목표 추가
        </button>
      )}
      <CrudTable
        rows={goals}
        columns={columns}
        onSave={(values) => save.mutateAsync(values)}
        onDelete={(id) => remove.mutate(id)}
        adding={adding}
        onAddingChange={setAdding}
        emptyText="아직 모으기 목표가 없어요."
        renderForm={({ row, onDone, onCancel }) => (
          <SavingGoalForm
            row={row}
            bookNames={[...books.keys()]}
            accounts={accounts}
            onSave={(values) => save.mutateAsync(values)}
            onDone={onDone}
            onCancel={onCancel}
          />
        )}
      />
      <p className="text-xs text-slate-400">
        진행 상태: 지난달까지 모았어야 할 돈(목표 × 지난 개월 ÷ 전체 개월)보다 많으면 순조로움이에요. 한 통장을 여러 목표에 연결하면 같은 잔액을 각각 세요.
      </p>
    </div>
  )
}

type FormProps = {
  row?: SavingGoal
  /** 통장 기록에 있는 통장 이름 */
  bookNames: string[]
  accounts: BankAccount[]
  onSave: (values: Record<string, unknown>) => Promise<unknown>
  onDone: () => void
  onCancel: () => void
}

function SavingGoalForm({ row, bookNames, accounts, onSave, onDone, onCancel }: FormProps) {
  const [saving, setSaving] = useState(false)
  const [v, setV] = useState(() => ({
    name: row?.name ?? '',
    kind: (row?.kind ?? 'sinking') as SavingGoalKind,
    target_amount: row?.target_amount ?? null,
    // <input type="month"> 는 'YYYY-MM' 을 쓴다 (DB 에는 'YYYY-MM-01')
    start_month: row?.start_month.slice(0, 7) ?? currentMonth(),
    due_month: row?.due_month.slice(0, 7) ?? '',
    repeat_yearly: row?.repeat_yearly ?? false,
    source: (row?.source ?? 'manual') as SavingSource,
    saved_amount: row?.saved_amount ?? null,
    book: row?.book ?? bookNames[0] ?? '',
    bank_account_id: row?.bank_account_id ?? accounts[0]?.id ?? '',
    memo: row?.memo ?? '',
  }))
  const set = <K extends keyof typeof v>(key: K, value: (typeof v)[K]) => setV((prev) => ({ ...prev, [key]: value }))

  let problem: string | null = null
  if (!v.name.trim()) problem = '이름을 넣어 주세요'
  else if (!v.target_amount) problem = '목표 금액을 넣어 주세요'
  else if (!v.start_month || !v.due_month) problem = '시작 월과 목표 월을 골라 주세요'
  else if (v.due_month < v.start_month) problem = '목표 월이 시작 월보다 빨라요'
  else if (v.source === 'book' && !v.book) problem = '통장 기록에 통장이 없어요. 먼저 통장 기록에 입출금을 넣어 주세요'
  else if (v.source === 'account' && !v.bank_account_id) problem = '자산 · 부채에 계좌가 없어요'

  async function handleSave() {
    const values: Record<string, unknown> = {
      name: v.name.trim(),
      kind: v.kind,
      target_amount: v.target_amount,
      start_month: `${v.start_month}-01`,
      due_month: `${v.due_month}-01`,
      repeat_yearly: v.repeat_yearly,
      source: v.source,
      saved_amount: v.source === 'manual' ? (v.saved_amount ?? 0) : 0,
      book: v.source === 'book' ? v.book : null,
      bank_account_id: v.source === 'account' ? v.bank_account_id : null,
      memo: v.memo.trim() || null,
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
      title={row ? '모으기 목표 수정' : '모으기 목표 추가'}
      hint="모은 돈은 직접 적거나, 통장 기록(예: 비상금)·계좌 잔액에서 자동으로 읽어요."
      problem={problem}
      saving={saving}
      onSave={handleSave}
      onCancel={onCancel}
    >
      <Field label="이름" required>
        <input className={inputCls} placeholder="예: 설 명절, 자동차세" value={v.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label="종류" required>
        <select className={inputCls} value={v.kind} onChange={(e) => set('kind', e.target.value as SavingGoalKind)}>
          <option value="sinking">쓸 돈 (명절·세금·여행)</option>
          <option value="goal">목표 (전세·차·이사)</option>
        </select>
      </Field>
      <Field label="목표 금액" required>
        <AmountInput className={inputCls} value={v.target_amount} onChange={(x) => set('target_amount', x)} />
      </Field>
      <Field label="시작 월" required>
        <input type="month" className={inputCls} value={v.start_month} onChange={(e) => set('start_month', e.target.value)} />
      </Field>
      <Field label="목표 월 (이때까지)" required>
        <input type="month" className={inputCls} value={v.due_month} onChange={(e) => set('due_month', e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" checked={v.repeat_yearly} onChange={(e) => set('repeat_yearly', e.target.checked)} />
        매년 반복
      </label>
      <Field label="모은 돈" required>
        <select className={inputCls} value={v.source} onChange={(e) => set('source', e.target.value as SavingSource)}>
          {(['manual', 'book', 'account'] as const).map((s) => (
            <option key={s} value={s}>{SAVING_SOURCE_LABEL[s]}</option>
          ))}
        </select>
      </Field>
      {v.source === 'manual' && (
        <Field label="지금까지 모은 돈">
          <AmountInput className={inputCls} value={v.saved_amount} onChange={(x) => set('saved_amount', x)} />
        </Field>
      )}
      {v.source === 'book' && (
        <Field label="통장" required>
          <select className={inputCls} value={v.book} onChange={(e) => set('book', e.target.value)}>
            {bookNames.length === 0 && <option value="">통장 없음</option>}
            {bookNames.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </Field>
      )}
      {v.source === 'account' && (
        <Field label="계좌" required>
          <select className={inputCls} value={v.bank_account_id} onChange={(e) => set('bank_account_id', e.target.value)}>
            {accounts.length === 0 && <option value="">계좌 없음</option>}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.bank ? `${a.bank} ${a.name}` : a.name}</option>
            ))}
          </select>
        </Field>
      )}
      <Field label="메모" className="col-span-2">
        <input className={inputCls} value={v.memo} onChange={(e) => set('memo', e.target.value)} />
      </Field>
    </FormBox>
  )
}
