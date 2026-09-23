import { COLUMNS, type ColumnId } from '../../shared/stages'
import styles from './ColumnTabs.module.css'

type ColumnTabsProps = {
  activeColumn: ColumnId
  countOf: (column: ColumnId) => number
  onSelect: (column: ColumnId) => void
}

/**
 * 좁은 화면에서 컬럼을 고르는 막대.
 *
 * ARIA 탭 패턴 대신 일반 버튼 + `aria-current`를 쓴다. 탭 패턴은 좌우 화살표를 탭 전환에 배정하는데,
 * 이 앱에서는 좌우 화살표가 카드 이동이라 같은 화면에서 같은 키가 두 일을 하게 된다
 * (DECISIONS.md "가정: 키보드 조작 규칙").
 *
 * 넓은 화면에서는 CSS가 `display: none`으로 감춘다. 접근성 트리에서도 함께 사라지므로
 * 네 컬럼이 모두 보이는 화면에 쓸모없는 컨트롤이 남지 않는다.
 */
export function ColumnTabs({ activeColumn, countOf, onSelect }: ColumnTabsProps) {
  return (
    <div className={styles.tabs} role="group" aria-label="채용 단계 선택">
      {COLUMNS.map((column) => {
        const isActive = column.id === activeColumn
        return (
          <button
            key={column.id}
            type="button"
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
            aria-current={isActive ? 'true' : undefined}
            onClick={() => onSelect(column.id)}
          >
            <span className={styles.label}>{column.label}</span>
            <span className={styles.count}>
              {countOf(column.id)}
              <span className={styles.srOnly}>명</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
