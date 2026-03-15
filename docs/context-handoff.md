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
- 결과 화면 유지 시간: 3초
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
- 클라이언트는 입력 전송 + 화면 반영
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
- 카드 높이는 1~2줄 정보 중심으로 컴팩트하게 조정됨

### 방 내부 로비

- 블루팀 / 레드팀으로 분리
- 입장 시 자동 팀 배치
- 이후 사용자가 팀 bar 클릭으로 자유 이동
- 방장도 팀 이동 가능
- 방장만 시작 가능
- 방장 제외 전원 준비 완료 + 정원 충족 시 시작 가능
- 방장만 강퇴 가능
- 강퇴는 로비에서만 가능
- 로비 채팅 있음
- 채팅은 새 메시지가 들어오면 자동으로 맨 아래로 스크롤
- 방장만 방 설정 변경 가능

### 게임 화면 HUD 규칙

- 모든 플레이어 머리 위에 `이름 + segmented 체력바`
- 하단 중앙에 `Q` 쿨타임 숫자 + 게이지
- 적 체력도 공개
- 결과 오버레이 표시 후 3초 뒤 로비 복귀

## 기술 스택 확정안

- 웹/UI: `Next.js + TypeScript`
- 게임 렌더링: `Phaser`
- 실시간 서버: `Node.js + TypeScript`
- 통신: `Socket.IO`
- 공통 타입/상수: `packages/shared`
- 저장소: 초기 MVP는 `DB 없음`, 메모리 기반

## 현재 프로젝트 구조

```text
Mundo_dodgeball_game/
  apps/
    web/
    game-server/
  packages/
    shared/
  docs/
```

### 주요 파일

#### shared

- `packages/shared/src/game/constants.ts`
- `packages/shared/src/types/room.ts`
- `packages/shared/src/types/session.ts`
- `packages/shared/src/types/game.ts`
- `packages/shared/src/events/clientToServer.ts`
- `packages/shared/src/events/serverToClient.ts`

