import { useState } from 'react'
import { useAppSettings, useSaveAppSettings } from '../api/settings'
import AmountInput from './AmountInput'

/** 설정 > 큰 지출 기준: 이 금액 이상인 변동지출을 거래 내역·대시보드에서 강조 */
export default function BigSpendSettings() {
  const { settings, isSuccess } = useAppSettings()
  // 불러온 뒤에 입력칸을 만들어야 저장된 값으로 시작한다
  return isSuccess ? <Form key={settings.big_spend_threshold} saved={settings.big_spend_threshold} /> : null
}

function Form({ saved }: { saved: number }) {
  const save = useSaveAppSettings()
  const [amount, setAmount] = useState<number | null>(saved)
  const changed = amount !== saved

  return (
    <div className="card flex flex-wrap items-end justify-between gap-4">
      <div>
        <h3 className="font-semibold">큰 지출 기준</h3>
        <p className="text-sm text-slate-500">이 금액 이상인 변동지출을 거래 내역에서 빨간색으로 표시하고, 대시보드 ‘이번 달 큰 지출’에 모아 보여줘요.</p>
      </div>
      <div className="flex items-center gap-2">
        <AmountInput className="w-40" value={amount} onChange={setAmount} />
        <span className="text-sm text-slate-500">원 이상</span>
        <button className="btn btn-primary" disabled={!changed || !amount || save.isPending} onClick={() => amount && save.mutate({ big_spend_threshold: amount })}>
          저장
        </button>
      </div>
    </div>
  )
}
