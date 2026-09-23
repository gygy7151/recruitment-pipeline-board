import { COLUMNS } from '../../shared/stages'
import { Column } from './Column'
import boardStyles from './Board.module.css'
import tabStyles from './ColumnTabs.module.css'
import styles from './BoardSkeleton.module.css'

/** 컬럼마다 그려 둘 카드 자리 수. 화면을 채울 만큼이면 되고 실제 인원과는 무관하다. */
const PLACEHOLDER_CARDS = 4

/**
 * 첫 조회 동안 보여줄 보드 모양.
 *
 * 실제 Column을 그대로 써서 컬럼 폭과 헤더가 불러온 뒤의 보드와 같다.
 * 목록이 도착해 교체될 때 레이아웃이 튀지 않는다.
 */
export function BoardSkeleton() {
  return (
    <div className={boardStyles.boardShell}>
      {/* 회색 자리는 화면용이다. 스크린리더에는 이 문장 하나만 전달한다. */}
      <p className={styles.srOnly} role="status">
        지원자 목록을 불러오는 중입니다.
      </p>
      {/* 좁은 화면의 탭 막대 자리. 없으면 보드가 뜨는 순간 막대가 끼어들며 화면이 밀린다. */}
      <div className={tabStyles.tabs} aria-hidden="true">
        {COLUMNS.map((column) => (
          <span key={column.id} className={`${tabStyles.tab} ${styles.tabPlaceholder}`}>
            <span className={tabStyles.label}>{column.label}</span>
          </span>
        ))}
      </div>
      <div className={boardStyles.board} aria-hidden="true">
        {COLUMNS.map((column, index) => (
          <Column key={column.id} column={column} count={null} isActive={index === 0}>
            {Array.from({ length: PLACEHOLDER_CARDS }, (_, card) => (
              <li key={card} className={styles.card}>
                <span className={styles.lineWide} />
                <span className={styles.lineNarrow} />
              </li>
            ))}
          </Column>
        ))}
      </div>
    </div>
  )
}
