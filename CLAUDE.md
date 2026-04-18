# Claude Harness

이 저장소는 문도피구 웹 게임 모노레포입니다.

## 먼저 읽기
- 빠른 개요: @README.md
- 프로젝트 전체 맥락: @docs/context-handoff.md
- 루트 스크립트: @package.json
- 웹 스크립트: @apps/web/package.json
- 게임 서버 스크립트: @apps/game-server/package.json
- 공통 패키지 스크립트: @packages/shared/package.json

## 작업 원칙
- `apps/web`, `apps/game-server`, `packages/shared` 책임을 섞지 않습니다.
- 소켓/게임 규칙을 바꾸면 shared 타입과 서버/클라이언트 양쪽을 같이 확인합니다.
- Phaser 장면 수정은 시각 변경과 판정 로직을 구분해서 다룹니다.
- 기존 문서는 `@파일명`으로 참조하고 설명을 중복 작성하지 않습니다.

## 빠른 워크플로우
1. 관련 레이어 확인 (`web`, `game-server`, `shared`)
2. 작은 범위로 수정
3. 타입 체크/빌드 등 최소 검증 실행
4. 게임 규칙 변경이면 HUD, shared 타입, 서버 판정을 함께 확인

## 검증 핵심
- 전체 타입 체크: `pnpm typecheck`
- 전체 빌드: `pnpm build`
- 웹 개발: `pnpm dev:web`
- 게임 서버 개발: `pnpm dev:game-server`

성능을 위해 기본은 전체 E2E 대신 관련 레이어 중심 검증을 우선합니다.

## 도메인 용어
- 문도피구: 이 게임 자체
- 로비: 게스트 입장, 방 목록, 방 내부 대기실 흐름
- 게임 웹: Next.js + Phaser 클라이언트
- 게임 서버: Socket.IO 기반 실시간 판정 서버
- shared: 이벤트 타입, 룸 타입, 게임 상수 패키지
- Q: 식칼 투사체 스킬
- countdown: 로비에서 게임으로 넘어갈 때 시작 카운트다운 상태

## 자주 하는 판단
- UI/HUD 변경: `pnpm typecheck`
- shared 타입 변경: `pnpm typecheck`
- Docker/배포 변경: 관련 Dockerfile + workflow + 런타임 경로 함께 확인
- 소켓/판정 변경: 클라이언트와 서버가 같은 이벤트 이름/타입을 쓰는지 확인

## 가비지 컬렉션
- `dist`, `.next`, 잘못 생성된 `src/**/*.js`, `tsbuildinfo`는 작업 후 정리합니다.
- 실수로 생성된 산출물이 source 폴더에 섞이지 않게 주의합니다.
- 임시 테스트 자산은 목적이 끝나면 제거합니다.

## 세부 규칙
- 워크플로우: @.claude/rules/workflow.md
- 검증: @.claude/rules/verification.md
- 용어: @.claude/rules/domain.md
- 정리 기준: @.claude/rules/garbage-collection.md
