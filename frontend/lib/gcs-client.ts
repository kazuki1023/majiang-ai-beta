/**
 * GCS クライアント（サーバー専用。クライアントから直接 import しない）
 * 画像アップロード用。ADC または GOOGLE_CLOUD_PROJECT を利用する。
 *
 * 開発/本番のデータ分離: 環境ごとに GCS_BUCKET を変える（例: my-app-dev / my-app-prod）。
 */

import { Storage } from "@google-cloud/storage";

const bucketName = process.env.GCS_BUCKET;
const projectId = process.env.GOOGLE_CLOUD_PROJECT;

function getStorage(): Storage {
  if (!bucketName) {
    throw new Error("GCS_BUCKET が設定されていません");
  }
  return new Storage(projectId ? { projectId } : undefined);
}

/**
 * 画像を GCS にアップロードする。
 * 保存パス: uploads/{timestamp}-{fileName}
 * @returns gs://{bucket}/{path}
 */
export async function uploadImage(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const storage = getStorage();
  const bucket = storage.bucket(bucketName!);
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `uploads/${timestamp}-${safeName}`;
  const file = bucket.file(path);
  await file.save(buffer, {
    contentType: getContentType(fileName),
  });
  return `gs://${bucketName}/${path}`;
}

function getContentType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };
  return map[ext ?? ""] ?? "application/octet-stream";
}
