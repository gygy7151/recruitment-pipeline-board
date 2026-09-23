import { ALL_ROLES } from './useApplicantFilter'
import styles from './FilterBar.module.css'

type FilterBarProps = {
  query: string
  onQueryChange: (value: string) => void
  role: string
  onRoleChange: (value: string) => void
  roles: string[]
  resultCount: number
  isFiltering: boolean
  /** 목록을 불러오는 동안. 자리는 지키되 입력은 받지 않는다. */
  disabled?: boolean
}

export function FilterBar({
  query,
  onQueryChange,
  role,
  onRoleChange,
  roles,
  resultCount,
  isFiltering,
  disabled = false,
}: FilterBarProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="applicant-search">
          이름 검색
        </label>
        <input
          id="applicant-search"
          className={styles.input}
          type="search"
          value={query}
          placeholder="지원자 이름"
          autoComplete="off"
          disabled={disabled}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="applicant-role">
          직무
        </label>
        <select
          id="applicant-role"
          className={styles.select}
          value={role}
          disabled={disabled}
          onChange={(event) => onRoleChange(event.target.value)}
        >
          <option value={ALL_ROLES}>전체 직무</option>
          {roles.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {/* 검색 중일 때만 결과 수를 읽어준다. 조용히 바뀌면 화면을 못 보는 사용자가 알 수 없다. */}
      <p className={styles.result} role="status">
        {isFiltering ? `${resultCount}명이 검색되었습니다.` : ''}
      </p>
    </div>
  )
}
