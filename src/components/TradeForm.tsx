import { useState, type ReactNode } from 'react'
import { formatNumber, formatUsd, formatWon, todayString } from '../lib/format'
import { currentFx, type Position } from '../lib/invest'
import type { InvestAccount, Market, StockPrice, StockTrade, TradeSide } from '../lib/types'
import { toNumber, toText } from '../lib/form'
import { Field, FormBox, inputCls, NumberInput } from './FormFields'

type Props = {
  side: TradeSide
  accounts: InvestAccount[]
  /** 지금 가지고 있는 종목 (매도할 종목 고르기용) */
  positions: Position[]
  priceByCode: Map<string, StockPrice>
  /** 있으면 그 기록을 수정 */
  row?: StockTrade
  /** 매도로 열 때 미리 골라 둘 종목 (Position.key) */
  initialPositionKey?: string
  /** 기록 한 줄 저장 (id 있으면 수정, 없으면 추가) */
  onSave: (values: Record<string, unknown>) => Promise<unknown>
  onDone: () => void
  onCancel: () => void
}

/**
 * 매수·매도 기록 입력 폼.
 * - 매수: 계좌·종목을 직접 넣는다.
 * - 매도: 가지고 있는 종목 중에서 고른다 (가진 수량보다 많이 팔 수 없음).
 */
