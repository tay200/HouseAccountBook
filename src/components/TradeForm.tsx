import { useEffect, useRef, useState, type ReactNode } from 'react'
import { lookupStockName } from '../api/tables'
import { formatNumber, formatUsd, formatWon, todayString } from '../lib/format'
import { codeProblem, currentFx, knownStockName, normalizeCode, oversellProblem, type Position } from '../lib/invest'
import type { InvestAccount, Market, StockHolding, StockPrice, StockTrade, TradeSide } from '../lib/types'
import { toNumber, toText } from '../lib/form'
import { Field, FormBox, inputCls, NumberInput } from './FormFields'

type Props = {
  side: TradeSide
  accounts: InvestAccount[]
  /** 지금 가지고 있는 종목 (매도할 종목 고르기용) */
  positions: Position[]
  /** 전체 보유분·매매 기록 (저장 전 '그 날짜에 가진 수량' 검사용) */
  holdings: StockHolding[]
  trades: StockTrade[]
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
export default function TradeForm({ side, accounts, positions, holdings, trades, priceByCode, row, initialPositionKey, onSave, onDone, onCancel }: Props) {
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

  // 매수: 종목코드(미국은 티커)를 넣고 잠깐 멈추면 종목명을 채운다.
  // 직접 고친 이름은 덮어쓰지 않도록, 자동으로 채운 이름(autoName)이거나 비어 있을 때만 바꾼다
  const autoName = useRef('')
  // 어느 종목을 조회했고 결과가 어땠는지 (시장·코드가 바뀌면 이전 결과는 무시)
  const [lookup, setLookup] = useState<{ key: string; status: 'loading' | 'notFound' } | null>(null)
  const lookupCodeOf = (market: Market, code: string) => {
    if (side !== 'buy') return ''
    // 한국 종목은 6자리를 다 넣었을 때만 (덜 넣으면 앞을 0으로 채워서 엉뚱한 종목을 찾게 된다)
    if (market === 'KR' && code.trim().length !== 6) return ''
    const c = normalizeCode(market, code)
    return c && !codeProblem(market, c) ? c : ''
  }
  const lookupCode = lookupCodeOf(v.market, v.stock_code)
  const lookupKey = lookupCode && `${v.market}:${lookupCode}`
  // 전에 적어 둔 이름이 있으면 조회하지 않는다 (직접 적은 '알파벳 A' 같은 이름을 그대로 쓴다)
  const known = lookupCode ? knownStockName(v.market, lookupCode, holdings, trades) : null
  const nameLookup = lookup?.key === lookupKey ? lookup.status : 'idle'

  function fillName(name: string) {
    setV((prev) => {
      if (prev.stock_name.trim() && prev.stock_name !== autoName.current) return prev
      autoName.current = name
      return { ...prev, stock_name: name }
    })
  }

  function changeCode(code: string) {
    set('stock_code', code)
    const c = lookupCodeOf(v.market, code)
    const name = c && knownStockName(v.market, c, holdings, trades)
    if (name) fillName(name)
  }

  useEffect(() => {
    if (!lookupKey || known) return
    let cancelled = false
    const timer = setTimeout(async () => {
      setLookup({ key: lookupKey, status: 'loading' })
      const name = await lookupStockName(v.market, lookupCode)
      if (cancelled) return
      if (name) fillName(name)
      setLookup(name ? null : { key: lookupKey, status: 'notFound' })
    }, 500)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [lookupKey, v.market, lookupCode, known])

  function changeMarket(market: Market) {
    // 미국 주식으로 바꾸면 환율에 오늘 환율을 미리 채워 둔다 (예전 거래면 그날 환율로 고치면 됨)
    setV((prev) => {
      let fx = market === 'US' ? prev.fx_rate : ''
      if (market === 'US' && fx === '' && fxNow) fx = String(fxNow)
      return { ...prev, market, fx_rate: fx }
    })
    // 코드를 먼저 넣고 시장을 바꾼 경우에도 전에 적어 둔 이름을 채운다
    const c = lookupCodeOf(market, v.stock_code)
    const name = c && knownStockName(market, c, holdings, trades)
    if (name) fillName(name)
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
  // 새 매도: 지금 가진 수량까지만 팔 수 있다 (수정은 아래 '그 날짜 기준 보유' 검사로 확인)
  const sellable = position?.quantity ?? 0

  // 저장할 값 (검사에도 같은 값을 쓴다)
  const code = isSell ? (row?.stock_code ?? position?.code ?? '') : normalizeCode(v.market, v.stock_code)
  const values: Record<string, unknown> = {
    account_id: isSell ? (row?.account_id ?? position?.accountId) : v.account_id,
    market,
    stock_code: code,
    stock_name: isSell ? (row?.stock_name ?? position?.name) : v.stock_name.trim(),
    side,
    trade_date: v.trade_date || null,
    price,
    quantity: qty,
    fx_rate: market === 'US' ? toNumber(v.fx_rate) : null,
    fee: toNumber(v.fee) ?? 0,
    memo: v.memo.trim() || null,
  }

  let problem: string | null = null
  if (isSell && !isEdit && !position) problem = '팔 종목을 골라 주세요'
  else if (!isSell && !v.account_id) problem = '계좌를 골라 주세요'
  else if (!isSell && codeProblem(v.market, code)) problem = codeProblem(v.market, code)
  else if (!isSell && !v.stock_name.trim()) problem = '종목명을 넣어 주세요'
  // 매도는 날짜가 있어야 '그때 가진 수량'을 알 수 있다. 매수는 엑셀에서 옮긴 날짜 없는 기록만 비워 둘 수 있음
  else if ((isSell || !isEdit) && !v.trade_date) problem = `${isSell ? '매도' : '매수'}일을 넣어 주세요`
  else if (!price || price <= 0) problem = '단가를 넣어 주세요'
  else if (!qty || qty <= 0) problem = '수량을 넣어 주세요'
  else if (market === 'US' && !toNumber(v.fx_rate))
    problem = fxNow ? '환율을 넣어 주세요' : "환율을 넣어 주세요 ('현재가 새로고침'을 누르면 오늘 환율을 받아 와요)"
  else if (isSell && !isEdit && qty > sellable + 1e-9) problem = `보유 수량(${formatNumber(sellable)}주)보다 많이 팔 수 없어요`
  else {
    // 이 기록을 반영했을 때 어떤 매도가 그 날짜에 가진 수량보다 많아지면 막는다
    // 새 기록은 같은 날짜 안에서 맨 뒤로 ('9999' 는 어떤 입력 시각보다 뒤)
    const candidate = { ...row, ...values, id: row?.id ?? '__new__', created_at: row?.created_at ?? '9999' } as StockTrade
    const after = isEdit ? trades.map((t) => (t.id === row.id ? candidate : t)) : [...trades, candidate]
    problem = oversellProblem({ holdings, trades }, { holdings, trades: after })
  }

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
    setSaving(true)
    try {
      await onSave(isEdit ? { ...values, id: row.id } : values)
      onDone()
    } catch {
      // 오류 알림은 main.tsx 의 MutationCache 가 띄운다. 폼은 열어 둔다.
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
            <input className={inputCls} placeholder={v.market === 'US' ? 'AAPL' : '000660'} value={v.stock_code} onChange={(e) => changeCode(e.target.value)} />
          </Field>
          <Field label="종목명" required>
            <input
              className={inputCls}
              value={v.stock_name}
              placeholder={v.market === 'US' ? '티커를 넣으면 자동으로 채워요' : '종목코드를 넣으면 자동으로 채워요'}
              onChange={(e) => set('stock_name', e.target.value)}
            />
            {nameLookup === 'loading' && <span className="block text-xs text-slate-400">이름 찾는 중…</span>}
            {nameLookup === 'notFound' && !v.stock_name.trim() && (
              <span className="block text-xs text-slate-500">이름을 못 찾았어요. 직접 입력해 주세요</span>
            )}
          </Field>
        </>
      )}
      <Field label={isSell ? '매도일' : '매수일'} required={isSell || !isEdit}>
        <input type="date" className={inputCls} value={v.trade_date} onChange={(e) => set('trade_date', e.target.value)} />
      </Field>
      <Field label={`${isSell ? '매도' : '매수'}단가 (${unit})`} required>
        <NumberInput value={v.price} onChange={(x) => set('price', x)} />
      </Field>
      <Field label={isSell && !isEdit && position ? `수량 (최대 ${formatNumber(sellable)}주)` : '수량'} required>
        <NumberInput value={v.quantity} onChange={(x) => set('quantity', x)} />
      </Field>
      {market === 'US' && (
        <Field label={`${isSell ? '매도' : '매수'}환율 (원/$)`} required>
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
