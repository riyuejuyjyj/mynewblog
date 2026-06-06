import { NextResponse, type NextRequest } from "next/server";

import { db, hasDatabase } from "@/db";
import { mediaAssets } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getPublicR2Url, isR2Configured, uploadR2Object } from "@/lib/r2";
import { verifyStudioInviteCookie } from "@/lib/studio-invite";

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;
const folders = new Set(["covers", "gallery", "attachments", "music"]);

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: NextRequest) {
  const session = await auth.api
    .getSession({ headers: request.headers })
    .catch(() => null);
  const inviteVerified = await verifyStudioInviteCookie(
    request.headers.get("cookie"),
  );

  if (!session?.user || !inviteVerified) {
    return jsonError("Studio access is required before uploading.", 401);
  }

  if (!isR2Configured()) {
    return jsonError("R2 is not fully configured.", 412);
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const folderValue = formData.get("folder");
  const folder = typeof folderValue === "string" ? folderValue : "attachments";

  if (!(file instanceof File)) {
    return jsonError("No upload file was provided.", 400);
  }

  if (!folders.has(folder)) {
    return jsonError("Invalid upload folder.", 400);
  }

  if (file.size < 1 || file.size > MAX_UPLOAD_SIZE) {
    return jsonError("File must be between 1 byte and 25MB.", 413);
  }

  const upload = await uploadR2Object({
    folder: folder as "covers" | "gallery" | "attachments" | "music",
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    body: new Uint8Array(await file.arrayBuffer()),
  });

  if (!upload) {
    return jsonError("R2 upload failed.", 500);
  }

  const publicUrl = upload.publicUrl ?? getPublicR2Url(upload.objectKey);

  if (hasDatabase) {
    await db.insert(mediaAssets).values({
      bucket: upload.bucket,
      objectKey: upload.objectKey,
      folder,
      publicUrl,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      altText: file.name,
      uploadedBy: session.user.id,
    });
  }

  return NextResponse.json({
    ok: true,
    bucket: upload.bucket,
    objectKey: upload.objectKey,
    publicUrl,
  });
}
