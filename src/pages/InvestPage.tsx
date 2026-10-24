import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { investAccountsApi, tradesApi, useRefreshStockPrices, useSaveStockPrice, useStockPrices } from '../api/tables'
import AmountInput from '../components/AmountInput'
import CrudTable, { type Column } from '../components/CrudTable'
import { useLookups } from '../hooks/useLookups'
import { formatNumber, formatUsd, formatWon, todayString } from '../lib/format'
import { calcTrade, holdings, investSummary } from '../lib/invest'
import { FX_CODE, type InvestAccount, type Market, type StockPrice, type Trade } from '../lib/types'

/** 해당 통화로 금액 표시 (KR=원, US=달러) */
function formatLocal(value: number, market: Market) {
  return market === 'US' ? formatUsd(value) : formatWon(value)
}

function signed(value: number) {
  return <span className={value > 0 ? 'text-red-600' : value < 0 ? 'text-blue-600' : ''}>{value > 0 ? '+' : ''}{formatWon(value)}</span>
}

function rate(value: number, base: number) {
  if (base === 0) return '-'
  const r = (value / base) * 100
  return <span className={r > 0 ? 'text-red-600' : r < 0 ? 'text-blue-600' : ''}>{r > 0 ? '+' : ''}{r.toFixed(2)}%</span>
}

