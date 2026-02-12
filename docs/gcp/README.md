# GCP 環境設定

## 概要

majiang-ai プロジェクトで使用するGoogle Cloud Platform（GCP）の設定をまとめたドキュメント

---

## プロジェクト情報

| 項目                 | 値                                   |
| -------------------- | ------------------------------------ |
| **プロジェクトID**   | `majiang-ai-beta`                    |
| **リージョン**       | `asia-northeast1`（東京）            |
| **請求先アカウント** | 個人アカウント（$300クレジット適用） |

---

## 有効化済みAPI

| API                     | 用途                                      | ステータス |
| ----------------------- | ----------------------------------------- | ---------- |
| Cloud Run API           | バックエンド/フロントエンドのホスティング | ✅ 有効    |
| Cloud Vision API        | 手牌画像のOCR（牌認識）                   | ✅ 有効    |
| Generative Language API | Gemini による会話生成・分析               | ✅ 有効    |
| Cloud Storage API       | 画像の保存                                | ✅ 有効    |
| Cloud Build API         | CI/CDパイプライン（Phase 5）              | ✅ 有効    |
| Artifact Registry API   | Dockerイメージの保存（Phase 2）           | 要確認     |

### API有効化コマンド

```bash
gcloud services enable \
  run.googleapis.com \
  vision.googleapis.com \
  generativelanguage.googleapis.com \
  storage.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

---

## Cloud Storage

開発環境と本番環境でバケットを分ける（dev / prd）。本番は既存バケット `majiang-ai-images` を使用する。

| 環境 | バケット名                     | URL                                |
|------|--------------------------------|------------------------------------|
| 開発 | `majiang-ai-images-dev`        | `gs://majiang-ai-images-dev/`       |
| 本番 | `majiang-ai-images`（既存）    | `gs://majiang-ai-images/`           |

- **リージョン**: `asia-northeast1`（東京）
- **ストレージクラス**: Standard
- **アクセス制御**: 均一（Uniform bucket-level access）

### バケット作成コマンド

本番用は既存の `majiang-ai-images` をそのまま利用する。**開発用のみ**新規作成する。

```bash
# プロジェクト・リージョン（必要に応じて）
gcloud config set project majiang-ai-beta
export REGION=asia-northeast1

# 開発用バケット（新規作成）
gcloud storage buckets create gs://majiang-ai-images-dev \
  --location=${REGION} \
  --uniform-bucket-level-access
```

本番用バケット `majiang-ai-images` は既に存在するため作成不要。

### 開発用バケットに SA のロールを付与する

`majiang-ai-images-dev` にサービスアカウント `majiang-ai-sa` の権限を付与する。

```bash
# アップロード用（objectCreator）
gcloud storage buckets add-iam-policy-binding gs://majiang-ai-images-dev \
  --member="serviceAccount:majiang-ai-sa@majiang-ai-beta.iam.gserviceaccount.com" \
  --role="roles/storage.objectCreator"

# 読み取り用（objectViewer）※必要なら
gcloud storage buckets add-iam-policy-binding gs://majiang-ai-images-dev \
  --member="serviceAccount:majiang-ai-sa@majiang-ai-beta.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

Cloud Run のデフォルト SA を使う場合は、その SA のメールアドレスに置き換える。

### 環境変数（フロントエンド）

| 環境   | `GCS_BUCKET` に設定する値               |
|--------|------------------------------------------|
| 開発   | `majiang-ai-images-dev`             |
| 本番   | `majiang-ai-images`                      |

`frontend/.env.local`（開発）および Cloud Run の環境変数（本番）で上記を設定する。

### 用途

- ユーザーがアップロードした手牌画像の保存
- Cloud Vision API への画像入力元

---

## サービスアカウント

詳細は [iam-service-account.md](./iam-service-account.md) を参照。

| 名前            | メールアドレス                                          | ロール                      |
| --------------- | ------------------------------------------------------- | --------------------------- |
| `majiang-ai-sa` | `majiang-ai-sa@majiang-ai-beta.iam.gserviceaccount.com` | objectViewer, objectCreator |

---

## 環境変数

### Mastra API (`mastra/.env`)

```bash
# Gemini API キー
GOOGLE_API_KEY=

# GCPプロジェクト
GOOGLE_CLOUD_PROJECT=majiang-ai-beta

# Cloud Storage バケット
GCS_BUCKET=majiang-ai-images
```

### Next.js Frontend（将来）

```bash
# Mastra API の URL
NEXT_PUBLIC_MASTRA_API_URL=https://majiang-ai-api-xxxxx.a.run.app

# GCPプロジェクト
GOOGLE_CLOUD_PROJECT=majiang-ai-beta

# Cloud Storage バケット
GCS_BUCKET=majiang-ai-images
```

---

## gcloud CLI 設定

```bash
# 現在の設定を確認
gcloud config list

# プロジェクトを設定
gcloud config set project majiang-ai-beta

# リージョンを設定
gcloud config set run/region asia-northeast1

# 認証（ローカル開発用）
gcloud auth application-default login
```

---

## ドキュメント一覧

| ドキュメント                                                             | 説明                          |
| ------------------------------------------------------------------------ | ----------------------------- |
| [README.md](./README.md)                                                 | このファイル（GCP環境の概要） |
| [deploy-commands.md](./deploy-commands.md)                               | **Mastra / Frontend デプロイ時に実行するコマンドまとめ** |
| [cloud-run-docker.md](./cloud-run-docker.md)                             | Cloud RunとDockerの仕組み     |
| [cloud-run-frontend-deploy.md](./cloud-run-frontend-deploy.md)           | フロントエンドのCloud Runデプロイ手順（詳細） |
| [iam-service-account.md](./iam-service-account.md)                       | サービスアカウントとIAMの説明 |
| [application-default-credentials.md](./application-default-credentials.md) | ADC（ローカル認証）の説明     |

---

## コスト概算

$300の無料クレジット内で十分に開発・運用可能です。

| サービス      | 無料枠             | 想定月額（開発段階） |
| ------------- | ------------------ | -------------------- |
| Cloud Run     | 200万リクエスト/月 | $0                   |
| Cloud Storage | 5GB/月             | $0                   |
| Cloud Vision  | 1,000回/月         | $0                   |
| Gemini API    | 無料枠あり         | $0〜数ドル           |

---

## 参考リンク

- [Google Cloud Console](https://console.cloud.google.com/)
- [Gemini API キー取得](https://aistudio.google.com/app/apikey)
- [Cloud Run ドキュメント](https://cloud.google.com/run/docs)
- [Cloud Vision API ドキュメント](https://cloud.google.com/vision/docs)
