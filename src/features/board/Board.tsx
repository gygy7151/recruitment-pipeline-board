import { useMemo } from 'react'
import type { Applicant } from '../../shared/applicant'
import { STAGES, type StageId } from '../../shared/stages'
import { ApplicantCard } from '../applicants/ApplicantCard'
import { Column } from './Column'
import styles from './Board.module.css'

type BoardProps = {
  applicants: Applicant[]
}

export function Board({ applicants }: BoardProps) {
  // 컬럼마다 filter를 돌리면 1,000건 × 5컬럼을 순회하게 된다. 한 번만 순회해 단계별로 나눈다.
  const byStage = useMemo(() => {
    const groups = new Map<StageId, Applicant[]>(STAGES.map((stage) => [stage.id, []]))
    for (const applicant of applicants) {
      groups.get(applicant.stage)?.push(applicant)
    }
    return groups
  }, [applicants])

  return (
    <div className={styles.board}>
      {STAGES.map((stage) => {
        const items = byStage.get(stage.id) ?? []
        return (
          <Column key={stage.id} stage={stage} count={items.length}>
            {items.map((applicant) => (
              <ApplicantCard key={applicant.id} applicant={applicant} />
            ))}
          </Column>
        )
      })}
    </div>
  )
}
