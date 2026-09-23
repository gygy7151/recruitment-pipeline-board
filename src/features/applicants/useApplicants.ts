import { useCallback, useEffect, useState } from 'react'
import { getApplicants, moveStage } from '../../api/mock'
import type { Applicant } from '../../shared/applicant'
import type { StageId } from '../../shared/stages'

type LoadStatus = 'loading' | 'ready' | 'error'

/**
 * 지원자 목록과 단계 이동을 맡는다.
 *
 * 지금은 API 응답을 기다렸다가 화면을 바꾼다. 낙관적 업데이트와 롤백, 경쟁 상태 처리는 #6에서
 * 이 훅을 고쳐 넣는다. 먼저 기다리는 방식으로 두면 #6의 diff가 그 전환만 담게 된다.
 */
export function useApplicants() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [movingIds, setMovingIds] = useState<ReadonlySet<string>>(() => new Set())
  const [moveError, setMoveError] = useState<string | null>(null)

  useEffect(() => {
    // 컴포넌트가 사라진 뒤 도착한 응답으로 상태를 바꾸지 않는다.
    let cancelled = false

    getApplicants()
      .then((list) => {
        if (cancelled) return
        setApplicants(list)
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const moveApplicant = useCallback(async (id: string, toStage: StageId) => {
    setMovingIds((previous) => new Set(previous).add(id))
    setMoveError(null)

    try {
      const updated = await moveStage(id, toStage)

      // 서버가 이동한 지원자를 배열 끝으로 옮기므로 화면 상태도 같은 순서를 따른다.
      // 그래야 카드가 대상 컬럼의 마지막에 놓인다.
      setApplicants((previous) => {
        const index = previous.findIndex((applicant) => applicant.id === updated.id)
        if (index === -1) return previous

        const next = previous.slice()
        next.splice(index, 1)
        next.push(updated)
        return next
      })
    } catch {
      setMoveError('단계를 이동하지 못했습니다. 다시 시도해 주세요.')
    } finally {
      setMovingIds((previous) => {
        const next = new Set(previous)
        next.delete(id)
        return next
      })
    }
  }, [])

  return { applicants, status, movingIds, moveError, moveApplicant }
}
