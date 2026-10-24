import { useEffect, useRef, useState, type ReactNode } from 'react'
import { formatNumber, formatUsd, formatWon, todayString } from '../lib/format'
import { currentFx, holdings, planSell } from '../lib/invest'
import type { InvestAccount, Market, StockPrice, Trade } from '../lib/types'

export type TradeMode = 'buy' | 'sell'

type Props = {
  accounts: InvestAccount[]
  trades: Trade[]
  priceByCode: Map<string, StockPrice>
  /** 있으면 그 매매 줄을 수정 */
  row?: Trade
  /** 새로 입력할 때 처음 고를 매수/매도 */
  initialMode?: TradeMode
  /** 매도로 열 때 미리 골라 둘 보유 종목 (holdings 의 key) */
  initialHoldingKey?: string
  /** 매매 한 줄 저장 (id 있으면 수정, 없으면 추가) */
  onSave: (values: Record<string, unknown>) => Promise<unknown>
  onDone: () => void
  onCancel: () => void
}

/** 입력칸 값(문자열)을 숫자로. 비어 있으면 null */
function num(value: string): number | null {
  return value.trim() === '' ? null : Number(value)
}

const str = (value: number | string | null | undefined) => (value === null || value === undefined ? '' : String(value))

/**
 * 매매 내역 입력 폼. 매수와 매도를 골라서 필요한 칸만 보여준다.
 * - 매수: 종목·단가·수량을 넣으면 새 줄이 생긴다.
 * - 매도: 보유 종목을 고르고 매도 단가·수량을 넣으면, 먼저 산 줄부터 매도 정보가 채워진다.
 * - 수정: 기존 줄을 고친다. 판 줄이면 매도 칸도 함께 보여준다.
 */
