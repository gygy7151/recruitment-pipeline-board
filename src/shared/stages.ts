/**
 * 채용 단계 정의. 순서가 파이프라인 순서다 (원문: 서류검토 → 면접 → 처우협의 → 최종합격 / 불합격).
 * 컬럼 렌더링과 단계 이동 규칙이 모두 이 배열을 기준으로 한다.
 */
export const STAGES = [
  { id: 'screening', label: '서류검토' },
  { id: 'interview', label: '면접' },
  { id: 'offer', label: '처우협의' },
  { id: 'hired', label: '최종합격' },
  { id: 'rejected', label: '불합격' },
] as const

export type Stage = (typeof STAGES)[number]
export type StageId = Stage['id']
