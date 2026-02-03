export function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_MASTRA_API_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_MASTRA_API_URL is not set");
  }
  return url.replace(/\/$/, "");
}
