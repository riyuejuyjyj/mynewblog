import { NextResponse, type NextRequest } from "next/server";

import { getR2ObjectStream } from "@/lib/r2";
import { normalizeStorageObjectKey } from "@/lib/storage-object-url";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

function getRequestRange(request: NextRequest) {
  const range = request.headers.get("range")?.trim();

  if (!range || !/^bytes=\d*-\d*(?:,\d*-\d*)?$/.test(range)) {
    return null;
  }

  return range;
}

export async function GET(request: NextRequest) {
  const objectKey = normalizeStorageObjectKey(
    request.nextUrl.searchParams.get("key"),
  );

  if (!objectKey) {
    return jsonError("Missing or invalid storage object key.", 400);
  }

  const r2Object = await getR2ObjectStream(objectKey, {
    range: getRequestRange(request),
  });

  if (!r2Object?.body) {
    return jsonError("Storage object was not found.", 404);
  }

  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Type": r2Object.contentType,
  });

  if (r2Object.contentRange) {
    headers.set("Content-Range", r2Object.contentRange);
  }

  if (r2Object.contentLength !== null) {
    headers.set("Content-Length", String(r2Object.contentLength));
  }

  return new Response(r2Object.body, {
    headers,
    status: r2Object.status === 206 ? 206 : 200,
  });
}
