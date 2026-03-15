# Mundo Dodgeball Game Handoff

## 프로젝트 개요

- 프로젝트 경로: `/Users/leechangmin/Documents/git-repos-carrotbat410/Mundo_dodgeball_game`
- git 브랜치 전략:
  - `develop`: 기능 개발 브랜치
  - `main`: 배포 브랜치
- 배포 방식:
  - `develop`에서 개발 후 `main`에 머지
  - `main` 머지 후 배포
- 인코딩 기준: `UTF-8`
  - 한글 문구, 주석, 에러 메시지가 깨지지 않도록 반드시 UTF-8 유지

## 게임 기획 요약

### 게임 컨셉

- 웹 기반 실시간 미니게임
- 사용자들이 보통 "문도피구"라고 부르는 컨셉
- 리그오브레전드의 문도 박사 감성을 참고하지만, 장기적으로는 오리지널화 권장

### 핵심 게임 규칙

- 모드:
  - `1:1`
  - `2:2`
  - `3:3`
- 비대칭 모드 없음
- 각 모드는 정확한 인원이 맞아야 시작 가능
- 단판 승부
- 한 팀 전멸 시 승리
- 3분 초과 시 무승부
- 결과 화면은 간단히 `승리 / 패배 / 무승부`만 보여주고 3초 후 로비 복귀

### 조작

- 마우스 우클릭: 이동
- `Q`: 즉시 식칼 발사
- 발사 방향: 현재 마우스 방향
- 좌클릭 조준 없음
- 조준 모드 없음
- 취소 없음
- 이동 중 발사 가능

### 전투 수치 초안

- 체력: 4
- 식칼 1회 명중 시 체력 1 감소
- 4회 맞으면 사망
- `Q` 쿨타임: 4초
- 경기 시간: 180초
- 시작 카운트다운: 3초
- 기준 맵 좌표계: `1600 x 900`
- 맵 중심: `(800, 450)`
- 맵 반지름: `300`
- 중앙 경계선: `x = 800`
- 플레이어 반지름: `22`
- 플레이어 이동속도: `210 px/sec`
- 식칼 반지름: `10`
- 식칼 속도: `520 px/sec`
- 식칼 최대 지속시간: `2초`

### 맵 규칙

- 바론 둥지 같은 원형 아레나
- 한 화면 고정
- 카메라 이동 없음
- 중앙선 기준 블루팀/레드팀 진영 분리
- 플레이어는 자기 반원 안에서만 이동 가능
- 중앙선은 플레이어가 넘을 수 없음
- 식칼은 중앙선을 통과 가능
- 식칼은 외곽 벽에 닿으면 즉시 소멸

### 판정 규칙

- 이동 판정: 서버 권위
- 투사체 생성/충돌 판정: 서버 권위
- 클라이언트는 입력 전송 + 화면 보간
- 플레이어끼리 몸 충돌 없음
- 아군 오사 없음
- 피격 시 경직 없음
- 죽으면 반투명 상태로 제자리에 남고, 아무것도 못 하고 경기 끝날 때까지 관전

## 로비 / 방 UX 규칙

### 게스트 입장

- 닉네임 자유 입력
- 닉네임 중복 허용
- 최대 12글자
- 브라우저 언어 자동 감지 (`ko`, `en`)

### 방 생성

- 방 이름 입력
- 방 이름 최대 20자
- 모드 선택: `1v1`, `2v2`, `3v3`
- 공개방 / 비밀번호방 선택 가능
- 비밀번호 길이: 4자 이상 20자 이하

### 방 목록

- 방 목록 표시
- 게임중 방도 목록에는 표시
- 게임중 방은 입장 불가
- 방 코드 입장 가능
- 비밀번호 방은 비밀번호 입력 후 입장

### 방 내부 로비

- 블루팀 / 레드팀으로 분리
- 입장 시 자동 팀 배치
- 이후 사용자가 팀 bar 클릭으로 자유 이동
- 방장도 팀 이동 가능
- 팀 이동 UX:
  - 블루팀 bar 클릭 시 블루팀 이동 시도
  - 레드팀 bar 클릭 시 레드팀 이동 시도
- 방장만 시작 가능
- 방장 제외 전원 준비 완료 + 정원 충족 시 시작 가능
- 방장만 강퇴 가능
- 강퇴는 로비에서만 가능
- 관전 입장 기능 없음
- 로비 채팅 있음

### 게임 화면 HUD 규칙

- 모든 플레이어 머리 위에 `이름 + 체력바`
- 체력바는 4칸 segmented 형식이 맞는 방향
- 하단 중앙에 `Q` 쿨타임 숫자 + 게이지
- 적 체력도 공개

## 기술 스택 확정안

- 웹/UI: `Next.js + TypeScript`
- 게임 렌더링: `Phaser` 예정
- 실시간 서버: `Node.js + TypeScript`
- 통신: `Socket.IO`
- 공통 타입/상수: `packages/shared`
- 저장소: 초기 MVP는 `DB 없음`, 메모리 기반
- 향후 확장:
  - 멀티 서버/공유 상태 필요 시 `Redis`
  - 로그인/전적/랭킹 필요 시 `MySQL/PostgreSQL`

