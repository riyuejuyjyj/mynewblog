"use client";

import { type FormEvent, useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";

export function useStudioAuth() {
  const session = authClient.useSession();
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authName, setAuthName] = useState("Author");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteVerified, setInviteVerified] = useState(false);
  const [inviteChecking, setInviteChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkInvite() {
      try {
        const response = await fetch("/api/studio/invite", {
          cache: "no-store",
          credentials: "include",
        });
        const data = (await response.json()) as { verified?: boolean };

        if (!cancelled) {
          setInviteVerified(Boolean(data.verified));
        }
      } catch {
        if (!cancelled) {
          setInviteVerified(false);
        }
      } finally {
        if (!cancelled) {
          setInviteChecking(false);
        }
      }
    }

    void checkInvite();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteError("");

    const response = await fetch("/api/studio/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ code: inviteCode }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      setInviteError(data.message ?? "邀请码不正确，请再确认一次。");
      return;
    }

    setInviteCode("");
    setInviteVerified(true);
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");

    const result =
      authMode === "signin"
        ? await authClient.signIn.email({
            email: authEmail,
            password: authPassword,
          })
        : await authClient.signUp.email({
            name: authName,
            email: authEmail,
            password: authPassword,
          });

    if (result.error) {
      setAuthError(result.error.message ?? "登录失败，请检查账号信息。");
      return;
    }

    setAuthPassword("");
    await session.refetch();
  }

  async function signOut() {
    await authClient.signOut();
    await fetch("/api/studio/invite", {
      method: "DELETE",
      credentials: "include",
    });
    setInviteVerified(false);
    await session.refetch();
  }

  return {
    authEmail,
    authError,
    authMode,
    authName,
    authPassword,
    handleAuth,
    handleInvite,
    inviteChecking,
    inviteCode,
    inviteError,
    inviteVerified,
    isAuthenticated: Boolean(session.data?.user && inviteVerified),
    session,
    setAuthEmail,
    setAuthMode,
    setAuthName,
    setAuthPassword,
    setInviteCode,
    signOut,
  };
}
