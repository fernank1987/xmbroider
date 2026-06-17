import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_HOSTS = new Set(["firebasestorage.googleapis.com", "storage.googleapis.com"]);

function readStorageBucketHost(): string | null {
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  if (!bucket) {
    return null;
  }
  return bucket.replace(/\/$/, "");
}

function isAllowedImageUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") {
    return false;
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return false;
  }

  const bucket = readStorageBucketHost();
  if (!bucket) {
    return false;
  }

  const encodedBucket = encodeURIComponent(bucket);
  return parsed.pathname.includes(encodedBucket) || parsed.pathname.includes(bucket);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const imageUrl = requestUrl.searchParams.get("url")?.trim();

  if (!imageUrl || !isAllowedImageUrl(imageUrl)) {
    return NextResponse.json({ error: "Invalid image URL." }, { status: 400 });
  }

  try {
    const response = await fetch(imageUrl, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ error: "Image fetch failed." }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());
    const dataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;

    return NextResponse.json({ dataUrl });
  } catch {
    return NextResponse.json({ error: "Image fetch failed." }, { status: 502 });
  }
}
