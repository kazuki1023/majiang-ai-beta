# ビルドコンテキスト: リポジトリルート (docker build -f frontend/Dockerfile .)
# frontend 単体で submodule を使わないため、frontend/ のみコピーする構成

FROM node:20-alpine AS builder

WORKDIR /app

# 依存関係のインストール
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# ソースをコピーしてビルド
COPY frontend/ ./
RUN npm run build

# ---

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# standalone 出力をコピー
COPY --from=builder /app/.next/standalone ./
# static と public を明示的にコピー（standalone に含まれないため）
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 8080

CMD ["node", "server.js"]
