import { useState } from 'react'
import { todayString } from '../lib/format'
import { INCOME_LABEL, type IncomeKind, type InvestAccount, type InvestIncome, type Market } from '../lib/types'
import AmountInput from './AmountInput'
import { Field, FormBox, inputCls } from './FormFields'

type Props = {
  accounts: InvestAccount[]
  /** 있으면 그 기록을 수정 */
  row?: InvestIncome
  onSave: (values: Record<string, unknown>) => Promise<unknown>
  onDone: () => void
  onCancel: () => void
}

/**
 * 판매수익·배당금 직접 입력 폼. 증권사 앱에 나오는 원화 금액을 그대로 넣는다.
 * (매매 내역에 매도를 기록하면 그 손익은 자동 계산되므로 여기에 또 넣지 않는다)
 */
export default function IncomeForm({ accounts, row, onSave, onDone, onCancel }: Props) {
  const [saving, setSaving] = useState(false)
  const [v, setV] = useState(() => ({
    kind: (row?.kind ?? 'dividend') as IncomeKind,
    income_date: row?.income_date ?? todayString(),
    account_id: row?.account_id ?? accounts[0]?.id ?? '',
    market: (row?.market ?? 'KR') as Market,
    stock_name: row?.stock_name ?? '',
    stock_code: row?.stock_code ?? '',
    amount: row ? Math.abs(Number(row.amount)) : (null as number | null),
    loss: row ? Number(row.amount) < 0 : false,
    memo: row?.memo ?? '',
  }))
  const set = <K extends keyof typeof v>(key: K, value: (typeof v)[K]) => setV((prev) => ({ ...prev, [key]: value }))

  let problem: string | null = null
  if (!v.income_date) problem = '날짜를 넣어 주세요'
  else if (!v.account_id) problem = '계좌를 골라 주세요'
  else if (!v.stock_name.trim()) problem = '종목명을 넣어 주세요'
  else if (!v.amount) problem = '금액을 넣어 주세요'

  async function handleSave() {
    const amount = v.amount ?? 0
    const values: Record<string, unknown> = {
      kind: v.kind,
      income_date: v.income_date,
      account_id: v.account_id,
      market: v.market,
      stock_name: v.stock_name.trim(),
      stock_code: v.stock_code.trim().toUpperCase() || null,
      // 배당은 항상 +, 판매수익은 손실이면 -
      amount: v.kind === 'sale' && v.loss ? -amount : amount,
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
      title={row ? `${INCOME_LABEL[row.kind]} 수정` : '수익 추가'}
      hint="증권사 앱에 나오는 원화 금액 그대로"
      problem={problem}
      saving={saving}
      gridClass="grid-cols-2 md:grid-cols-3"
      onSave={handleSave}
      onCancel={onCancel}
    >
      <Field label="구분" required>
        <select className={inputCls} value={v.kind} onChange={(e) => set('kind', e.target.value as IncomeKind)}>
          <option value="dividend">배당금</option>
          <option value="sale">판매수익</option>
        </select>
      </Field>
      <Field label="날짜" required>
        <input type="date" className={inputCls} value={v.income_date} onChange={(e) => set('income_date', e.target.value)} />
      </Field>
      <Field label="계좌" required>
        <select className={inputCls} value={v.account_id} onChange={(e) => set('account_id', e.target.value)}>
          <option value="" disabled>선택</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </Field>
      <Field label="시장" required>
        <select className={inputCls} value={v.market} onChange={(e) => set('market', e.target.value as Market)}>
          <option value="KR">한국</option>
          <option value="US">미국</option>
        </select>
      </Field>
      <Field label="종목명" required>
        <input className={inputCls} value={v.stock_name} onChange={(e) => set('stock_name', e.target.value)} />
      </Field>
      <Field label="종목코드">
        <input className={inputCls} placeholder={v.market === 'US' ? 'SGOV' : '360750'} value={v.stock_code} onChange={(e) => set('stock_code', e.target.value)} />
      </Field>
      <Field label="금액 (원)" required>
        <AmountInput className="w-full py-1.5" value={v.amount} onChange={(x) => set('amount', x)} />
      </Field>
      {v.kind === 'sale' && (
        <label className="flex items-end gap-2 pb-2 text-sm text-slate-600">
          <input type="checkbox" className="size-4" checked={v.loss} onChange={(e) => set('loss', e.target.checked)} />
          손실
        </label>
      )}
      <Field label="메모" className="col-span-2">
        <input className={inputCls} value={v.memo} onChange={(e) => set('memo', e.target.value)} />
      </Field>
    </FormBox>
  )
}
