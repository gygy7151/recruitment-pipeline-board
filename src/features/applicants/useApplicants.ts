import { useCallback, useEffect, useRef, useState } from 'react'
import { getApplicants, moveStage, type StagePlacement } from '../../api/mock'
import type { Applicant } from '../../shared/applicant'
import { insertAfter } from '../../shared/order'
import { columnIdOf, stageLabel, type StageId } from '../../shared/stages'

type LoadStatus = 'loading' | 'ready' | 'error'

export type MoveOutcome = 'confirmed' | 'rolled-back' | 'superseded'

/** 되돌리기로 카드를 돌려보낼 곳. 이동 직전의 단계와, 같은 컬럼에서 바로 앞에 있던 카드다. */
type UndoTarget = {
  applicantId: string
  stage: StageId
  after: string | null
}

export type Toast = {
  id: number
  message: string
  /** 있으면 토스트에 되돌리기 버튼이 붙는다. */
  undo?: UndoTarget
}

const TOAST_DURATION_MS = 5000
const MAX_TOASTS = 4

/** 토스트 하나의 남은 시간. 멈췄다 다시 시작할 수 있게 남은 시간을 들고 있다. */
type ToastTimer = {
  handle: ReturnType<typeof setTimeout> | null
  remaining: number
  startedAt: number
}

/** 서버 응답 처리에 필요한, 이동을 시작할 때 정해 둔 것들. */
type MoveContext = {
  /** 있으면 성공 시 되돌리기 토스트를 띄운다. 되돌리기 자체에는 넣지 않는다. */
  undo: UndoTarget | null
  /** 실패 시 서버 확정 단계로 돌아갈 때의 자리 규칙. */
  rollback: StagePlacement
}

/**
 * 지원자의 단계를 바꾼다. 자리 규칙은 서버(`moveStage`)와 똑같이 맞춘다.
 * 어긋나면 새로고침했을 때 카드가 다른 자리에 나타난다.
 */
export function applyMove(
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
  const updated = { ...moved, stage: toStage }

  if (placement === 'end') next.push(updated)
  else insertAfter(next, updated, placement.after)

  return next
}

/**
 * 같은 컬럼에서 바로 앞에 있는 카드 id. 맨 앞이면 null.
 * 되돌릴 때 이 카드 뒤에 끼우면 컬럼 안의 원래 순서가 돌아온다.
 */
function previousInColumn(applicants: Applicant[], index: number): string | null {
  const column = columnIdOf(applicants[index].stage)
  for (let i = index - 1; i >= 0; i--) {
    if (columnIdOf(applicants[i].stage) === column) return applicants[i].id
  }
  return null
}

