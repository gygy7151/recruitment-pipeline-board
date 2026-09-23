import { useEffect, useRef } from 'react'
import { Board } from './features/board/Board'
import { BoardSkeleton } from './features/board/BoardSkeleton'
import { FilterBar } from './features/applicants/FilterBar'
import { MoveToasts } from './features/applicants/MoveToasts'
import { ALL_ROLES, useApplicantFilter } from './features/applicants/useApplicantFilter'
import { useApplicants } from './features/applicants/useApplicants'
import styles from './App.module.css'

export default function App() {
  const { applicants, status, toasts, moveApplicant, dismissToast, reload } = useApplicants()
  const { query, setQuery, role, setRole, roles, filtered, isFiltering, isStale } =
    useApplicantFilter(applicants)

  const retryButton = useRef<HTMLButtonElement>(null)
  /** 재시도를 누른 뒤인지. 첫 실패 때는 포커스를 빼앗지 않는다. */
  const hasRetried = useRef(false)

  // 다시 시도 버튼은 누르는 순간 사라진다. 재시도가 또 실패하면 새로 뜬 버튼으로 포커스를 돌려준다.
  useEffect(() => {
    if (status === 'error' && hasRetried.current) retryButton.current?.focus()
  }, [status])

  const retry = () => {
    hasRetried.current = true
    reload()
  }

  const resetFilter = () => {
    setQuery('')
    setRole(ALL_ROLES)
    // 초기화 버튼은 곧 사라진다. 조건을 다시 입력할 검색란으로 포커스를 옮긴다.
    document.getElementById('applicant-search')?.focus()
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Recruitment Pipeline Board</h1>
        <p className={styles.subtitle}>채용 단계별 지원자 관리 및 파이프라인 보드</p>
      </header>

      {/* 로딩 중에도 자리를 지켜, 보드가 뜰 때 필터바가 끼어들며 컬럼을 밀어내지 않게 한다. */}
      {status !== 'error' && (
        <FilterBar
          query={query}
          onQueryChange={setQuery}
          role={role}
          onRoleChange={setRole}
          roles={roles}
          resultCount={filtered.length}
          isFiltering={isFiltering}
          disabled={status === 'loading'}
        />
      )}

      <main className={styles.main}>
        {status === 'loading' && <BoardSkeleton />}
        {status === 'error' && (
          <div className={styles.notice} role="alert">
            <p className={styles.noticeText}>지원자 목록을 불러오지 못했습니다.</p>
            <button
              ref={retryButton}
              type="button"
              className={styles.noticeButton}
              onClick={retry}
            >
              다시 시도
            </button>
          </div>
        )}
        {status === 'ready' && filtered.length === 0 && (
          <div className={styles.notice}>
            <p className={styles.noticeText}>조건에 맞는 지원자가 없습니다. 검색어나 직무를 바꿔 보세요.</p>
            <button type="button" className={styles.noticeButton} onClick={resetFilter}>
              검색 조건 초기화
            </button>
          </div>
        )}
        {status === 'ready' && filtered.length > 0 && (
          // 미룬 값이 따라오는 동안 목록이 한 박자 뒤처져 있다는 것을 옅게 표시한다.
          <div className={`${styles.boardArea} ${isStale ? styles.stale : ''}`}>
            <Board applicants={filtered} onMove={moveApplicant} />
          </div>
        )}
      </main>

      <MoveToasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