export default function InvestPage() {
  const { data: accounts = [] } = investAccountsApi.useList()
  const { data: trades = [] } = tradesApi.useList()
  const { data: prices = [] } = useStockPrices()
  const saveTrade = tradesApi.useSave()
  const deleteTrade = tradesApi.useDelete()
  const saveAccount = investAccountsApi.useSave()
  const deleteAccount = investAccountsApi.useDelete()
  const refresh = useRefreshStockPrices()
  const { members, memberName } = useLookups()
  // 매매 내역의 새 입력 줄 열림 여부 (보유 종목 쪽 버튼에서도 열 수 있도록 여기서 관리)
  const [addingTrade, setAddingTrade] = useState(false)
  const tradesCardRef = useRef<HTMLDivElement>(null)

  function startAddTrade() {
    setAddingTrade(true)
    tradesCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const priceByCode = new Map(prices.map((p) => [p.stock_code, p]))
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? ''

  // 계좌별 현황에서 체크한 계좌만 위쪽 합계에 넣는다 (예: 연금 계좌 제외)
  const isIncluded = (a: InvestAccount) => a.included !== false
  const includedIds = new Set(accounts.filter(isIncluded).map((a) => a.id))
  const summary = investSummary(trades.filter((t) => includedIds.has(t.account_id)), priceByCode)
  const holdingList = holdings(trades, priceByCode)
  const allIncluded = accounts.length > 0 && accounts.every(isIncluded)

  function toggleAccount(a: InvestAccount) {
    saveAccount.mutate({ id: a.id, included: !isIncluded(a) })
  }

  function toggleAll() {
    for (const a of accounts) {
      if (isIncluded(a) === allIncluded) saveAccount.mutate({ id: a.id, included: !allIncluded })
    }
  }
  const lastUpdated = prices.reduce((latest, p) => (p.updated_at > latest ? p.updated_at : latest), '')

  function handleRefresh() {
    const open = trades.filter((t) => !t.sell_date)
    const codesOf = (market: Market) => [...new Set(open.filter((t) => t.market === market).map((t) => t.stock_code))]
    refresh.mutate({ kr: codesOf('KR'), us: codesOf('US') }, {
      onSuccess: (failed) => {
        if (failed.length > 0) alert(`일부 종목은 조회하지 못했어요. 현재가를 직접 입력해 주세요.\n${failed.map((f) => `${f.code}: ${f.error}`).join('\n')}`)
      },
    })
  }

  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }))
  const fxRender = (value: number | null, t: Trade) =>
    t.market !== 'US' ? <span className="text-slate-300">-</span> : value ? formatNumber(value) : <span className="text-slate-400">현재</span>
  const tradeColumns: Column<Trade>[] = [
    { key: 'account_id', label: '계좌', input: { type: 'select', options: accountOptions }, required: true },
    {
      key: 'market',
      label: '시장',
      input: { type: 'select', options: [{ value: 'KR', label: '한국' }, { value: 'US', label: '미국' }] },
      required: true,
    },
    { key: 'stock_code', label: '종목코드', input: { type: 'text', placeholder: '000660 / AAPL' }, required: true },
    { key: 'stock_name', label: '종목명', input: { type: 'text' }, required: true },
    { key: 'buy_date', label: '매수일', input: { type: 'date' } },
    { key: 'buy_price', label: '매수단가', input: { type: 'number' }, required: true, align: 'right', render: (t) => formatLocal(t.buy_price, t.market) },
    { key: 'quantity', label: '수량', input: { type: 'number' }, required: true, align: 'right' },
    { key: 'buy_fx_rate', label: '매수환율', input: { type: 'number' }, align: 'right', render: (t) => fxRender(t.buy_fx_rate, t) },
    { key: 'sell_date', label: '매도일', input: { type: 'date' } },
    {
      key: 'sell_price',
      label: '매도단가',
      input: { type: 'number' },
      align: 'right',
      render: (t) => (t.sell_price === null ? <span className="text-slate-300">-</span> : formatLocal(t.sell_price, t.market)),
    },
    { key: 'sell_fx_rate', label: '매도환율', input: { type: 'number' }, align: 'right', render: (t) => (t.sell_date ? fxRender(t.sell_fx_rate, t) : <span className="text-slate-300">-</span>) },
    {
      key: 'fee',
      label: '수수료·세금',
      formLabel: '수수료·세금 (한국 원 / 미국 $)',
      input: { type: 'number' },
      required: true,
      align: 'right',
      render: (t) => formatLocal(t.fee, t.market),
    },
    {
      key: 'cost',
      label: '매수금액(원)',
      align: 'right',
      render: (t) => formatWon(Math.round(calcTrade(t, priceByCode).cost)),
    },
    {
      key: 'profit',
      label: '손익',
      align: 'right',
      render: (t) => {
        const r = calcTrade(t, priceByCode)
        return r.sold ? <>실현 {signed(Math.round(r.realized))}</> : signed(Math.round(r.unrealized))
      },
    },
    { key: 'memo', label: '메모', input: { type: 'text' } },
  ]

  const accountColumns: Column<InvestAccount>[] = [
    { key: 'name', label: '계좌 이름', input: { type: 'text', placeholder: '예: 진석ISA' }, required: true },
    {
      key: 'member_id',
      label: '사람',
      input: { type: 'select', options: members.map((m) => ({ value: m.id, label: m.name })), emptyLabel: '공동' },
      render: (a) => memberName(a.member_id),
    },
    { key: 'memo', label: '메모', input: { type: 'text' } },
  ]

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">투자</h2>
          <p className="mt-1 text-xs text-slate-500">
            합계는 계좌별 현황에서 체크한 계좌 {includedIds.size}개 / 전체 {accounts.length}개 기준이에요.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-sm text-slate-600">
            환율 USD/KRW
            <PriceCell code={FX_CODE} price={priceByCode.get(FX_CODE)} market="US" format={(v) => `${formatNumber(v)}원`} />
          </span>
          {lastUpdated && <span className="text-xs text-slate-500">현재가 갱신 {new Date(lastUpdated).toLocaleString('ko-KR')}</span>}
          <button className="btn btn-primary" onClick={handleRefresh} disabled={refresh.isPending || trades.length === 0}>
            {refresh.isPending ? '조회 중…' : '현재가 새로고침'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="보유 매수금액" value={formatWon(summary.cost)} />
        <Stat label="평가금액" value={formatWon(summary.value)} />
        <Stat label="평가손익" value={<>{signed(summary.unrealized)} <span className="text-sm">({rate(summary.unrealized, summary.cost)})</span></>} />
        <Stat label="실현손익" value={signed(summary.realized)} />
      </div>

      <div className="card">
        <h3 className="mb-1 font-semibold">계좌별 현황</h3>
        <p className="mb-4 text-xs text-slate-500">체크한 계좌만 위쪽 합계에 들어가요. 연금처럼 따로 보고 싶은 계좌는 체크를 풀어 두세요.</p>
        <table className="w-full text-sm tabular-nums">
          <thead className="border-b border-slate-200 text-xs text-slate-500">
            <tr>
              <th className="w-8 py-2 text-left">
                <input type="checkbox" className="size-4 cursor-pointer" checked={allIncluded} onChange={toggleAll} aria-label="전체 선택" />
              </th>
              <th className="py-2 text-left font-medium">계좌</th>
              <th className="py-2 text-right font-medium">종목 수</th>
              <th className="py-2 text-right font-medium">매수금액</th>
              <th className="py-2 text-right font-medium">평가금액</th>
              <th className="py-2 text-right font-medium">평가손익</th>
              <th className="py-2 text-right font-medium">수익률</th>
              <th className="py-2 text-right font-medium">비중</th>
              <th className="py-2 text-right font-medium">실현손익</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {accounts.map((a) => {
              const s = investSummary(trades.filter((t) => t.account_id === a.id), priceByCode)
              const count = holdingList.filter((h) => h.accountId === a.id).length
              const included = isIncluded(a)
              return (
                <tr key={a.id} className={included ? '' : 'text-slate-400'}>
                  <td className="py-2">
                    <input type="checkbox" className="size-4 cursor-pointer" checked={included} onChange={() => toggleAccount(a)} aria-label={`${a.name} 합계에 포함`} />
                  </td>
                  <td className="py-2">{a.name}</td>
                  <td className="py-2 text-right">{count}</td>
                  <td className="py-2 text-right">{formatWon(s.cost)}</td>
                  <td className="py-2 text-right">{formatWon(s.value)}</td>
                  <td className="py-2 text-right">{included ? signed(s.unrealized) : formatWon(s.unrealized)}</td>
                  <td className="py-2 text-right">{included ? rate(s.unrealized, s.cost) : '-'}</td>
                  <td className="py-2 text-right text-slate-500">
                    {included && summary.value > 0 ? `${Math.round((s.value / summary.value) * 100)}%` : '-'}
                  </td>
                  <td className="py-2 text-right">{included ? signed(s.realized) : formatWon(s.realized)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="border-t border-slate-300 font-semibold">
            <tr>
              <td />
              <td className="py-2">선택 합계</td>
              <td className="py-2 text-right">{holdingList.filter((h) => includedIds.has(h.accountId)).length}</td>
              <td className="py-2 text-right">{formatWon(summary.cost)}</td>
              <td className="py-2 text-right">{formatWon(summary.value)}</td>
              <td className="py-2 text-right">{signed(summary.unrealized)}</td>
              <td className="py-2 text-right">{rate(summary.unrealized, summary.cost)}</td>
              <td className="py-2 text-right text-slate-500">{summary.value > 0 ? '100%' : '-'}</td>
              <td className="py-2 text-right">{signed(summary.realized)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="card">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-semibold">보유 종목</h3>
          <button className="btn btn-primary" onClick={startAddTrade} disabled={accounts.length === 0}>
            + 매수 추가
          </button>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          보유 종목은 매매 내역에서 아직 팔지 않은 것을 모아서 보여줘요. 새로 산 종목은 '+ 매수 추가'로 매매 내역에 넣으세요.{' '}현재가를 클릭하고 금액을 입력한 뒤 Enter 를 누르면 직접 고칠 수 있어요. 자동 조회가 안 되는 종목에 쓰세요.</p>
        <table className="w-full text-sm tabular-nums">
          <thead className="border-b border-slate-200 text-xs text-slate-500">
            <tr>
              <th className="py-2 text-left font-medium">계좌</th>
              <th className="py-2 text-left font-medium">종목</th>
              <th className="py-2 text-right font-medium">수량</th>
              <th className="py-2 text-right font-medium">평균단가</th>
              <th className="py-2 text-right font-medium">현재가</th>
              <th className="py-2 text-right font-medium">평가금액</th>
              <th className="py-2 text-right font-medium">평가손익</th>
              <th className="py-2 text-right font-medium">수익률</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {holdingList.map((h) => (
              <tr key={h.key}>
                <td className="py-2">{accountName(h.accountId)}</td>
                <td className="py-2">
                  {h.market === 'US' && <span className="mr-1 rounded bg-slate-100 px-1 text-xs text-slate-500">US</span>}
                  {h.name} <span className="text-xs text-slate-400">{h.code}</span>
                </td>
                <td className="py-2 text-right">{formatNumber(h.quantity)}</td>
                <td className="py-2 text-right">{formatLocal(h.costLocal / h.quantity, h.market)}</td>
                <td className="py-2 text-right">
                  <PriceCell code={h.code} price={priceByCode.get(h.code)} market={h.market} format={(v) => formatLocal(v, h.market)} />
                </td>
                <td className="py-2 text-right">{formatWon(Math.round(h.value))}</td>
                <td className="py-2 text-right">{signed(Math.round(h.unrealized))}</td>
                <td className="py-2 text-right">{rate(h.unrealized, h.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {holdingList.length === 0 && <p className="py-6 text-center text-sm text-slate-400">보유 종목이 없어요.</p>}
      </div>

      <div className="card scroll-mt-4" ref={tradesCardRef}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-semibold">매매 내역</h3>
          {!addingTrade && (
            <button className="btn btn-primary" onClick={startAddTrade} disabled={accounts.length === 0}>
              + 매매 추가
            </button>
          )}
        </div>
        {accounts.length === 0 && <p className="mb-2 text-xs text-amber-700">먼저 아래 '투자 계좌'에서 계좌를 추가해 주세요.</p>}
        <p className="mb-4 text-xs text-slate-500">
          매수 1번 = 1줄. 팔았으면 그 줄에 매도일과 매도단가를 채우세요. 매수금액(원)은 단가 × 수량 × 환율로 자동 계산돼요.
          미국 주식은 단가·수수료를 달러로 넣고, 매수환율을 넣으면 환차손익까지 계산해요 (비우면 현재 환율 기준). 수수료를 모르면 0.
        </p>
        <CrudTable
          rows={trades}
          columns={tradeColumns}
          defaults={{ account_id: accounts[0]?.id ?? '', market: 'KR', fee: 0, buy_date: todayString() }}
          onSave={(values) =>
            // 미국 티커는 대문자로 통일 (aapl → AAPL)
            saveTrade.mutateAsync({ ...values, stock_code: String(values.stock_code).trim().toUpperCase() })
          }
          onDelete={(id) => deleteTrade.mutate(id)}
          adding={addingTrade}
          onAddingChange={setAddingTrade}
        />
      </div>

      <div className="card">
        <h3 className="mb-4 font-semibold">투자 계좌</h3>
        <CrudTable
          rows={accounts}
          columns={accountColumns}
          onSave={(values) => saveAccount.mutateAsync(values)}
          onDelete={(id) => deleteAccount.mutate(id)}
          addLabel="+ 계좌 추가"
        />
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

type PriceCellProps = {
  code: string
  price: StockPrice | undefined
  /** US 면 소수점(달러, 환율) 입력 */
  market: Market
  format: (value: number) => string
}

/** 클릭하면 입력칸으로 바뀌는 현재가 칸 */
function PriceCell({ code, price, market, format }: PriceCellProps) {
  const save = useSaveStockPrice()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState<number | null>(price?.price ?? null)

  if (!editing) {
    return (
      <button className="rounded px-1 hover:bg-slate-100" onClick={() => { setValue(price?.price ?? null); setEditing(true) }}>
        {price ? format(price.price) : <span className="text-amber-600">입력 필요</span>}
      </button>
    )
  }
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value) save.mutate({ stock_code: code, price: value }, { onSuccess: () => setEditing(false) })
    if (e.key === 'Escape') setEditing(false)
  }
  if (market === 'US') {
    return (
      <input
        type="number"
        step="any"
        autoFocus
        className="input w-28 py-1 text-right"
        value={value ?? ''}
        onChange={(e) => setValue(e.target.value === '' ? null : Number(e.target.value))}
        onKeyDown={handleKeyDown}
        onBlur={() => setEditing(false)}
      />
    )
  }
  return <AmountInput className="w-28 py-1" value={value} onChange={setValue} onKeyDown={handleKeyDown} onBlur={() => setEditing(false)} />
}