#### web

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/guest/page.tsx`
- `apps/web/src/app/rooms/page.tsx`
- `apps/web/src/app/room/[roomId]/page.tsx`
- `apps/web/src/app/game/[roomId]/page.tsx`
- `apps/web/src/lib/phaser/createGame.ts`
- `apps/web/src/lib/phaser/scenes/RoomGameScene.ts`

#### game-server

- `apps/game-server/src/server.ts`
- `apps/game-server/src/state/serverState.ts`
- `apps/game-server/src/types/state.ts`
- `apps/game-server/src/services/roomService.ts`
- `apps/game-server/src/services/gameService.ts`
- `apps/game-server/src/socket/registerSocketHandlers.ts`
- `apps/game-server/src/socket/handlers/lobbyHandler.ts`
- `apps/game-server/src/socket/handlers/roomHandler.ts`
- `apps/game-server/src/socket/handlers/gameHandler.ts`
- `apps/game-server/src/engine/gameLoop.ts`

## 지금까지 완료한 작업

### 스프린트 1 완료

- 게스트 입장
- 방 목록 조회
- 방 생성
- 공개방 / 비밀번호방 입장
- 서버 기반 방 코드 입장
- 방 로비 상태 동기화
- 팀 이동
- 준비 / 준비 취소
- 로비 채팅
- 나가기
- 방장 시작 시 `countdown` 상태 전환
- 방 설정 변경 UI/서버 로직
- 강퇴 UI/서버 로직
- 로비에서 게임 페이지 자동 이동

### 스프린트 2 완료

- Phaser 전장 컨테이너 연결
- 원형 아레나 + 중앙선 렌더링
- `game:state` 타입/이벤트 추가
- 서버 메모리 `games: Map<roomId, Game>` 추가
- `room:start-game` 시 game state 생성
- 서버 game loop 추가 (`50ms` tick)
- countdown -> playing 전환
- game page에서 `game:get-state`, `game:state` 구독
- Phaser 전장에 참가자 위치/이름/체력 프리뷰 렌더링
- 우클릭 이동 입력을 Phaser에서 받아 `game:move`로 전송
- 서버 권위 이동 반영
- 반원 맵 제한 클램프 적용

### 스프린트 3 완료

- `game:cast-q` 이벤트 추가
- 플레이어별 `Q` 쿨타임 서버 관리
- 투사체 생성 / 직선 이동 / TTL / 벽 소멸 구현
- 적 플레이어 충돌 판정 구현
- HP 감소 및 사망 처리 구현
- 사망 시 반투명 상태 유지 구현
- 팀 전멸 시 승패 판정 구현
- 3분 초과 시 무승부 구현
- 결과 3초 후 로비 복귀 구현
- Phaser 씬에서 투사체 렌더링
- Phaser 씬에서 `Q` 키 입력 연결
- 게임 페이지에 Q HUD 및 결과 오버레이 표시

## 현재 동작하는 수준

현재는 **스프린트 3 완료 상태**입니다.

가능한 것:
- 게스트 입장
- 방 생성 / 입장 / 코드 입장
- 방 로비 전체 흐름
- 방 설정 변경
- 강퇴
- 게임 시작 시 countdown 진입
- `/game/[roomId]` 이동
- Phaser 전장 렌더링
- countdown 표시
- 우클릭 이동
- `Q` 발사
- 투사체 이동 및 명중
- 체력 감소 및 탈락 처리
- 승패 / 무승부 / 결과 후 로비 복귀

아직 안 된 것:
- 피격 이펙트 / 발사 이펙트 고도화
- 식칼 도트 아트 / 캐릭터 도트 아트
- 사운드
- 정교한 보간 / 네트워크 튜닝
- 다국어 문자열 정리

## 소켓 이벤트 현황

클라이언트 → 서버
- `guest:enter`
- `lobby:list`
- `lobby:join-by-code`
- `room:create`
- `room:join`
- `room:join-private`
- `room:get-state`
- `room:change-team`
- `room:set-ready`
- `room:chat`
- `room:leave`
- `room:start-game`
- `room:kick-player`
- `room:update-settings`
- `game:get-state`
- `game:move`
- `game:cast-q`

서버 → 클라이언트
- `guest:entered`
- `lobby:list-updated`
- `room:joined`
- `room:state`
- `room:chat-message`
- `room:system-message`
- `room:kicked`
- `game:state`
- `system:error`

## 서버 메모리 구조

### 전역 상태

- `sessions: Map<socketId, Session>`
- `rooms: Map<roomId, Room>`
- `roomCodeIndex: Map<roomCode, roomId>`
- `games: Map<roomId, Game>`

### Room 개념

- 로비 상태 관리
- 플레이어 목록 유지
- 방장 유지
- 상태: `waiting | countdown | playing`

### Game 개념

- 방과 분리된 경기 단위 상태
- 플레이어 좌표, HP, alive 상태, `qCooldownRemaining`, `moveTarget` 유지
- 투사체 배열 유지
- countdown / playing / finished 상태 유지
- 서버 loop에서 매 tick 계산

## 바로 이어서 해야 할 작업

### 후속 우선순위

1. 비주얼 polish
- 피격 이펙트
- 발사 이펙트
- 결과 연출 강화
- HUD 정리

2. 아트 반영
- 문도풍 캐릭터 도트
- 식칼 도트
- 맵 장식

3. 네트워크 / UX 정리
- 이동 보간 고도화
- system error를 toast 식으로 정리
- 다국어 문자열 분리

## 알고 있어야 하는 기술 포인트

### 1. 서버가 진실의 원천

다음 상태는 서버 기준이어야 함:
- 방 정보
- 플레이어 목록
- 팀 배치
- 준비 상태
- 방장
- 경기 좌표와 countdown 상태
- 투사체
- 체력 / 사망 / 결과

### 2. `room:state`, `game:state` 분리

- 로비 관련은 `room:state`
- 경기 관련은 `game:state`
- 둘을 섞지 않는 것이 중요함

### 3. `Session` / `RoomPlayer` / `GamePlayer` 분리

현재 구조:
- `Session`
- `RoomPlayer`
- `GamePlayer`

세 책임을 섞지 않는 것이 중요함.

### 4. 소켓 싱글턴 유지

`apps/web/src/lib/socket/client.ts`는 싱글턴으로 유지해야 함.
페이지마다 소켓을 새로 만들면 상태가 쉽게 꼬임.

### 5. UTF-8 유지

- 한글 문구가 많음
- 파일 저장 시 UTF-8 유지 필수

## 실행 방법

### 의존성 설치

```bash
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

### 현재 로컬 테스트 포인트

- `/guest`에서 2인 이상 입장
- 방 생성 / 입장 / 코드 입장 / 비밀번호 방 테스트
- 로비에서 팀 이동 / 준비 / 강퇴 / 방 설정 변경 테스트
- 방장이 시작 누르면 `/game/[roomId]`로 이동
- 카운트다운 후 우클릭 이동 테스트
- `Q` 발사 / 체력 감소 / 탈락 / 결과 후 로비 복귀 테스트

## 다음 코덱스 스레드에 바로 요청하기 좋은 문장 예시

- `docs/context-handoff.md를 읽고 전투는 유지한 채 피격/발사 이펙트와 HUD polish를 해줘.`
- `docs/context-handoff.md를 기준으로 문도 도트 아트와 식칼 도트 아트를 반영해줘.`
- `docs/context-handoff.md를 읽고 다국어 문자열을 정리하고 화면 문구를 i18n 구조로 분리해줘.`

## 참고

- 현재 `pnpm typecheck`는 통과 상태여야 정상
- 스프린트 3까지는 구현 완료로 보면 됨
