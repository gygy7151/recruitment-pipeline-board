import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getApplicants, moveStage, type StagePlacement } from '../../api/mock'
import type { Applicant } from '../../shared/applicant'
import type { StageId } from '../../shared/stages'
import { applyMove, useApplicants } from './useApplicants'

/**
 * mock API를 테스트가 직접 조종한다.
 * 실제 mock은 200~800ms 난수 지연과 15% 실패라 같은 순서를 재현할 수 없다. 여기서는 호출마다
 * 대기 중인 Promise를 하나씩 쌓아 두고, 어느 요청을 언제 성공·실패시킬지 테스트가 정한다.
 */
vi.mock('../../api/mock', () => ({
  getApplicants: vi.fn(),
  moveStage: vi.fn(),
}))

type PendingCall = {
  id: string
  toStage: StageId
  placement: StagePlacement
  resolve: () => void
  reject: () => void
}

function applicant(id: string, stage: StageId): Applicant {
  return {
    id,
    name: `지원자 ${id}`,
    role: 'Frontend',
    appliedAt: '2026-09-01',
    stage,
    email: `${id}@example.com`,
    phone: '010-0000-0000',
    yearsOfExperience: 3,
    memo: '',
  }
}

const SEED: Applicant[] = [applicant('a', 'screening'), applicant('b', 'screening'), applicant('c', 'hired')]

/** moveStage 호출이 도착한 순서. 서버 쓰기 순서와 같다. */
let calls: PendingCall[]

beforeEach(() => {
  calls = []

  vi.mocked(getApplicants).mockResolvedValue(SEED.map((item) => ({ ...item })))

  vi.mocked(moveStage).mockImplementation(
    (id, toStage, placement) =>
      new Promise<Applicant>((resolve, reject) => {
        calls.push({
          id,
          toStage,
          placement,
          // 서버가 쓴 결과처럼 대상 단계로 바뀐 지원자를 돌려준다.
          resolve: () => resolve({ ...SEED.find((item) => item.id === id)!, stage: toStage }),
          reject: () => reject(new Error('mock failure')),
        })
      }),
  )
})

async function renderReady() {
  const hook = renderHook(() => useApplicants())
  await waitFor(() => expect(hook.result.current.status).toBe('ready'))
  return hook
}

/** 화면 상태에서 카드 하나의 단계를 읽는다. */
function stageOf(list: Applicant[], id: string): StageId | undefined {
  return list.find((item) => item.id === id)?.stage
}

/**
 * 이동을 요청하고, 줄에서 차례가 된 네트워크 호출이 나갈 때까지 마이크로태스크를 흘린다.
 * 결과 Promise를 그대로 return하면 async 함수가 그것을 기다려 버리므로 객체로 감싸 돌려준다.
 */
async function move(
  hook: Awaited<ReturnType<typeof renderReady>>,
  id: string,
  toStage: StageId,
  placement: StagePlacement = 'end',
) {
  let outcome!: ReturnType<typeof hook.result.current.moveApplicant>
  await act(async () => {
    outcome = hook.result.current.moveApplicant(id, toStage, placement)
  })
  return { outcome }
}

/** 대기 중인 호출 하나를 끝내고 그 여파(다음 요청 발사, 상태 갱신)까지 흘려보낸다. */
async function settle(call: PendingCall, result: 'resolve' | 'reject') {
  await act(async () => {
    call[result]()
  })
}

describe('applyMove', () => {
  it('end: 대상 단계로 바꾸고 배열 끝에 놓는다', () => {
    const next = applyMove(SEED, 'a', 'interview', 'end')

    expect(next.map((item) => item.id)).toEqual(['b', 'c', 'a'])
    expect(stageOf(next, 'a')).toBe('interview')
  })

  it('keep: 단계만 바꾸고 자리는 그대로 둔다', () => {
    const next = applyMove(SEED, 'b', 'rejected', 'keep')

    expect(next.map((item) => item.id)).toEqual(['a', 'b', 'c'])
    expect(stageOf(next, 'b')).toBe('rejected')
  })

  it('입력 배열과 원소를 바꾸지 않는다', () => {
    const input = SEED.map((item) => ({ ...item }))
    applyMove(input, 'a', 'offer', 'end')

    expect(input).toEqual(SEED)
  })

  it('없는 id면 같은 배열을 그대로 돌려준다', () => {
    expect(applyMove(SEED, 'nobody', 'offer', 'end')).toBe(SEED)
  })
})

