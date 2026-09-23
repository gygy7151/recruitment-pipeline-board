import { useEffect, useRef } from 'react'
import styles from './ResultConfirmDialog.module.css'

type ResultConfirmDialogProps = {
  /** 확인을 기다리는 지원자 이름. null이면 닫힌 상태다. */
  applicantName: string | null
  onDecide: (hired: boolean) => void
  onCancel: () => void
}

/**
 * 합격 여부 확인 창.
 *
 * 네이티브 `<dialog>`의 `showModal()`을 쓴다. 포커스 트랩, ESC로 닫기, 배경 조작 차단,
 * 최상위 레이어 배치를 브라우저가 맡는다. 직접 만들면 틀리기 쉬운 부분이다.
 */
export function ResultConfirmDialog({ applicantName, onDecide, onCancel }: ResultConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (applicantName && !dialog.open) {
      dialog.showModal()
      // 합격도 불합격도 되돌리기 어려운 결정이라, Enter를 연타해도 어느 쪽으로도 튀지 않게
      // 취소에 포커스를 둔다.
      cancelRef.current?.focus()
    } else if (!applicantName && dialog.open) {
      dialog.close()
    }
  }, [applicantName])

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="result-confirm-title"
      // ESC로 닫을 때 브라우저가 보내는 이벤트다.
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      // 배경을 누르면 취소한다. 취소는 아무것도 바꾸지 않으므로 실수로 닫혀도 잃는 것이 없다.
      onClick={(event) => {
        if (event.target === dialogRef.current) onCancel()
      }}
    >
      <div className={styles.content}>
        <h2 id="result-confirm-title" className={styles.title}>
          최종합격인가요?
        </h2>
        <p className={styles.body}>
          {applicantName} 지원자를 결과 단계로 옮깁니다. 이후 결과 칩을 눌러 바꿀 수 있습니다.
        </p>
        <div className={styles.actions}>
          <button ref={cancelRef} type="button" className={styles.cancel} onClick={onCancel}>
            취소
          </button>
          <button type="button" className={styles.no} onClick={() => onDecide(false)}>
            아니요, 불합격
          </button>
          <button type="button" className={styles.yes} onClick={() => onDecide(true)}>
            예, 최종합격
          </button>
        </div>
      </div>
    </dialog>
  )
}
