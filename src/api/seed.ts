import type { Applicant } from '../shared/applicant'
import type { StageId } from '../shared/stages'

/**
 * 시드 데이터 생성기.
 * 고정 seed와 고정 기준일을 쓰므로 몇 번을 돌려도 같은 1,000건이 나온다.
 * Math.random이나 new Date()를 쓰면 재현이 깨지므로 이 파일에서는 쓰지 않는다.
 */
const SEED = 20260923
const SEED_COUNT = 1000

/** 지원일 계산 기준일. 실행 시각에 의존하지 않도록 고정한다. */
const BASE_DATE = Date.UTC(2026, 8, 23)
const APPLY_WINDOW_DAYS = 180

/** mulberry32 — 작고 결정적인 의사난수 생성기 */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SURNAMES: ReadonlyArray<readonly [string, string]> = [
  ['김', 'kim'], ['이', 'lee'], ['박', 'park'], ['최', 'choi'], ['정', 'jung'],
  ['강', 'kang'], ['조', 'cho'], ['윤', 'yoon'], ['장', 'jang'], ['임', 'lim'],
  ['한', 'han'], ['오', 'oh'], ['서', 'seo'], ['신', 'shin'], ['권', 'kwon'],
  ['황', 'hwang'], ['안', 'ahn'], ['송', 'song'], ['전', 'jeon'], ['홍', 'hong'],
]

const GIVEN_NAMES = [
  '서연', '민준', '지우', '도윤', '하은', '시우', '지호', '예은', '주원', '수아',
  '지훈', '유진', '현우', '다은', '준서', '수빈', '태윤', '나윤', '건우', '채원',
] as const

const ROLES = [
  '프론트엔드 개발자', '백엔드 개발자', '안드로이드 개발자', 'iOS 개발자',
  '데이터 엔지니어', '프로덕트 디자이너', '프로덕트 매니저', 'QA 엔지니어',
] as const

const SOURCES = ['사내 추천', '채용 공고', '헤드헌터', '리크루터 컨택'] as const

/**
 * 초기 단계 분포 (지원자 가정).
 * 실제 채용 파이프라인처럼 앞단이 두껍다. 첫 컬럼이 붐벼야 가상 스크롤 효과도 드러난다.
 */
const STAGE_WEIGHTS: ReadonlyArray<readonly [StageId, number]> = [
  ['screening', 45],
  ['interview', 25],
  ['offer', 10],
  ['hired', 8],
  ['rejected', 12],
]

const TOTAL_WEIGHT = STAGE_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0)

function pickStage(roll: number): StageId {
  let threshold = roll * TOTAL_WEIGHT
  for (const [stage, weight] of STAGE_WEIGHTS) {
    threshold -= weight
    if (threshold < 0) return stage
  }
  return STAGE_WEIGHTS[0][0]
}

function toIsoDate(daysAgo: number): string {
  return new Date(BASE_DATE - daysAgo * 86_400_000).toISOString().slice(0, 10)
}

export function createSeedApplicants(count: number = SEED_COUNT): Applicant[] {
  const random = mulberry32(SEED)
  const applicants: Applicant[] = []

  for (let i = 0; i < count; i += 1) {
    const [surname, romanized] = SURNAMES[Math.floor(random() * SURNAMES.length)]
    const givenName = GIVEN_NAMES[Math.floor(random() * GIVEN_NAMES.length)]
    const role = ROLES[Math.floor(random() * ROLES.length)]
    const source = SOURCES[Math.floor(random() * SOURCES.length)]
    const serial = String(i + 1).padStart(4, '0')

    applicants.push({
      id: `applicant-${serial}`,
      name: `${surname}${givenName}`,
      role,
      appliedAt: toIsoDate(Math.floor(random() * APPLY_WINDOW_DAYS)),
      stage: pickStage(random()),
      email: `${romanized}${serial}@example.com`,
      phone: `010-${String(1000 + Math.floor(random() * 9000))}-${String(1000 + Math.floor(random() * 9000))}`,
      yearsOfExperience: Math.floor(random() * 13),
      memo: `${source} 경로로 접수. ${role} 포지션 지원.`,
    })
  }

  return applicants
}
