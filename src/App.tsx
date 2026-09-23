import { Board } from './features/board/Board'
import { FilterBar } from './features/applicants/FilterBar'
import { MoveToasts } from './features/applicants/MoveToasts'
import { useApplicantFilter } from './features/applicants/useApplicantFilter'
import { useApplicants } from './features/applicants/useApplicants'
import styles from './App.module.css'

export default function App() {
  const { applicants, status, toasts, moveApplicant, undoMove, dismissToast, setToastsPaused } =
    useApplicants()
  const { query, setQuery, role, setRole, roles, filtered, isFiltering, isStale } =
    useApplicantFilter(applicants)

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Recruitment Pipeline Board</h1>
        <p className={styles.subtitle}>채용 단계별 지원자 관리 및 파이프라인 보드</p>
      </header>

      {status === 'ready' && (
        <FilterBar
          query={query}
          onQueryChange={setQuery}
          role={role}
          onRoleChange={setRole}
          roles={roles}
          resultCount={filtered.length}
          isFiltering={isFiltering}
        />
      )}

      <main className={styles.main}>
        {/* 로딩·에러 화면과 재시도는 #9에서 제대로 만든다. 여기서는 상태를 알려주기만 한다. */}
        {status === 'loading' && <p className={styles.status}>지원자 목록을 불러오는 중입니다.</p>}
        {status === 'error' && (
          <p className={styles.status} role="alert">
            지원자 목록을 불러오지 못했습니다. 새로고침해 주세요.
          </p>
        )}
        {status === 'ready' && filtered.length === 0 && (
          <p className={styles.status}>조건에 맞는 지원자가 없습니다. 검색어나 직무를 바꿔 보세요.</p>
        )}
        {status === 'ready' && filtered.length > 0 && (
          // 미룬 값이 따라오는 동안 목록이 한 박자 뒤처져 있다는 것을 옅게 표시한다.
          <div className={`${styles.boardArea} ${isStale ? styles.stale : ''}`}>
            <Board applicants={filtered} onMove={moveApplicant} />
          </div>
        )}
      </main>

      <MoveToasts
        toasts={toasts}
        onUndo={undoMove}
        onDismiss={dismissToast}
        onPauseChange={setToastsPaused}
      />
    </div>
  )
}
