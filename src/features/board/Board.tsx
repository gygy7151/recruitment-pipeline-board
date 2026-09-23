import { useCallback, useMemo } from 'react'
import type { Applicant } from '../../shared/applicant'
import { STAGES, type MoveDirection, type StageId } from '../../shared/stages'
import { ApplicantCard } from '../applicants/ApplicantCard'
import { Column } from './Column'
import styles from './Board.module.css'

type BoardProps = {
  applicants: Applicant[]
  movingIds: ReadonlySet<string>
  onMove: (id: string, toStage: StageId) => Promise<void>
}

function findMoveButton(id: string, direction: MoveDirection): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(`[data-move="${id}:${direction}"]`)
}

export function Board({ applicants, movingIds, onMove }: BoardProps) {
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
      await onMove(id, toStage)

      // 이동이 끝나면 카드가 다른 컬럼에 다시 그려지고, 이동 중 버튼이 비활성이었던 탓에
      // 포커스는 이미 body로 떨어져 있다. 다음 프레임에 같은 카드의 버튼을 찾아 되돌린다.
      // 호출마다 별도 클로저라 이동이 겹쳐도 서로 섞이지 않고, 실패해도 똑같이 복원된다.
      requestAnimationFrame(() => {
        const preferred = findMoveButton(id, direction)
        // 경계 컬럼으로 옮겨가면 같은 방향 버튼이 비활성이 된다. 그때는 반대쪽 버튼을 잡는다.
        const fallback = findMoveButton(id, direction === 'next' ? 'prev' : 'next')
        const button = preferred && !preferred.disabled ? preferred : fallback

        button?.focus()
      })
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
              <ApplicantCard
                key={applicant.id}
                applicant={applicant}
                isMoving={movingIds.has(applicant.id)}
                onMove={handleMove}
              />
            ))}
          </Column>
        )
      })}
    </div>
  )
}
