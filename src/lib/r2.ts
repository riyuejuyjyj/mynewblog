import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHash, randomUUID } from "node:crypto";

type R2UploadInput = {
  folder: "covers" | "gallery" | "attachments" | "music";
  fileName: string;
  contentType: string;
};

type R2UploadWithKeyInput = R2UploadInput & {
  body: Uint8Array;
  objectKey?: string;
};

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
  const suffix = randomUUID();

  return `${input.folder}/${stamp}/${suffix}-${safeName || "upload"}`;
}

export function getPublicR2Url(objectKey: string) {
  if (!normalizedPublicBaseUrl) {
    return null;
  }

  return `${normalizedPublicBaseUrl}/${objectKey.replace(/^\/+/g, "")}`;
}

function createR2Client() {
  if (!isR2Configured() || !endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function createR2UploadUrl(input: R2UploadInput) {
  if (!isR2Configured() || !endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  const objectKey = makeR2ObjectKey(input);
  const client = createR2Client();

  if (!client) {
    return null;
  }

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: input.contentType,
    }),
    { expiresIn: 600 },
  );

  return {
    bucket,
    objectKey,
    uploadUrl,
    publicUrl: getPublicR2Url(objectKey),
    expiresIn: 600,
  };
}

export async function createR2PreviewUrl(objectKey: string) {
  const client = createR2Client();

  if (!client || !bucket) {
    return getPublicR2Url(objectKey);
  }

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    }),
    { expiresIn: 900 },
  );
}

export async function uploadR2Object(input: R2UploadWithKeyInput) {
  if (!bucket) {
    return null;
  }

  const client = createR2Client();

  if (!client) {
    return null;
  }

  const objectKey = input.objectKey ?? makeR2ObjectKey(input);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: input.body,
      ContentType: input.contentType,
    }),
  );

  return {
    bucket,
    objectKey,
    publicUrl: getPublicR2Url(objectKey),
  };
}

function getErrorStatus(error: unknown) {
  if (typeof error !== "object" || error === null || !("$metadata" in error)) {
    return null;
  }

  return (
    (error as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode ?? null
  );
}

export async function r2ObjectExists(objectKey: string) {
  const client = createR2Client();

  if (!client || !bucket) {
    return null;
  }

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      }),
    );

    return true;
  } catch (error) {
    return getErrorStatus(error) === 404 ? false : null;
  }
}

export async function deleteR2Object(objectKey: string) {
  const client = createR2Client();

  if (!client || !bucket) {
    return { deleted: false, missing: false };
  }

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      }),
    );

    return { deleted: true, missing: false };
  } catch (error) {
    if (getErrorStatus(error) === 404) {
      return { deleted: true, missing: true };
    }

    return { deleted: false, missing: false };
  }
}

export async function getR2ObjectStream(objectKey: string) {
  const client = createR2Client();

  if (!client || !bucket) {
    return null;
  }

  const result = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    }),
  );

  return {
    body: result.Body,
    contentLength: result.ContentLength ?? null,
    contentType: result.ContentType ?? "application/octet-stream",
  };
}
