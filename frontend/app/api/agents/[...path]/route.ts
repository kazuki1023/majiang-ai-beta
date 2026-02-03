import { NextRequest, NextResponse } from "next/server";

const MASTRA_API_URL = process.env.MASTRA_API_URL;

/** ストリーミングをバッファさせない */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Mastra API へのプロキシ（選択肢 C: cors-strategy.md）
 * - ブラウザは同一オリジン /api/agents/... のみ叩く
 * - サーバー側で MASTRA_API_URL に中継し、ストリーミングもそのままパイプする
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  if (!MASTRA_API_URL) {
    return NextResponse.json(
      {
        error:
          "MASTRA_API_URL is not set. Set it in .env.local (local) or Cloud Run (production).",
      },
      { status: 503 }
    );
  }

  const { path } = await context.params;
  if (!path?.length) {
    return NextResponse.json(
      { error: "Agent path is required (e.g. majiangAnalysisAgent/stream)" },
      { status: 400 }
    );
  }

  const base = MASTRA_API_URL.replace(/\/$/, "");
  const pathSegment = path.join("/");
  const backendUrl = `${base}/api/agents/${pathSegment}`;

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json(
      { error: "Failed to read request body" },
      { status: 400 }
    );
  }

  const contentType = request.headers.get("content-type") ?? "application/json";

  let backendRes: Response;
  try {
    backendRes = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
      },
      body: body || undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Proxy failed: ${message}` },
      { status: 502 }
    );
  }

  // ストリーミング・JSON ともに body をそのままパイプする（バッファしない）
  const responseHeaders = new Headers();
  const contentTypeBackend = backendRes.headers.get("content-type");
  if (contentTypeBackend) {
    responseHeaders.set("Content-Type", contentTypeBackend);
  }
  const isStream =
    contentTypeBackend?.includes("event-stream") ||
    contentTypeBackend?.includes("ndjson") ||
    contentTypeBackend?.includes("stream");
  if (isStream) {
    responseHeaders.set("Cache-Control", "no-cache, no-store, no-transform");
    responseHeaders.set("X-Accel-Buffering", "no");
    responseHeaders.set("Connection", "keep-alive");
  }

  if (!backendRes.body) {
    return NextResponse.json(
      { error: "Empty response from Mastra API" },
      { status: 502 }
    );
  }

  return new NextResponse(backendRes.body, {
    status: backendRes.status,
    statusText: backendRes.statusText,
    headers: responseHeaders,
  });
}
