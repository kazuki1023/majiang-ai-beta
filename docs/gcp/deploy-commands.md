# デプロイ時に実行するコマンドまとめ

Mastra（API）と Frontend を Cloud Run にデプロイする際に実行するコマンドを一覧にしたドキュメント
詳細は [cloud-run-docker.md](./cloud-run-docker.md)・[cloud-run-frontend-deploy.md](./cloud-run-frontend-deploy.md) を参照。

---

## 前提

- **プロジェクト**: `majiang-ai-beta`
- **リージョン**: `asia-northeast1`（東京）
- **Artifact Registry リポジトリ**: `majiang-ai-repo`
- 実行場所: **リポジトリルート**（`majiang-ai/`）

```bash
# プロジェクト・リージョン（以下で共通）
export PROJECT_ID=majiang-ai-beta
export REGION=asia-northeast1
gcloud config set project ${PROJECT_ID}
```

**初回のみ**

- Artifact Registry の認証: `gcloud auth configure-docker ${REGION}-docker.pkg.dev`
- 必要に応じて Artifact Registry リポジトリ作成: [cloud-run-frontend-deploy.md §4.4.2](./cloud-run-frontend-deploy.md#4442-artifact-registry-にタグを付けて-push-する)

---

## 1. Mastra（API）のデプロイ

サービス名: **majiang-ai-api**
イメージ名: **majiang-ai-api**

### 1.1 イメージのビルド

**Apple Silicon (M1/M2/M3) の場合は `--platform linux/amd64` を付ける**（Cloud Run は x86_64 のため）。

```bash
# リポジトリルートで実行
docker build --platform linux/amd64 \
  -f mastra/Dockerfile \
  -t majiang-ai-api:latest .
```

### 1.2 タグ付けと push

```bash
export PROJECT_ID=majiang-ai-beta
export REGION=asia-northeast1
gcloud config set project ${PROJECT_ID}

docker tag majiang-ai-api:latest \
  ${REGION}-docker.pkg.dev/${PROJECT_ID}/majiang-ai-repo/majiang-ai-api:latest

docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/majiang-ai-repo/majiang-ai-api:latest
```

### 1.3 Cloud Run にデプロイ

環境変数（`GOOGLE_API_KEY` 等）は Secret Manager または `--set-env-vars` で渡す。
GCS・Gemini 利用の場合はサービスアカウント `majiang-ai-sa` を指定する。

```bash
export PROJECT_ID=majiang-ai-beta
export REGION=asia-northeast1
gcloud run deploy majiang-ai-api \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/majiang-ai-repo/majiang-ai-api:latest \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --service-account majiang-ai-sa@${PROJECT_ID}.iam.gserviceaccount.com
```

環境変数を直指定する例:

```bash
gcloud run deploy majiang-ai-api \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/majiang-ai-repo/majiang-ai-api:latest \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --service-account majiang-ai-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --set-env-vars "GOOGLE_API_KEY=xxx,GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GCS_BUCKET=majiang-ai-images"
```

### 1.4 デプロイ後の URL 取得

```bash
gcloud run services describe majiang-ai-api --region ${REGION} --format='value(status.url)'
```

この URL を **Frontend の `MASTRA_API_URL`** に設定する。

---

## 2. Frontend のデプロイ

サービス名: **majiang-ai-frontend**  
イメージ名: **majiang-ai-frontend**

**注意**: Frontend は Mastra の URL を参照するため、**先に Mastra をデプロイし、その URL を控えておく**。

### 2.1 イメージのビルド

**Apple Silicon の場合は `--platform linux/amd64` を付ける。**

```bash
# リポジトリルートで実行
docker build --platform linux/amd64 \
  -f frontend/Dockerfile \
  -t majiang-ai-frontend:latest .
```

### 2.2 タグ付けと push

```bash
export PROJECT_ID=majiang-ai-beta
export REGION=asia-northeast1
docker tag majiang-ai-frontend:latest \
  ${REGION}-docker.pkg.dev/${PROJECT_ID}/majiang-ai-repo/majiang-ai-frontend:latest

docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/majiang-ai-repo/majiang-ai-frontend:latest
```

### 2.3 Cloud Run にデプロイ

`MASTRA_API_URL` には [1.4](#14-デプロイ後の-url-取得) で取得した Mastra の URL を指定する。

```bash
export PROJECT_ID=majiang-ai-beta
export REGION=asia-northeast1
gcloud run deploy majiang-ai-frontend \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/majiang-ai-repo/majiang-ai-frontend:latest \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
```

Secret Manager を使う場合は [cloud-run-frontend-deploy.md §4.4.4 方法 C](./cloud-run-frontend-deploy.md#方法-c-secret-manager-で管理する推奨) を参照。

### 2.4 デプロイ後の URL 取得

```bash
gcloud run services describe majiang-ai-frontend --region ${REGION} --format='value(status.url)'
```

---

## 3. コピペ用：一括実行

### Mastra のみ

```bash
export PROJECT_ID=majiang-ai-beta
export REGION=asia-northeast1

docker build --platform linux/amd64 -f mastra/Dockerfile -t majiang-ai-api:latest .
docker tag majiang-ai-api:latest ${REGION}-docker.pkg.dev/${PROJECT_ID}/majiang-ai-repo/majiang-ai-api:latest
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/majiang-ai-repo/majiang-ai-api:latest

gcloud run deploy majiang-ai-api \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/majiang-ai-repo/majiang-ai-api:latest \
  --region ${REGION} --platform managed --allow-unauthenticated --port 8080 \
  --service-account majiang-ai-sa@${PROJECT_ID}.iam.gserviceaccount.com
```

### Frontend のみ（Mastra URL を設定済みの前提）

```bash
export PROJECT_ID=majiang-ai-beta
export REGION=asia-northeast1
# MASTRA_URL は実際の Mastra サービス URL に置き換える
export MASTRA_URL=https://majiang-ai-api-xxxxx.run.app

docker build --platform linux/amd64 -f frontend/Dockerfile -t majiang-ai-frontend:latest .
docker tag majiang-ai-frontend:latest ${REGION}-docker.pkg.dev/${PROJECT_ID}/majiang-ai-repo/majiang-ai-frontend:latest
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/majiang-ai-repo/majiang-ai-frontend:latest

gcloud run deploy majiang-ai-frontend \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/majiang-ai-repo/majiang-ai-frontend:latest \
  --region ${REGION} --platform managed --allow-unauthenticated --port 8080 \
  --set-env-vars "MASTRA_API_URL=${MASTRA_URL},GCS_BUCKET=majiang-ai-images,GOOGLE_CLOUD_PROJECT=${PROJECT_ID}"
```

---

## 4. 関連ドキュメント

| ドキュメント | 内容 |
|--------------|------|
| [README.md](./README.md) | GCP プロジェクト・API・環境変数の概要 |
| [cloud-run-docker.md](./cloud-run-docker.md) | `--platform linux/amd64` の理由、Cloud Run の仕組み |
| [cloud-run-frontend-deploy.md](./cloud-run-frontend-deploy.md) | Frontend の詳細手順・環境変数・Secret Manager・GCS IAM |
| [application-default-credentials.md](./application-default-credentials.md) | ローカル認証・Cloud Run のサービスアカウント |
| [iam-service-account.md](./iam-service-account.md) | サービスアカウントと IAM |