/** 카드가 지금 있는 자리. 되돌리기 대상이자, 이동이 실패했을 때 돌아갈 자리다. */
function currentSpot(applicants: Applicant[], id: string): UndoTarget | null {
  const index = applicants.findIndex((applicant) => applicant.id === id)
  if (index === -1) return null
  return { applicantId: id, stage: applicants[index].stage, after: previousInColumn(applicants, index) }
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
 *
 * 되돌리기는 별도 경로가 아니라 같은 이동이다. 원래 단계·원래 자리로 한 번 더 옮길 뿐이라
 * 직렬화·늦은 응답 무시·실패 롤백을 그대로 물려받는다.
 * 되돌리기 토스트는 서버가 이동을 확정한 뒤에만 띄운다. 저장되지 않은 이동을 되돌리게 하면
 * 실패 롤백과 겹쳐 카드가 어디로 갈지 알 수 없다. 같은 카드를 다시 옮기면 옛 토스트는 지운다.
 */
export function useApplicants() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [toasts, setToasts] = useState<Toast[]>([])
  /** 목록 조회 시도 번호. 올리면 조회 effect가 다시 돈다. */
  const [loadAttempt, setLoadAttempt] = useState(0)

  /** 이동 직전 자리를 읽기 위한 최신 목록. 이동 함수가 목록이 바뀔 때마다 새로 만들어지지 않게 ref로 둔다. */
  const latestApplicants = useRef(applicants)
  useEffect(() => {
    latestApplicants.current = applicants
  }, [applicants])

  /** 카드별로 서버가 마지막에 확정해 준 모습. 롤백의 기준점이다. */
  const confirmed = useRef(new Map<string, Applicant>())
  /** 카드별 최신 요청 번호. 응답이 이 번호와 다르면 버린다. */
  const latestRequest = useRef(new Map<string, number>())
  /** 카드별 요청 줄. 앞 요청이 끝나야 다음 요청이 나간다. */
  const queues = useRef(new Map<string, Promise<unknown>>())
  const requestCounter = useRef(0)
  const toastCounter = useRef(0)
  const toastTimers = useRef(new Map<number, ToastTimer>())
  /** 사용자가 토스트를 가리키거나 포커스를 두고 있는 동안은 시간을 멈춘다. */
  const toastsPaused = useRef(false)

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
  }, [loadAttempt])

  /** 조회 실패 후 다시 불러온다. 앞선 시도의 응답은 effect 정리에서 버려진다. */
  const reload = useCallback(() => {
    setStatus('loading')
    setLoadAttempt((attempt) => attempt + 1)
  }, [])

  // 남아 있는 토스트 타이머를 정리한다.
  useEffect(() => {
    const timers = toastTimers.current
    return () => {
      for (const timer of timers.values()) {
        if (timer.handle) clearTimeout(timer.handle)
      }
      timers.clear()
    }
  }, [])

  const dismissToast = useCallback((id: number) => {
    const timer = toastTimers.current.get(id)
    if (timer?.handle) clearTimeout(timer.handle)
    toastTimers.current.delete(id)
    setToasts((previous) => previous.filter((toast) => toast.id !== id))
  }, [])

  const startToastTimer = useCallback(
    (id: number, remaining: number) => {
      toastTimers.current.set(id, {
        handle: setTimeout(() => dismissToast(id), remaining),
        remaining,
        startedAt: Date.now(),
      })
    },
    [dismissToast],
  )

  const pushToast = useCallback(
    (message: string, undo?: UndoTarget) => {
      const id = ++toastCounter.current
      setToasts((previous) => [...previous, { id, message, undo }].slice(-MAX_TOASTS))

      // 개수 제한이나 같은 카드 재이동으로 먼저 빠진 토스트도 타이머는 남아 있다가 제시간에 스스로 지워진다.
      if (toastsPaused.current) {
        toastTimers.current.set(id, { handle: null, remaining: TOAST_DURATION_MS, startedAt: 0 })
      } else {
        startToastTimer(id, TOAST_DURATION_MS)
      }
    },
    [startToastTimer],
  )

  /**
   * 토스트 시간을 멈추거나 이어간다. 되돌리기 버튼까지 Tab으로 가는 동안 토스트가 사라지면
   * 키보드 사용자는 되돌릴 수 없다 (WCAG 2.2.1 시간 조절).
   */
  const setToastsPaused = useCallback(
    (paused: boolean) => {
      if (toastsPaused.current === paused) return
      toastsPaused.current = paused

      const now = Date.now()
      for (const [id, timer] of toastTimers.current) {
        if (!paused) {
          startToastTimer(id, timer.remaining)
        } else if (timer.handle) {
          clearTimeout(timer.handle)
          const remaining = timer.remaining - (now - timer.startedAt)
          toastTimers.current.set(id, { handle: null, remaining, startedAt: 0 })
        }
      }
    },
    [startToastTimer],
  )

  const sendMove = useCallback(
    async (
      id: string,
      toStage: StageId,
      placement: StagePlacement,
      requestId: number,
      { undo, rollback }: MoveContext,
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

        if (undo) {
          pushToast(
            `${updated.name}: ${stageLabel(undo.stage)} → ${stageLabel(updated.stage)} 이동했습니다.`,
            undo,
          )
        }

        return 'confirmed'
      } catch {
        if (latestRequest.current.get(id) !== requestId) return 'superseded'

        const base = confirmed.current.get(id)
        if (!base) return 'superseded'

        // 이 카드만 서버 확정 상태로 되돌린다. 다른 카드의 이동에는 손대지 않는다.
        // 자리는 이동 직전 자리로 돌려놓는다. 서버는 실패한 요청에서 카드를 움직이지 않았으므로
        // 그래야 새로고침했을 때 같은 자리에 있다.
        setApplicants((previous) => applyMove(previous, id, base.stage, rollback))
        // 되돌리기 요청에는 undo를 넣지 않으므로 undo가 없으면 되돌리기가 실패한 것이다.
        // 같은 문구를 쓰면 "되돌리기를 되돌렸다"로 읽힌다.
        pushToast(
          undo
            ? `${base.name}: 이동하지 못해 ${stageLabel(base.stage)} 단계로 되돌렸습니다.`
            : `${base.name}: 되돌리지 못했습니다. ${stageLabel(base.stage)} 단계에 그대로 둡니다.`,
        )

        return 'rolled-back'
      }
    },
    [pushToast],
  )

  const startMove = useCallback(
    (
      id: string,
      toStage: StageId,
      placement: StagePlacement,
      { recordUndo }: { recordUndo: boolean },
    ): Promise<MoveOutcome> => {
      const before = currentSpot(latestApplicants.current, id)
      const context: MoveContext = {
        undo: recordUndo ? before : null,
        // 제자리 이동(결과 토글)은 카드가 자리를 떠난 적이 없으므로 제자리에서 되돌린다.
        // 앞 카드 기준으로 다시 끼우면 컬럼 순서는 같아도 전체 목록에서 자리가 바뀐다.
        rollback: placement === 'keep' || !before ? placement : { after: before.after },
      }

      const requestId = ++requestCounter.current
      latestRequest.current.set(id, requestId)

      // 같은 카드를 다시 옮기면 그 카드의 옛 되돌리기는 더 이상 "방금 한 이동"이 아니다.
      setToasts((previous) => previous.filter((toast) => toast.undo?.applicantId !== id))

      // 화면은 줄을 서지 않는다. 클릭 즉시 반영한다.
      setApplicants((previous) => applyMove(previous, id, toStage, placement))

      // 네트워크 호출만 카드별로 줄을 세운다.
      const pending = queues.current.get(id) ?? Promise.resolve()
      const run = pending.then(() =>
        sendMove(id, toStage, placement, requestId, context),
      )

      // 줄이 실패로 끊기지 않게 한다. sendMove는 스스로 처리하므로 여기서는 삼킨다.
      queues.current.set(
        id,
        run.catch(() => undefined),
      )

      return run
    },
    [sendMove],
  )

  const moveApplicant = useCallback(
    (id: string, toStage: StageId, placement: StagePlacement): Promise<MoveOutcome> =>
      startMove(id, toStage, placement, { recordUndo: true }),
    [startMove],
  )

  const undoMove = useCallback(
    (toastId: number) => {
      const target = toasts.find((toast) => toast.id === toastId)?.undo
      if (!target) return

      // 되돌리기의 되돌리기는 만들지 않는다. 카드가 돌아온 것 자체가 피드백이다.
      void startMove(target.applicantId, target.stage, { after: target.after }, { recordUndo: false })
    },
    [toasts, startMove],
  )

  return {
    applicants,
    status,
    toasts,
    moveApplicant,
    undoMove,
    dismissToast,
    setToastsPaused,
    reload,
  }
}
