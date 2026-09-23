import type { StageId } from './stages'

/**
 * 지원자 모델.
 * 이름·직무·지원일·현재 단계는 원문 2장이 카드에 표시하라고 명시한 필드다.
 * 나머지는 상세 패널용으로 지원자가 가정한 필드다 (DECISIONS.md "가정: 지원자 상세 필드").
 */
export type Applicant = {
  id: string
  name: string
  role: string
  /** ISO 날짜 문자열 (YYYY-MM-DD) */
  appliedAt: string
  stage: StageId
  email: string
  phone: string
  yearsOfExperience: number
  memo: string
}
