import { NextRequest, NextResponse } from "next/server";

const MASTRA_URL = process.env.MASTRA_URL ?? process.env.MASTRA_API_URL;

export const runtime = "nodejs";

/**
 * Mastra chat API へのプロキシ（useChat のデフォルト /api/chat 用）
 * - chatRoute({ path: "/chat" }) にそのまま転送
 */
export async function POST(request: NextRequest) {
  if (!MASTRA_URL) {
    return NextResponse.json(
      {
        error:
          "MASTRA_URL (or MASTRA_API_URL) is not set. Set it in .env.local or Cloud Run.",
      },
      { status: 503 }
    );
  }

  const base = MASTRA_URL.replace(/\/$/, "");
  const upstreamUrl = `${base}/chat`;

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json(
      { error: "Failed to read request body" },
      { status: 400 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("content-type") ?? "application/json",
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

  if (!upstream.body) {
    return NextResponse.json(
      { error: "Empty response from Mastra API" },
      { status: 502 }
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
