# mastra/Dockerfile
FROM node:20-alpine

# submodulesを/appの親ディレクトリにコピー
# /appから見て../submodules/が正しく解決されるように
WORKDIR /
COPY submodules/ /submodules/

# mastraアプリケーションの作業ディレクトリ
WORKDIR /app

# package.jsonをコピー
COPY mastra/package*.json ./

# 依存関係のインストール（submodulesが/submodules/にあることを想定）
# package.jsonのfile:../submodules/...は/app/../submodules/ = /submodules/を指す
RUN npm ci

# ソースコードをコピー
COPY mastra/ ./

# ビルド実行
RUN npm run build

# 環境変数設定
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["npm", "start"]
