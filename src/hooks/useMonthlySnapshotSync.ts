import { useEffect, useRef } from 'react'
import { monthlySnapshotsApi, useSaveMonthlySnapshot } from '../api/tables'
import { currentMonth } from '../lib/format'
import { isSameSnapshot, snapshotOf, toSnapshotValues } from '../lib/snapshots'
import { useAssetSummary } from './useAssetSummary'

/**
 * 앱을 열어 둔 동안 이번 달 자산 기록을 지금 값으로 맞춘다 (Layout 에서 한 번만 쓴다).
 * 그 달에 마지막으로 앱을 연 시점(또는 마지막으로 값을 고친 시점)의 값이 그 달 기록이 된다.
 */
export function useMonthlySnapshotSync() {
  const summary = useAssetSummary()
  const { data: snapshots = [], isSuccess } = monthlySnapshotsApi.useList()
  const save = useSaveMonthlySnapshot()
  // 같은 값을 저장 중에 또 보내지 않도록 마지막으로 보낸 값을 기억한다
  // (실패해도 지우지 않는다: 값이 바뀔 때까지 다시 시도하지 않아 오류 알림이 반복되지 않음)
  const lastSent = useRef('')

  const month = currentMonth()
  const values = toSnapshotValues(month, summary)
  const key = JSON.stringify(values)
  // 다 받지 못했거나 환율을 몰라 미국 종목이 빠진 상태면 저장하지 않는다 (지난 기록보다 작게 남는 것 방지)
  const ready = summary.isLoaded && !summary.fxMissing && isSuccess
  const changed = ready && !isSameSnapshot(snapshotOf(snapshots, month), values)

  useEffect(() => {
    if (!changed || save.isPending || lastSent.current === key) return
    lastSent.current = key
    save.mutate(values)
  }, [changed, key, save, values])
}
