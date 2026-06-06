import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { memoryAdapter } from "better-auth/adapters/memory";
import { nextCookies } from "better-auth/next-js";

import { db, hasDatabase } from "@/db";
import * as schema from "@/db/schema";

const memoryDb = {
  user: [],
  session: [],
  account: [],
  verification: [],
};

function getAuthLogText(value: unknown): string {
  if (value instanceof Error) {
    const cause = "cause" in value ? value.cause : null;

    return [value.name, value.message, cause ? getAuthLogText(cause) : ""]
      .filter(Boolean)
      .join(" ");
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
}

function isTransientDatabaseLog(message: string, args: unknown[]) {
  const text = [message, ...args.map(getAuthLogText)].join(" ");

  return (
    text.includes("fetch failed") ||
    text.includes("Error connecting to database") ||
    text.includes("NeonDbError")
  );
}

function logBetterAuth(
  level: "debug" | "info" | "warn" | "error",
  message: string,
  ...args: unknown[]
) {
  if (isTransientDatabaseLog(message, args)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[better-auth] Session lookup could not reach Neon; using a null session for this request.",
      );
    }

    return;
  }

  const log = level === "error" ? console.error : console.warn;
  const sanitizedArgs = args
    .map(getAuthLogText)
    .filter((item): item is string => Boolean(item));

  log(`[better-auth] ${message}`, ...sanitizedArgs);
}

export const auth = betterAuth({
  database: hasDatabase
    ? drizzleAdapter(db, {
        provider: "pg",
        schema,
      })
    : memoryAdapter(memoryDb),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
      strategy: "compact",
    },
  },
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "development-only-secret-change-before-deploying-mynewblog",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  logger: {
    level: process.env.NODE_ENV === "production" ? "error" : "warn",
    log: logBetterAuth,
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
