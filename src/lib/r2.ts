import { createHash } from "node:crypto";

type R2UploadInput = {
  folder: "covers" | "gallery" | "attachments" | "music";
  fileName: string;
  contentType: string;
};

type R2UploadWithKeyInput = R2UploadInput & {
  body: Uint8Array;
  objectKey?: string;
};

const REGION = "auto";
const SERVICE = "s3";
const SIGNING_ALGORITHM = "AWS4-HMAC-SHA256";
const UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD";
const encoder = new TextEncoder();

function cleanEnv(value: string | undefined) {
  let trimmed = value?.trim();

  while (
    trimmed &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  return trimmed ? trimmed : undefined;
}

function normalizeSecretAccessKey(value: string | undefined) {
  const trimmed = cleanEnv(value);

  if (!trimmed) {
    return undefined;
  }

  return trimmed.startsWith("cfat_")
    ? createHash("sha256").update(trimmed).digest("hex")
    : trimmed;
}

const accountId = cleanEnv(process.env.R2_ACCOUNT_ID);
const endpoint =
  cleanEnv(process.env.R2_ENDPOINT) ??
  (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
const accessKeyId = cleanEnv(process.env.R2_ACCESS_KEY_ID);
const secretAccessKey = normalizeSecretAccessKey(process.env.R2_SECRET_ACCESS_KEY);
const bucket = cleanEnv(process.env.R2_BUCKET);
const publicBaseUrl = cleanEnv(process.env.R2_PUBLIC_BASE_URL);

function normalizePublicBaseUrl(value: string | undefined) {
  const trimmed = value?.trim().replace(/\/+$/g, "");

  if (!trimmed) {
    return null;
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

const normalizedPublicBaseUrl = normalizePublicBaseUrl(publicBaseUrl);

export function isR2Configured() {
  return Boolean(endpoint && accessKeyId && secretAccessKey && bucket);
}

export function getR2Status() {
  return {
    provider: "Cloudflare R2",
    configured: isR2Configured(),
    endpoint: endpoint ?? null,
    bucket: bucket ?? null,
    publicBaseUrl: normalizedPublicBaseUrl,
  };
}

export function getR2Bucket() {
  return bucket ?? null;
}

export function makeR2ObjectKey(input: R2UploadInput) {
  const safeName = input.fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

  const stamp = new Date().toISOString().slice(0, 10);
  const suffix = crypto.randomUUID();

  return `${input.folder}/${stamp}/${suffix}-${safeName || "upload"}`;
}

export function getPublicR2Url(objectKey: string) {
  if (!normalizedPublicBaseUrl) {
    return null;
  }

  return `${normalizedPublicBaseUrl}/${objectKey.replace(/^\/+/g, "")}`;
}

function assertR2Config() {
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  return {
    accessKeyId,
    bucket,
    endpoint: endpoint.replace(/\/+$/g, ""),
    secretAccessKey,
  };
}

function encodePathPart(value: string) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function encodeObjectKey(value: string) {
  return value.split("/").map(encodePathPart).join("/");
}

function encodeQueryValue(value: string) {
  return encodePathPart(value).replace(/%7E/g, "~");
}

function canonicalQueryString(params: Array<[string, string]>) {
  return params
    .slice()
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey
        ? leftValue.localeCompare(rightValue)
        : leftKey.localeCompare(rightKey),
    )
    .map(
      ([key, value]) => `${encodeQueryValue(key)}=${encodeQueryValue(value)}`,
    )
    .join("&");
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function hmacSha256(key: BufferSource, value: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    {
      hash: "SHA-256",
      name: "HMAC",
    },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(value),
  );

  return new Uint8Array(signature);
}

async function createSigningKey(secret: string, dateStamp: string) {
  const dateKey = await hmacSha256(encoder.encode(`AWS4${secret}`), dateStamp);
  const regionKey = await hmacSha256(dateKey, REGION);
  const serviceKey = await hmacSha256(regionKey, SERVICE);

  return hmacSha256(serviceKey, "aws4_request");
}

function getAmzDate(now = new Date()) {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");

  return {
    amzDate,
    dateStamp: amzDate.slice(0, 8),
  };
}

function objectUrl(objectKey: string) {
  const config = assertR2Config();

  if (!config) {
    return null;
  }

  return new URL(
    `${config.endpoint}/${encodePathPart(config.bucket)}/${encodeObjectKey(
      objectKey,
    )}`,
  );
}

async function createPresignedObjectUrl(input: {
  expiresIn: number;
  method: "GET" | "PUT";
  objectKey: string;
}) {
  const config = assertR2Config();
  const url = objectUrl(input.objectKey);

  if (!config || !url) {
    return null;
  }

  const { amzDate, dateStamp } = getAmzDate();
  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const signedHeaders = "host";
  const queryParams: Array<[string, string]> = [
    ["X-Amz-Algorithm", SIGNING_ALGORITHM],
    ["X-Amz-Credential", `${config.accessKeyId}/${credentialScope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", String(input.expiresIn)],
    ["X-Amz-SignedHeaders", signedHeaders],
  ];
  const canonicalRequest = [
    input.method,
    url.pathname,
    canonicalQueryString(queryParams),
    `host:${url.host}\n`,
    signedHeaders,
    UNSIGNED_PAYLOAD,
  ].join("\n");
  const stringToSign = [
    SIGNING_ALGORITHM,
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = await createSigningKey(config.secretAccessKey, dateStamp);
  const signature = bytesToHex(await hmacSha256(signingKey, stringToSign));

  url.search = canonicalQueryString([
    ...queryParams,
    ["X-Amz-Signature", signature],
  ]);

  return url.toString();
}

async function createSignedHeaders(input: {
  contentType?: string;
  method: string;
  url: URL;
}) {
  const config = assertR2Config();

  if (!config) {
    return null;
  }

  const { amzDate, dateStamp } = getAmzDate();
  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const headersToSign: Array<[string, string]> = [
    ["host", input.url.host],
    ["x-amz-content-sha256", UNSIGNED_PAYLOAD],
    ["x-amz-date", amzDate],
  ];

  if (input.contentType) {
    headersToSign.push(["content-type", input.contentType]);
  }

  headersToSign.sort(([left], [right]) => left.localeCompare(right));

  const canonicalHeaders = `${headersToSign
    .map(([key, value]) => `${key}:${value}`)
    .join("\n")}\n`;
  const signedHeaders = headersToSign.map(([key]) => key).join(";");
  const canonicalRequest = [
    input.method,
    input.url.pathname,
    input.url.search.slice(1),
    canonicalHeaders,
    signedHeaders,
    UNSIGNED_PAYLOAD,
  ].join("\n");
  const stringToSign = [
    SIGNING_ALGORITHM,
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = await createSigningKey(config.secretAccessKey, dateStamp);
  const signature = bytesToHex(await hmacSha256(signingKey, stringToSign));
  const headers = new Headers();

  headers.set("x-amz-content-sha256", UNSIGNED_PAYLOAD);
  headers.set("x-amz-date", amzDate);

  if (input.contentType) {
    headers.set("content-type", input.contentType);
  }

  headers.set(
    "authorization",
    `${SIGNING_ALGORITHM} Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  );

  return headers;
}

async function fetchR2Object(input: {
  body?: BodyInit;
  contentType?: string;
  headers?: HeadersInit;
  method: "DELETE" | "GET" | "HEAD" | "PUT";
  objectKey: string;
}) {
  const url = objectUrl(input.objectKey);

  if (!url) {
    return null;
  }

  const headers = await createSignedHeaders({
    contentType: input.contentType,
    method: input.method,
    url,
  });

  if (!headers) {
    return null;
  }

  if (input.headers) {
    for (const [key, value] of new Headers(input.headers)) {
      headers.set(key, value);
    }
  }

  return fetch(url, {
    body: input.body,
    headers,
    method: input.method,
  });
}

export async function createR2UploadUrl(input: R2UploadInput) {
  if (!isR2Configured() || !bucket) {
    return null;
  }

  const objectKey = makeR2ObjectKey(input);
  const uploadUrl = await createPresignedObjectUrl({
    expiresIn: 600,
    method: "PUT",
    objectKey,
  });

  if (!uploadUrl) {
    return null;
  }

  return {
    bucket,
    objectKey,
    uploadUrl,
    publicUrl: getPublicR2Url(objectKey),
    expiresIn: 600,
  };
}

export async function createR2PreviewUrl(objectKey: string) {
  const previewUrl = await createPresignedObjectUrl({
    expiresIn: 900,
    method: "GET",
    objectKey,
  });

  return previewUrl ?? getPublicR2Url(objectKey);
}

export async function uploadR2Object(input: R2UploadWithKeyInput) {
  if (!bucket) {
    return null;
  }

  const objectKey = input.objectKey ?? makeR2ObjectKey(input);
  const response = await fetchR2Object({
    body: input.body as BodyInit,
    contentType: input.contentType,
    method: "PUT",
    objectKey,
  });

  if (!response) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`R2 upload failed with ${response.status}.`);
  }

  return {
    bucket,
    objectKey,
    publicUrl: getPublicR2Url(objectKey),
  };
}

export async function r2ObjectExists(objectKey: string) {
  const response = await fetchR2Object({
    method: "HEAD",
    objectKey,
  });

  if (!response) {
    return null;
  }

  if (response.ok) {
    return true;
  }

  return response.status === 404 ? false : null;
}

export async function deleteR2Object(objectKey: string) {
  const response = await fetchR2Object({
    method: "DELETE",
    objectKey,
  });

  if (!response) {
    return { deleted: false, missing: false };
  }

  if (response.ok) {
    return { deleted: true, missing: false };
  }

  if (response.status === 404) {
    return { deleted: true, missing: true };
  }

  return { deleted: false, missing: false };
}

export async function getR2ObjectStream(
  objectKey: string,
  options: { range?: string | null } = {},
) {
  const response = await fetchR2Object({
    headers: options.range ? { Range: options.range } : undefined,
    method: "GET",
    objectKey,
  });

  if (!response?.ok || !response.body) {
    return null;
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);

  return {
    body: response.body,
    contentRange: response.headers.get("content-range"),
    contentLength: Number.isFinite(contentLength) && contentLength > 0
      ? contentLength
      : null,
    contentType:
      response.headers.get("content-type") ?? "application/octet-stream",
    status: response.status,
  };
}
