import { Board } from './features/board/Board'
import { MoveToasts } from './features/applicants/MoveToasts'
import { useApplicants } from './features/applicants/useApplicants'
import styles from './App.module.css'

export default function App() {
  const { applicants, status, toasts, moveApplicant, dismissToast } = useApplicants()

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Recruitment Pipeline Board</h1>
        <p className={styles.subtitle}>채용 단계별 지원자 관리 및 파이프라인 보드</p>
      </header>

      <main className={styles.main}>
        {/* 로딩·에러 화면과 재시도는 #9에서 제대로 만든다. 여기서는 상태를 알려주기만 한다. */}
        {status === 'loading' && <p className={styles.status}>지원자 목록을 불러오는 중입니다.</p>}
        {status === 'error' && (
          <p className={styles.status} role="alert">
            지원자 목록을 불러오지 못했습니다. 새로고침해 주세요.
          </p>
        )}
        {status === 'ready' && <Board applicants={applicants} onMove={moveApplicant} />}
      </main>

      <MoveToasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
