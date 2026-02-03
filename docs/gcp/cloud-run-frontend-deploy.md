# フロントエンド（Next.js）の Cloud Run デプロイ手順

## 概要

frontend を Docker イメージ化し、Artifact Registry に push して Cloud Run にデプロイする手順。実装計画 4.4 に対応する。

---

## 前提

- GCP プロジェクト: `majiang-ai-beta`
- リージョン: `asia-northeast1`（東京）
- Artifact Registry リポジトリ: 既存の `majiang-ai-repo` を使用するか、未作成なら先に作成する
- `gcloud` CLI のログイン・プロジェクト設定済み

---

## 4.4.1 Docker イメージをビルドする

### 何をするか

- リポジトリルートをコンテキストに、`frontend/Dockerfile` でイメージをビルドする
- **Apple Silicon (M1/M2/M3) の場合は `--platform linux/amd64` を付ける**（Cloud Run は x86_64 のため。付けないと ARM64 イメージになり本番で「exec format error」になる）

### コマンド

```bash
# リポジトリルートで実行
cd /path/to/majiang-ai

# イメージをビルド（タグは後で Artifact Registry 用に付け直すので任意でよい）
docker build -f frontend/Dockerfile -t majiang-ai-frontend:latest .

# Apple Silicon の場合は必須
docker build -f frontend/Dockerfile --platform linux/amd64 -t majiang-ai-frontend:latest .
```

### 補足

- ビルドコンテキストはルート（`.`）なので、Dockerfile 内の `COPY frontend/` は正しく解釈される
- 初回やクリーン後は `npm ci` と `npm run build` の分、数分かかることがある
- `--platform linux/amd64` を付けると QEMU でエミュレーションするため、ビルド時間は長くなりがち

---

## 4.4.2 Artifact Registry にタグを付けて push する

### 何をするか

- ビルドしたイメージに、Artifact Registry の URL 形式のタグを付ける
- そのタグで `docker push` し、GCP の Artifact Registry にアップロードする
- 初回は Artifact Registry のリポジトリが無い場合は作成する

### 1. Artifact Registry リポジトリの有無確認・作成

```bash
gcloud config set project majiang-ai-beta

# 既存リポジトリ一覧
gcloud artifacts repositories list --location=asia-northeast1

# 無い場合は作成（形式: Docker）
gcloud artifacts repositories create majiang-ai-repo \
  --repository-format=docker \
  --location=asia-northeast1 \
  --description="Docker images for majiang-ai"
```

### 2. Docker の認証設定（Artifact Registry 用）

```bash
# リージョンに合わせて認証（1回やればよい）
gcloud auth configure-docker asia-northeast1-docker.pkg.dev
```

### 3. タグ付けと push

```bash
# ローカルタグを Artifact Registry 用のタグに付け直す
# 形式: {リージョン}-docker.pkg.dev/{プロジェクトID}/{リポジトリ名}/{イメージ名}:{タグ}
docker tag majiang-ai-frontend:latest \
  asia-northeast1-docker.pkg.dev/majiang-ai-beta/majiang-ai-repo/majiang-ai-frontend:latest

# push
docker push asia-northeast1-docker.pkg.dev/majiang-ai-beta/majiang-ai-repo/majiang-ai-frontend:latest
```

### 補足

- イメージ名（`majiang-ai-frontend`）はサービス名に合わせておくと分かりやすい
- タグは `latest` のほか、`v1.0.0` や日付など任意でよい
- push 後、GCP コンソールの「Artifact Registry」→ 該当リポジトリでイメージが一覧に出る

---

## 4.4.3 gcloud run deploy でデプロイする

### 何をするか

- Cloud Run に「サービス」を作成または更新する
- 使用するイメージを Artifact Registry の URL で指定する
- リージョン・ポート・メモリなどはオプションで指定可能

### コマンド（最小）

```bash
gcloud run deploy majiang-ai-frontend \
  --image asia-northeast1-docker.pkg.dev/majiang-ai-beta/majiang-ai-repo/majiang-ai-frontend:latest \
  --region asia-northeast1
```

### よく使うオプション

