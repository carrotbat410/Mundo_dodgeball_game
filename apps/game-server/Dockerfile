FROM node:22-alpine
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml ./
COPY apps/game-server/package.json ./apps/game-server/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --no-frozen-lockfile

COPY . .

RUN pnpm --filter @mundo/shared build

WORKDIR /app/apps/game-server

EXPOSE 5000

CMD ["pnpm", "start"]
