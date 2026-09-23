import { useCallback, useMemo } from 'react'
import type { Applicant } from '../../shared/applicant'
import { COLUMNS, columnIdOf, type ColumnId, type MoveDirection, type StageId } from '../../shared/stages'
import { ApplicantCard } from '../applicants/ApplicantCard'
import type { MoveOutcome } from '../applicants/useApplicants'
import { Column } from './Column'
import styles from './Board.module.css'

type BoardProps = {
  applicants: Applicant[]
  onMove: (id: string, toStage: StageId) => Promise<MoveOutcome>
}

/**
 * 카드가 다시 그려지면 누르고 있던 버튼이 사라져 포커스가 body로 떨어진다.
 * 다음 프레임에 후보를 순서대로 훑어 살아 있는 버튼을 잡는다.
 */
function focusAfterRender(selectors: string[], onlyIfFocusLost = false) {
  requestAnimationFrame(() => {
    // 되돌리기의 경우, 사용자가 이미 다른 곳으로 옮겨갔다면 포커스를 빼앗지 않는다.
    if (onlyIfFocusLost && document.activeElement !== document.body) return

    for (const selector of selectors) {
      const element = document.querySelector<HTMLButtonElement>(selector)
      if (element && !element.disabled) {
        element.focus()
        return
      }
    }
  })
}

export function Board({ applicants, onMove }: BoardProps) {
  // 컬럼마다 filter를 돌리면 1,000건 × 컬럼 수만큼 순회하게 된다. 한 번만 순회해 컬럼별로 나눈다.
  const byColumn = useMemo(() => {
    const groups = new Map<ColumnId, Applicant[]>(COLUMNS.map((column) => [column.id, []]))
    for (const applicant of applicants) {
      groups.get(columnIdOf(applicant.stage))?.push(applicant)
    }
    return groups
  }, [applicants])

  const runWithFocus = useCallback(
    async (id: string, toStage: StageId, selectors: string[]) => {
      const outcome = onMove(id, toStage)

      // 낙관적 반영이라 카드는 이미 옮겨갔다. 응답을 기다리지 않고 바로 포커스를 따라 보낸다.
      focusAfterRender(selectors)

      // 실패해 되돌아오면 카드가 또 한 번 다시 그려진다. 그때도 포커스를 따라가게 한다.
      if ((await outcome) === 'rolled-back') {
        focusAfterRender(selectors, true)
      }
    },
    [onMove],
  )

  const handleMove = useCallback(
    (id: string, toStage: StageId, direction: MoveDirection) => {
      const other: MoveDirection = direction === 'next' ? 'prev' : 'next'
      // 경계 컬럼으로 옮겨가면 같은 방향 버튼이 비활성이 된다. 그때는 반대쪽 버튼을 잡는다.
      void runWithFocus(id, toStage, [`[data-move="${id}:${direction}"]`, `[data-move="${id}:${other}"]`])
    },
    [runWithFocus],
  )

  const handleToggleResult = useCallback(
    (id: string, toStage: StageId) => {
      // 토글해도 카드가 목록 끝으로 밀리므로 다시 그려진다. 칩으로 포커스를 되돌린다.
      void runWithFocus(id, toStage, [`[data-toggle="${id}"]`])
    },
    [runWithFocus],
  )

  return (
    <div className={styles.board}>
      {COLUMNS.map((column) => {
        const items = byColumn.get(column.id) ?? []
        return (
          <Column key={column.id} column={column} count={items.length}>
            {items.map((applicant) => (
              <ApplicantCard
                key={applicant.id}
                applicant={applicant}
                onMove={handleMove}
                onToggleResult={handleToggleResult}
              />
            ))}
          </Column>
        )
      })}
    </div>
  )
}
