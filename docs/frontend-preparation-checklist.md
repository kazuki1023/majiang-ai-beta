# フロントエンド実装前の確認事項

## 概要

Next.jsフロントエンドの実装とデプロイを開始する前に、現状の実装で確認・対応すべき点をまとめました。

---

## 🔴 必須対応事項

### 1. CORS設定（Mastra API側）

**現状**: CORS設定が未実装  
**影響**: フロントエンドからAPIを呼び出すとCORSエラーが発生

**対応方法**: Mastraのmiddleware機能を使用

```typescript
// mastra/src/mastra/index.ts
import { Mastra } from '@mastra/core/mastra';

export const mastra = new Mastra({
  // ... 既存の設定
  server: {
    middleware: [
      {
        handler: async (c, next) => {
          // 許可するオリジンを環境変数から取得
          const allowedOrigins = [
            process.env.FRONTEND_URL || 'https://majiang-ai-xxxxx.a.run.app',
            'http://localhost:3000', // 開発用
          ];
          
          const origin = c.req.header('Origin');
          
          // CORSヘッダーの設定
          if (origin && allowedOrigins.includes(origin)) {
            c.header('Access-Control-Allow-Origin', origin);
          } else if (!origin) {
            // 同一オリジンからのリクエスト（originがundefined）は許可
            c.header('Access-Control-Allow-Origin', '*');
          }
          
          c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          c.header('Access-Control-Allow-Credentials', 'true');
          
          // OPTIONSリクエスト（プリフライト）の処理
          if (c.req.method === 'OPTIONS') {
            return new Response(null, { status: 204 });
          }
          
          await next();
        },
        path: '/api/*', // APIエンドポイントに適用
      },
    ],
  },
});
```

**実装手順**:
- [x] `mastra/src/mastra/index.ts`にCORS middlewareを追加
- [x] 環境変数`FRONTEND_URL`を読むように実装（Cloud Run デプロイ時に環境変数として設定する）
- [x] ローカル開発用に`http://localhost:3000`を許可
- [ ] 動作確認（フロント起動後にブラウザから API 呼び出しで確認）

