import type { Toast } from './useApplicants'
import styles from './MoveToasts.module.css'

type MoveToastsProps = {
  toasts: Toast[]
  onDismiss: (id: number) => void
}

export function MoveToasts({ toasts, onDismiss }: MoveToastsProps) {
  return (
    /*
     * 살아 있는 알림 영역이라 토스트가 나타날 때 스크린리더가 읽어준다.
     * assertive(alert)가 아니라 polite(status)를 쓴다. 이동 실패는 15% 확률로 자주 나는데
     * 그때마다 읽던 것을 끊으면 오히려 방해가 된다.
     */
    <div className={styles.region} role="status">
      {toasts.map((toast) => (
        <div key={toast.id} className={styles.toast}>
          <span className={styles.message}>{toast.message}</span>
          <button
            type="button"
            className={styles.dismiss}
            aria-label="알림 닫기"
            onClick={() => onDismiss(toast.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
