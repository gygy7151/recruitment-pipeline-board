import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getApplicants } from '../../api/mock'
import type { Applicant } from '../../shared/applicant'
import { useApplicants } from './useApplicants'

/**
 * 목록 조회와 재시도. 이동 테스트(useApplicants.test.ts)와 파일을 나눠 조회 쪽만 조종한다.
 * 실제 mock의 15% 실패는 재현 순서를 정할 수 없어, 호출마다 성공·실패를 테스트가 정한다.
 */
vi.mock('../../api/mock', () => ({
  getApplicants: vi.fn(),
  moveStage: vi.fn(),
}))

const SEED: Applicant[] = [
  {
    id: 'a',
    name: '지원자 a',
    role: 'Frontend',
    appliedAt: '2026-09-01',
    stage: 'screening',
    email: 'a@example.com',
    phone: '010-0000-0000',
    yearsOfExperience: 3,
    memo: '',
  },
]

type PendingLoad = { resolve: () => void; reject: () => void }
let loads: PendingLoad[]

beforeEach(() => {
  loads = []
  vi.mocked(getApplicants).mockImplementation(
    () =>
      new Promise<Applicant[]>((resolve, reject) => {
        loads.push({
          resolve: () => resolve(SEED.map((item) => ({ ...item }))),
          reject: () => reject(new Error('mock failure')),
        })
      }),
  )
})

describe('useApplicants 조회', () => {
  it('첫 조회가 실패하면 error, reload 후 성공하면 ready로 복구한다', async () => {
    const { result } = renderHook(() => useApplicants())
    expect(result.current.status).toBe('loading')

    await act(async () => loads[0].reject())
    expect(result.current.status).toBe('error')
    expect(result.current.applicants).toEqual([])

    act(() => result.current.reload())
    expect(result.current.status).toBe('loading')
    expect(loads).toHaveLength(2)

    await act(async () => loads[1].resolve())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.applicants.map((item) => item.id)).toEqual(['a'])
  })

  it('재시도가 다시 실패하면 다시 error가 된다', async () => {
    const { result } = renderHook(() => useApplicants())
    await act(async () => loads[0].reject())

    act(() => result.current.reload())
    await act(async () => loads[1].reject())
    expect(result.current.status).toBe('error')
  })
})
