import { uploadImage } from "@/lib/gcs-client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "画像ファイルが指定されていません" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name || "image";
    const gcsUri = await uploadImage(buffer, fileName);

    return NextResponse.json({ gcsUri });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status =
      message.includes("GCS_BUCKET") || message.includes("設定されていません")
        ? 500
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
