# PROMPTS.md

프롬프트 & 리뷰/검증 로그. 기능 단위로 기록하며 커밋과 1:1로 대응한다.
AI 도구: Claude Code (Claude Fable 5.1). 각 기능은 `/feature-step <feature>` 스킬 사이클
(요구사항 해석·가정 → 설계 선택 → 구현 → 독립 AI 리뷰 → 테스트 → 기록 → 커밋)로 진행한다.

---

## [init] 프로젝트 셋업

### 프롬프트 1
> 이 스킬은 내 깃허브에도 연결 되어 있어야해

### 프롬프트 2
> repo 이름은 recruitment-pipline-board로 할거야

### 프롬프트 3
> README 제목은
> Recruitment Pipeline Board
> 채용 단계별 지원자 관리 및 파이프라인 보드
> 이렇게 잡아줘 ..

### 프롬프트 4
> recruitment-pipeline-board로 고쳐줘, 그리고 init 시작하자

(AI가 레포 이름 `pipline`과 README 제목 `Pipeline`의 표기 불일치를 지적 → 사용자가 `pipeline`으로 확정)

### 프롬프트 5 — 초기 결정 (AI가 제시한 선택지에서 사용자가 선택)
- 프레임워크: Vite + React + TS (대안: Next.js)
- 상태 관리: React state + custom hook (대안: Zustand / Redux Toolkit / TanStack Query)
- 스타일링: CSS Modules (대안: Tailwind / styled-components)
- 단계 이동 방식: 액션 버튼 (대안: DnD + 키보드 대체 경로 / 버튼 먼저 후 DnD 추가)
- 레포 공개 범위: public
- 원문 7장(제출물·제공 mock API): 못 봤음 → 가정으로 진행
- 상세 패널 추가 필드: 이메일·연락처·경력연수·메모

### AI 출력 요지
- `npm create vite@latest -- --template react-ts`로 스캐폴딩 (React 19, TS 6, Vite 8, oxlint).
- `package.json`에 `typecheck` 스크립트와 `engines.node >= 20` 추가, `.nvmrc` 생성.
- README / DECISIONS.md / PROMPTS.md 스켈레톤 생성. DECISIONS.md에 초기 결정 4개와 가정 3개 기록.
- `git init` → 첫 커밋 → `gh repo create --public` 으로 원격 생성·push.

### 리뷰 / 검증
- 무엇이 문제였나: 첫 스캐폴딩 명령이 실패했다. 셸 기본 Node가 v16.16.0이어서 최신 create-vite가 실행되지 않았다.
- 어떻게 알아챘나: npm 에러 로그 확인 후 `node --version`으로 재현. fnm에 Homebrew Node 25.8.0이 `system`으로 있어 그것으로 재실행.
- 채택 / 수정 / 기각: 스캐폴딩 결과는 그대로 채택. Node 요구 버전을 프로젝트에 명시(`engines`, `.nvmrc`, README)하도록 수정.
- 어떻게 고쳤나: `PATH`에 Homebrew Node를 앞세워 재실행. 이후 `npm run typecheck`, `npm run lint`, `npm run build` 통과 확인.
- 독립 AI 리뷰: 이 단계는 기능 코드가 없어 리뷰 에이전트를 돌리지 않았다. board-layout부터 적용.
