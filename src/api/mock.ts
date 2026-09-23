import type { Applicant } from '../shared/applicant'
import { STAGES, type StageId } from '../shared/stages'
import { createSeedApplicants } from './seed'

/**
 * Mock API.
 *
 * 원문 4장 제약:
 *   "mock API — 반드시 네트워크 지연(200~800ms)과 실패(약 15%)를 시뮬레이션할 것."
 * 지연만 넣는 것은 미충족이므로 실제로 throw 한다. 실패율을 낮추거나 끄는 수단은 두지 않는다.
 *
 * 저장 모델: 모듈 메모리를 "서버"로 보고, 쓰기가 성공했을 때만 localStorage에 반영한다.
 * 매 호출마다 직렬화하지 않으므로 1,000건에서도 부담이 적고, 응답 순서가 뒤집히는 상황을
 * 실제 서버처럼 재현할 수 있다 (경쟁 상태 처리는 #6에서 다룬다).
 */

const MIN_DELAY_MS = 200
const MAX_DELAY_MS = 800
const FAILURE_RATE = 0.15

const STORAGE_KEY = 'recruitment-pipeline-board/applicants'

/** 실패한 호출이 던지는 에러. UI가 일반 예외와 구분할 수 있게 별도 타입으로 둔다. */
export class MockApiError extends Error {
  constructor(message = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.') {
    super(message)
    this.name = 'MockApiError'
  }
}

const KNOWN_STAGE_IDS = new Set<string>(STAGES.map((stage) => stage.id))

/**
 * 저장된 데이터가 현재 모델과 맞는지 첫 항목으로만 확인한다.
 * 모델이 바뀐 뒤 옛 데이터가 조용히 살아남아 화면이 깨지는 것을 막는 용도라
 * 1,000건을 모두 순회할 필요는 없다.
 *
 * stage는 문자열인지가 아니라 실제 단계 id인지까지 본다. 알 수 없는 단계가 들어오면
 * 화면에서 그 카드가 어느 컬럼에도 들어가지 못하고 아무 표시 없이 사라지기 때문이다.
 */
function isApplicantLike(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<Applicant>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.stage === 'string' &&
    KNOWN_STAGE_IDS.has(candidate.stage)
  )
}

/** "서버" 메모리. 첫 접근 때 localStorage에서 복원하거나 시드로 만든다. */
let store: Applicant[] | null = null

function readStore(): Applicant[] {
  if (store) return store

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0 && isApplicantLike(parsed[0])) {
        store = parsed as Applicant[]
        return store
      }
    }
  } catch {
    // 저장소를 읽지 못하면(사생활 보호 모드, 손상된 JSON) 시드로 새로 시작한다.
  }

  store = createSeedApplicants()
  writeStore()
  return store
}

function writeStore(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // 저장에 실패해도 모듈 메모리에는 반영되어 있어 현재 세션 안에서는 일관되게 동작한다.
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 지연 200~800ms 뒤, 약 15% 확률로 실패시킨다. 모든 호출이 이 관문을 지난다. */
async function simulateNetwork(): Promise<void> {
  const latency = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS)
  await delay(latency)

  if (Math.random() < FAILURE_RATE) {
    throw new MockApiError()
  }
}

/** 지원자 전체 조회. 호출자가 "서버" 상태를 직접 바꾸지 못하도록 복사본을 준다. */
export async function getApplicants(): Promise<Applicant[]> {
  await simulateNetwork()
  return readStore().map((applicant) => ({ ...applicant }))
}

/**
 * 단계 이동.
 * 이동한 지원자를 배열 끝으로 옮긴다. 화면은 이 순서를 그대로 쓰므로 카드가 대상 컬럼의
 * 마지막에 놓인다 (DECISIONS.md "가정: 키보드 조작 규칙" 3번).
 * 어느 단계로든 이동을 허용한다. 이동 규칙은 화면이 정하고 여기서는 저장만 한다.
 */
export async function moveStage(id: string, toStage: StageId): Promise<Applicant> {
  await simulateNetwork()

  const applicants = readStore()
  const index = applicants.findIndex((applicant) => applicant.id === id)
  if (index === -1) {
    throw new MockApiError('존재하지 않는 지원자입니다.')
  }

  const moved: Applicant = { ...applicants[index], stage: toStage }
  applicants.splice(index, 1)
  applicants.push(moved)
  writeStore()

  return { ...moved }
}
