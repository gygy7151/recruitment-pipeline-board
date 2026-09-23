import { Board } from './features/board/Board'
import styles from './App.module.css'

export default function App() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Recruitment Pipeline Board</h1>
        <p className={styles.subtitle}>채용 단계별 지원자 관리 및 파이프라인 보드</p>
      </header>
      <main className={styles.main}>
        <Board />
      </main>
    </div>
  )
}
