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

const STAGE_LABELS = new Map<StageId, string>(STAGES.map((stage) => [stage.id, stage.label]))

/** 단계 id로 화면에 쓸 한글 라벨을 찾는다. 저장된 값이 현재 단계 목록에 없으면 id를 그대로 보여준다. */
export function stageLabel(id: StageId): string {
  return STAGE_LABELS.get(id) ?? id
}

/** 카드 이동 방향. 화살표 키 가정(← 이전 / → 다음)과 버튼이 같은 모델을 쓴다. */
export type MoveDirection = 'prev' | 'next'

/**
 * 한 단계 옆의 단계를 찾는다. 경계(첫 컬럼의 이전, 마지막 컬럼의 다음)에서는 null.
 * 순환하지 않는다 (DECISIONS.md "가정: 키보드 조작 규칙" 2번).
 */
export function adjacentStage(from: StageId, direction: MoveDirection): StageId | null {
  const index = STAGES.findIndex((stage) => stage.id === from)
  if (index === -1) return null

  const target = direction === 'prev' ? index - 1 : index + 1
  if (target < 0 || target >= STAGES.length) return null

  return STAGES[target].id
}
