import { ResponsiveContainer, Sankey, Tooltip, type SankeyNodeProps } from 'recharts'
import { buildCashFlow, type FlowKind, type FlowNode } from '../lib/cashflow'
import { formatManwon, formatWon } from '../lib/format'
import type { Transaction } from '../lib/types'

// 앱 차트와 같은 검증된 팔레트: 수입=파랑, 소비=주황, 저축=초록. 남은 돈·모아 둔 돈은 회색
// (초록은 배경 대비가 낮아 모든 칸에 이름표를 붙인다)
const COLOR: Record<FlowKind, string> = {
  income: '#2a78d6',
  hub: '#2a78d6',
  shortfall: '#94a3b8',
  saving: '#1baf7a',
  consumption: '#eb6834',
  category: '#eb6834',
  left: '#94a3b8',
}
const INK = '#334155'

type Props = {
  transactions: Transaction[]
  majorOf: (categoryId: string | null) => { name: string } | undefined
  height?: number
}

/** 현금흐름 Sankey: 수입 → 들어온 돈 → 저축성·소비성·남은 돈 → 소비성 대분류 */
export default function CashFlowSankey({ transactions, majorOf, height = 320 }: Props) {
  const flow = buildCashFlow(transactions, majorOf)
  if (!flow) return <p className="py-16 text-center text-sm text-slate-400">이 기간에는 기록이 없어요.</p>

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Sankey
        data={flow}
        node={FlowNodeShape}
        nodeWidth={10}
        nodePadding={18}
        // 링크는 출발 칸 색을 옅게 (색은 이름표와 함께 쓴다)
        link={{ stroke: '#cbd5e1', strokeOpacity: 0.5 }}
        margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
        iterations={64}
      >
        <Tooltip formatter={(value) => formatWon(Number(value))} contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 13 }} />
      </Sankey>
    </ResponsiveContainer>
  )
}

/** 칸 하나: 색 막대 + 이름·금액. 맨 오른쪽 열은 이름표를 막대 왼쪽에 둔다 */
function FlowNodeShape({ x, y, width, height, payload }: SankeyNodeProps) {
  const node = payload as unknown as FlowNode & { value: number }
  const left = node.last
  const textX = left ? x - 6 : x + width + 6
  return (
    <g>
      <rect x={x} y={y} width={width} height={Math.max(height, 2)} rx={2} fill={COLOR[node.kind]} />
      <text
        x={textX}
        y={y + height / 2}
        textAnchor={left ? 'end' : 'start'}
        dominantBaseline="middle"
        fontSize={12}
        fill={INK}
        // 글자 뒤에 흰 테두리를 깔아 링크 위에서도 읽히게
        stroke="#ffffff"
        strokeWidth={3}
        paintOrder="stroke"
      >
        {node.name} <tspan fontWeight={600}>{formatManwon(node.value)}</tspan>
      </text>
    </g>
  )
}