export default function TradeForm({ accounts, trades, priceByCode, row, initialMode = 'buy', initialHoldingKey, onSave, onDone, onCancel }: Props) {
  const formRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  const fxNow = currentFx(priceByCode)
  const [mode, setMode] = useState<TradeMode>(initialMode)
  const [saving, setSaving] = useState(false)

  // ── 매수 (및 수정) 입력값. 입력하는 동안은 문자열로 들고 있다.
  const [buy, setBuy] = useState(() => ({
    account_id: row?.account_id ?? accounts[0]?.id ?? '',
    market: (row?.market ?? 'KR') as Market,
    stock_code: row?.stock_code ?? '',
    stock_name: row?.stock_name ?? '',
    buy_date: row?.buy_date ?? todayString(),
    buy_price: str(row?.buy_price),
    quantity: str(row?.quantity),
    buy_fx_rate: str(row?.buy_fx_rate),
    sell_date: row?.sell_date ?? '',
    sell_price: str(row?.sell_price),
    sell_fx_rate: str(row?.sell_fx_rate),
    fee: str(row?.fee ?? 0),
    memo: row?.memo ?? '',
  }))
  const setB = (key: keyof typeof buy, value: string) => setBuy((prev) => ({ ...prev, [key]: value }))

  function changeMarket(market: Market) {
    // 미국 주식으로 바꾸면 매수 환율에 오늘 환율을 미리 채워 둔다 (과거 매수면 고쳐서 넣으면 됨)
    setBuy((prev) => {
      let fx = market === 'US' ? prev.buy_fx_rate : ''
      if (market === 'US' && fx === '' && fxNow) fx = String(fxNow)
      return { ...prev, market, buy_fx_rate: fx }
    })
  }

  // ── 매도 입력값
  const holdingList = holdings(trades, priceByCode)
  const [sell, setSell] = useState(() => {
    const h = holdingList.find((x) => x.key === initialHoldingKey)
    return {
      holdingKey: h?.key ?? '',
      sell_date: todayString(),
      sell_price: h?.currentPrice ? String(h.currentPrice) : '',
      quantity: h ? String(h.quantity) : '',
      sell_fx_rate: h?.market === 'US' && fxNow ? String(fxNow) : '',
      fee: '0',
    }
  })
  const setS = (key: keyof typeof sell, value: string) => setSell((prev) => ({ ...prev, [key]: value }))
  const holding = holdingList.find((h) => h.key === sell.holdingKey)
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? ''

  function chooseHolding(key: string) {
    const h = holdingList.find((x) => x.key === key)
    setSell((prev) => ({
      ...prev,
      holdingKey: key,
      // 기본은 전량 매도, 매도단가는 현재가로 채워 둔다
      quantity: h ? String(h.quantity) : '',
      sell_price: h?.currentPrice ? String(h.currentPrice) : '',
      sell_fx_rate: h?.market === 'US' && fxNow ? String(fxNow) : '',
    }))
  }

  // ── 검증과 미리보기
  const isEdit = row !== undefined
  const editSold = isEdit && row.sell_date !== null
  const showSell = mode === 'sell' && !isEdit
  const market: Market = showSell ? (holding?.market ?? 'KR') : buy.market
  const unit = market === 'US' ? '$' : '원'
  const money = (v: number) => (market === 'US' ? formatUsd(v) : formatWon(Math.round(v)))

  let problem: string | null = null
  let preview: ReactNode = null
  if (showSell) {
    const qty = num(sell.quantity)
    const price = num(sell.sell_price)
    if (!holding) problem = '팔 종목을 골라 주세요'
    else if (!sell.sell_date) problem = '매도일을 넣어 주세요'
    else if (!price || price <= 0) problem = '매도단가를 넣어 주세요'
    else if (!qty || qty <= 0) problem = '수량을 넣어 주세요'
    else if (qty > holding.quantity + 1e-9) problem = `보유 수량(${formatNumber(holding.quantity)}주)보다 많이 팔 수 없어요`
    if (holding && price && qty) {
      const fx = market === 'US' ? (num(sell.sell_fx_rate) ?? fxNow ?? 0) : 1
      const proceeds = price * qty * fx - (num(sell.fee) ?? 0) * fx
      const cost = (holding.cost / holding.quantity) * qty
      preview = (
        <>
          매도금액 {money(price * qty)}
          {market === 'US' && <> ≈ {formatWon(Math.round(price * qty * fx))}</>} · 예상 실현손익 약{' '}
          <Signed value={Math.round(proceeds - cost)} /> <span className="text-slate-400">(평균 매수가 기준, 실제는 먼저 산 것부터 계산)</span>
        </>
      )
    }
  } else {
    const price = num(buy.buy_price)
    const qty = num(buy.quantity)
    if (!buy.account_id) problem = '계좌를 골라 주세요'
    else if (!buy.stock_code.trim()) problem = '종목코드를 넣어 주세요'
    else if (!buy.stock_name.trim()) problem = '종목명을 넣어 주세요'
    else if (!price || price <= 0) problem = '매수단가를 넣어 주세요'
    else if (!qty || qty <= 0) problem = '수량을 넣어 주세요'
    else if (editSold && (!buy.sell_date || !num(buy.sell_price))) problem = '매도일과 매도단가를 넣어 주세요'
    if (price && qty) {
      const fx = num(buy.buy_fx_rate) ?? fxNow ?? 0
      preview = (
        <>
          매수금액 {money(price * qty)}
          {market === 'US' && <> × 환율 {formatNumber(fx)}원 = {formatWon(Math.round(price * qty * fx))}</>}
        </>
      )
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (showSell && holding) {
        const lots = trades.filter((t) => !t.sell_date && `${t.account_id}:${t.market}:${t.stock_code}` === holding.key)
        const writes = planSell(lots, {
          quantity: num(sell.quantity)!,
          sell_date: sell.sell_date,
          sell_price: num(sell.sell_price)!,
          sell_fx_rate: holding.market === 'US' ? num(sell.sell_fx_rate) : null,
          fee: num(sell.fee) ?? 0,
        })
        // 순서대로 저장 (일부 매도는 새 줄 추가 → 원래 줄 수량 줄이기 순서가 중요)
        for (const w of writes) await onSave(w)
      } else {
        const isUs = buy.market === 'US'
        const values: Record<string, unknown> = {
          account_id: buy.account_id,
          market: buy.market,
          // 미국 티커는 대문자로 통일 (aapl → AAPL)
          stock_code: buy.stock_code.trim().toUpperCase(),
          stock_name: buy.stock_name.trim(),
          buy_date: buy.buy_date || null,
          buy_price: num(buy.buy_price),
          quantity: num(buy.quantity),
          buy_fx_rate: isUs ? num(buy.buy_fx_rate) : null,
          fee: num(buy.fee) ?? 0,
          memo: buy.memo.trim() || null,
        }
        if (editSold) {
          values.sell_date = buy.sell_date
          values.sell_price = num(buy.sell_price)
          values.sell_fx_rate = isUs ? num(buy.sell_fx_rate) : null
        }
        await onSave(isEdit ? { ...values, id: row.id } : values)
      }
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={formRef} className="edit-form mb-4 scroll-mt-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
      <div className="mb-3 flex items-center gap-3">
        {isEdit ? (
          <p className="text-sm font-semibold text-blue-800">{editSold ? '수정 (판 매매)' : '수정 (보유 중)'}</p>
        ) : (
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm" role="tablist">
            <ModeButton active={mode === 'buy'} onClick={() => setMode('buy')} className="text-red-600">매수</ModeButton>
            <ModeButton active={mode === 'sell'} onClick={() => setMode('sell')} className="text-blue-600">매도</ModeButton>
          </div>
        )}
        <span className="text-xs text-slate-500">
          {showSell ? '가진 종목을 골라 판 가격과 수량을 넣으세요. 먼저 산 것부터 판 것으로 기록돼요.' : !isEdit && '새로 산 종목을 넣으세요.'}
        </span>
      </div>

      {showSell ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <Field label="팔 종목" required className="col-span-2">
            <select className={cls} value={sell.holdingKey} onChange={(e) => chooseHolding(e.target.value)}>
              <option value="" disabled>{holdingList.length === 0 ? '보유 종목이 없어요' : '선택'}</option>
              {holdingList.map((h) => (
                <option key={h.key} value={h.key}>
                  {accountName(h.accountId)} · {h.name} ({h.code}) {formatNumber(h.quantity)}주
                </option>
              ))}
            </select>
          </Field>
          <Field label="매도일" required>
            <input type="date" className={cls} value={sell.sell_date} onChange={(e) => setS('sell_date', e.target.value)} />
          </Field>
          <Field label={`매도단가 (${unit})`} required>
            <NumberInput value={sell.sell_price} onChange={(v) => setS('sell_price', v)} />
          </Field>
          <Field label={holding ? `수량 (보유 ${formatNumber(holding.quantity)}주)` : '수량'} required>
            <NumberInput value={sell.quantity} onChange={(v) => setS('quantity', v)} />
          </Field>
          {market === 'US' && (
            <Field label="매도환율 (원/$)">
              <NumberInput value={sell.sell_fx_rate} onChange={(v) => setS('sell_fx_rate', v)} />
            </Field>
          )}
          <Field label={`수수료·세금 (${unit})`}>
            <NumberInput value={sell.fee} onChange={(v) => setS('fee', v)} />
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <Field label="계좌" required>
            <select className={cls} value={buy.account_id} onChange={(e) => setB('account_id', e.target.value)}>
              <option value="" disabled>선택</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </Field>
          <Field label="시장" required>
            <select className={cls} value={buy.market} onChange={(e) => changeMarket(e.target.value as Market)}>
              <option value="KR">한국</option>
              <option value="US">미국</option>
            </select>
          </Field>
          <Field label="종목코드" required>
            <input className={cls} placeholder={buy.market === 'US' ? 'AAPL' : '000660'} value={buy.stock_code} onChange={(e) => setB('stock_code', e.target.value)} />
          </Field>
          <Field label="종목명" required>
            <input className={cls} value={buy.stock_name} onChange={(e) => setB('stock_name', e.target.value)} />
          </Field>
          <Field label="매수일">
            <input type="date" className={cls} value={buy.buy_date} onChange={(e) => setB('buy_date', e.target.value)} />
          </Field>
          <Field label={`매수단가 (${unit})`} required>
            <NumberInput value={buy.buy_price} onChange={(v) => setB('buy_price', v)} />
          </Field>
          <Field label="수량" required>
            <NumberInput value={buy.quantity} onChange={(v) => setB('quantity', v)} />
          </Field>
          {buy.market === 'US' && (
            <Field label="매수환율 (원/$)">
              <NumberInput value={buy.buy_fx_rate} onChange={(v) => setB('buy_fx_rate', v)} />
            </Field>
          )}
          {editSold && (
            <>
              <Field label="매도일" required>
                <input type="date" className={cls} value={buy.sell_date} onChange={(e) => setB('sell_date', e.target.value)} />
              </Field>
              <Field label={`매도단가 (${unit})`} required>
                <NumberInput value={buy.sell_price} onChange={(v) => setB('sell_price', v)} />
              </Field>
              {buy.market === 'US' && (
                <Field label="매도환율 (원/$)">
                  <NumberInput value={buy.sell_fx_rate} onChange={(v) => setB('sell_fx_rate', v)} />
                </Field>
              )}
            </>
          )}
          <Field label={editSold ? `수수료·세금 합계 (${unit})` : `수수료·세금 (${unit})`}>
            <NumberInput value={buy.fee} onChange={(v) => setB('fee', v)} />
          </Field>
          <Field label="메모" className="col-span-2">
            <input className={cls} value={buy.memo} onChange={(e) => setB('memo', e.target.value)} />
          </Field>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {preview && <span className="mr-auto text-sm text-slate-600 tabular-nums">{preview}</span>}
        {problem && <span className="text-xs text-slate-500">{problem}</span>}
        <button className="btn btn-secondary" onClick={onCancel}>취소</button>
        <button className="btn btn-primary" disabled={problem !== null || saving} onClick={handleSave}>
          {showSell ? '매도 저장' : '저장'}
        </button>
      </div>
    </div>
  )
}

const cls = 'input w-full min-w-24 py-1.5'

function Field({ label, required, className = '', children }: { label: string; required?: boolean; className?: string; children: ReactNode }) {
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

function NumberInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <input type="number" step="any" min="0" className={`${cls} text-right`} value={value} onChange={(e) => onChange(e.target.value)} />
}

function ModeButton({ active, onClick, className, children }: { active: boolean; onClick: () => void; className: string; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`rounded-md px-4 py-1 font-semibold ${active ? `bg-slate-100 ${className}` : 'text-slate-400 hover:text-slate-600'}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function Signed({ value }: { value: number }) {
  return <span className={value > 0 ? 'text-red-600' : value < 0 ? 'text-blue-600' : ''}>{value > 0 ? '+' : ''}{formatWon(value)}</span>
}
