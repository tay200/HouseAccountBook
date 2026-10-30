import { ResponsiveContainer, Sankey, Tooltip, type SankeyLinkProps, type SankeyNodeProps } from 'recharts'
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
export default function CashFlowSankey({ transactions, majorOf, height = 340 }: Props) {
  const flow = buildCashFlow(transactions, majorOf)
  if (!flow) return <p className="py-16 text-center text-sm text-slate-400">이 기간에는 기록이 없어요.</p>

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Sankey
        data={flow}
        node={FlowNodeShape}
        nodeWidth={10}
        // 이름표가 두 줄이라 칸 사이를 넉넉히
        nodePadding={28}
        link={FlowLinkShape}
        margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
        iterations={64}
      >
        <Tooltip formatter={(value) => formatWon(Number(value))} contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 13 }} />
      </Sankey>
    </ResponsiveContainer>
  )
}

/**
 * 줄기 하나: 돈이 흘러가는 곳의 색을 옅게 채운다 (저축=초록, 소비=주황, 남은 돈=회색).
 * '들어온 돈'으로 모이는 줄기만은 출발한 수입 색으로.
 */
function FlowLinkShape({ sourceX, sourceY, sourceControlX, targetX, targetY, targetControlX, linkWidth, payload }: SankeyLinkProps) {
  const source = payload.source as unknown as FlowNode
  const target = payload.target as unknown as FlowNode
  const color = COLOR[target.kind === 'hub' ? source.kind : target.kind]
  return (
    <path
      d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke={color}
      strokeWidth={linkWidth}
      strokeOpacity={0.35}
    />
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
        fontSize={11}
        fill={INK}
        // 글자 뒤에 흰 테두리를 깔아 링크 위에서도 읽히게
        stroke="#ffffff"
        strokeWidth={3}
        paintOrder="stroke"
      >
        {/* 이름과 금액을 두 줄로: 휴대폰처럼 열 사이가 좁아도 옆 칸과 겹치지 않게 */}
        <tspan x={textX} dy="-0.6em">
          {node.name}
        </tspan>
        <tspan x={textX} dy="1.2em" fontWeight={600}>
          {formatManwon(node.value)}
        </tspan>
      </text>
    </g>
  )
}
