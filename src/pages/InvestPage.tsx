import { useRef, useState } from 'react'
import { describeCounts } from '../api/counts'
import { investAccountsApi, stockHoldingsApi, stockTradesApi, useRefreshStockPrices, useStockPrices } from '../api/tables'
import CrudTable, { type Column } from '../components/CrudTable'
import HoldingForm from '../components/HoldingForm'
import { ProfitRate, SignedWon, StatCard } from '../components/Numbers'
import TradeForm from '../components/TradeForm'
import { useLookups } from '../hooks/useLookups'
import { formatNumber, formatWon } from '../lib/format'
import { analyzeInvest, investSummary, isIncluded, oversellProblem } from '../lib/invest'
import { FX_CODE, SIDE_LABEL, type InvestAccount, type Market, type StockHolding, type StockTrade, type TradeSide } from '../lib/types'
import AccountSummaryCard from './invest/AccountSummaryCard'
import HoldingsTable from './invest/HoldingsTable'
import PriceCell from './invest/PriceCell'
import { tradeColumns } from './invest/tradeColumns'

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
  const { positions, open, realizedByTrade, oversold } = analyzeInvest(stockHoldings, trades, priceByCode)
  const fxMissing = open.some((p) => p.fxMissing)

  // 계좌별 현황에서 체크한 계좌만 위쪽 합계에 넣는다 (예: 연금 계좌 제외)
  const includedIds = new Set(accounts.filter(isIncluded).map((a) => a.id))
  const summary = investSummary(positions.filter((p) => includedIds.has(p.accountId)))
  const lastUpdated = prices.reduce((latest, p) => (p.updated_at > latest ? p.updated_at : latest), '')

  /** 매수 기록·보유분을 지웠을 때 뒤의 매도가 가진 수량을 넘게 되면 막는다 */
  function confirmRemove(next: { holdings?: StockHolding[]; trades?: StockTrade[] }, question: string) {
    const problem = oversellProblem(
      { holdings: stockHoldings, trades },
      { holdings: next.holdings ?? stockHoldings, trades: next.trades ?? trades },
    )
    if (problem) {
      alert(`삭제할 수 없어요.\n${problem}\n먼저 그 매도 기록을 고치거나 지워 주세요.`)
      return false
    }
    return confirm(question)
  }

  /** 직접 넣은 보유분의 [수정] [삭제] 버튼 (보유 중·청산 종목 공용) */
  const holdingButtons = (h: StockHolding) => (
    <>
      <button className="btn btn-text" onClick={() => setHoldingForm(h)} title="직접 넣은 보유분 수정">수정</button>
      <button
        className="btn btn-danger-text"
        onClick={() =>
          confirmRemove({ holdings: stockHoldings.filter((x) => x.id !== h.id) }, '직접 넣은 보유분을 삭제할까요? (매매 내역은 그대로)') &&
          deleteHolding.mutate(h.id)
        }
      >
        삭제
      </button>
    </>
  )

  /** 투자 계좌를 지우면 그 계좌의 매매 기록·보유분도 함께 지워진다 (DB: on delete cascade) */
  function confirmDeleteAccount(a: InvestAccount) {
    const linked = describeCounts([
      ['매매 기록', trades.filter((t) => t.account_id === a.id).length],
      ['보유분', stockHoldings.filter((h) => h.account_id === a.id).length],
    ])
    const effect = linked ? `\n${linked}도 함께 삭제되고 되돌릴 수 없어요.` : ''
    return confirm(`'${a.name}' 계좌를 삭제할까요?${effect}`)
  }

  function handleRefresh() {
    const codesOf = (market: Market) => [...new Set(open.filter((p) => p.market === market).map((p) => p.code))]
    refresh.mutate({ kr: codesOf('KR'), us: codesOf('US') }, {
      onSuccess: (failed) => {
        if (failed.length > 0) alert(`일부 종목은 조회하지 못했어요. 현재가를 직접 입력해 주세요.\n${failed.map((f) => `${f.code}: ${f.error}`).join('\n')}`)
      },
    })
  }

  const accountColumns: Column<InvestAccount>[] = [
    { key: 'name', label: '계좌 이름', input: { type: 'text', placeholder: '예: 홍길동 ISA' }, required: true },
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
          <button className="btn btn-primary" onClick={handleRefresh} disabled={refresh.isPending}>
            {refresh.isPending ? '조회 중…' : '현재가 새로고침'}
          </button>
        </div>
      </header>

      {fxMissing && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          원/달러 환율을 아직 불러오지 못해서 미국 종목은 평가금액을 계산할 수 없어요 (합계에서 빠져 있어요). '현재가 새로고침'을 누르거나 위 환율을 직접 입력해 주세요.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="보유 매수금액" value={formatWon(summary.cost)} />
        <StatCard label="평가금액" value={formatWon(summary.value)} />
        <StatCard
          label="평가손익"
          value={
            <>
              <SignedWon value={summary.unrealized} />{' '}
              <span className="text-sm">(<ProfitRate value={summary.unrealized} base={summary.cost} />)</span>
            </>
          }
        />
        <StatCard label="실현손익" value={<SignedWon value={summary.realized} />} />
      </div>

      <AccountSummaryCard accounts={accounts} positions={positions} summary={summary} />

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
            trades={trades}
            priceByCode={priceByCode}
            row={holdingForm === 'new' ? undefined : holdingForm}
            onSave={(values) => saveHolding.mutateAsync(values)}
            onDone={() => setHoldingForm(null)}
            onCancel={() => setHoldingForm(null)}
          />
        )}
        <HoldingsTable
          positions={positions}
          priceByCode={priceByCode}
          accountName={accountName}
          editingHoldingId={holdingForm !== null && holdingForm !== 'new' ? holdingForm.id : undefined}
          onSell={(key) => startTrade('sell', key)}
          holdingButtons={holdingButtons}
        />
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
          미국 주식은 단가·수수료를 달러로 넣고, 거래한 날의 환율을 꼭 넣어 주세요 (오늘 환율이 미리 채워져요). 수수료를 모르면 0.
        </p>
        <CrudTable
          rows={trades}
          columns={tradeColumns({ accountName, priceByCode, realizedByTrade, oversold })}
          onSave={(values) => saveTrade.mutateAsync(values)}
          onDelete={(id) => deleteTrade.mutate(id)}
          confirmDelete={(t) => confirmRemove({ trades: trades.filter((x) => x.id !== t.id) }, `${SIDE_LABEL[t.side]} 기록을 삭제할까요?`)}
          adding={tradeForm !== null}
          onAddingChange={(opened) => setTradeForm(opened ? { side: 'buy' } : null)}
          renderForm={({ row, onDone, onCancel }) => (
            <TradeForm
              // 다른 버튼(매수↔매도, 다른 종목의 매도)을 누르면 폼을 새로 연다
              key={row ? row.id : `${tradeForm?.side}-${tradeForm?.positionKey ?? ''}`}
              side={row?.side ?? tradeForm?.side ?? 'buy'}
              accounts={accounts}
              positions={open}
              holdings={stockHoldings}
              trades={trades}
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
          confirmDelete={confirmDeleteAccount}
          addLabel="+ 계좌 추가"
        />
      </div>
    </section>
  )
}
