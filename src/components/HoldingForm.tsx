import { useState } from 'react'
import { formatNumber, formatUsd, formatWon } from '../lib/format'
import { currentFx, positionKey } from '../lib/invest'
import type { InvestAccount, Market, StockHolding, StockPrice } from '../lib/types'
import { toNumber, toText } from '../lib/form'
import { Field, FormBox, inputCls, NumberInput } from './FormFields'

type Props = {
  accounts: InvestAccount[]
  /** 이미 있는 직접 입력 보유분 (같은 종목 중복 확인용) */
  holdings: StockHolding[]
  priceByCode: Map<string, StockPrice>
  /** 있으면 그 보유분을 수정 */
  row?: StockHolding
  onSave: (values: Record<string, unknown>) => Promise<unknown>
  onDone: () => void
  onCancel: () => void
}

/**
 * 매매 기록 없이 보유 종목을 직접 넣는 폼.
 * 예: 매매 내역이 남아 있지 않은 종목, 증권사 앱의 평균단가·수량을 그대로 옮길 때.
 */
export default function HoldingForm({ accounts, holdings, priceByCode, row, onSave, onDone, onCancel }: Props) {
  const fxNow = currentFx(priceByCode)
  const [saving, setSaving] = useState(false)
  const [v, setV] = useState(() => ({
    account_id: row?.account_id ?? accounts[0]?.id ?? '',
    market: (row?.market ?? 'KR') as Market,
    stock_code: row?.stock_code ?? '',
    stock_name: row?.stock_name ?? '',
    quantity: toText(row?.quantity),
    avg_price: toText(row?.avg_price),
    avg_fx_rate: toText(row?.avg_fx_rate),
    memo: row?.memo ?? '',
  }))
  const set = (key: keyof typeof v, value: string) => setV((prev) => ({ ...prev, [key]: value }))

  const isUs = v.market === 'US'
  const code = v.stock_code.trim().toUpperCase()
  const qty = toNumber(v.quantity)
  const avg = toNumber(v.avg_price)
  // 같은 계좌·종목의 직접 입력 보유분은 하나만 (수량·평균단가는 그 줄에서 고친다)
  const duplicate = holdings.some(
    (h) => h.id !== row?.id && positionKey(h) === positionKey({ account_id: v.account_id, market: v.market, stock_code: code }),
  )

  let problem: string | null = null
  if (!v.account_id) problem = '계좌를 골라 주세요'
  else if (!code) problem = '종목코드를 넣어 주세요'
  else if (!v.stock_name.trim()) problem = '종목명을 넣어 주세요'
  else if (!qty || qty <= 0) problem = '수량을 넣어 주세요'
  else if (avg === null || avg < 0) problem = '평균단가를 넣어 주세요'
  else if (duplicate) problem = '이 계좌에 같은 종목을 이미 직접 넣었어요. 그 줄의 [수정]으로 고쳐 주세요'

  const fx = isUs ? (toNumber(v.avg_fx_rate) ?? fxNow ?? 0) : 1
  const preview =
    qty && avg ? (
      <>
        매수금액 {isUs ? formatUsd(avg * qty) : formatWon(Math.round(avg * qty))}
        {isUs && <> × 환율 {formatNumber(fx)}원 = {formatWon(Math.round(avg * qty * fx))}</>}
      </>
    ) : null

  async function handleSave() {
    const values: Record<string, unknown> = {
      account_id: v.account_id,
      market: v.market,
      stock_code: code,
      stock_name: v.stock_name.trim(),
      quantity: qty,
      avg_price: avg,
      avg_fx_rate: isUs ? toNumber(v.avg_fx_rate) : null,
      memo: v.memo.trim() || null,
    }
    setSaving(true)
    try {
      await onSave(row ? { ...values, id: row.id } : values)
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormBox
      title={row ? '보유 종목 수정' : '보유 종목 추가'}
      hint="매매 기록 없이 지금 가진 수량과 평균단가를 넣어요. 이후 매수·매도 기록이 여기에 더해지고 빠져요."
      preview={preview}
      problem={problem}
      saving={saving}
      onSave={handleSave}
      onCancel={onCancel}
    >
      <Field label="계좌" required>
        <select className={inputCls} value={v.account_id} onChange={(e) => set('account_id', e.target.value)}>
          <option value="" disabled>선택</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </Field>
      <Field label="시장" required>
        <select className={inputCls} value={v.market} onChange={(e) => set('market', e.target.value)}>
          <option value="KR">한국</option>
          <option value="US">미국</option>
        </select>
      </Field>
      <Field label="종목코드" required>
        <input className={inputCls} placeholder={isUs ? 'AAPL' : '000660'} value={v.stock_code} onChange={(e) => set('stock_code', e.target.value)} />
      </Field>
      <Field label="종목명" required>
        <input className={inputCls} value={v.stock_name} onChange={(e) => set('stock_name', e.target.value)} />
      </Field>
      <Field label="수량" required>
        <NumberInput value={v.quantity} onChange={(x) => set('quantity', x)} />
      </Field>
      <Field label={`평균단가 (${isUs ? '$' : '원'})`} required>
        <NumberInput value={v.avg_price} onChange={(x) => set('avg_price', x)} />
      </Field>
      {isUs && (
        <Field label="평균 매수환율 (원/$)">
          <NumberInput value={v.avg_fx_rate} onChange={(x) => set('avg_fx_rate', x)} />
        </Field>
      )}
      <Field label="메모" className="col-span-2">
        <input className={inputCls} value={v.memo} onChange={(e) => set('memo', e.target.value)} />
      </Field>
    </FormBox>
  )
}
