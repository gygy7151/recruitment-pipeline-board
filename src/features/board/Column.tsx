import type { ReactNode } from 'react'
import type { Stage } from '../../shared/stages'
import styles from './Column.module.css'

type ColumnProps = {
  stage: Stage
  count: number
  children?: ReactNode
}

export function Column({ stage, count, children }: ColumnProps) {
  const headingId = `column-${stage.id}-heading`

  return (
    <section className={styles.column} aria-labelledby={headingId}>
      <header className={styles.header}>
        <h2 id={headingId} className={styles.title}>
          {stage.label}
        </h2>
        <span className={styles.count}>
          {count}
          <span className={styles.srOnly}>명</span>
        </span>
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  )
}
