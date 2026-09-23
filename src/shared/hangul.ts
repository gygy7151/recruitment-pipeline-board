/**
 * 초성 검색용 한글 유틸.
 *
 * 한글 완성형 음절(U+AC00 '가' ~ U+D7A3 '힣')은 초성 19 × 중성 21 × 종성 28 순서로
 * 규칙적으로 배열되어 있다. 그래서 초성은 `(코드 - 0xAC00) / 588`(= 21 × 28)의 몫으로 바로 나온다.
 * 표의 문자는 키보드 IME가 실제로 입력하는 호환 자모(U+3131~)다.
 */
const CHOSUNG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
]
// 겹받침 자음(ㄳ, ㄵ 등)은 초성이 될 수 없으므로 이 집합에 없다.
const CHOSUNG_SET = new Set(CHOSUNG)

const SYLLABLE_FIRST = 0xac00
const SYLLABLE_LAST = 0xd7a3
const SYLLABLES_PER_CHOSUNG = 588

/** 초성으로 쓸 수 있는 자음 한 글자인가. */
function isChosung(char: string): boolean {
  return CHOSUNG_SET.has(char)
}

/** 완성형 음절이면 그 초성을, 아니면 글자를 그대로 돌려준다. */
function getChosung(char: string): string {
  const code = char.charCodeAt(0)
  if (code < SYLLABLE_FIRST || code > SYLLABLE_LAST) return char
  return CHOSUNG[Math.floor((code - SYLLABLE_FIRST) / SYLLABLES_PER_CHOSUNG)]
}

/** 검색어의 한 글자가 대상의 한 글자와 맞는가. 검색어가 초성이면 대상의 초성과 비교한다. */
function matchesChar(targetChar: string, keywordChar: string): boolean {
  if (targetChar === keywordChar) return true
  return isChosung(keywordChar) && getChosung(targetChar) === keywordChar
}

/**
 * 초성을 섞어 쓸 수 있는 부분 일치 검사기를 만든다.
 *
 * - `ㅎㅅㅂ` → "한수빈", `ㅅㅂ` → "한수빈"(중간부터)
 * - `한ㅅ` → "한수빈". IME로 "한수"를 치는 도중 반드시 거치는 상태라 결과가 0건으로 깜빡이지 않게 한다.
 * - 검색어에 초성이 없으면 기존 `includes`와 결과가 같으므로 그대로 쓴다.
 *
 * 검색어에 초성이 있는지는 검색어마다 한 번만 판정하면 되므로, 검색어를 받아 대상마다 호출할 함수를 돌려준다.
 */
export function createChosungMatcher(keyword: string): (target: string) => boolean {
  let hasChosung = false
  for (let i = 0; i < keyword.length; i++) {
    if (isChosung(keyword[i])) {
      hasChosung = true
      break
    }
  }
  if (!hasChosung) return (target) => target.includes(keyword)

  return (target) => {
    const last = target.length - keyword.length
    for (let start = 0; start <= last; start++) {
      let matched = true
      for (let i = 0; i < keyword.length; i++) {
        if (!matchesChar(target[start + i], keyword[i])) {
          matched = false
          break
        }
      }
      if (matched) return true
    }
    return false
  }
}
