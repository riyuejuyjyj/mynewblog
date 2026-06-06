const STORAGE_OBJECT_FOLDERS = new Set([
  "attachments",
  "covers",
  "gallery",
  "music",
]);

function cleanValue(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function stripQueryAndHash(value: string) {
  return value.split(/[?#]/)[0] ?? value;
}

function safeDecodePath(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isSafeStorageObjectKey(value: string) {
  if (!value || value.length > 500) return false;
  if (/[\u0000-\u001f\\]/.test(value)) return false;
  if (value.includes("..")) return false;

  const [folder] = value.split("/");

  return Boolean(folder && STORAGE_OBJECT_FOLDERS.has(folder));
}

export function normalizeStorageObjectKey(value: string | null | undefined) {
  const trimmed = cleanValue(value);

  if (!trimmed) return null;

  let candidate = trimmed;

  try {
    const url = new URL(trimmed, "https://mynewblog.local");

    if (url.pathname === "/api/storage/object") {
      candidate = url.searchParams.get("key") ?? "";
    } else {
      candidate = safeDecodePath(url.pathname).replace(/^\/+/g, "");
    }
  } catch {
    candidate = trimmed;
  }

  const objectKey = stripQueryAndHash(candidate).replace(/^\/+/g, "");

  return isSafeStorageObjectKey(objectKey) ? objectKey : null;
}

export function buildStorageObjectUrl(objectKey: string | null | undefined) {
  const normalized = normalizeStorageObjectKey(objectKey);

  return normalized
    ? `/api/storage/object?key=${encodeURIComponent(normalized)}`
    : null;
}

export function resolveStorageObjectUrl(value: string | null | undefined) {
  const trimmed = cleanValue(value);

  if (!trimmed) return "";
  if (/^(data:image\/|blob:)/i.test(trimmed)) return trimmed;

  return buildStorageObjectUrl(trimmed) ?? trimmed;
}

export function rewriteStorageObjectUrlsInText(value: string) {
  return value.replace(
    /(https?:\/\/[^\s)"']+|\/?(?:attachments|covers|gallery|music)\/[^\s)"']+)/g,
    (match) => resolveStorageObjectUrl(match),
  );
}

export function isSupportedMediaReference(value: string | null | undefined) {
  const trimmed = cleanValue(value);

  if (!trimmed) return false;
  if (/^(data:image\/|blob:)/i.test(trimmed)) return true;
  if (buildStorageObjectUrl(trimmed)) return true;

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
