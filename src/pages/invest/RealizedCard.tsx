import { useState } from 'react'
import { investIncomesApi } from '../../api/tables'
import IncomeForm from '../../components/IncomeForm'
import { SignedWon } from '../../components/Numbers'
import { formatNumber } from '../../lib/format'
import { isIncluded } from '../../lib/invest'
import { INCOME_LABEL, type IncomeKind, type InvestAccount, type InvestIncome, type Market, type StockTrade } from '../../lib/types'
import { StockName } from './common'

const TOTAL = ''

type Props = {
  accounts: InvestAccount[]
  trades: StockTrade[]
  /** 매도 기록 id → 그 매도의 실현손익 (analyzeInvest 결과) */
  realizedByTrade: Map<string, number>
  /** 직접 입력한 판매수익·배당금 */
  incomes: InvestIncome[]
}

/** 목록 한 줄: 매도 기록(자동 계산) 또는 직접 입력한 판매수익·배당금 */
type Row = {
  key: string
  date: string | null
  kind: 'sell' | IncomeKind
  accountId: string
  market: Market
  name: string
  code: string
  quantity: number | null
  amount: number
  createdAt: string
  income?: InvestIncome
}

const BADGE: Record<Row['kind'], { label: string; cls: string }> = {
  sell: { label: '매도', cls: 'bg-blue-50 text-blue-700' },
  sale: { label: INCOME_LABEL.sale, cls: 'bg-slate-100 text-slate-600' },
  dividend: { label: INCOME_LABEL.dividend, cls: 'bg-emerald-50 text-emerald-700' },
}

/** 실현손익·배당 내역: 최신순, 길면 카드 안에서 스크롤. 판매수익·배당금은 여기서 직접 넣는다 */
export default function RealizedCard({ accounts, trades, realizedByTrade, incomes }: Props) {
  const saveIncome = investIncomesApi.useSave()
  const deleteIncome = investIncomesApi.useDelete()
  const [accountId, setAccountId] = useState(TOTAL)
  // 입력 폼: 'new' = 추가, 객체 = 그 기록 수정
  const [form, setForm] = useState<'new' | InvestIncome | null>(null)
  const includedIds = new Set(accounts.filter(isIncluded).map((a) => a.id))
  const inView = (id: string) => (accountId ? id === accountId : includedIds.has(id))
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? ''

  const rows: Row[] = [
    ...trades
      .filter((t) => t.side === 'sell' && inView(t.account_id))
      .map((t) => ({
        key: t.id, date: t.trade_date, kind: 'sell' as const, accountId: t.account_id, market: t.market, name: t.stock_name, code: t.stock_code,
        quantity: t.quantity, amount: Math.round(realizedByTrade.get(t.id) ?? 0), createdAt: t.created_at,
      })),
    ...incomes
      .filter((i) => inView(i.account_id))
      .map((i) => ({
        key: i.id, date: i.income_date, kind: i.kind, accountId: i.account_id, market: i.market, name: i.stock_name, code: i.stock_code ?? '',
        quantity: null, amount: Number(i.amount), createdAt: i.created_at, income: i,
      })),
  ]
    // 날짜 없는 기록(엑셀에서 옮긴 것)은 가장 오래된 것으로 보고 맨 아래
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || b.createdAt.localeCompare(a.createdAt))
  const realized = rows.filter((r) => r.kind !== 'dividend').reduce((sum, r) => sum + r.amount, 0)
  const dividend = rows.filter((r) => r.kind === 'dividend').reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="card flex flex-col">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">실현손익 · 배당 내역</h3>
        <div className="flex gap-2">
          <select className="input py-1.5" value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label="실현손익 계좌 선택">
            <option value={TOTAL}>선택 합계</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          {form === null && (
            <button className="btn btn-primary py-1.5" onClick={() => setForm('new')} disabled={accounts.length === 0}>
              + 수익 추가
            </button>
          )}
        </div>
      </div>
      <p className="mb-3 text-sm">
        실현손익 <span className="font-semibold tabular-nums"><SignedWon value={realized} /></span>
        <span className="text-slate-300"> · </span>
        배당 <span className="font-semibold tabular-nums"><SignedWon value={dividend} /></span>
        <span className="text-slate-300"> · </span>
        합계 <span className="font-semibold tabular-nums"><SignedWon value={realized + dividend} /></span>
      </p>

      {form !== null && (
        <IncomeForm
          key={form === 'new' ? 'new' : form.id}
          accounts={accounts}
          row={form === 'new' ? undefined : form}
          onSave={(values) => saveIncome.mutateAsync(values)}
          onDone={() => setForm(null)}
          onCancel={() => setForm(null)}
        />
      )}

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">아직 매도·배당 기록이 없어요.</p>
      ) : (
        // 넓은 화면: 옆 카드(종목별 비중) 높이에 맞추고 넘치면 스크롤
        //   (목록을 absolute 로 띄워서 목록 길이가 카드 높이를 늘리지 않게 한다)
        // 좁은 화면: 최대 높이까지만 보이고 스크롤
        <div className="relative xl:min-h-60 xl:flex-1">
          <div className="max-h-96 overflow-y-auto xl:absolute xl:inset-0 xl:max-h-none">
            <table className="w-full text-sm tabular-nums">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-white text-xs whitespace-nowrap text-slate-500">
                <tr>
                  <th className="py-2 text-left font-medium">날짜</th>
                  <th className="py-2 text-left font-medium">구분</th>
                  <th className="hidden py-2 text-left font-medium 2xl:table-cell">계좌</th>
                  <th className="py-2 text-left font-medium">종목</th>
                  <th className="py-2 text-right font-medium">금액</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.key} className={form !== null && form !== 'new' && form.id === r.key ? 'bg-blue-50' : ''}>
                    <td className="py-2 pr-2 whitespace-nowrap text-slate-600">{r.date ?? '-'}</td>
                    <td className="py-2 pr-2 whitespace-nowrap">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${BADGE[r.kind].cls}`}>{BADGE[r.kind].label}</span>
                    </td>
                    <td className="hidden py-2 pr-2 whitespace-nowrap text-slate-600 2xl:table-cell">{accountName(r.accountId)}</td>
                    <td className="py-2 pr-2">
                      <StockName position={r} />
                      {r.quantity !== null && <span className="text-xs text-slate-400"> {formatNumber(r.quantity)}주</span>}
                    </td>
                    <td className="py-2 pl-2 text-right whitespace-nowrap"><SignedWon value={r.amount} /></td>
                    <td className="py-2 pl-1 text-right whitespace-nowrap">
                      {r.income ? (
                        <IncomeButtons
                          income={r.income}
                          onEdit={setForm}
                          onDelete={(i) => confirm(`${INCOME_LABEL[i.kind]} 기록을 삭제할까요?`) && deleteIncome.mutate(i.id)}
                        />
                      ) : (
                        <span className="px-2 text-xs text-slate-400" title="매도 기록은 아래 매매 내역에서 고쳐요">자동</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/** 직접 입력한 기록의 [수정] [삭제] */
function IncomeButtons({ income, onEdit, onDelete }: { income: InvestIncome; onEdit: (i: InvestIncome) => void; onDelete: (i: InvestIncome) => void }) {
  return (
    <>
      <button className="btn btn-text" onClick={() => onEdit(income)}>수정</button>
      <button className="btn btn-danger-text" onClick={() => onDelete(income)}>삭제</button>
    </>
  )
}