describe('useApplicants 롤백', () => {
  it('실패하면 그 카드를 서버 확정 상태로 되돌리고 알린다', async () => {
    const hook = await renderReady()

    const { outcome } = await move(hook, 'a', 'interview')
    expect(stageOf(hook.result.current.applicants, 'a')).toBe('interview')

    await settle(calls[0], 'reject')

    await expect(outcome).resolves.toBe('rolled-back')
    expect(stageOf(hook.result.current.applicants, 'a')).toBe('screening')
    expect(hook.result.current.toasts).toHaveLength(1)
    expect(hook.result.current.toasts[0].message).toContain('서류검토')
  })

  it('A 카드의 실패가 B 카드의 낙관적 이동을 지우지 않는다', async () => {
    const hook = await renderReady()

    await move(hook, 'a', 'interview')
    await move(hook, 'b', 'offer')
    const [callA, callB] = calls

    await settle(callA, 'reject')

    // 전체 스냅샷 롤백이었다면 B도 screening으로 돌아갔을 것이다.
    expect(stageOf(hook.result.current.applicants, 'a')).toBe('screening')
    expect(stageOf(hook.result.current.applicants, 'b')).toBe('offer')

    await settle(callB, 'resolve')
    expect(stageOf(hook.result.current.applicants, 'b')).toBe('offer')
  })

  it('첫 요청 성공 + 두 번째 요청 실패면 첫 요청의 결과로 되돌린다', async () => {
    const hook = await renderReady()

    await move(hook, 'a', 'interview')
    const { outcome: second } = await move(hook, 'a', 'offer')

    await settle(calls[0], 'resolve')
    await settle(calls[1], 'reject')

    await expect(second).resolves.toBe('rolled-back')
    // 이동 직전(screening)이 아니라 서버가 마지막으로 확정한 interview여야 한다.
    expect(stageOf(hook.result.current.applicants, 'a')).toBe('interview')
    expect(hook.result.current.toasts[0].message).toContain('면접')
  })

  it('keep 이동이 실패하면 제자리에서 되돌린다', async () => {
    const hook = await renderReady()

    // 결과 칩 토글: 최종합격 → 불합격, 자리는 그대로.
    await move(hook, 'c', 'rejected', 'keep')
    // 그 사이 다른 카드가 컬럼을 옮겨 순서가 바뀐다.
    await move(hook, 'a', 'interview', 'end')
    expect(calls[0].placement).toBe('keep')

    await settle(calls[0], 'reject')

    expect(stageOf(hook.result.current.applicants, 'c')).toBe('hired')
    // 롤백이 end로 처리됐다면 c가 맨 뒤로 튀었을 것이다.
    expect(hook.result.current.applicants.map((item) => item.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('useApplicants 경쟁 상태', () => {
  it('같은 카드의 요청은 앞 요청이 끝난 뒤에 나가서 서버 쓰기 순서가 의도 순서와 같다', async () => {
    const hook = await renderReady()

    await move(hook, 'a', 'interview')
    await move(hook, 'a', 'offer')

    // 화면은 줄을 서지 않는다. 두 번째 의도가 이미 반영되어 있다.
    expect(stageOf(hook.result.current.applicants, 'a')).toBe('offer')
    // 네트워크는 줄을 선다. 첫 요청이 끝나기 전에는 두 번째가 나가지 않는다.
    expect(calls).toHaveLength(1)

    await settle(calls[0], 'resolve')

    expect(calls.map((call) => [call.toStage, call.placement])).toEqual([
      ['interview', 'end'],
      ['offer', 'end'],
    ])
  })

  it('앞 요청이 실패해도 줄이 끊기지 않고 다음 요청이 나간다', async () => {
    const hook = await renderReady()

    await move(hook, 'a', 'interview')
    await move(hook, 'a', 'offer')

    await settle(calls[0], 'reject')

    expect(calls).toHaveLength(2)
    expect(calls[1].toStage).toBe('offer')
  })

  it('다른 카드의 요청은 서로 기다리지 않는다', async () => {
    const hook = await renderReady()

    await move(hook, 'a', 'interview')
    await move(hook, 'b', 'offer')

    expect(calls.map((call) => call.id)).toEqual(['a', 'b'])
  })

  it('지난 요청의 성공 응답이 화면의 마지막 의도를 덮어쓰지 않는다', async () => {
    const hook = await renderReady()

    const { outcome: first } = await move(hook, 'a', 'interview')
    await move(hook, 'a', 'offer')

    await settle(calls[0], 'resolve')

    await expect(first).resolves.toBe('superseded')
    expect(stageOf(hook.result.current.applicants, 'a')).toBe('offer')
  })

  it('지난 요청의 실패 응답은 롤백도 알림도 하지 않는다', async () => {
    const hook = await renderReady()

    const { outcome: first } = await move(hook, 'a', 'interview')
    await move(hook, 'a', 'offer')

    await settle(calls[0], 'reject')

    await expect(first).resolves.toBe('superseded')
    expect(stageOf(hook.result.current.applicants, 'a')).toBe('offer')
    expect(hook.result.current.toasts).toHaveLength(0)
  })
})