export default function TradeForm({ side, accounts, positions, priceByCode, row, initialPositionKey, onSave, onDone, onCancel }: Props) {
  const fxNow = currentFx(priceByCode)
  const isEdit = row !== undefined
  const [saving, setSaving] = useState(false)
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? ''

  // 매도할 종목: 수정이면 그 기록의 종목, 새 매도면 고른 종목
  const [positionKey, setPositionKey] = useState(initialPositionKey ?? '')
  const position = row
    ? positions.find((p) => p.accountId === row.account_id && p.market === row.market && p.code === row.stock_code)
    : positions.find((p) => p.key === positionKey)
  const startPosition = positions.find((p) => p.key === initialPositionKey)

  const [v, setV] = useState(() => ({
    account_id: row?.account_id ?? accounts[0]?.id ?? '',
    market: (row?.market ?? 'KR') as Market,
    stock_code: row?.stock_code ?? '',
    stock_name: row?.stock_name ?? '',
    // 엑셀에서 옮긴 기록은 날짜가 비어 있을 수 있어서 수정할 때는 비운 채로 둔다
    trade_date: row ? (row.trade_date ?? '') : todayString(),
    price: row ? toText(row.price) : toText(startPosition?.currentPrice),
    quantity: row ? toText(row.quantity) : toText(startPosition?.quantity),
    fx_rate: row ? toText(row.fx_rate) : startPosition?.market === 'US' ? toText(fxNow) : '',
    fee: toText(row?.fee ?? 0),
    memo: row?.memo ?? '',
  }))
  const set = (key: keyof typeof v, value: string) => setV((prev) => ({ ...prev, [key]: value }))

  function changeMarket(market: Market) {
    // 미국 주식으로 바꾸면 환율에 오늘 환율을 미리 채워 둔다 (예전 거래면 그날 환율로 고치면 됨)
    setV((prev) => {
      let fx = market === 'US' ? prev.fx_rate : ''
      if (market === 'US' && fx === '' && fxNow) fx = String(fxNow)
      return { ...prev, market, fx_rate: fx }
    })
  }

  function choosePosition(key: string) {
    const p = positions.find((x) => x.key === key)
    setPositionKey(key)
    // 기본은 전량 매도, 매도단가는 현재가로 채워 둔다
    setV((prev) => ({
      ...prev,
      quantity: toText(p?.quantity),
      price: toText(p?.currentPrice),
      fx_rate: p?.market === 'US' ? toText(fxNow) : '',
    }))
  }

  const isSell = side === 'sell'
  const market: Market = isSell ? (row?.market ?? position?.market ?? 'KR') : v.market
  const unit = market === 'US' ? '$' : '원'
  const money = (n: number) => (market === 'US' ? formatUsd(n) : formatWon(Math.round(n)))
  const price = toNumber(v.price)
  const qty = toNumber(v.quantity)
  const fx = market === 'US' ? (toNumber(v.fx_rate) ?? fxNow ?? 0) : 1
  // 수정 중인 매도는 이미 보유 수량에서 빠져 있으므로 되돌려서 계산
  const sellable = (position?.quantity ?? 0) + (isEdit && isSell ? row.quantity : 0)

  let problem: string | null = null
  if (isSell && !isEdit && !position) problem = '팔 종목을 골라 주세요'
  else if (!isSell && !v.account_id) problem = '계좌를 골라 주세요'
  else if (!isSell && !v.stock_code.trim()) problem = '종목코드를 넣어 주세요'
  else if (!isSell && !v.stock_name.trim()) problem = '종목명을 넣어 주세요'
  else if (!isEdit && !v.trade_date) problem = `${isSell ? '매도' : '매수'}일을 넣어 주세요`
  else if (!price || price <= 0) problem = '단가를 넣어 주세요'
  else if (!qty || qty <= 0) problem = '수량을 넣어 주세요'
  else if (isSell && qty > sellable + 1e-9) problem = `보유 수량(${formatNumber(sellable)}주)보다 많이 팔 수 없어요`

  let preview: ReactNode = null
  if (price && qty) {
    const amount = price * qty
    const krw = market === 'US' ? <> × 환율 {formatNumber(fx)}원 = {formatWon(Math.round(amount * fx))}</> : null
    if (isSell && position && sellable > 0) {
      // 이동평균법: 평균 매수원가 × 판 수량을 뺀다
      const avgCost = position.quantity > 0 ? position.cost / position.quantity : 0
      const realized = (amount - (toNumber(v.fee) ?? 0)) * fx - avgCost * qty
      preview = (
        <>
          매도금액 {money(amount)}{krw} · 예상 실현손익 <Signed value={Math.round(realized)} />
        </>
      )
    } else if (!isSell) {
      preview = <>매수금액 {money(amount)}{krw}</>
    }
  }

  async function handleSave() {
    const base = isSell
      ? {
          account_id: row?.account_id ?? position!.accountId,
          market,
          stock_code: row?.stock_code ?? position!.code,
          stock_name: row?.stock_name ?? position!.name,
        }
      : {
          account_id: v.account_id,
          market,
          // 미국 티커는 대문자로 통일 (aapl → AAPL)
          stock_code: v.stock_code.trim().toUpperCase(),
          stock_name: v.stock_name.trim(),
        }
    const values: Record<string, unknown> = {
      ...base,
      side,
      trade_date: v.trade_date || null,
      price,
      quantity: qty,
      fx_rate: market === 'US' ? toNumber(v.fx_rate) : null,
      fee: toNumber(v.fee) ?? 0,
      memo: v.memo.trim() || null,
    }
    setSaving(true)
    try {
      await onSave(isEdit ? { ...values, id: row.id } : values)
      onDone()
    } finally {
      setSaving(false)
    }
  }

  const title = (
    <span className={isSell ? 'text-blue-700' : 'text-red-700'}>
      {isSell ? '매도' : '매수'} {isEdit ? '수정' : '추가'}
    </span>
  )
  const hint = isSell ? '가지고 있는 종목을 골라 판 가격과 수량을 넣으세요.' : '새로 산 종목을 넣으세요. 미국 주식은 단가·수수료를 달러로 넣어요.'

  return (
    <FormBox title={title} hint={hint} preview={preview} problem={problem} saving={saving} onSave={handleSave} onCancel={onCancel}>
      {isSell ? (
        <Field label="종목" required className="col-span-2">
          {isEdit ? (
            <p className="py-1.5 text-sm">
              {accountName(row.account_id)} · {row.stock_name} ({row.stock_code})
            </p>
          ) : (
            <select className={inputCls} value={positionKey} onChange={(e) => choosePosition(e.target.value)}>
              <option value="" disabled>{positions.length === 0 ? '보유 종목이 없어요' : '선택'}</option>
              {positions.map((p) => (
                <option key={p.key} value={p.key}>
                  {accountName(p.accountId)} · {p.name} ({p.code}) {formatNumber(p.quantity)}주
                </option>
              ))}
            </select>
          )}
        </Field>
      ) : (
        <>
          <Field label="계좌" required>
            <select className={inputCls} value={v.account_id} onChange={(e) => set('account_id', e.target.value)}>
              <option value="" disabled>선택</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </Field>
          <Field label="시장" required>
            <select className={inputCls} value={v.market} onChange={(e) => changeMarket(e.target.value as Market)}>
              <option value="KR">한국</option>
              <option value="US">미국</option>
            </select>
          </Field>
          <Field label="종목코드" required>
            <input className={inputCls} placeholder={v.market === 'US' ? 'AAPL' : '000660'} value={v.stock_code} onChange={(e) => set('stock_code', e.target.value)} />
          </Field>
          <Field label="종목명" required>
            <input className={inputCls} value={v.stock_name} onChange={(e) => set('stock_name', e.target.value)} />
          </Field>
        </>
      )}
      <Field label={isSell ? '매도일' : '매수일'} required={!isEdit}>
        <input type="date" className={inputCls} value={v.trade_date} onChange={(e) => set('trade_date', e.target.value)} />
      </Field>
      <Field label={`${isSell ? '매도' : '매수'}단가 (${unit})`} required>
        <NumberInput value={v.price} onChange={(x) => set('price', x)} />
      </Field>
      <Field label={isSell && (position || isEdit) ? `수량 (최대 ${formatNumber(sellable)}주)` : '수량'} required>
        <NumberInput value={v.quantity} onChange={(x) => set('quantity', x)} />
      </Field>
      {market === 'US' && (
        <Field label={`${isSell ? '매도' : '매수'}환율 (원/$)`}>
          <NumberInput value={v.fx_rate} onChange={(x) => set('fx_rate', x)} />
        </Field>
      )}
      <Field label={`수수료·세금 (${unit})`}>
        <NumberInput value={v.fee} onChange={(x) => set('fee', x)} />
      </Field>
      <Field label="메모" className="col-span-2">
        <input className={inputCls} value={v.memo} onChange={(e) => set('memo', e.target.value)} />
      </Field>
    </FormBox>
  )
}

function Signed({ value }: { value: number }) {
  return <span className={value > 0 ? 'text-red-600' : value < 0 ? 'text-blue-600' : ''}>{value > 0 ? '+' : ''}{formatWon(value)}</span>
}
