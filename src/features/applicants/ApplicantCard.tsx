import type { Applicant } from '../../shared/applicant'
import {
  adjacentStage,
  stageLabel,
  toggledResultStage,
  type MoveDirection,
  type StageId,
} from '../../shared/stages'
import styles from './ApplicantCard.module.css'

type ApplicantCardProps = {
  applicant: Applicant
  onMove: (id: string, toStage: StageId, direction: MoveDirection) => void
  onToggleResult: (id: string, toStage: StageId) => void
}

/** 2026-03-28 → "2026. 03. 28." 문자열만 다시 조합하므로 실행 환경의 시간대에 영향받지 않는다. */
function formatAppliedAt(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${year}. ${month}. ${day}.`
}

export function ApplicantCard({ applicant, onMove, onToggleResult }: ApplicantCardProps) {
  const previousStage = adjacentStage(applicant.stage, 'prev')
  const nextStage = adjacentStage(applicant.stage, 'next')
  // 결과 컬럼의 카드만 값이 있다. 나머지 컬럼에서는 칩이 읽기 전용 텍스트로 남는다.
  const toggleTarget = toggledResultStage(applicant.stage)

  return (
    <li className={styles.card}>
      <span className={styles.name}>{applicant.name}</span>
      <span className={styles.role}>{applicant.role}</span>
      <span className={styles.meta}>
        <time dateTime={applicant.appliedAt}>{formatAppliedAt(applicant.appliedAt)}</time>

        {toggleTarget ? (
          <button
            type="button"
            className={`${styles.stage} ${applicant.stage === 'hired' ? styles.hired : styles.rejected}`}
            data-toggle={applicant.id}
            aria-label={`${applicant.name}: 현재 ${stageLabel(applicant.stage)}. 눌러서 ${stageLabel(toggleTarget)} 단계로 변경`}
            onClick={() => onToggleResult(applicant.id, toggleTarget)}
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
          onClick={() => previousStage && onMove(applicant.id, previousStage, 'prev')}
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
          onClick={() => nextStage && onMove(applicant.id, nextStage, 'next')}
        >
          →
        </button>
      </span>
    </li>
  )
}
