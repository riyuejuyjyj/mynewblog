import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db, hasDatabase } from "@/db";
import { musicDownloads } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getR2ObjectStream } from "@/lib/r2";
import { verifyStudioInviteCookie } from "@/lib/studio-invite";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

function encodeFileName(value: string) {
  return encodeURIComponent(value).replace(/['()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function buildAsciiFileName(value: string) {
  const dotIndex = value.lastIndexOf(".");
  const baseName = dotIndex > 0 ? value.slice(0, dotIndex) : value;
  const extension = dotIndex > 0 ? value.slice(dotIndex) : "";
  const asciiBaseName = baseName
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]+/g, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 96);

  return `${asciiBaseName || "music"}${extension}`;
}

function inferExtension(url: string) {
  const extension = url
    .split(/[?#]/)[0]
    ?.split(".")
    .pop()
    ?.toLowerCase();

  return extension && /^[a-z0-9]{2,5}$/.test(extension) ? extension : "mp3";
}

function buildFileName(title: string, audioUrl: string) {
  const cleanTitle = title
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 96);

  return `${cleanTitle || "music"}.${inferExtension(audioUrl)}`;
}

function toWebReadableStream(body: unknown) {
  if (!body) {
    return null;
  }

  if (body instanceof ReadableStream) {
    return body;
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "transformToWebStream" in body &&
    typeof body.transformToWebStream === "function"
  ) {
    return body.transformToWebStream() as ReadableStream<Uint8Array>;
  }

  if (
    typeof body === "object" &&
    body !== null &&
    Symbol.asyncIterator in body
  ) {
    const iterator = (body as AsyncIterable<Uint8Array>)[
      Symbol.asyncIterator
    ]();

    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        const { done, value } = await iterator.next();

        if (done) {
          controller.close();
        } else {
          controller.enqueue(value);
        }
      },
      async cancel() {
        await iterator.return?.();
      },
    });
  }

  return null;
}

export async function GET(request: NextRequest) {
  const session = await auth.api
    .getSession({ headers: request.headers })
    .catch(() => null);
  const inviteVerified = await verifyStudioInviteCookie(
    request.headers.get("cookie"),
  );

  if (!session?.user || !inviteVerified) {
    return jsonError("Studio access is required before downloading.", 401);
  }

  if (!hasDatabase) {
    return jsonError("Database is required before downloading.", 412);
  }

  const id = request.nextUrl.searchParams.get("id")?.trim();

  if (!id) {
    return jsonError("Missing download id.", 400);
  }

  const [download] = await db
    .select()
    .from(musicDownloads)
    .where(eq(musicDownloads.id, id))
    .limit(1);

  if (!download || download.createdBy !== session.user.id) {
    return jsonError("Download record was not found.", 404);
  }

  const fileName = buildFileName(download.title, download.audioUrl);
  const asciiFileName = buildAsciiFileName(fileName);
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Disposition": `attachment; filename="${asciiFileName.replace(/"/g, "'")}"; filename*=UTF-8''${encodeFileName(fileName)}`,
  });

  if (download.audioObjectKey) {
    const r2Object = await getR2ObjectStream(download.audioObjectKey);
    const stream = toWebReadableStream(r2Object?.body);

    if (r2Object && stream) {
      headers.set("Content-Type", r2Object.contentType);

      if (r2Object.contentLength !== null) {
        headers.set("Content-Length", String(r2Object.contentLength));
      }

      return new Response(stream, { headers });
    }
  }

  if (!download.audioUrl) {
    return jsonError("This download does not have an audio URL.", 404);
  }

  const upstream = await fetch(download.audioUrl, { cache: "no-store" });

  if (!upstream.ok || !upstream.body) {
    return jsonError("Audio source is not available.", 502);
  }

  const contentType = upstream.headers.get("content-type");
  const contentLength = upstream.headers.get("content-length");

  headers.set("Content-Type", contentType || "application/octet-stream");

  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }

  return new Response(upstream.body, { headers });
}
