import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import {
  investAccountsApi,
  stockHoldingsApi,
  stockTradesApi,
  useRefreshStockPrices,
  useSaveStockPrice,
  useStockPrices,
} from '../api/tables'
import AmountInput from '../components/AmountInput'
import CrudTable, { type Column } from '../components/CrudTable'
import HoldingForm from '../components/HoldingForm'
import TradeForm from '../components/TradeForm'
import { useLookups } from '../hooks/useLookups'
import { formatNumber, formatUsd, formatWon } from '../lib/format'
import { analyzeInvest, investSummary, tradeAmount } from '../lib/invest'
import { FX_CODE, SIDE_LABEL, type InvestAccount, type Market, type StockHolding, type StockPrice, type StockTrade, type TradeSide } from '../lib/types'

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

/** 매수는 빨강, 매도는 파랑 */
function SideBadge({ side }: { side: TradeSide }) {
  const color = side === 'buy' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${color}`}>{SIDE_LABEL[side]}</span>
}

export default function InvestPage() {
  const { data: accounts = [] } = investAccountsApi.useList()
  const { data: stockHoldings = [] } = stockHoldingsApi.useList()
  const { data: trades = [] } = stockTradesApi.useList()
  const { data: prices = [] } = useStockPrices()
  const saveTrade = stockTradesApi.useSave()
  const deleteTrade = stockTradesApi.useDelete()
  const saveHolding = stockHoldingsApi.useSave()
  const deleteHolding = stockHoldingsApi.useDelete()
  const saveAccount = investAccountsApi.useSave()
  const deleteAccount = investAccountsApi.useDelete()
  const refresh = useRefreshStockPrices()
  const { members, memberName } = useLookups()

  // 매매 내역의 새 기록 폼: 매수/매도 중 무엇인지, 매도면 어떤 보유 종목인지
  // (보유 종목 줄의 '매도' 버튼에서도 열 수 있도록 여기서 관리)
  const [tradeForm, setTradeForm] = useState<{ side: TradeSide; positionKey?: string } | null>(null)
  const tradesCardRef = useRef<HTMLDivElement>(null)
  // 보유 종목 폼: 'new' = 추가, 객체 = 그 보유분 수정
  const [holdingForm, setHoldingForm] = useState<'new' | StockHolding | null>(null)

  function startTrade(side: TradeSide, positionKey?: string) {
    setTradeForm({ side, positionKey })
    tradesCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const priceByCode = new Map(prices.map((p) => [p.stock_code, p]))
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? ''
  const { positions, open, realizedByTrade } = analyzeInvest(stockHoldings, trades, priceByCode)

  // 계좌별 현황에서 체크한 계좌만 위쪽 합계에 넣는다 (예: 연금 계좌 제외)
  const isIncluded = (a: InvestAccount) => a.included !== false
  const includedIds = new Set(accounts.filter(isIncluded).map((a) => a.id))
  const summary = investSummary(positions.filter((p) => includedIds.has(p.accountId)))
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
    const codesOf = (market: Market) => [...new Set(open.filter((p) => p.market === market).map((p) => p.code))]
    refresh.mutate({ kr: codesOf('KR'), us: codesOf('US') }, {
      onSuccess: (failed) => {
        if (failed.length > 0) alert(`일부 종목은 조회하지 못했어요. 현재가를 직접 입력해 주세요.\n${failed.map((f) => `${f.code}: ${f.error}`).join('\n')}`)
      },
    })
  }

  const dash = <span className="text-slate-300">-</span>
  // 입력은 TradeForm 이 맡으므로 여기 열들은 표시용
  const tradeColumns: Column<StockTrade>[] = [
    { key: 'side', label: '구분', render: (t) => <SideBadge side={t.side} /> },
    { key: 'trade_date', label: '날짜' },
    { key: 'account_id', label: '계좌', render: (t) => accountName(t.account_id) },
    { key: 'market', label: '시장', render: (t) => (t.market === 'US' ? '미국' : '한국') },
    { key: 'stock_code', label: '종목코드' },
    { key: 'stock_name', label: '종목명' },
    { key: 'price', label: '단가', align: 'right', render: (t) => formatLocal(t.price, t.market) },
    { key: 'quantity', label: '수량', align: 'right', render: (t) => formatNumber(t.quantity) },
    {
      key: 'fx_rate',
      label: '환율',
      align: 'right',
      render: (t) => (t.market !== 'US' ? dash : t.fx_rate ? formatNumber(t.fx_rate) : <span className="text-slate-400">현재</span>),
    },
    { key: 'fee', label: '수수료·세금', align: 'right', render: (t) => formatLocal(t.fee, t.market) },
    { key: 'amount', label: '금액(원)', align: 'right', render: (t) => formatWon(Math.round(tradeAmount(t, priceByCode))) },
    {
      key: 'realized',
      label: '실현손익',
      align: 'right',
      render: (t) => (t.side === 'sell' ? signed(Math.round(realizedByTrade.get(t.id) ?? 0)) : dash),
    },
    { key: 'memo', label: '메모' },
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
          <button className="btn btn-primary" onClick={handleRefresh} disabled={refresh.isPending || open.length === 0}>
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
              const s = investSummary(positions.filter((p) => p.accountId === a.id))
              const count = open.filter((p) => p.accountId === a.id).length
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
              <td className="py-2 text-right">{open.filter((p) => includedIds.has(p.accountId)).length}</td>
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
          {holdingForm === null && (
            <button className="btn btn-primary" onClick={() => setHoldingForm('new')} disabled={accounts.length === 0}>
              + 보유 종목 추가
            </button>
          )}
        </div>
        <p className="mb-4 text-xs text-slate-500">
          보유 수량·평균단가 = 직접 넣은 보유분 + 매매 내역의 매수 − 매도 (이동평균). 매매 기록이 없는 종목은 '+ 보유 종목 추가'로 넣으세요.
          현재가를 클릭하고 금액을 입력한 뒤 Enter 를 누르면 직접 고칠 수 있어요. 자동 조회가 안 되는 종목에 쓰세요.
        </p>
        {holdingForm !== null && (
          <HoldingForm
            key={holdingForm === 'new' ? 'new' : holdingForm.id}
            accounts={accounts}
            holdings={stockHoldings}
            priceByCode={priceByCode}
            row={holdingForm === 'new' ? undefined : holdingForm}
            onSave={(values) => saveHolding.mutateAsync(values)}
            onDone={() => setHoldingForm(null)}
            onCancel={() => setHoldingForm(null)}
          />
        )}
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
              <th className="w-44" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {open.map((p) => {
              const avg = p.costLocal / p.quantity
              return (
                <tr key={p.key} className={holdingForm !== null && holdingForm !== 'new' && holdingForm.id === p.holding?.id ? 'bg-blue-50' : ''}>
                  <td className="py-2">{accountName(p.accountId)}</td>
                  <td className="py-2">
                    {p.market === 'US' && <span className="mr-1 rounded bg-slate-100 px-1 text-xs text-slate-500">US</span>}
                    {p.name} <span className="text-xs text-slate-400">{p.code}</span>
                  </td>
                  <td className="py-2 text-right">{formatNumber(p.quantity)}</td>
                  <td className="py-2 text-right">{formatLocal(p.market === 'US' ? avg : Math.round(avg), p.market)}</td>
                  <td className="py-2 text-right">
                    <PriceCell code={p.code} price={priceByCode.get(p.code)} market={p.market} format={(v) => formatLocal(v, p.market)} />
                  </td>
                  <td className="py-2 text-right">{formatWon(Math.round(p.value))}</td>
                  <td className="py-2 text-right">{signed(Math.round(p.unrealized))}</td>
                  <td className="py-2 text-right">{rate(p.unrealized, p.cost)}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <button className="btn btn-text text-blue-600" onClick={() => startTrade('sell', p.key)}>매도</button>
                    {/* 직접 넣은 보유분이 있는 종목만 수정·삭제 (매매 기록은 매매 내역에서) */}
                    {p.holding && (
                      <>
                        <button className="btn btn-text" onClick={() => setHoldingForm(p.holding)} title="직접 넣은 보유분 수정">수정</button>
                        <button
                          className="btn btn-danger-text"
                          onClick={() => confirm('직접 넣은 보유분을 삭제할까요? (매매 내역은 그대로)') && deleteHolding.mutate(p.holding!.id)}
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {open.length === 0 && <p className="py-6 text-center text-sm text-slate-400">보유 종목이 없어요.</p>}
      </div>

      <div className="card scroll-mt-4" ref={tradesCardRef}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-semibold">매매 내역</h3>
          <div className="flex gap-2">
            <button className="btn bg-red-600 text-white hover:bg-red-700" onClick={() => startTrade('buy')} disabled={accounts.length === 0}>
              + 매수 추가
            </button>
            <button className="btn bg-blue-600 text-white hover:bg-blue-700" onClick={() => startTrade('sell')} disabled={open.length === 0}>
              + 매도 추가
            </button>
          </div>
        </div>
        {accounts.length === 0 && <p className="mb-2 text-xs text-amber-700">먼저 아래 '투자 계좌'에서 계좌를 추가해 주세요.</p>}
        <p className="mb-4 text-xs text-slate-500">
          매수 1건 = 1줄, 매도 1건 = 1줄. 매도의 실현손익은 그때까지의 평균단가로 계산해요 (이동평균).
          미국 주식은 단가·수수료를 달러로 넣고, 환율을 비우면 현재 환율로 계산해요. 수수료를 모르면 0.
        </p>
        <CrudTable
          rows={trades}
          columns={tradeColumns}
          onSave={(values) => saveTrade.mutateAsync(values)}
          onDelete={(id) => deleteTrade.mutate(id)}
          adding={tradeForm !== null}
          onAddingChange={(opened) => setTradeForm(opened ? { side: 'buy' } : null)}
          renderForm={({ row, onDone, onCancel }) => (
            <TradeForm
              // 다른 버튼(매수↔매도, 다른 종목의 매도)을 누르면 폼을 새로 연다
              key={row ? row.id : `${tradeForm?.side}-${tradeForm?.positionKey ?? ''}`}
              side={row?.side ?? tradeForm?.side ?? 'buy'}
              accounts={accounts}
              positions={open}
              priceByCode={priceByCode}
              row={row}
              initialPositionKey={tradeForm?.positionKey}
              onSave={(values) => saveTrade.mutateAsync(values)}
              onDone={onDone}
              onCancel={onCancel}
            />
          )}
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
