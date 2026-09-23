import type { ReactNode } from 'react'
import type { BoardColumn } from '../../shared/stages'
import styles from './Column.module.css'

type ColumnProps = {
  column: BoardColumn
  /** 컬럼의 인원 수. 아직 불러오는 중이라 모르면 null이고, 인원 수 자리를 비워 둔다. */
  count: number | null
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
        {count === null ? (
          <span className={`${styles.count} ${styles.countPending}`} aria-hidden="true" />
        ) : (
          <span className={styles.count}>
            {count}
            <span className={styles.srOnly}>명</span>
          </span>
        )}
      </header>
      {count === 0 ? (
        // 빈 목록을 그대로 두면 컬럼이 고장 난 것처럼 보인다. 목록 대신 안내를 둔다.
        <p className={styles.empty}>이 단계에 지원자가 없습니다.</p>
      ) : (
        <ul className={styles.body} role="list">
          {children}
        </ul>
      )}
    </section>
  )
}
