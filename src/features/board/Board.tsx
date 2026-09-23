import { useCallback, useMemo } from 'react'
import type { Applicant } from '../../shared/applicant'
import { STAGES, type MoveDirection, type StageId } from '../../shared/stages'
import { ApplicantCard } from '../applicants/ApplicantCard'
import type { MoveOutcome } from '../applicants/useApplicants'
import { Column } from './Column'
import styles from './Board.module.css'

type BoardProps = {
  applicants: Applicant[]
  onMove: (id: string, toStage: StageId) => Promise<MoveOutcome>
}

function findMoveButton(id: string, direction: MoveDirection): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(`[data-move="${id}:${direction}"]`)
}

/**
 * 카드가 다른 컬럼으로 다시 그려지면 누르고 있던 버튼이 사라져 포커스가 body로 떨어진다.
 * 다음 프레임에 같은 카드의 버튼을 찾아 되돌린다.
 */
function restoreFocus(id: string, direction: MoveDirection, onlyIfFocusLost = false) {
  requestAnimationFrame(() => {
    // 되돌리기의 경우, 사용자가 이미 다른 곳으로 옮겨갔다면 포커스를 빼앗지 않는다.
    if (onlyIfFocusLost && document.activeElement !== document.body) return

    const preferred = findMoveButton(id, direction)
    // 경계 컬럼으로 옮겨가면 같은 방향 버튼이 비활성이 된다. 그때는 반대쪽 버튼을 잡는다.
    const fallback = findMoveButton(id, direction === 'next' ? 'prev' : 'next')
    const button = preferred && !preferred.disabled ? preferred : fallback

    button?.focus()
  })
}

export function Board({ applicants, onMove }: BoardProps) {
  // 컬럼마다 filter를 돌리면 1,000건 × 5컬럼을 순회하게 된다. 한 번만 순회해 단계별로 나눈다.
  const byStage = useMemo(() => {
    const groups = new Map<StageId, Applicant[]>(STAGES.map((stage) => [stage.id, []]))
    for (const applicant of applicants) {
      groups.get(applicant.stage)?.push(applicant)
    }
    return groups
  }, [applicants])

  const handleMove = useCallback(
    async (id: string, toStage: StageId, direction: MoveDirection) => {
      const outcome = onMove(id, toStage)

      // 낙관적 반영이라 카드는 이미 옮겨갔다. 응답을 기다리지 않고 바로 포커스를 따라 보낸다.
      restoreFocus(id, direction)

      // 실패해 되돌아오면 카드가 또 한 번 다시 그려진다. 그때도 포커스를 따라가게 한다.
      if ((await outcome) === 'rolled-back') {
        restoreFocus(id, direction, true)
      }
    },
    [onMove],
  )

  return (
    <div className={styles.board}>
      {STAGES.map((stage) => {
        const items = byStage.get(stage.id) ?? []
        return (
          <Column key={stage.id} stage={stage} count={items.length}>
            {items.map((applicant) => (
              <ApplicantCard key={applicant.id} applicant={applicant} onMove={handleMove} />
            ))}
          </Column>
        )
      })}
    </div>
  )
}
