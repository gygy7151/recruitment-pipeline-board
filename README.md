# Recruitment Pipeline Board

채용 단계별 지원자 관리 및 파이프라인 보드

## 실행

Node 20 이상이 필요합니다 (`.nvmrc` 참고).

```bash
npm install
npm run dev        # 개발 서버
npm run build      # tsc -b && vite build
npm run typecheck  # 타입 검사
npm run lint       # oxlint
```

## 키보드 조작

카드 안의 버튼(이름·결과 칩·이동 버튼) 중 하나에 포커스를 두고 누른다.

| 키 | 동작 |
|---|---|
| `←` / `→` | 이전 / 다음 컬럼으로 이동. 서류검토에서 `←`, 결과에서 `→`는 무동작 |
| `→` (처우협의) | "최종합격인가요?" 확인 창. 취소·`ESC`면 이동하지 않음 |
| `↑` | 상세 drawer 열기 |
| `ESC` / `↓` | 상세 drawer 닫기. 포커스는 그 카드의 이름으로 돌아온다 |
| `Tab` | 카드 안 버튼과 다음 카드로 이동. 컬럼 본문이 포커스를 따라 스크롤된다 |

- 키를 누르고 있어도 한 칸만 이동한다.
- 이동한 카드는 대상 컬럼의 맨 아래로 가고, 포커스는 누르던 버튼과 같은 종류의 버튼을 따라간다.
- 이동 성공은 스크린리더가 "OOO: 면접 단계로 옮겼습니다."로 읽는다. 실패하면 되돌린 뒤 알림으로 알려 준다.

## 구현 범위

| feature | 요구사항 | 상태 |
|---|---|---|
| init | - | 완료 |
| board-layout | Must 1 (보드/컬럼) | 완료 |
| mock-api | Must 2·3 전제 | 완료 |
| card-list | Must 1 (카드) | 완료 |
| stage-move | Must 2 | 완료 |
| stage-merge | 결과 컬럼 통합 + 칩 토글 | 완료 |
| toggle-in-place | 결과 토글 시 자리 유지 | 완료 |
| result-confirm | 결과 이동 시 합격 여부 확인 | 완료 |
| responsive | 모바일 화면 대응 | 완료 |
| optimistic-update | Must 3 | 완료 |
| search-filter | Must 4 | 완료 |
| detail-panel | Must 5 | 완료 |
| loading-error-empty | Must 6 | 예정 |
| a11y-keyboard | Should (키보드 접근성) | 완료 |
| rollback-test · undo · virtualization | Should | 예정 |

저장되는 채용 단계는 서류검토 · 면접 · 처우협의 · 최종합격 · 불합격 5개다. 화면의 컬럼은 **서류검토 → 면접 → 처우협의 → 결과** 4개이며, 결과 컬럼이 최종합격과 불합격을 함께 담는다. 카드의 칩을 눌러 두 결과를 전환한다. 단계와 컬럼 정의 모두 `src/shared/stages.ts`가 단일 출처다.

컬럼 구성은 원문에 규정이 없어 지원자가 정한 가정이다. 근거는 DECISIONS.md를 참고.

## Mock API

`src/api/mock.ts`에 자체 구현했다. 실제 백엔드는 없다.

- 모든 호출이 **200~800ms 난수 지연** 뒤 **약 15% 확률로 `MockApiError`를 던진다.** 조회와 이동 모두에 적용된다.
- 실패율을 낮추거나 끄는 수단은 두지 않았다.
- 단계 이동은 성공 시 localStorage에 저장되어 새로고침 후에도 유지된다.
- 단계 변경 시 카드가 놓일 자리를 호출부가 정한다. 컬럼 간 이동은 목록 끝으로, 결과 토글은 제자리다.
- 시드 데이터 1,000건은 `src/api/seed.ts`가 고정 seed로 생성하므로 항상 같은 데이터가 나온다.

측정값(브라우저에서 직접 호출): 지연 210~797ms(40회), 실패 65/500회 = 13.0%. 자세한 검증 표는 PROMPTS.md 참조.

## 기록

- [PROMPTS.md](./PROMPTS.md) — 프롬프트 & 리뷰/검증 로그 (기능별, 커밋과 1:1)
- [DECISIONS.md](./DECISIONS.md) — 설계 결정 · 가정 · AI 제안 채택/기각 · 못 끝낸 기능
