import { formatWon } from '../lib/format'

// 상태 색은 '좋음/주의/초과' 의미로만 쓰고, 색만으로 전달하지 않도록 글자 라벨을 함께 보여준다
const STATUS = {
  good: { color: '#0ca30c', text: 'text-slate-500' },
  warning: { color: '#fab219', text: 'text-amber-700' },
  over: { color: '#d03b3b', text: 'text-red-600' },
}

type Props = {
  spent: number
  budget: number
}

/** 예산 대비 사용량 막대. 80% 이상이면 주의, 100% 를 넘으면 초과로 표시 */
export default function BudgetBar({ spent, budget }: Props) {
  const ratio = budget > 0 ? spent / budget : 0
  const status = ratio > 1 ? STATUS.over : ratio >= 0.8 ? STATUS.warning : STATUS.good
  const remaining = budget - spent

  return (
    <div className="space-y-1">
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(ratio, 1) * 100}%`, backgroundColor: status.color }}
        />
      </div>
      <div className={`flex justify-between text-xs tabular-nums ${status.text}`}>
        <span>{Math.round(ratio * 100)}% 사용</span>
        <span>{remaining >= 0 ? `${formatWon(remaining)} 남음` : `${formatWon(-remaining)} 초과`}</span>
      </div>
    </div>
  )
}
