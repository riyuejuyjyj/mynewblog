export const STUDIO_INVITE_COOKIE = "mynewblog_studio_invite";
export const STUDIO_INVITE_MAX_AGE = 60 * 60 * 24 * 30;

const TOKEN_VERSION = "v1";

function getInviteCode() {
  return process.env.STUDIO_INVITE_CODE?.trim() || null;
}

function getInviteSecret() {
  return (
    process.env.BETTER_AUTH_SECRET?.trim() ||
    "development-only-secret-change-before-deploying-mynewblog"
  );
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return diff === 0;
}

function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return null;
  }

  for (const pair of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = pair.trim().split("=");

    if (rawKey === name) {
      try {
        return decodeURIComponent(rawValue.join("="));
      } catch {
        return null;
      }
    }
  }

  return null;
}

async function signInvite(createdAt: number, code: string) {
  return sha256Hex(
    [TOKEN_VERSION, createdAt, code, getInviteSecret()].join("."),
  );
}

export function isStudioInviteConfigured() {
  return Boolean(getInviteCode());
}

export function verifyStudioInviteCode(code: unknown) {
  const inviteCode = getInviteCode();

  if (typeof code !== "string" || !inviteCode) {
    return false;
  }

  return constantTimeEqual(code.trim(), inviteCode);
}

export async function createStudioInviteToken() {
  const inviteCode = getInviteCode();

  if (!inviteCode) {
    return null;
  }

  const createdAt = Math.floor(Date.now() / 1000);
  const signature = await signInvite(createdAt, inviteCode);

  return [TOKEN_VERSION, createdAt, signature].join(".");
}

export async function verifyStudioInviteToken(token: string | null) {
  const inviteCode = getInviteCode();

  if (!token || !inviteCode) {
    return false;
  }

  const [version, createdAtText, signature] = token.split(".");
  const createdAt = Number(createdAtText);
  const now = Math.floor(Date.now() / 1000);

  if (
    version !== TOKEN_VERSION ||
    !Number.isFinite(createdAt) ||
    now - createdAt > STUDIO_INVITE_MAX_AGE ||
    createdAt > now + 60 ||
    !signature
  ) {
    return false;
  }

  const expectedSignature = await signInvite(createdAt, inviteCode);

  return constantTimeEqual(signature, expectedSignature);
}

export async function verifyStudioInviteCookie(cookieHeader: string | null) {
  const token = readCookie(cookieHeader, STUDIO_INVITE_COOKIE);

  return verifyStudioInviteToken(token);
}
