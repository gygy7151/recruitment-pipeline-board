import type { MouseEvent, KeyboardEvent } from 'react'
import type { Applicant } from '../../shared/applicant'
import { formatAppliedAt } from '../../shared/date'
import {
  adjacentStage,
  stageLabel,
  toggledResultStage,
  type MoveDirection,
  type StageId,
} from '../../shared/stages'
import styles from './ApplicantCard.module.css'

/**
 * 이동을 시작한 버튼의 종류. 이동하면 카드가 다시 그려져 그 버튼이 사라지므로,
 * 보드가 새 위치에서 같은 종류의 버튼을 찾아 포커스를 돌려준다.
 */
export type FocusOrigin = 'move' | 'name' | 'toggle'

function focusOriginOf(target: EventTarget): FocusOrigin {
  if (!(target instanceof Element)) return 'move'
  if (target.closest('[data-detail]')) return 'name'
  if (target.closest('[data-toggle]')) return 'toggle'
  return 'move'
}

type ApplicantCardProps = {
  applicant: Applicant
  onMove: (
    applicant: Applicant,
    toStage: StageId,
    direction: MoveDirection,
    origin: FocusOrigin,
  ) => void
  onToggleResult: (applicant: Applicant, toStage: StageId) => void
  onOpenDetail: (applicant: Applicant) => void
}

export function ApplicantCard({
  applicant,
  onMove,
  onToggleResult,
  onOpenDetail,
}: ApplicantCardProps) {
  const previousStage = adjacentStage(applicant.stage, 'prev')
  const nextStage = adjacentStage(applicant.stage, 'next')
  // 결과 컬럼의 카드만 값이 있다. 나머지 컬럼에서는 칩이 읽기 전용 텍스트로 남는다.
  const toggleTarget = toggledResultStage(applicant.stage)

  // 마우스로는 카드 어디를 눌러도 상세가 열린다. 버튼은 제 동작만 하게 둔다.
  // 키보드 사용자는 이름 버튼으로 같은 일을 하므로 li 자체는 포커스를 받지 않는다.
  const handleCardClick = (event: MouseEvent<HTMLLIElement>) => {
    if (event.target instanceof Element && event.target.closest('button, a')) return
    // 이름이나 날짜를 복사하려고 드래그한 경우에는 열지 않는다.
    if (window.getSelection()?.toString()) return
    onOpenDetail(applicant)
  }

  // 카드 안 어느 버튼에 포커스가 있든 ↑로 상세를 열고 ←/→로 옮긴다
  // (DECISIONS.md "가정: 키보드 조작 규칙" 1·2·4번).
  const handleCardKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      onOpenDetail(applicant)
      return
    }

    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    // 경계에서도 기본 동작(가로 스크롤)을 막는다. 무동작이 규칙이다.
    event.preventDefault()
    // 키를 누르고 있어 생긴 반복 입력은 버린다. 한 번 누르면 한 칸만 옮긴다.
    // 그러지 않으면 카드가 처우협의까지 달려가 확인 창이 뜬다.
    if (event.repeat) return
    const direction: MoveDirection = event.key === 'ArrowLeft' ? 'prev' : 'next'
    const toStage = direction === 'prev' ? previousStage : nextStage
    if (toStage) onMove(applicant, toStage, direction, focusOriginOf(event.target))
  }

  return (
    <li className={styles.card} onClick={handleCardClick} onKeyDown={handleCardKeyDown}>
      <button
        type="button"
        className={styles.name}
        // 상세를 닫으면 보드가 이 속성으로 카드를 찾아 포커스를 돌려준다.
        data-detail={applicant.id}
        aria-haspopup="dialog"
        onClick={() => onOpenDetail(applicant)}
      >
        {applicant.name}
      </button>
      <span className={styles.role}>{applicant.role}</span>
      <span className={styles.meta}>
        <time dateTime={applicant.appliedAt}>{formatAppliedAt(applicant.appliedAt)}</time>

        {toggleTarget ? (
          <button
            type="button"
            className={`${styles.stage} ${applicant.stage === 'hired' ? styles.hired : styles.rejected}`}
            data-toggle={applicant.id}
            aria-label={`${applicant.name}: 현재 ${stageLabel(applicant.stage)}. 눌러서 ${stageLabel(toggleTarget)} 단계로 변경`}
            onClick={() => onToggleResult(applicant, toggleTarget)}
          >
            {stageLabel(applicant.stage)}
          </button>
        ) : (
          <span className={styles.stage}>{stageLabel(applicant.stage)}</span>
        )}

        <button
          type="button"
          className={styles.move}
          // 이동하면 카드가 다른 컬럼으로 옮겨가 이 버튼이 사라진다.
          // 보드가 이 속성으로 새 위치의 같은 버튼을 찾아 포커스를 옮긴다.
          data-move={`${applicant.id}:prev`}
          disabled={previousStage === null}
          aria-label={
            previousStage
              ? `${applicant.name}: ${stageLabel(previousStage)} 단계로 이동`
              : `${applicant.name}: 이전 단계 없음`
          }
          onClick={() => previousStage && onMove(applicant, previousStage, 'prev', 'move')}
        >
          ←
        </button>

        <button
          type="button"
          className={styles.move}
          data-move={`${applicant.id}:next`}
          disabled={nextStage === null}
          aria-label={
            nextStage
              ? `${applicant.name}: ${stageLabel(nextStage)} 단계로 이동`
              : `${applicant.name}: 다음 단계 없음`
          }
          onClick={() => nextStage && onMove(applicant, nextStage, 'next', 'move')}
        >
          →
        </button>
      </span>
    </li>
  )
}
