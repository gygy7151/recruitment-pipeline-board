import type { ReactNode } from 'react'
import type { BoardColumn } from '../../shared/stages'
import styles from './Column.module.css'

type ColumnProps = {
  column: BoardColumn
  count: number
  /** 좁은 화면에서 지금 보이는 컬럼인지. 넓은 화면에서는 CSS가 무시한다. */
  isActive: boolean
  children?: ReactNode
}

export function Column({ column, count, isActive, children }: ColumnProps) {
  const headingId = `column-${column.id}-heading`

  return (
    <section
      className={styles.column}
      // 어느 컬럼을 보일지는 CSS가 이 값을 보고 정한다. role은 CSS로 바꿀 수 없지만
      // 표시 여부는 바꿀 수 있어, 데스크톱과 모바일이 같은 마크업을 쓸 수 있다.
      data-active={isActive ? 'true' : 'false'}
      aria-labelledby={headingId}
    >
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
