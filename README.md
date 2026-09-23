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

| feature | Must/Should | 커밋 | 상태 |
|---|---|---|---|
| init | - | (아래 커밋 로그) | 완료 |

## Mock API

지연 200~800ms, 실패율 약 15%, localStorage persist — `mock-api` 단계에서 구현 예정.

## 기록

- [PROMPTS.md](./PROMPTS.md) — 프롬프트 & 리뷰/검증 로그 (기능별, 커밋과 1:1)
- [DECISIONS.md](./DECISIONS.md) — 설계 결정 · 가정 · AI 제안 채택/기각 · 못 끝낸 기능