## 현재 프로젝트 구조

```text
Mundo_dodgeball_game/
  apps/
    web/
    game-server/
  packages/
    shared/
  docs/
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
```

### 주요 파일

#### 루트

- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `.env.example`
- `README.md`

#### shared

- `packages/shared/src/game/constants.ts`
- `packages/shared/src/game/modes.ts`
- `packages/shared/src/game/teams.ts`
- `packages/shared/src/types/room.ts`
- `packages/shared/src/types/session.ts`
- `packages/shared/src/events/clientToServer.ts`
- `packages/shared/src/events/serverToClient.ts`
- `packages/shared/src/index.ts`

#### web

- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/guest/page.tsx`
- `apps/web/src/app/rooms/page.tsx`
- `apps/web/src/app/room/[roomId]/page.tsx`
- `apps/web/src/app/game/[roomId]/page.tsx`
- `apps/web/src/lib/socket/client.ts`
- `apps/web/src/lib/session/guestSession.ts`
- `apps/web/src/lib/room/currentRoom.ts`
- `apps/web/src/messages/ko.json`
- `apps/web/src/messages/en.json`

#### game-server

- `apps/game-server/src/index.ts`
- `apps/game-server/src/server.ts`
- `apps/game-server/src/config/env.ts`
- `apps/game-server/src/state/serverState.ts`
- `apps/game-server/src/types/state.ts`
- `apps/game-server/src/services/ids.ts`
- `apps/game-server/src/services/roomService.ts`
- `apps/game-server/src/socket/registerSocketHandlers.ts`
- `apps/game-server/src/socket/handlers/guestHandler.ts`
- `apps/game-server/src/socket/handlers/lobbyHandler.ts`
- `apps/game-server/src/socket/handlers/roomHandler.ts`

## 지금까지 완료한 작업

### 1. 모노레포 기본 세팅 완료

- `apps/web`, `apps/game-server`, `packages/shared`, `docs` 구성 생성
- `pnpm` workspace 구성 완료
- `TypeScript` 공통 설정 추가

### 2. 공통 타입 / 이벤트 / 상수 추가

- 게임 모드 타입
- 팀 타입
- 방 상태 타입
- 세션 타입
- 소켓 이벤트 타입
- 게임 수치 상수

### 3. 웹 앱 스캐폴드 완료

- `/guest` 페이지 생성
- `/rooms` 페이지 생성
- `/room/[roomId]` 페이지 생성
- `/game/[roomId]` placeholder 페이지 생성
- 글로벌 스타일 추가
- 소켓 싱글턴 클라이언트 추가
- 게스트 세션 저장 로직 추가
- 현재 방 id 저장 로직 추가

### 4. 게임 서버 스캐폴드 완료

- Socket.IO 서버 생성
- 메모리 기반 `sessions`, `rooms`, `roomCodeIndex` 구조 생성
- 게스트 입장 핸들러 추가
- 방 목록 핸들러 추가
- 방 생성 / 입장 / 비밀번호 입장 핸들러 추가
- 팀 변경 핸들러 추가
- 준비 상태 핸들러 추가
- 로비 채팅 핸들러 추가
- 방 나가기 / disconnect 정리 핸들러 추가
- 방장 시작 조건 검사 추가

### 5. 웹-소켓 기본 연결 완료

- 게스트 입장 화면에서 `guest:enter` 호출
- 방 목록 화면에서 `lobby:list` 반영
- 방 생성 UI 연결
- 공개방 / 비밀번호방 입장 연결
- 로비 화면에서 `room:get-state` 요청
- 팀 변경, 준비 상태 변경, 채팅, 나가기 연결

### 6. 검증 완료

- `corepack`으로 `pnpm` 활성화
- `pnpm install` 완료
- `pnpm typecheck` 통과

## 현재 동작하는 수준

현재는 스프린트 1의 usable skeleton 상태입니다.

가능한 것:
- 게스트 입장
- 방 목록 조회
- 방 생성
- 공개방 입장
- 비밀번호방 입장
- 방 로비 상태 동기화
- 팀 이동
- 준비 / 준비 취소
- 로비 채팅
- 나가기
- 방장 시작 시 `countdown` 상태 전환

아직 안 된 것:
- 방 설정 변경 UI/서버 로직
- 강퇴 UI/서버 로직 연결
- 실제 게임 페이지 자동 이동
- Phaser 씬 연결
- 이동, 투사체, 체력, 사망, 승패

## 소켓 이벤트 현황

### 현재 구현된 주요 이벤트

클라이언트 → 서버
- `guest:enter`
- `lobby:list`
- `room:create`
- `room:join`
- `room:join-private`
- `room:get-state`
- `room:change-team`
- `room:set-ready`
- `room:chat`
- `room:leave`
- `room:start-game`

서버 → 클라이언트
- `guest:entered`
- `lobby:list-updated`
- `room:joined`
- `room:state`
- `room:chat-message`
- `room:system-message`
- `system:error`

## 서버 메모리 구조

### 전역 상태

- `sessions: Map<socketId, Session>`
- `rooms: Map<roomId, Room>`
- `roomCodeIndex: Map<roomCode, roomId>`

### Room 개념

- 로비 상태 관리
- 플레이어 목록 유지
- 방장 유지
- 채팅 메시지 일부 유지 가능
- 상태: `waiting | countdown | playing`

### GameState

- 아직 구현 안 됨
- 스프린트 2~3에서 추가 예정
- 방과 분리된 경기 단위 상태로 갈 계획

## 바로 이어서 해야 할 작업

### 최우선 작업

1. 방 설정 변경 기능 구현
- 방 이름 변경
- 모드 변경
- 비밀번호 설정 변경
- 현재 인원 초과 시 모드 변경 불가 처리

2. 강퇴 기능 구현
- 방장만 가능
- 로비에서만 가능
- 강퇴 대상은 방 목록으로 복귀

3. 게임 시작 후 페이지 이동 연결
- `room:start-game` 성공 후 `/game/[roomId]`로 이동
- 현재는 room 상태만 `countdown`으로 바뀜
- 클라이언트에서 이를 감지해 이동시키는 흐름 필요

### 스프린트 2 작업

4. Phaser 연결
- `apps/web/src/lib/phaser` 구조 생성
- `BootScene`, `RoomGameScene` 추가
- `/game/[roomId]` 페이지에서 Phaser mount

5. 고정 맵 렌더링
- 원형 아레나
- 중앙선
- 팀 스폰 위치
- 타이머 / 쿨타임 HUD 뼈대

6. 우클릭 이동 구현
- 서버 권위 이동
- 목표 좌표 처리
- 벽 / 중앙선 제한
- 클라이언트 보간

### 스프린트 3 작업

7. `Q` 발사 구현
- 즉시 발사
- 마우스 방향 기반
- 쿨타임 4초
- 하단 중앙 숫자 + 게이지 HUD

8. 투사체 / 충돌 / 체력
- 식칼 직선 이동
- 벽 닿으면 소멸
- 플레이어 충돌 판정
- 체력 4칸 감소

9. 사망 / 승패 / 로비 복귀
- 사망 시 반투명 + 관전
- 팀 전멸 시 승패
- 시간 초과 무승부
- 결과 3초 후 로비 복귀

## 알고 있어야 하는 기술 포인트

### 1. 서버가 진실의 원천

다음 상태는 서버 기준이어야 함:
- 방 정보
- 플레이어 목록
- 팀 배치
- 준비 상태
- 방장
- 시작 가능 여부

프론트는 계산보다 반영 중심으로 유지하는 게 좋음.

### 2. `room:state` 전체 동기화 전략

현재는 최적화보다 안정성을 우선해서,
상태가 바뀔 때 전체 `room:state`를 다시 보내는 구조가 맞음.

### 3. `Session` / `RoomPlayer` / `GamePlayer` 분리

현재:
- `Session`
- `RoomPlayer`

앞으로 필요:
- `GamePlayer`

세 책임을 섞지 않는 것이 중요함.

### 4. room id와 room code 분리

- `roomId`: 내부 식별자
- `roomCode`: 사용자 입력용 짧은 코드

### 5. 소켓 싱글턴 유지

`apps/web/src/lib/socket/client.ts`는 싱글턴으로 유지해야 함.
페이지마다 소켓을 새로 만들면 상태가 쉽게 꼬임.

### 6. 리스너 cleanup 중요

React 페이지에서 `socket.on()`을 쓸 때는 반드시 cleanup 필요.
중복 리스너 등록이 가장 흔한 버그 포인트 중 하나임.

### 7. UTF-8 유지

- 한글 문구가 많음
- 파일 저장 시 UTF-8 유지 필수

### 8. 기존 사이트와의 관계

- 이 repo는 기존 `lol_team_balance_tool_front2`와 분리된 새 게임 repo임
- 기존 사이트에서는 탭이나 링크로 이 게임에 접근시키는 방향
- `iframe`보다 링크/이동 방식이 더 적합하다고 정리됨

## 실행 방법

### 의존성 설치

```bash
corepack enable
corepack prepare pnpm@10.6.5 --activate
pnpm install
```

### 타입 체크

```bash
pnpm typecheck
```

### 웹 개발 서버

```bash
pnpm dev:web
```

### 게임 서버 실행

```bash
pnpm dev:game-server
```

## 다음 코덱스 스레드에 바로 요청하기 좋은 문장 예시

- `docs/context-handoff.md를 읽고 스프린트 1 남은 작업인 방 설정 변경, 강퇴 UI/서버 연결, 게임 시작 후 /game/[roomId] 이동까지 구현해줘.`
- `docs/context-handoff.md 기준으로 스프린트 2를 시작해서 Phaser 씬 연결과 고정 맵 렌더링을 구현해줘.`
- `docs/context-handoff.md를 바탕으로 현재 room:start-game 이후 countdown 상태를 감지해서 게임 페이지로 이동하는 흐름부터 연결해줘.`

## 참고

- 현재 `pnpm typecheck`는 통과 상태여야 정상
- 다음 작업 전에 `docs/context-handoff.md`를 먼저 읽고 이어서 작업하는 것이 가장 안전함