```bash
gcloud run deploy majiang-ai-frontend \
  --image asia-northeast1-docker.pkg.dev/majiang-ai-beta/majiang-ai-repo/majiang-ai-frontend:latest \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080
```

| オプション | 意味 |
|------------|------|
| `--platform managed` | フルマネージドの Cloud Run（通常はこれ） |
| `--allow-unauthenticated` | 認証なしで HTTP アクセスを許可（公開フロント用） |
| `--port 8080` | コンテナのリスンポート（Dockerfile の `ENV PORT=8080` と一致） |

### 補足

- 初回は「リソースの API を有効にしますか？」と出たら `y`
- デプロイ中は新しいリビジョンが作られ、トラフィックが切り替わる
- 環境変数は 4.4.4 で設定する（同じ `gcloud run deploy` に `--set-env-vars` を付けるか、コンソールで後から設定）

---

## 4.4.4 環境変数を設定する

### 何をするか

- Next.js フロントと API Route（GCS アップロード、**Mastra プロキシ**）が参照する環境変数を、Cloud Run のサービスに渡す
- **設計**: ブラウザは Mastra を直接叩かず Next.js の API Route 経由で叩くため、Mastra の URL は **サーバー専用**の `MASTRA_API_URL` でよい（[cors-strategy.md](../cors-strategy.md) 選択肢 C）。`NEXT_PUBLIC_*` は不要。
- **サーバー側のみ**（`MASTRA_API_URL`, `GCS_BUCKET`, `GOOGLE_CLOUD_PROJECT`）は Cloud Run の環境変数または **方法 C: Secret Manager** で渡してよい。

### 設定する変数一覧

| 変数名 | 用途 | 例（本番） |
|--------|------|-------------|
| `MASTRA_API_URL` | プロキシ先の Mastra API の URL（**サーバー専用**） | `https://majiang-ai-api-xxxxx.run.app` |
| `GCS_BUCKET` | 画像アップロード先バケット（本番） | `majiang-ai-images` |
| `GOOGLE_CLOUD_PROJECT` | GCP プロジェクト ID | `majiang-ai-beta` |

- 上記はすべてサーバー専用のため、**方法 C: Secret Manager** で保存し、Cloud Run の `--set-secrets` で読み取る形にすると運用しやすい（推奨）。実行時に変更可能で再ビルド不要。

### 方法 A: デプロイ時に `--set-env-vars` で渡す（サーバー用のみ）

```bash
gcloud run deploy majiang-ai-frontend \
  --image asia-northeast1-docker.pkg.dev/majiang-ai-beta/majiang-ai-repo/majiang-ai-frontend:latest \
  --region asia-northeast1 \
  --set-env-vars "MASTRA_API_URL=https://majiang-ai-api-xxxxx.run.app,GCS_BUCKET=majiang-ai-images,GOOGLE_CLOUD_PROJECT=majiang-ai-beta"
```

### 方法 B: コンソールで後から設定

1. GCP コンソール → Cloud Run → サービス `majiang-ai-frontend` を選択
2. 「編集と新しいリビジョンをデプロイ」→「変数とシークレット」
3. `MASTRA_API_URL`, `GCS_BUCKET`, `GOOGLE_CLOUD_PROJECT` を追加・編集
4. 保存してデプロイ

### 方法 C: Secret Manager で管理する（推奨）

サーバー側の環境変数（`MASTRA_API_URL`, `GCS_BUCKET`, `GOOGLE_CLOUD_PROJECT`）を Secret Manager に保存し、Cloud Run が起動時に読み取る形にすると、値の一元管理・ローテーション・監査がしやすくなる。**プロキシ採用のため Mastra URL も実行時に渡せる**（再ビルド不要）。

#### 1. Secret Manager API の有効化

```bash
gcloud services enable secretmanager.googleapis.com --project=majiang-ai-beta
```

#### 2. シークレットの作成

