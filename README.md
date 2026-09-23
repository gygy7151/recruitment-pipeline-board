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

## 구현 범위

| feature | 요구사항 | 상태 |
|---|---|---|
| init | - | 완료 |
| board-layout | Must 1 (보드/컬럼) | 완료 |
| mock-api | Must 2·3 전제 | 완료 |
| card-list | Must 1 (카드) | 완료 |
| stage-move | Must 2 | 예정 |
| optimistic-update | Must 3 | 예정 |
| search-filter | Must 4 | 예정 |
| detail-panel | Must 5 | 예정 |
| loading-error-empty | Must 6 | 예정 |
| a11y-keyboard · rollback-test · undo · virtualization | Should | 예정 |

채용 단계는 서류검토 → 면접 → 처우협의 → 최종합격 / 불합격 5개이며 `src/shared/stages.ts`가 단일 출처다.

## Mock API

`src/api/mock.ts`에 자체 구현했다. 실제 백엔드는 없다.

- 모든 호출이 **200~800ms 난수 지연** 뒤 **약 15% 확률로 `MockApiError`를 던진다.** 조회와 이동 모두에 적용된다.
- 실패율을 낮추거나 끄는 수단은 두지 않았다.
- 단계 이동은 성공 시 localStorage에 저장되어 새로고침 후에도 유지된다.
- 시드 데이터 1,000건은 `src/api/seed.ts`가 고정 seed로 생성하므로 항상 같은 데이터가 나온다.

측정값(브라우저에서 직접 호출): 지연 210~797ms(40회), 실패 65/500회 = 13.0%. 자세한 검증 표는 PROMPTS.md 참조.

## 기록

- [PROMPTS.md](./PROMPTS.md) — 프롬프트 & 리뷰/검증 로그 (기능별, 커밋과 1:1)
- [DECISIONS.md](./DECISIONS.md) — 설계 결정 · 가정 · AI 제안 채택/기각 · 못 끝낸 기능
