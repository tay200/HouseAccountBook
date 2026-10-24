import { useRef, useState, type KeyboardEvent } from 'react'
import { useSaveStockPrice } from '../../api/tables'
import AmountInput from '../../components/AmountInput'
import type { Market, StockPrice } from '../../lib/types'

type Props = {
  code: string
  price: StockPrice | undefined
  /** US 면 소수점(달러, 환율) 입력 */
  market: Market
  format: (value: number) => string
}

/** 클릭하면 입력칸으로 바뀌는 현재가 칸 (자동 조회가 안 되는 종목, 환율 직접 입력용) */
export default function PriceCell({ code, price, market, format }: Props) {
  const save = useSaveStockPrice()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState<number | null>(price?.price ?? null)
  // Esc 로 닫을 때는 저장하지 않는다
  const cancelled = useRef(false)

  if (!editing) {
    return (
      <button className="rounded px-1 hover:bg-slate-100" onClick={() => { setValue(price?.price ?? null); cancelled.current = false; setEditing(true) }}>
        {price ? format(price.price) : <span className="text-amber-600">입력 필요</span>}
      </button>
    )
  }
  // Enter 를 누르거나 다른 곳을 클릭하면 저장 (값이 바뀌었을 때만)
  function commit() {
    if (!cancelled.current && value && value > 0 && value !== price?.price) save.mutate({ stock_code: code, price: value })
    setEditing(false)
  }
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') cancelled.current = true
    if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
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
        onBlur={commit}
      />
    )
  }
  return <AmountInput autoFocus className="w-28 py-1" value={value} onChange={setValue} onKeyDown={handleKeyDown} onBlur={commit} />
}
