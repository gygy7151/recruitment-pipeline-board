import type { Applicant } from '../../shared/applicant'
import { stageLabel } from '../../shared/stages'
import styles from './ApplicantCard.module.css'

type ApplicantCardProps = {
  applicant: Applicant
}

/** 2026-03-28 → "2026. 03. 28." 문자열만 다시 조합하므로 실행 환경의 시간대에 영향받지 않는다. */
function formatAppliedAt(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${year}. ${month}. ${day}.`
}

export function ApplicantCard({ applicant }: ApplicantCardProps) {
  return (
    <li className={styles.card}>
      <span className={styles.name}>{applicant.name}</span>
      <span className={styles.role}>{applicant.role}</span>
      <span className={styles.meta}>
        <time dateTime={applicant.appliedAt}>{formatAppliedAt(applicant.appliedAt)}</time>
        <span className={styles.stage}>{stageLabel(applicant.stage)}</span>
      </span>
    </li>
  )
}