```bash
# プロジェクト・リージョン
export PROJECT_ID=majiang-ai-beta

# Mastra API の URL（プロキシ用。本番の Cloud Run URL）
echo -n "https://majiang-ai-api-xxxxx.run.app" | gcloud secrets create majiang-ai-mastra-api-url \
  --data-file=- \
  --project=$PROJECT_ID

# GCS バケット名（値はそのままシークレットの「値」として保存）
echo -n "majiang-ai-images" | gcloud secrets create majiang-ai-gcs-bucket \
  --data-file=- \
  --project=$PROJECT_ID

# プロジェクト ID（必要なら Secret 化。固定値なら --set-env-vars でも可）
echo -n "majiang-ai-beta" | gcloud secrets create majiang-ai-google-cloud-project \
  --data-file=- \
  --project=$PROJECT_ID
```

- 既に同名のシークレットがある場合は `gcloud secrets versions add <SECRET_NAME> --data-file=-` で新バージョンを追加する。

#### 3. Cloud Run のサービスアカウントに Secret 参照権限を付与

Cloud Run はデフォルトで `PROJECT_NUMBER-compute@developer.gserviceaccount.com` で動く。このアカウントに各シークレットの「シークレット アクセサ」を付与する。

```bash
export PROJECT_ID=majiang-ai-beta
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
export SA_EMAIL="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# 各シークレットへのアクセス権を付与
gcloud secrets add-iam-policy-binding majiang-ai-mastra-api-url \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID

gcloud secrets add-iam-policy-binding majiang-ai-gcs-bucket \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID

gcloud secrets add-iam-policy-binding majiang-ai-google-cloud-project \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID
```

- カスタムサービスアカウントで Cloud Run を動かしている場合は、そのサービスアカウントのメールを `SA_EMAIL` に指定する。

#### 4. デプロイ時に `--set-secrets` で渡す

シークレットの**最新バージョン**を環境変数として注入する。

```bash
gcloud run deploy majiang-ai-frontend \
  --image asia-northeast1-docker.pkg.dev/majiang-ai-beta/majiang-ai-repo/majiang-ai-frontend:latest \
  --region asia-northeast1 \
  --set-secrets="MASTRA_API_URL=majiang-ai-mastra-api-url:latest,GCS_BUCKET=majiang-ai-gcs-bucket:latest,GOOGLE_CLOUD_PROJECT=majiang-ai-google-cloud-project:latest"
```

- 書式は `環境変数名=シークレット名:バージョン`。`latest` で常に最新バージョンを参照する。
- 環境変数とシークレットを混在させる場合は `--set-env-vars` と `--set-secrets` を両方指定してよい。

#### 運用のポイント

- シークレットの値を変更したら、Secret Manager で新バージョンを追加する。Cloud Run は `latest` を参照しているため、**新しいリビジョンをデプロイ**すると新しい値が読み込まれる（同じイメージでも「新しいリビジョンのデプロイ」でよい）。
- 監査ログを残したい場合は Cloud Audit Logs で Secret Manager のアクセスを有効にしておく。

---

## 4.4.5 GCS バケットへの IAM 設定（storage.objects.create）

### 何をするか

- フロントの API Route が GCS にオブジェクトをアップロードするため、**Cloud Run が動いているサービスアカウント**に、対象バケットへの `storage.objects.create`（および必要なら `storage.objects.get` など）権限を付与する。
- エラー例: `77676006830-compute@developer.gserviceaccount.com does not have storage.objects.create access to the Google Cloud Storage object`

### 1. 現状の IAM を確認する

```bash
export PROJECT_ID=majiang-ai-beta
export BUCKET_NAME=majiang-ai-images   # 環境変数 GCS_BUCKET の値

# Cloud Run が使っているサービスアカウント（デフォルトは Compute Engine のデフォルト SA）
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
export SA_EMAIL="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
echo "Cloud Run のサービスアカウント: $SA_EMAIL"

# バケットの IAM ポリシー（誰にどのロールが付いているか）
gsutil iam get gs://${BUCKET_NAME}

# 上記 SA がバケットでどの権限を持っているか（一覧に SA が含まれるか確認）
gcloud storage buckets get-iam-policy gs://${BUCKET_NAME} --project=$PROJECT_ID
```

