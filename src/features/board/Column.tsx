import type { ReactNode } from 'react'
import type { BoardColumn } from '../../shared/stages'
import styles from './Column.module.css'

type ColumnProps = {
  column: BoardColumn
  count: number
  children?: ReactNode
}

export function Column({ column, count, children }: ColumnProps) {
  const headingId = `column-${column.id}-heading`

  return (
    <section className={styles.column} aria-labelledby={headingId}>
      <header className={styles.header}>
        <h2 id={headingId} className={styles.title}>
          {column.label}
        </h2>
        <span className={styles.count}>
          {count}
          <span className={styles.srOnly}>명</span>
        </span>
      </header>
      <ul className={styles.body} role="list">
        {children}
      </ul>
    </section>
  )
}
