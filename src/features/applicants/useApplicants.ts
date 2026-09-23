import { useEffect, useState } from 'react'
import { getApplicants } from '../../api/mock'
import type { Applicant } from '../../shared/applicant'

type LoadStatus = 'loading' | 'ready' | 'error'

/**
 * 지원자 목록을 한 번 불러온다.
 * mock API는 조회에도 약 15% 확률로 실패하므로 실패 상태를 반드시 다뤄야 한다.
 * 로딩·에러 화면을 제대로 만드는 것과 재시도는 #9에서 다룬다.
 */
export function useApplicants() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')

  useEffect(() => {
    // 컴포넌트가 사라진 뒤 도착한 응답으로 상태를 바꾸지 않는다.
    let cancelled = false

    getApplicants()
      .then((list) => {
        if (cancelled) return
        setApplicants(list)
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { applicants, status }
}
