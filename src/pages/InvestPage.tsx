import { useState, type ReactNode } from 'react'
import { investAccountsApi, tradesApi, useRefreshStockPrices, useSaveStockPrice, useStockPrices } from '../api/tables'
import AmountInput from '../components/AmountInput'
import CrudTable, { type Column } from '../components/CrudTable'
import { useLookups } from '../hooks/useLookups'
import { formatNumber, formatWon } from '../lib/format'
import { calcTrade, holdings, investSummary } from '../lib/invest'
import type { InvestAccount, StockPrice, Trade } from '../lib/types'

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

  const priceByCode = new Map(prices.map((p) => [p.stock_code, p]))
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? ''
  const summary = investSummary(trades, priceByCode)
  const holdingList = holdings(trades, priceByCode)
  const lastUpdated = prices.reduce((latest, p) => (p.updated_at > latest ? p.updated_at : latest), '')

  function handleRefresh() {
    const codes = [...new Set(trades.filter((t) => !t.sell_date).map((t) => t.stock_code))]
    refresh.mutate(codes, {
      onSuccess: (failed) => {
        if (failed.length > 0) alert(`일부 종목은 조회하지 못했어요. 현재가를 직접 입력해 주세요.\n${failed.map((f) => `${f.code}: ${f.error}`).join('\n')}`)
      },
    })
  }

  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }))
  const tradeColumns: Column<Trade>[] = [
    { key: 'account_id', label: '계좌', input: { type: 'select', options: accountOptions }, required: true },
    { key: 'stock_code', label: '종목코드', input: { type: 'text', placeholder: '000660' }, required: true },
    { key: 'stock_name', label: '종목명', input: { type: 'text' }, required: true },
    { key: 'buy_date', label: '매수일', input: { type: 'date' } },
    { key: 'buy_price', label: '매수단가', input: { type: 'number' }, required: true, align: 'right' },
    { key: 'quantity', label: '수량', input: { type: 'number' }, required: true, align: 'right' },
    { key: 'sell_date', label: '매도일', input: { type: 'date' } },
    { key: 'sell_price', label: '매도단가', input: { type: 'number' }, align: 'right' },
    { key: 'fee', label: '비용', input: { type: 'money' }, align: 'right' },
    {
      key: 'cost',
      label: '매수금액',
      align: 'right',
      render: (t) => formatWon(t.buy_price * t.quantity),
    },
    {
      key: 'profit',
      label: '손익',
      align: 'right',
      render: (t) => {
        const r = calcTrade(t, priceByCode)
        return r.sold ? <>실현 {signed(r.realized)}</> : signed(r.unrealized)
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
        <h2 className="text-2xl font-bold">투자</h2>
        <div className="flex items-center gap-3">
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
        <h3 className="mb-4 font-semibold">계좌별 현황</h3>
        <table className="w-full text-sm tabular-nums">
          <thead className="border-b border-slate-200 text-xs text-slate-500">
            <tr>
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
              return (
                <tr key={a.id}>
                  <td className="py-2">{a.name}</td>
                  <td className="py-2 text-right">{count}</td>
                  <td className="py-2 text-right">{formatWon(s.cost)}</td>
                  <td className="py-2 text-right">{formatWon(s.value)}</td>
                  <td className="py-2 text-right">{signed(s.unrealized)}</td>
                  <td className="py-2 text-right">{rate(s.unrealized, s.cost)}</td>
                  <td className="py-2 text-right text-slate-500">{summary.value > 0 ? `${Math.round((s.value / summary.value) * 100)}%` : '-'}</td>
                  <td className="py-2 text-right">{signed(s.realized)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 className="mb-1 font-semibold">보유 종목</h3>
        <p className="mb-4 text-xs text-slate-500">현재가를 클릭하고 금액을 입력한 뒤 Enter 를 누르면 직접 고칠 수 있어요. 자동 조회가 안 되는 종목에 쓰세요.</p>
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
                  {h.name} <span className="text-xs text-slate-400">{h.code}</span>
                </td>
                <td className="py-2 text-right">{formatNumber(h.quantity)}</td>
                <td className="py-2 text-right">{formatWon(Math.round(h.cost / h.quantity))}</td>
                <td className="py-2 text-right">
                  <PriceCell code={h.code} price={priceByCode.get(h.code)} />
                </td>
                <td className="py-2 text-right">{formatWon(h.value)}</td>
                <td className="py-2 text-right">{signed(h.unrealized)}</td>
                <td className="py-2 text-right">{rate(h.unrealized, h.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {holdingList.length === 0 && <p className="py-6 text-center text-sm text-slate-400">보유 종목이 없어요.</p>}
      </div>

      <div className="card">
        <h3 className="mb-1 font-semibold">매매 내역</h3>
        <p className="mb-4 text-xs text-slate-500">매수 1번 = 1줄. 팔았으면 그 줄에 매도일과 매도단가를 채우세요.</p>
        <CrudTable
          rows={trades}
          columns={tradeColumns}
          defaults={{ account_id: accounts[0]?.id ?? '', fee: 0 }}
          onSave={(values) => saveTrade.mutateAsync(values)}
          onDelete={(id) => deleteTrade.mutate(id)}
          addLabel="+ 매매 추가"
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

/** 클릭하면 입력칸으로 바뀌는 현재가 칸 */
function PriceCell({ code, price }: { code: string; price: StockPrice | undefined }) {
  const save = useSaveStockPrice()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState<number | null>(price?.price ?? null)

  if (!editing) {
    return (
      <button className="rounded px-1 hover:bg-slate-100" onClick={() => { setValue(price?.price ?? null); setEditing(true) }}>
        {price ? formatWon(price.price) : <span className="text-amber-600">입력 필요</span>}
      </button>
    )
  }
  return (
    <AmountInput
      className="w-28 py-1"
      value={value}
      onChange={setValue}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && value) save.mutate({ stock_code: code, price: value }, { onSuccess: () => setEditing(false) })
        if (e.key === 'Escape') setEditing(false)
      }}
      onBlur={() => setEditing(false)}
    />
  )
}
