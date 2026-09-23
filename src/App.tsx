import { Board } from './features/board/Board'
import { useApplicants } from './features/applicants/useApplicants'
import styles from './App.module.css'

export default function App() {
  const { applicants, status, movingIds, moveError, moveApplicant } = useApplicants()

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Recruitment Pipeline Board</h1>
        <p className={styles.subtitle}>채용 단계별 지원자 관리 및 파이프라인 보드</p>
      </header>

      {/* 이동 실패를 알리기만 한다. 토스트와 되돌리기는 #6·#12에서 만든다. */}
      <p className={styles.notice} role="status">
        {moveError}
      </p>

      <main className={styles.main}>
        {/* 로딩·에러 화면과 재시도는 #9에서 제대로 만든다. 여기서는 상태를 알려주기만 한다. */}
        {status === 'loading' && <p className={styles.status}>지원자 목록을 불러오는 중입니다.</p>}
        {status === 'error' && (
          <p className={styles.status} role="alert">
            지원자 목록을 불러오지 못했습니다. 새로고침해 주세요.
          </p>
        )}
        {status === 'ready' && (
          <Board applicants={applicants} movingIds={movingIds} onMove={moveApplicant} />
        )}
      </main>
    </div>
  )
}
