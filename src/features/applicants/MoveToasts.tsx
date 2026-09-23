import { useEffect, useRef } from 'react'
import type { Toast } from './useApplicants'
import styles from './MoveToasts.module.css'

type MoveToastsProps = {
  toasts: Toast[]
  onUndo: (id: number) => void
  onDismiss: (id: number) => void
  onPauseChange: (paused: boolean) => void
}

/** Ctrl/⌘+Z인가. 한글 입력 상태에서는 `key`가 'ㅋ'로 오므로 물리 키(`code`)도 본다. */
function isUndoShortcut(event: KeyboardEvent): boolean {
  if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey) return false
  return event.key.toLowerCase() === 'z' || event.code === 'KeyZ'
}

/** 단축키를 글자 입력으로 쓰는 곳. 여기서 Ctrl+Z는 입력 취소이므로 가로채지 않는다. */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export function MoveToasts({ toasts, onUndo, onDismiss, onPauseChange }: MoveToastsProps) {
  const regionRef = useRef<HTMLDivElement>(null)
  const hovered = useRef(false)
  const focused = useRef(false)

  const syncPause = () => onPauseChange(hovered.current || focused.current)

  // 포커스를 가진 버튼이 토스트와 함께 사라지면 blur 없이 포커스가 body로 간다.
  // 그대로 두면 시간이 영영 멈춰 있으므로, 토스트가 바뀔 때마다 포커스가 아직 안에 있는지 다시 본다.
  useEffect(() => {
    focused.current = regionRef.current?.contains(document.activeElement) ?? false
    onPauseChange(hovered.current || focused.current)
  }, [toasts, onPauseChange])

  // Ctrl/⌘+Z로 가장 최근 되돌리기를 실행한다.
  useEffect(() => {
    const latest = toasts.findLast((toast) => toast.undo)
    if (!latest) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isUndoShortcut(event) || event.defaultPrevented) return
      // 꾹 누르면 쌓인 되돌리기가 한꺼번에 실행된다. 한 번 누를 때 하나만 되돌린다.
      if (event.repeat) return
      if (isEditable(event.target)) return
      // 확인 창이 떠 있는 동안에는 배경 조작을 막는 것이 모달의 약속이다.
      if (document.querySelector('dialog[open]')) return

      event.preventDefault()
      onUndo(latest.id)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toasts, onUndo])

  const handleUndoClick = (id: number) => {
    onUndo(id)
    // 누른 버튼이 토스트와 함께 사라져 포커스가 body로 떨어진다. 남은 되돌리기 버튼이 있으면 그리로 옮긴다.
    requestAnimationFrame(() => {
      regionRef.current?.querySelector<HTMLButtonElement>('[data-undo]')?.focus()
    })
  }

  return (
    /*
     * 살아 있는 알림 영역이라 토스트가 나타날 때 스크린리더가 읽어준다.
     * assertive(alert)가 아니라 polite(status)를 쓴다. 이동 실패는 15% 확률로 자주 나는데
     * 그때마다 읽던 것을 끊으면 오히려 방해가 된다.
     */
    <div
      ref={regionRef}
      className={styles.region}
      role="status"
      onMouseEnter={() => {
        hovered.current = true
        syncPause()
      }}
      onMouseLeave={() => {
        hovered.current = false
        syncPause()
      }}
      onFocus={() => {
        focused.current = true
        syncPause()
      }}
      onBlur={(event) => {
        focused.current = regionRef.current?.contains(event.relatedTarget) ?? false
        syncPause()
      }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} className={styles.toast}>
          <span className={styles.message}>{toast.message}</span>
          {toast.undo && (
            <button
              type="button"
              className={styles.undo}
              data-undo
              aria-keyshortcuts="Control+Z Meta+Z"
              onClick={() => handleUndoClick(toast.id)}
            >
              되돌리기
            </button>
          )}
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
