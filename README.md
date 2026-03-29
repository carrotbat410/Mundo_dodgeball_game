# Mundo Dodgeball Game

문도피구 웹 게임 프로젝트입니다.

## Workspace

- `apps/web`: Next.js + Phaser 기반 웹 클라이언트
- `apps/game-server`: Socket.IO 기반 실시간 게임 서버
- `packages/shared`: 공통 타입, 이벤트, 게임 상수

## Branch Strategy

- `develop`: 기능 개발 브랜치
- `main`: 배포 브랜치

`develop`에서 개발 후 `main`에 머지하면 배포합니다.

## 서버 실행 명령어
pnpm dev:game-server
pnpm dev:web