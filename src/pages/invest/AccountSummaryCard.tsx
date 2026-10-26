import { investAccountsApi } from '../../api/tables'
import { ProfitRate, SignedWon } from '../../components/Numbers'
import { formatWon } from '../../lib/format'
import { investSummary, isIncluded, withIncomes, type Position } from '../../lib/invest'
import type { InvestAccount, InvestIncome } from '../../lib/types'

type Props = {
  accounts: InvestAccount[]
  positions: Position[]
  /** 직접 입력한 판매수익·배당금 */
  incomes: InvestIncome[]
  /** 체크한 계좌들의 합계 */
  summary: ReturnType<typeof withIncomes>
}

/** 계좌별 현황. 체크한 계좌만 위쪽 합계에 들어간다 (예: 연금 계좌 제외) */
export default function AccountSummaryCard({ accounts, positions, incomes, summary }: Props) {
  const saveAccount = investAccountsApi.useSave()
  const includedIds = new Set(accounts.filter(isIncluded).map((a) => a.id))
  const allIncluded = accounts.length > 0 && accounts.every(isIncluded)
  const openCount = (accountIds: (id: string) => boolean) => positions.filter((p) => p.quantity > 0 && accountIds(p.accountId)).length

  function toggleAll() {
    for (const a of accounts) {
      if (isIncluded(a) === allIncluded) saveAccount.mutate({ id: a.id, included: !allIncluded })
    }
  }

  return (
    <div className="card">
      <h3 className="mb-1 font-semibold">계좌별 현황</h3>
      <p className="mb-4 text-xs text-slate-500">체크한 계좌만 위쪽 합계에 들어가요. 연금처럼 따로 보고 싶은 계좌는 체크를 풀어 두세요.</p>
      <div className="overflow-x-auto">
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
            <th className="py-2 text-right font-medium">배당</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {accounts.map((a) => {
            const s = withIncomes(investSummary(positions.filter((p) => p.accountId === a.id)), incomes.filter((i) => i.account_id === a.id))
            const included = isIncluded(a)
            return (
              <tr key={a.id} className={included ? '' : 'text-slate-400'}>
                <td className="py-2">
                  <input
                    type="checkbox"
                    className="size-4 cursor-pointer"
                    checked={included}
                    onChange={() => saveAccount.mutate({ id: a.id, included: !included })}
                    aria-label={`${a.name} 합계에 포함`}
                  />
                </td>
                <td className="py-2">{a.name}</td>
                <td className="py-2 text-right">{openCount((id) => id === a.id)}</td>
                <td className="py-2 text-right">{formatWon(s.cost)}</td>
                <td className="py-2 text-right">{formatWon(s.value)}</td>
                <td className="py-2 text-right">{included ? <SignedWon value={s.unrealized} /> : formatWon(s.unrealized)}</td>
                <td className="py-2 text-right">{included ? <ProfitRate value={s.unrealized} base={s.cost} /> : '-'}</td>
                <td className="py-2 text-right text-slate-500">
                  {included && summary.value > 0 ? `${Math.round((s.value / summary.value) * 100)}%` : '-'}
                </td>
                <td className="py-2 text-right">{included ? <SignedWon value={s.realized} /> : formatWon(s.realized)}</td>
                <td className="py-2 text-right">{included ? <SignedWon value={s.dividend} /> : formatWon(s.dividend)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot className="border-t border-slate-300 font-semibold">
          <tr>
            <td />
            <td className="py-2">선택 합계</td>
            <td className="py-2 text-right">{openCount((id) => includedIds.has(id))}</td>
            <td className="py-2 text-right">{formatWon(summary.cost)}</td>
            <td className="py-2 text-right">{formatWon(summary.value)}</td>
            <td className="py-2 text-right"><SignedWon value={summary.unrealized} /></td>
            <td className="py-2 text-right"><ProfitRate value={summary.unrealized} base={summary.cost} /></td>
            <td className="py-2 text-right text-slate-500">{summary.value > 0 ? '100%' : '-'}</td>
            <td className="py-2 text-right"><SignedWon value={summary.realized} /></td>
            <td className="py-2 text-right"><SignedWon value={summary.dividend} /></td>
          </tr>
        </tfoot>
      </table>
      </div>
    </div>
  )
}
