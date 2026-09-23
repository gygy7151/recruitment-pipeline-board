import { useEffect, useRef } from 'react'
import type { Applicant } from '../../shared/applicant'
import { formatAppliedAt } from '../../shared/date'
import { stageLabel } from '../../shared/stages'
import styles from './ApplicantDrawer.module.css'

type ApplicantDrawerProps = {
  /** 보여줄 지원자. null이면 닫힌 상태다. */
  applicant: Applicant | null
  onClose: () => void
}

/**
 * 지원자 상세 drawer. 읽기 전용이며 단계 이동은 카드에서만 한다.
 *
 * 결과 확인 창과 같은 이유로 네이티브 `<dialog>`의 `showModal()`을 쓰고, 오른쪽 시트로만 꾸민다.
 * 포커스 트랩·ESC·배경 조작 차단을 브라우저가 맡는다.
 */
export function ApplicantDrawer({ applicant, onClose }: ApplicantDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const isOpen = applicant !== null

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen && !dialog.open) {
      dialog.showModal()
      closeRef.current?.focus()
    } else if (!isOpen && dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  return (
    <dialog
      ref={dialogRef}
      className={styles.drawer}
      aria-labelledby="applicant-drawer-title"
      // ESC로 닫을 때 브라우저가 보내는 이벤트다. 브라우저가 직접 닫게 두면 상태와 어긋난다.
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      // 배경(dialog 자신)을 누르면 닫는다. 읽기 전용이라 실수로 닫혀도 잃는 것이 없다.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
      // ↓로 닫는다 (DECISIONS.md "가정: 키보드 조작 규칙" 4번).
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' && !event.altKey && !event.ctrlKey && !event.metaKey) {
          event.preventDefault()
          onClose()
        }
      }}
    >
      {applicant && (
        <div className={styles.content}>
          <header className={styles.header}>
            <div>
              <h2 id="applicant-drawer-title" className={styles.title}>
                {applicant.name}
              </h2>
              <p className={styles.role}>{applicant.role}</p>
            </div>
            <button
              ref={closeRef}
              type="button"
              className={styles.close}
              aria-label="상세 닫기"
              onClick={onClose}
            >
              ✕
            </button>
          </header>

          <dl className={styles.fields}>
            <dt>현재 단계</dt>
            <dd>{stageLabel(applicant.stage)}</dd>

            <dt>지원일</dt>
            <dd>
              <time dateTime={applicant.appliedAt}>{formatAppliedAt(applicant.appliedAt)}</time>
            </dd>

            <dt>이메일</dt>
            <dd>
              <a href={`mailto:${applicant.email}`}>{applicant.email}</a>
            </dd>

            <dt>연락처</dt>
            <dd>
              <a href={`tel:${applicant.phone}`}>{applicant.phone}</a>
            </dd>

            <dt>경력</dt>
            <dd>{applicant.yearsOfExperience === 0 ? '신입' : `${applicant.yearsOfExperience}년`}</dd>

            <dt>메모</dt>
            <dd className={styles.memo}>{applicant.memo || '메모 없음'}</dd>
          </dl>
        </div>
      )}
    </dialog>
  )
}