- `gsutil iam get` または `gcloud storage buckets get-iam-policy` の出力に `77676006830-compute@developer.gserviceaccount.com`（またはあなたの PROJECT_NUMBER）が無い、あるいは `objectCreator` / `objectAdmin` が付いていなければ、create 権限不足。

### 2. 権限を付与する（推奨: オブジェクトの作成・読み取りのみ）

バケット単位で、Cloud Run のサービスアカウントに **Storage Object Creator**（作成）と **Storage Object Viewer**（読み取り）を付与する。

```bash
export PROJECT_ID=majiang-ai-beta
export BUCKET_NAME=majiang-ai-images
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
export SA_EMAIL="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# オブジェクトの作成（アップロード）権限
gcloud storage buckets add-iam-policy-binding gs://${BUCKET_NAME} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.objectCreator" \
  --project=$PROJECT_ID

# オブジェクトの読み取り権限（アップロード後の確認や署名付き URL 等で使う場合）
gcloud storage buckets add-iam-policy-binding gs://${BUCKET_NAME} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.objectViewer" \
  --project=$PROJECT_ID
```

- 作成だけできればよい場合は `roles/storage.objectCreator` のみでよい。読み取りも必要なら `roles/storage.objectViewer` を追加。
- バケットのメタデータの変更まで許す場合は `roles/storage.objectAdmin` でもよい（権限は広い）。

### 3. 付与後の確認

```bash
gsutil iam get gs://${BUCKET_NAME}
# 出力に serviceAccount:77676006830-compute@developer.gserviceaccount.com と roles/storage.objectCreator 等が出ていれば OK
```

### 補足

- Cloud Run をカスタムサービスアカウントで動かしている場合は、その SA のメールを `SA_EMAIL` に指定して同じようにバケットに IAM バインドする。
- プロジェクト全体に広く権限を付与したくないため、**バケット単位**の IAM で済ませるのがおすすめ。

---

## 4.4.6 デプロイ後にサービス URL を取得する

### 何をするか

- デプロイが終わると、Cloud Run がサービス用の URL を発行する
- この URL をメモし、フロントの本番 URL として使う。プロキシ採用のため Mastra API 側の CORS（`FRONTEND_URL`）は必須ではない（他オリジンから直接 Mastra を叩く場合のみ設定）

### コマンド

```bash
# サービスの詳細（URL が表示される）
gcloud run services describe majiang-ai-frontend --region asia-northeast1 --format='value(status.url)'

# または一覧で確認
gcloud run services list --region asia-northeast1
```

### 補足

- URL は `https://majiang-ai-frontend-xxxxx-an.a.run.app` のような形式。プロキシ採用のためブラウザは Mastra を直接叩かず、このフロント URL の同一オリジンのみ叩く。

---

## 一連のコマンドまとめ（コピペ用）

```bash
# プロジェクト・リージョン
export PROJECT_ID=majiang-ai-beta
export REGION=asia-northeast1
export IMAGE_NAME=majiang-ai-frontend
export REPO=majiang-ai-repo

# 1. イメージビルド（Apple Silicon の場合は --platform linux/amd64 を付ける）
docker build -f frontend/Dockerfile --platform linux/amd64 -t ${IMAGE_NAME}:latest .

# 2. Artifact Registry 用タグ付け
docker tag ${IMAGE_NAME}:latest ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}:latest

# 3. 認証（初回のみ）
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# 4. push
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}:latest

# 5. デプロイ（環境変数は必要に応じて --set-env-vars を追加）
gcloud run deploy majiang-ai-frontend \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}:latest \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "GCS_BUCKET=majiang-ai-images,GOOGLE_CLOUD_PROJECT=${PROJECT_ID}"

# 6. URL 取得
gcloud run services describe majiang-ai-frontend --region ${REGION} --format='value(status.url)'
```

---

## 関連ドキュメント

- [cloud-run-docker.md](./cloud-run-docker.md) — Cloud Run と Docker の仕組み、プラットフォーム指定
- [README.md](./README.md) — GCP プロジェクト情報、環境変数一覧
- [frontend-implementation-plan.md](../frontend-implementation-plan.md) — 4.4 / 4.5 のチェックリスト
