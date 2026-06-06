import { initTRPC, TRPCError } from "@trpc/server";
import { getSessionCookie } from "better-auth/cookies";
import superjson from "superjson";

import { auth, type AuthSession } from "@/lib/auth";
import { db } from "@/db";
import { verifyStudioInviteCookie } from "@/lib/studio-invite";

const SESSION_LOOKUP_RETRY_DELAY_MS = 220;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeAuthSessionError(error: unknown) {
  if (error instanceof Error) {
    const cause = "cause" in error ? error.cause : null;
    const causeMessage = cause instanceof Error ? `: ${cause.message}` : "";

    return `${error.name}: ${error.message}${causeMessage}`;
  }

  return "Unknown auth session error";
}

async function readAuthSession(headers: Request["headers"]) {
  const sessionCookie = getSessionCookie(headers);

  if (!sessionCookie) {
    return null;
  }

  try {
    return await auth.api.getSession({ headers });
  } catch {
    await sleep(SESSION_LOOKUP_RETRY_DELAY_MS);

    try {
      return await auth.api.getSession({ headers });
    } catch (secondError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[trpc] Better Auth session lookup failed; continuing as signed-out.",
          summarizeAuthSessionError(secondError),
        );
      }

      return null;
    }
  }
}

export async function createTRPCContext(opts: { req: Request }) {
  const session = await readAuthSession(opts.req.headers);
  const studioInviteVerified = await verifyStudioInviteCookie(
    opts.req.headers.get("cookie"),
  );

  return {
    db,
    session,
    studioInviteVerified,
  };
}

export type TRPCContext = {
  db: typeof db;
  session: AuthSession | null;
  studioInviteVerified: boolean;
};

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sign in before opening the studio.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export const studioProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.studioInviteVerified) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Enter the studio invite code before opening the studio.",
    });
  }

  return next();
});
