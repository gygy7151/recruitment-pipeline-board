import { useCallback, useMemo, useState } from 'react'
import type { StagePlacement } from '../../api/mock'
import type { Applicant } from '../../shared/applicant'
import {
  COLUMNS,
  columnIdOf,
  isResultDecision,
  resultStageFor,
  type ColumnId,
  type MoveDirection,
  type StageId,
} from '../../shared/stages'
import { ApplicantCard } from '../applicants/ApplicantCard'
import { ApplicantDrawer } from '../applicants/ApplicantDrawer'
import { ResultConfirmDialog } from '../applicants/ResultConfirmDialog'
import type { MoveOutcome } from '../applicants/useApplicants'
import { Column } from './Column'
import { ColumnTabs } from './ColumnTabs'
import styles from './Board.module.css'

type BoardProps = {
  applicants: Applicant[]
  onMove: (id: string, toStage: StageId, placement: StagePlacement) => Promise<MoveOutcome>
}

/** 확인 창이 떠 있는 동안 기억해 두는 이동. 답을 받으면 그때 실제로 옮긴다. */
type PendingDecision = {
  applicant: Applicant
  direction: MoveDirection
}

function moveButtonSelector(id: string, direction: MoveDirection): string {
  return `[data-move="${id}:${direction}"]`
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
  const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(null)
  // 좁은 화면에서 지금 보이는 컬럼. 넓은 화면에서는 네 컬럼이 모두 보여 쓰이지 않는다.
  const [activeColumn, setActiveColumn] = useState<ColumnId>(COLUMNS[0].id)
  // 상세에 띄운 지원자. 객체가 아니라 id를 들고 목록에서 찾는다. 열기 직전에 보낸 이동이
  // 열려 있는 동안 롤백돼도 drawer가 실제 단계를 보여주게 하기 위해서다.
  const [detailId, setDetailId] = useState<string | null>(null)
  const detailApplicant = useMemo(
    () => (detailId ? (applicants.find((applicant) => applicant.id === detailId) ?? null) : null),
    [applicants, detailId],
  )
  // 목록에서 사라졌으면 id도 비운다. 남겨 두면 같은 id가 다시 나타날 때 drawer가 저절로 열린다.
  if (detailId && !detailApplicant) setDetailId(null)

  // 컬럼마다 filter를 돌리면 1,000건 × 컬럼 수만큼 순회하게 된다. 한 번만 순회해 컬럼별로 나눈다.
  const byColumn = useMemo(() => {
    const groups = new Map<ColumnId, Applicant[]>(COLUMNS.map((column) => [column.id, []]))
    for (const applicant of applicants) {
      groups.get(columnIdOf(applicant.stage))?.push(applicant)
    }
    return groups
  }, [applicants])

  const runWithFocus = useCallback(
    async (
      id: string,
      toStage: StageId,
      placement: StagePlacement,
      selectors: string[],
    ): Promise<MoveOutcome> => {
      const outcome = onMove(id, toStage, placement)

      // 낙관적 반영이라 카드는 이미 옮겨갔다. 응답을 기다리지 않고 바로 포커스를 따라 보낸다.
      focusAfterRender(selectors)

      const settled = await outcome

      // 실패해 되돌아오면 카드가 또 한 번 다시 그려진다. 그때도 포커스를 따라가게 한다.
      if (settled === 'rolled-back') {
        focusAfterRender(selectors, true)
      }

      return settled
    },
    [onMove],
  )

  const moveToColumn = useCallback(
    async (applicant: Applicant, toStage: StageId, direction: MoveDirection) => {
      const other: MoveDirection = direction === 'next' ? 'prev' : 'next'
      const fromColumn = columnIdOf(applicant.stage)

      // 좁은 화면에서는 옮겨간 컬럼으로 함께 넘어간다. 그러지 않으면 카드가 보이지 않는 곳으로
      // 사라져 어디로 갔는지 알 수 없다.
      setActiveColumn(columnIdOf(toStage))

      // 경계 컬럼으로 옮겨가면 같은 방향 버튼이 비활성이 된다. 그때는 반대쪽 버튼을 잡는다.
      const outcome = await runWithFocus(applicant.id, toStage, 'end', [
        moveButtonSelector(applicant.id, direction),
        moveButtonSelector(applicant.id, other),
      ])

      // 되돌아왔으면 보이는 컬럼도 함께 되돌린다.
      if (outcome === 'rolled-back') setActiveColumn(fromColumn)
    },
    [runWithFocus],
  )

  const handleMove = useCallback(
    (applicant: Applicant, toStage: StageId, direction: MoveDirection) => {
      // 합격 여부가 걸린 이동은 묻고 나서 옮긴다. 확인 전에는 카드가 움직이지 않는다.
      if (isResultDecision(toStage, direction)) {
        setPendingDecision({ applicant, direction })
        return
      }
      void moveToColumn(applicant, toStage, direction)
    },
    [moveToColumn],
  )

  const handleToggleResult = useCallback(
    (applicant: Applicant, toStage: StageId) => {
      // 결과 전환은 도착이 아니라 정정이므로 자리를 지킨다. 확인 창도 띄우지 않는다.
      void runWithFocus(applicant.id, toStage, 'keep', [`[data-toggle="${applicant.id}"]`])
    },
    [runWithFocus],
  )

  const handleDecide = useCallback(
    (hired: boolean) => {
      if (!pendingDecision) return
      const { applicant, direction } = pendingDecision
      setPendingDecision(null)
      void moveToColumn(applicant, resultStageFor(hired), direction)
    },
    [pendingDecision, moveToColumn],
  )

  const handleCancelDecision = useCallback(() => {
    const cancelled = pendingDecision
    setPendingDecision(null)
    // 아무것도 바꾸지 않았으므로 원래 누르던 버튼으로 포커스를 돌려준다.
    if (cancelled) {
      focusAfterRender([moveButtonSelector(cancelled.applicant.id, cancelled.direction)])
    }
  }, [pendingDecision])

  const handleOpenDetail = useCallback((applicant: Applicant) => {
    setDetailId(applicant.id)
  }, [])

  const handleCloseDetail = useCallback(() => {
    const closedId = detailId
    setDetailId(null)
    // 카드 빈 곳을 마우스로 눌러 연 경우 브라우저가 돌려줄 포커스가 없다. 어느 경로로 열었든
    // 그 카드의 이름 버튼으로 돌아가게 직접 잡는다.
    if (closedId) focusAfterRender([`[data-detail="${closedId}"]`])
  }, [detailId])

  return (
    <div className={styles.boardShell}>
      <ColumnTabs
        activeColumn={activeColumn}
        countOf={(column) => byColumn.get(column)?.length ?? 0}
        onSelect={setActiveColumn}
      />

      <div className={styles.board}>
        {COLUMNS.map((column) => {
          const items = byColumn.get(column.id) ?? []
          return (
            <Column
              key={column.id}
              column={column}
              count={items.length}
              isActive={column.id === activeColumn}
            >
              {items.map((applicant) => (
                <ApplicantCard
                  key={applicant.id}
                  applicant={applicant}
                  onMove={handleMove}
                  onToggleResult={handleToggleResult}
                  onOpenDetail={handleOpenDetail}
                />
              ))}
            </Column>
          )
        })}
      </div>

      <ResultConfirmDialog
        applicantName={pendingDecision?.applicant.name ?? null}
        onDecide={handleDecide}
        onCancel={handleCancelDecision}
      />

      <ApplicantDrawer applicant={detailApplicant} onClose={handleCloseDetail} />
    </div>
  )
}
