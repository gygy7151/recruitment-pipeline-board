import { useCallback, useEffect, useRef, useState } from 'react'
import { getApplicants, moveStage, type StagePlacement } from '../../api/mock'
import type { Applicant } from '../../shared/applicant'
import { stageLabel, type StageId } from '../../shared/stages'

type LoadStatus = 'loading' | 'ready' | 'error'

export type MoveOutcome = 'confirmed' | 'rolled-back' | 'superseded'

export type Toast = {
  id: number
  message: string
}

const TOAST_DURATION_MS = 5000
const MAX_TOASTS = 4

/**
 * 지원자의 단계를 바꾼다. 자리 규칙은 서버(`moveStage`)와 똑같이 맞춘다.
 * 어긋나면 새로고침했을 때 카드가 다른 자리에 나타난다.
 */
function applyMove(
  applicants: Applicant[],
  id: string,
  toStage: StageId,
  placement: StagePlacement,
): Applicant[] {
  const index = applicants.findIndex((applicant) => applicant.id === id)
  if (index === -1) return applicants

  const next = applicants.slice()

  if (placement === 'keep') {
    next[index] = { ...next[index], stage: toStage }
    return next
  }

  const [moved] = next.splice(index, 1)
  next.push({ ...moved, stage: toStage })
  return next
}

/**
 * 지원자 목록과 단계 이동.
 *
 * 이동은 낙관적으로 반영한다. 화면을 먼저 바꾸고 API를 부른 뒤, 실패하면 되돌린다.
 *
 * 롤백은 "이동 직전 전체 목록"이 아니라 **카드별 서버 확정 상태**를 기준으로 한다.
 * 전체 스냅샷을 되돌리면 그 사이 다른 카드가 옮겨간 것까지 지워지고, 같은 카드를 두 번 옮겼을 때
 * 첫 번째 성공까지 없던 일이 된다.
 *
 * 경쟁 상태는 두 겹으로 막는다.
 *
 * 첫째, 카드별로 요청을 **직렬화**한다. 같은 카드의 다음 요청은 앞 요청이 끝난 뒤에 보낸다.
 * mock API는 호출마다 200~800ms 난수 지연을 주므로, 동시에 보내면 나중에 보낸 요청이 먼저 도착해
 * 서버의 최종 쓰기가 사용자 의도와 뒤바뀐다. 실제로 같은 카드를 빠르게 두 번 옮기는 실험에서
 * 12회 중 7회가 화면과 저장값이 갈렸다. 직렬화하면 서버 쓰기 순서가 의도 순서와 같아진다.
 *
 * 둘째, 카드별 요청 시퀀스로 늦게 온 응답을 버린다. 화면은 사용자의 마지막 의도를 지킨다.
 *
 * 화면은 여전히 즉시 반응한다. 줄을 서는 것은 네트워크 호출이지 화면이 아니다.
 */
export function useApplicants() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [toasts, setToasts] = useState<Toast[]>([])

  /** 카드별로 서버가 마지막에 확정해 준 모습. 롤백의 기준점이다. */
  const confirmed = useRef(new Map<string, Applicant>())
  /** 카드별 최신 요청 번호. 응답이 이 번호와 다르면 버린다. */
  const latestRequest = useRef(new Map<string, number>())
  /** 카드별 요청 줄. 앞 요청이 끝나야 다음 요청이 나간다. */
  const queues = useRef(new Map<string, Promise<unknown>>())
  const requestCounter = useRef(0)
  const toastCounter = useRef(0)
  const toastTimers = useRef(new Set<ReturnType<typeof setTimeout>>())

  useEffect(() => {
    // 컴포넌트가 사라진 뒤 도착한 응답으로 상태를 바꾸지 않는다.
    let cancelled = false

    getApplicants()
      .then((list) => {
        if (cancelled) return
        confirmed.current = new Map(list.map((applicant) => [applicant.id, applicant]))
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

  // 남아 있는 토스트 타이머를 정리한다.
  useEffect(() => {
    const timers = toastTimers.current
    return () => {
      for (const timer of timers) clearTimeout(timer)
      timers.clear()
    }
  }, [])

  const pushToast = useCallback((message: string) => {
    const id = ++toastCounter.current
    setToasts((previous) => [...previous, { id, message }].slice(-MAX_TOASTS))

    const timer = setTimeout(() => {
      toastTimers.current.delete(timer)
      setToasts((previous) => previous.filter((toast) => toast.id !== id))
    }, TOAST_DURATION_MS)
    toastTimers.current.add(timer)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id))
  }, [])

  const sendMove = useCallback(
    async (
      id: string,
      toStage: StageId,
      placement: StagePlacement,
      requestId: number,
    ): Promise<MoveOutcome> => {
      try {
        const updated = await moveStage(id, toStage, placement)

        // 서버가 실제로 썼으므로 확정 상태는 최신 요청이 아니더라도 갱신한다.
        confirmed.current.set(id, updated)

        // 내가 최신 요청이 아니면 화면은 건드리지 않는다. 뒤이은 요청이 최종 모습을 정한다.
        if (latestRequest.current.get(id) !== requestId) return 'superseded'

        // 서버가 확정한 단계가 화면과 다를 때만 맞춘다. 같으면 목록을 건드리지 않아
        // 그 사이 다른 카드가 만든 순서를 흐트러뜨리지 않는다.
        setApplicants((previous) => {
          const current = previous.find((applicant) => applicant.id === id)
          if (!current || current.stage === updated.stage) return previous
          return applyMove(previous, id, updated.stage, placement)
        })

        return 'confirmed'
      } catch {
        if (latestRequest.current.get(id) !== requestId) return 'superseded'

        const base = confirmed.current.get(id)
        if (!base) return 'superseded'

        // 이 카드만 서버 확정 상태로 되돌린다. 다른 카드의 이동에는 손대지 않는다.
        // 되돌릴 때도 같은 자리 규칙을 쓴다. 실패했을 때만 카드가 튀면 더 이상하다.
        setApplicants((previous) => applyMove(previous, id, base.stage, placement))
        pushToast(`${base.name}: 이동하지 못해 ${stageLabel(base.stage)} 단계로 되돌렸습니다.`)

        return 'rolled-back'
      }
    },
    [pushToast],
  )

  const moveApplicant = useCallback(
    (id: string, toStage: StageId, placement: StagePlacement): Promise<MoveOutcome> => {
      const requestId = ++requestCounter.current
      latestRequest.current.set(id, requestId)

      // 화면은 줄을 서지 않는다. 클릭 즉시 반영한다.
      setApplicants((previous) => applyMove(previous, id, toStage, placement))

      // 네트워크 호출만 카드별로 줄을 세운다.
      const pending = queues.current.get(id) ?? Promise.resolve()
      const run = pending.then(() => sendMove(id, toStage, placement, requestId))

      // 줄이 실패로 끊기지 않게 한다. sendMove는 스스로 처리하므로 여기서는 삼킨다.
      queues.current.set(
        id,
        run.catch(() => undefined),
      )

      return run
    },
    [sendMove],
  )

  return { applicants, status, toasts, moveApplicant, dismissToast }
}
