/**
 * `after` 바로 뒤에 끼운다. `null`이면 맨 앞, 찾지 못하면 끝.
 * 서버(mock `moveStage`)와 화면(`applyMove`)이 이 함수 하나를 같이 쓴다. 규칙이 어긋나면
 * 새로고침했을 때 카드가 다른 자리에 나타난다.
 */
export function insertAfter<T extends { id: string }>(list: T[], item: T, after: string | null): void {
  if (after === null) {
    list.unshift(item)
    return
  }
  const anchor = list.findIndex((entry) => entry.id === after)
  if (anchor === -1) list.push(item)
  else list.splice(anchor + 1, 0, item)
}
