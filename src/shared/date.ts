/** 2026-03-28 → "2026. 03. 28." 문자열만 다시 조합하므로 실행 환경의 시간대에 영향받지 않는다. */
export function formatAppliedAt(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${year}. ${month}. ${day}.`
}
