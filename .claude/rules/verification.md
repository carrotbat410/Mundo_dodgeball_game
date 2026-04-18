# Verification Rules

- 기본 검증: `pnpm typecheck`
- 배포/런타임 변경: `pnpm build`
- shared 수정: 최소 `pnpm --filter @mundo/shared build` 또는 `pnpm typecheck`
- game-server 수정: `pnpm --filter game-server typecheck`
- web 수정: `pnpm --filter web typecheck`
- Dockerfile 수정 시: 관련 이미지가 어떤 포트와 진입점을 쓰는지 확인
