import { useDeferredValue, useMemo, useState } from 'react'
import type { Applicant } from '../../shared/applicant'

export const ALL_ROLES = '__all__'

/** 검색어를 비교용으로 다듬는다. 앞뒤 공백을 버리고 영문 직무를 위해 소문자로 맞춘다. */
function normalize(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * 이름 검색과 직무 필터.
 *
 * 1,000건을 훑는 비용은 마이크로초 단위라 문제가 아니다. 진짜 비용은 키를 누를 때마다
 * 최대 1,000장의 카드를 다시 그리는 React 재조정이다. 그래서 `useDeferredValue`로
 * 목록 렌더를 낮은 우선순위로 미룬다. 입력란은 즉시 반응하고 목록만 뒤따라온다.
 * 디바운스와 달리 결과가 늦게 나타나지 않고, 타이머를 관리할 필요도 없다.
 */
export function useApplicantFilter(applicants: Applicant[]) {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<string>(ALL_ROLES)

  // 입력란이 쓰는 값은 그대로, 목록이 쓰는 값은 미룬 값이다.
  const deferredQuery = useDeferredValue(query)
  const deferredRole = useDeferredValue(role)

  /** 선택지는 실제로 존재하는 직무만 보여준다. 결과가 0건인 것이 확정된 선택지를 만들지 않기 위함이다. */
  const roles = useMemo(() => {
    const found = new Set<string>()
    for (const applicant of applicants) found.add(applicant.role)
    return [...found].sort((a, b) => a.localeCompare(b, 'ko'))
  }, [applicants])

  const filtered = useMemo(() => {
    const keyword = normalize(deferredQuery)
    const byRole = deferredRole !== ALL_ROLES

    if (!keyword && !byRole) return applicants

    return applicants.filter((applicant) => {
      if (byRole && applicant.role !== deferredRole) return false
      if (keyword && !applicant.name.toLowerCase().includes(keyword)) return false
      return true
    })
  }, [applicants, deferredQuery, deferredRole])

  return {
    query,
    setQuery,
    role,
    setRole,
    roles,
    filtered,
    // 결과 수와 같은 시점을 가리키도록 미룬 값으로 판단한다.
    // 즉시 값으로 보면 첫 글자 직후 잠깐 필터 전 숫자가 "검색되었습니다"로 읽힌다.
    isFiltering: normalize(deferredQuery) !== '' || deferredRole !== ALL_ROLES,
    // 미룬 값이 아직 따라오지 못한 동안이라 목록이 한 박자 뒤처져 있다.
    isStale: query !== deferredQuery || role !== deferredRole,
  }
}
