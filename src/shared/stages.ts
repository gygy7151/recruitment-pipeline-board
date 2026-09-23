/**
 * 저장되는 채용 단계. 원문의 "서류검토 → 면접 → 처우협의 → 최종합격 / 불합격"을 그대로 담는다.
 * mock API와 시드가 쓰는 데이터 모델이므로 화면 구성이 바뀌어도 건드리지 않는다.
 */
export const STAGES = [
  { id: 'screening', label: '서류검토' },
  { id: 'interview', label: '면접' },
  { id: 'offer', label: '처우협의' },
  { id: 'hired', label: '최종합격' },
  { id: 'rejected', label: '불합격' },
] as const

export type StageId = (typeof STAGES)[number]['id']

/**
 * "결과" 컬럼이 담는 단계들. 칩 토글이 이 목록을 순환한다.
 * 첫 항목이 결과 컬럼에 들어올 때의 기본값이다 (DECISIONS.md "가정(임시, 2026-09-23 수정)" 4번).
 */
const RESULT_STAGES = ['hired', 'rejected'] as const

/**
 * 화면의 컬럼. 단계와 1:1이 아니다. 최종합격과 불합격은 파이프라인의 다음 단계가 아니라
 * 같은 지점의 두 결과이므로 "결과" 한 컬럼에 함께 담는다.
 * 카드 이동은 단계가 아니라 이 컬럼 단위로 한 칸씩 움직인다.
 */
export const COLUMNS = [
  { id: 'screening', label: '서류검토', stages: ['screening'] },
  { id: 'interview', label: '면접', stages: ['interview'] },
  { id: 'offer', label: '처우협의', stages: ['offer'] },
  { id: 'result', label: '결과', stages: RESULT_STAGES },
] as const

export type BoardColumn = (typeof COLUMNS)[number]
export type ColumnId = BoardColumn['id']

const STAGE_LABELS = new Map<StageId, string>(STAGES.map((stage) => [stage.id, stage.label]))

/** 단계 id로 화면에 쓸 한글 라벨을 찾는다. 저장된 값이 현재 단계 목록에 없으면 id를 그대로 보여준다. */
export function stageLabel(id: StageId): string {
  return STAGE_LABELS.get(id) ?? id
}

/**
 * 단계 → 컬럼 매핑. 타입이 `Map<StageId, ColumnId>`라 COLUMNS에 없는 단계 id를 적으면 컴파일에서 걸린다.
 */
const STAGE_TO_COLUMN = new Map<StageId, ColumnId>(
  COLUMNS.flatMap((column) =>
    column.stages.map((stage): [StageId, ColumnId] => [stage, column.id]),
  ),
)

/**
 * 단계가 속한 컬럼을 찾는다.
 * 어느 컬럼에도 매핑되지 않은 단계는 마지막 컬럼으로 보낸다. 그냥 버리면 그 카드가 화면에서
 * 아무 표시 없이 사라지기 때문이다 (card-list 리뷰에서 같은 문제를 한 번 겪었다).
 */
export function columnIdOf(stage: StageId): ColumnId {
  return STAGE_TO_COLUMN.get(stage) ?? COLUMNS[COLUMNS.length - 1].id
}

/** 카드 이동 방향. 화살표 키 가정(← 이전 / → 다음)과 버튼이 같은 모델을 쓴다. */
export type MoveDirection = 'prev' | 'next'

/**
 * 한 컬럼 옆으로 옮길 때 들어갈 단계. 경계에서는 null이며 순환하지 않는다
 * (DECISIONS.md "가정: 키보드 조작 규칙" 2번).
 * 결과 컬럼으로 들어갈 때는 기본값인 최종합격이 된다. 불합격은 칩 토글로 정한다.
 */
export function adjacentStage(from: StageId, direction: MoveDirection): StageId | null {
  const columnId = columnIdOf(from)
  const index = COLUMNS.findIndex((column) => column.id === columnId)
  if (index === -1) return null

  const target = direction === 'prev' ? index - 1 : index + 1
  if (target < 0 || target >= COLUMNS.length) return null

  return COLUMNS[target].stages[0]
}

/** 결과 컬럼 안에서 다음 결과로 넘긴다. 결과 컬럼의 단계가 아니면 null이라 칩이 버튼이 되지 않는다. */
export function toggledResultStage(stage: StageId): StageId | null {
  const results: readonly StageId[] = RESULT_STAGES
  const index = results.indexOf(stage)
  if (index === -1) return null

  return results[(index + 1) % results.length]
}
