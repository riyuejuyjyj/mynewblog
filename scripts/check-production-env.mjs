import { existsSync, readFileSync } from "node:fs";

const envFiles = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.production.local",
];

function parseEnvFile(path) {
  if (!existsSync(path)) return {};

  const values = {};
  const text = readFileSync(path, "utf8");

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    let value = rawValue.trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function readEnv() {
  return {
    ...envFiles.reduce(
      (current, path) => ({
        ...current,
        ...parseEnvFile(path),
      }),
      {},
    ),
    ...process.env,
  };
}

function clean(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "";
}

function splitCsv(value) {
  return clean(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isPlaceholder(value) {
  const normalized = clean(value).toLowerCase();

  return (
    !normalized ||
    normalized.includes("replace-with") ||
    normalized.includes("user:password") ||
    normalized.includes("your-") ||
    normalized === "changeme"
  );
}

function isUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function addRequired(checks, env, key, description) {
  const value = clean(env[key]);

  if (!value) {
    checks.fail.push(`${key}: missing (${description})`);
    return "";
  }

  if (isPlaceholder(value)) {
    checks.fail.push(`${key}: placeholder value (${description})`);
  } else {
    checks.pass.push(`${key}: present`);
  }

  return value;
}

const env = readEnv();
const checks = {
  fail: [],
  pass: [],
  warn: [],
};

const databaseUrl = addRequired(
  checks,
  env,
  "DATABASE_URL",
  "Neon Postgres connection string",
);
const betterAuthSecret = addRequired(
  checks,
  env,
  "BETTER_AUTH_SECRET",
  "Better Auth signing secret",
);
const betterAuthUrl = addRequired(
  checks,
  env,
  "BETTER_AUTH_URL",
  "server-side public app URL",
);
const publicBetterAuthUrl = clean(env.NEXT_PUBLIC_BETTER_AUTH_URL);
const betterAuthTrustedOrigins = splitCsv(env.BETTER_AUTH_TRUSTED_ORIGINS);
addRequired(checks, env, "R2_BUCKET", "R2 bucket name");
const r2AccessKey = addRequired(checks, env, "R2_ACCESS_KEY_ID", "R2 S3 access key");
const r2Secret = addRequired(
  checks,
  env,
  "R2_SECRET_ACCESS_KEY",
  "R2 S3 secret access key",
);
const r2PublicBaseUrl = addRequired(
  checks,
  env,
  "R2_PUBLIC_BASE_URL",
  "public or custom domain base URL for stored media",
);
const inviteCode = addRequired(
  checks,
  env,
  "STUDIO_INVITE_CODE",
  "private Studio invite code",
);

const r2AccountId = clean(env.R2_ACCOUNT_ID);
const r2Endpoint = clean(env.R2_ENDPOINT);

if (!r2AccountId && !r2Endpoint) {
  checks.fail.push("R2_ACCOUNT_ID or R2_ENDPOINT: one is required for R2 S3 access");
} else {
  checks.pass.push("R2_ACCOUNT_ID/R2_ENDPOINT: endpoint can be resolved");
}

if (databaseUrl && !databaseUrl.startsWith("postgres")) {
  checks.fail.push("DATABASE_URL: must be a Postgres connection string");
}

if (databaseUrl && !databaseUrl.toLowerCase().includes("sslmode=require")) {
  checks.warn.push("DATABASE_URL: add sslmode=require for Neon production connections");
}

if (betterAuthSecret && betterAuthSecret.length < 32) {
  checks.fail.push("BETTER_AUTH_SECRET: should be at least 32 characters");
}

if (betterAuthUrl && !isUrl(betterAuthUrl)) {
  checks.fail.push("BETTER_AUTH_URL: must be an http(s) URL");
}

if (publicBetterAuthUrl) {
  if (!isUrl(publicBetterAuthUrl)) {
    checks.fail.push("NEXT_PUBLIC_BETTER_AUTH_URL: must be an http(s) URL when set");
  } else {
    checks.pass.push("NEXT_PUBLIC_BETTER_AUTH_URL: optional fallback present");
  }
}

for (const origin of betterAuthTrustedOrigins) {
  if (!isUrl(origin)) {
    checks.fail.push(`BETTER_AUTH_TRUSTED_ORIGINS: ${origin} must be an http(s) URL`);
  }
}

if (betterAuthTrustedOrigins.length > 0) {
  checks.pass.push("BETTER_AUTH_TRUSTED_ORIGINS: optional extra origins present");
}

if (betterAuthUrl.includes("localhost") || publicBetterAuthUrl.includes("localhost")) {
  checks.warn.push("Auth URLs still point at localhost; set the production origin before deploy");
}

if (r2PublicBaseUrl && !isUrl(r2PublicBaseUrl)) {
  checks.fail.push("R2_PUBLIC_BASE_URL: must be an http(s) URL");
}

if (r2Endpoint && !isUrl(r2Endpoint)) {
  checks.fail.push("R2_ENDPOINT: must be an http(s) URL when provided");
}

if (r2AccessKey && r2AccessKey === r2Secret) {
  checks.fail.push("R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY must not be identical");
}

if (inviteCode && inviteCode.length < 8) {
  checks.warn.push("STUDIO_INVITE_CODE is short; use a private non-guessable value");
}

if (!clean(env.CLOUDFLARE_API_TOKEN)) {
  checks.warn.push(
    "CLOUDFLARE_API_TOKEN is not set; wrangler deploy will need an authenticated session or secret",
  );
}

function printSection(label, items) {
  if (items.length === 0) return;

  console.log(`\n${label}`);
  for (const item of items) {
    console.log(`- ${item}`);
  }
}

console.log("MyNewBlog production environment check");
printSection("PASS", checks.pass);
printSection("WARN", checks.warn);
printSection("FAIL", checks.fail);

if (checks.fail.length > 0) {
  process.exitCode = 1;
}
