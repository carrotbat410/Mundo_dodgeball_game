# Mundo Dodgeball Game

문도피구 웹 게임 프로젝트입니다.

## Workspace

- `apps/web`: Next.js + Phaser 기반 웹 클라이언트
- `apps/game-server`: Socket.IO 기반 실시간 게임 서버
- `packages/shared`: 공통 타입, 이벤트, 게임 상수

## Branch Strategy

- `develop`: 기능 개발 브랜치
- `main`: 문서상 배포 브랜치였으나 현재 원격에는 없음

현재 원격 저장소는 `develop`만 있고 `origin/HEAD`도 `develop`입니다.
현 운영에서는 `develop`에 push된 최신 커밋을 배포 기준으로 봅니다.

## 운영 서버 메모

- 서버 IP: `168.107.4.77`
- SSH 계정: `ubuntu`
- SSH 키: `/Users/leechangmin/Documents/authKeys/oracle_cloud/instance-20260222-1310-key/ssh-key-2026-02-22.key`
- 2026-04-23 기준 `/swapfile` 4GiB 설정 완료

## 서버 실행 명령어
pnpm dev:game-server
pnpm dev:web
