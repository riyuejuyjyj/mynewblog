import { type NextRequest, NextResponse } from "next/server";

import {
  createStudioInviteToken,
  isStudioInviteConfigured,
  STUDIO_INVITE_COOKIE,
  STUDIO_INVITE_MAX_AGE,
  verifyStudioInviteCode,
  verifyStudioInviteCookie,
} from "@/lib/studio-invite";

const cookieOptions = {
  httpOnly: true,
  maxAge: STUDIO_INVITE_MAX_AGE,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

async function readBody(request: NextRequest) {
  try {
    return (await request.json()) as { code?: unknown };
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    configured: isStudioInviteConfigured(),
    verified: await verifyStudioInviteCookie(request.headers.get("cookie")),
  });
}

export async function POST(request: NextRequest) {
  const body = await readBody(request);

  if (!verifyStudioInviteCode(body.code)) {
    return NextResponse.json(
      { ok: false, message: "Invalid studio invite code." },
      { status: 401 },
    );
  }

  const token = await createStudioInviteToken();

  if (!token) {
    return NextResponse.json(
      { ok: false, message: "Studio invite code is not configured." },
      { status: 500 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(STUDIO_INVITE_COOKIE, token, cookieOptions);

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(STUDIO_INVITE_COOKIE, "", {
    ...cookieOptions,
    maxAge: 0,
  });

  return response;
}