**参考**: 
- [Mastra Middleware Documentation](https://mastra.ai/docs/server/middleware#cors-support)
- [docs/cors-strategy.md](./cors-strategy.md)

---

### 2. 環境変数の整合性

**現状**: フロントエンド用の環境変数が未設定

**必要な環境変数**:

| サービス | 変数名 | 説明 | 現状 |
|---------|--------|------|------|
| **Mastra API** | `FRONTEND_URL` | フロントエンドのURL（CORS用） | ❌ 未設定 |
| **Next.js Frontend** | `NEXT_PUBLIC_MASTRA_API_URL` | Mastra APIのURL | ❌ 未設定 |
| **Next.js Frontend** | `GCS_BUCKET` | Cloud Storageバケット名 | ❌ 未設定 |
| **Next.js Frontend** | `GOOGLE_CLOUD_PROJECT` | GCPプロジェクトID | ❌ 未設定 |

**対応方法**:
- [ ] フロントエンドデプロイ後に、Mastra APIの`FRONTEND_URL`を更新
- [ ] フロントエンドの環境変数をCloud Runで設定

---

### 3. Next.jsのDockerfile設定

**現状**: ARCHITECTURE.mdにDockerfile例はあるが、`standalone`モードの設定が未確認

#### `standalone`モードとは？

Next.jsの`standalone`モードは、**コンテナ環境向けの最適化されたビルドモード**です。

**通常のビルドとの違い**:

| 項目 | 通常のビルド | standaloneモード |
|------|------------|-----------------|
| **出力先** | `.next/` | `.next/standalone/` |
| **含まれるもの** | すべてのファイル | 実行に必要な最小限のファイルのみ |
| **node_modules** | すべての依存関係 | 本番環境に必要な依存関係のみ（60-70%削減） |
| **ソースコード** | `.ts`, `.tsx`ファイルも含む | コンパイル済みの`.js`のみ |
| **イメージサイズ** | 大きい（500MB+） | 小さい（180MB程度） |

**メリット**:
- ✅ Dockerイメージサイズが大幅に削減される
- ✅ ビルド時間が短縮される
- ✅ セキュリティリスクが低減（ソースコードが含まれない）
- ✅ Cloud Runでの起動時間が短縮される

#### 設定方法

**1. `next.config.js`で`standalone`モードを有効化**:

```typescript
// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // ← これを追加
};

module.exports = nextConfig;
```

**2. ビルドを実行**:

```bash
npm run build
```

**3. 出力を確認**:

```
.next/
├── standalone/          # ← これが生成される
│   ├── server.js       # エントリーポイント
│   ├── node_modules/   # 最小限の依存関係
│   ├── package.json
│   └── .next/          # コンパイル済みファイル
├── static/             # 静的アセット
└── ...
```

**4. Dockerfileで使用**:

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build  # standaloneモードでビルド

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# standaloneディレクトリをコピー
COPY --from=builder /app/.next/standalone ./
# 静的アセットをコピー
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 8080
CMD ["node", "server.js"]  # standalone/server.jsを実行
```

#### 注意事項

**1. 外部ファイルのコピーが必要な場合**

`standalone`モードでは、`public/`ディレクトリや静的アセットは自動的にコピーされません。明示的にコピーする必要があります：

```dockerfile
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
```

**2. submodulesの扱い**

`majiang-ui`などのsubmodulesを使用する場合、それらも`standalone`ディレクトリに含まれるか確認が必要です。含まれない場合は、手動でコピーする必要があります。

**確認事項**:
- [ ] `next.config.js`で`output: 'standalone'`が設定されているか
- [ ] Dockerfileが`standalone`モードを前提としているか
- [ ] `submodules`（majiang-ui等）が正しくコピーされるか
- [ ] 静的アセット（`public/`）が正しくコピーされるか

**参考**: 
- [Next.js Standalone Output Documentation](https://nextjs.org/docs/pages/api-reference/next-config-js/output#standalone)
- [Next.js Docker Deployment Guide](https://nextjs.org/docs/deployment#docker-image)

---

## 🟡 推奨確認事項

### 4. 画像アップロードフロー

**設計の確認**:

**選択肢A: フロントエンド → GCS直接アップロード**
- メリット: Next.jsサーバーの負荷が少ない
- デメリット: ブラウザからGCSへの認証が必要（Signed URL等）

**選択肢B: フロントエンド → Next.js API Route → GCS**
- メリット: 認証をサーバー側で処理できる
- デメリット: Next.jsサーバーに負荷がかかる

**推奨**: 選択肢B（Next.js API Route経由）

**確認事項**:
- [ ] 画像アップロード用のNext.js API Routeを実装するか決定
- [ ] フロントエンド用のサービスアカウントが必要か確認
- [ ] Signed URLを使用する場合は、有効期限の設定を検討

---

### 5. サービスアカウントの権限

**現状**: `majiang-ai-sa`はMastra API用に設定済み

**フロントエンド用の検討**:

| 用途 | 必要な権限 | サービスアカウント |
|------|-----------|-------------------|
| **GCSへの画像アップロード** | `roles/storage.objectCreator` | フロントエンド用のSAが必要？ |
| **Mastra API呼び出し** | 不要（公開エンドポイント） | 不要 |

**確認事項**:
- [ ] フロントエンドからGCSに直接アップロードする場合、新しいサービスアカウントが必要か
- [ ] Next.js API Route経由の場合、Cloud Runのサービスアカウントで十分か

**推奨**: Next.js API Route経由の場合、Cloud Runのサービスアカウントに`roles/storage.objectCreator`を付与

---

### 6. Cloud Build設定の更新

**現状**: `cloudbuild.yaml`はGCR（Container Registry）を使用

**確認事項**:
- [ ] Artifact Registryを使用するように更新するか
- [ ] フロントエンドのビルドも含めるか

**推奨**: Artifact Registryに統一（Phase 2で使用開始）

```yaml
# cloudbuild.yaml の更新例
steps:
  - name: "gcr.io/cloud-builders/docker"
    args: [
      "build",
      "--platform", "linux/amd64",  # 重要
      "-t", "asia-northeast1-docker.pkg.dev/$PROJECT_ID/majiang-ai-repo/majiang-ai-frontend:latest",
      "./frontend"
    ]
```

---

## 🟢 その他の確認事項

### 7. エラーハンドリング

**確認事項**:
- [ ] Mastra APIのエラーレスポンス形式を確認
- [ ] フロントエンドでのエラー表示方法を設計
- [ ] タイムアウト処理の実装方針

---

### 8. 認証・セキュリティ

**現状**: Mastra APIは`--allow-unauthenticated`で公開

**確認事項**:
- [ ] API Key認証を追加するか（推奨）
- [ ] レート制限の実装を検討
- [ ] セキュリティヘッダーの設定

**推奨**: Phase 3以降でAPI Key認証を追加

---

### 9. デプロイ順序

**推奨デプロイ順序**:

1. **Mastra APIをデプロイ**（既に完了）
   - API URLを取得: `https://majiang-ai-api-xxxxx.a.run.app`

2. **Next.js Frontendをデプロイ**
   - 環境変数`NEXT_PUBLIC_MASTRA_API_URL`にAPI URLを設定
   - フロントエンドURLを取得: `https://majiang-ai-xxxxx.a.run.app`

3. **Mastra APIのCORS設定を更新**
   - 環境変数`FRONTEND_URL`にフロントエンドURLを設定

4. **動作確認**

---

### 10. ローカル開発環境

**確認事項**:
- [ ] フロントエンドのローカル開発環境のセットアップ方法
- [ ] ローカルでMastra APIを呼び出す際のURL設定
- [ ] 環境変数の管理方法（`.env.local`等）

---

## 📋 実装前チェックリスト

### Mastra API側

- [x] CORS設定の実装方法を確認 → **Mastraのmiddleware機能を使用**
- [x] CORS middlewareの実装
- [x] `FRONTEND_URL`環境変数の追加準備（コードで参照済み。Cloud Run デプロイ時に設定）
- [ ] エラーレスポンス形式の確認

### Next.js Frontend側

- [x] プロジェクトの初期化（`frontend/` に Next.js 16, App Router, TypeScript, Tailwind, ESLint）
- [x] `next.config.ts`で`standalone`モードの設定
- [ ] Dockerfileの作成（submodules対応）
- [x] 環境変数の設計（`.env.local.example` に記載。本番は Cloud Run で設定）
- [ ] GCSアップロード用API Routeの設計

### インフラ側

- [ ] フロントエンド用のサービスアカウントが必要か確認
- [ ] Cloud Build設定の更新（Artifact Registry対応）
- [ ] デプロイ手順の文書化

---

## 🚨 注意事項

### 1. プラットフォーム指定

**重要**: フロントエンドのDockerビルド時も`--platform linux/amd64`を指定

```bash
docker build --platform linux/amd64 \
  -f frontend/Dockerfile \
  -t asia-northeast1-docker.pkg.dev/majiang-ai-beta/majiang-ai-repo/majiang-ai-frontend:latest .
```

### 2. submodulesの扱い

フロントエンドで`majiang-ui`を使用する場合、submodulesをDockerfileで正しくコピーする必要がある

### 3. 環境変数の公開

`NEXT_PUBLIC_*`プレフィックスが付いた環境変数は、クライアント側に公開される  
機密情報は使用しないこと

---

## 📚 参考ドキュメント

- [ARCHITECTURE.md](../ARCHITECTURE.md) - 全体アーキテクチャ
- [docs/cors-strategy.md](./cors-strategy.md) - CORS戦略
- [docs/gcp/README.md](./gcp/README.md) - GCP環境設定
- [docs/gcp/cloud-run-docker.md](./gcp/cloud-run-docker.md) - Cloud RunとDockerの仕組み

---

## 次のステップ

1. **CORS設定の実装方法を確認**（最優先）
2. **Next.jsプロジェクトの初期化**
3. **Dockerfileの作成とテスト**
4. **環境変数の設計と設定**
5. **デプロイと動作確認**
