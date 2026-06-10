"use client";

import { type FormEvent } from "react";
import { KeyRound, Lock, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type StudioGateProps = {
  authEmail: string;
  authError: string;
  authMode: "signin" | "signup";
  authName: string;
  authPassword: string;
  inviteChecking: boolean;
  inviteCode: string;
  inviteError: string;
  inviteVerified: boolean;
  onAuthEmailChange: (value: string) => void;
  onAuthModeChange: (value: "signin" | "signup") => void;
  onAuthNameChange: (value: string) => void;
  onAuthPasswordChange: (value: string) => void;
  onAuthSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onInviteChange: (value: string) => void;
  onInviteSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function StudioGate({
  authEmail,
  authError,
  authMode,
  authName,
  authPassword,
  inviteChecking,
  inviteCode,
  inviteError,
  inviteVerified,
  onAuthEmailChange,
  onAuthModeChange,
  onAuthNameChange,
  onAuthPasswordChange,
  onAuthSubmit,
  onInviteChange,
  onInviteSubmit,
}: StudioGateProps) {
  if (inviteChecking) {
    return (
      <section className="relative z-10 mx-auto mt-6 w-full max-w-xl px-3 sm:mt-10 sm:px-0">
        <div className="glass-panel p-5 sm:p-8">
          <Badge>Studio Gate</Badge>
          <h1 className="mt-6 text-2xl font-black leading-tight tracking-[0] sm:mt-8 sm:text-4xl">
            正在确认后台访问权限
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-200 sm:mt-5 sm:text-base sm:leading-8">
            正在校验这台设备上的邀请码令牌。
          </p>
        </div>
      </section>
    );
  }

  if (!inviteVerified) {
    return (
      <section className="relative z-10 mx-auto mt-6 grid w-full max-w-5xl gap-4 px-3 sm:mt-10 sm:px-0 lg:grid-cols-[1fr_380px]">
        <div className="glass-panel p-5 sm:p-8">
          <Badge>Private Studio</Badge>
          <h1 className="mt-6 max-w-2xl text-3xl font-black leading-tight tracking-[0] sm:mt-8 sm:text-5xl">
            先通过邀请码，再进入后台。
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-700 dark:text-slate-200 sm:mt-5 sm:text-base sm:leading-8">
            后台接口也会校验邀请码状态。即使绕过页面直接请求 tRPC，
            没有通过门禁也无法读写文章。
          </p>
        </div>

        <form onSubmit={onInviteSubmit} className="glass-panel p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <KeyRound className="size-6 text-coral-500" />
            <div>
              <p className="text-sm font-bold text-coral-700 dark:text-coral-200">
                Invite only
              </p>
              <h2 className="text-2xl font-black tracking-[0]">后台邀请码</h2>
            </div>
          </div>

          <label className="studio-label mt-6 block">
            Invite code
            <input
              value={inviteCode}
              onChange={(event) => onInviteChange(event.target.value)}
              required
              autoComplete="off"
              placeholder="请输入邀请码"
              className="studio-input mt-2"
            />
          </label>

          {inviteError ? (
            <p className="mt-4 rounded-2xl bg-coral-100 px-4 py-3 text-sm font-semibold text-coral-950">
              {inviteError}
            </p>
          ) : null}

          <Button className="mt-5 w-full" type="submit">
            <ShieldCheck className="size-4" />
            验证邀请码
          </Button>
        </form>
      </section>
    );
  }

  return (
    <section className="relative z-10 mx-auto mt-6 grid w-full max-w-5xl gap-4 px-3 sm:mt-10 sm:px-0 lg:grid-cols-[1fr_380px]">
      <div className="glass-panel p-5 sm:p-8">
        <Badge>Better Auth</Badge>
        <h1 className="mt-6 max-w-2xl text-3xl font-black leading-tight tracking-[0] sm:mt-8 sm:text-5xl">
          打开写作控制台。
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-700 dark:text-slate-200 sm:mt-5 sm:text-base sm:leading-8">
          登录后可以写文章、管理草稿、准备发布，并继续接入 R2 媒体与评论审核。
        </p>
      </div>

      <form onSubmit={onAuthSubmit} className="glass-panel p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Lock className="size-6 text-emerald-500" />
          <div>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-200">
              {authMode === "signin" ? "Sign in" : "Create account"}
            </p>
            <h2 className="text-2xl font-black tracking-[0]">Author access</h2>
          </div>
        </div>

        <div className="mt-5 space-y-3 sm:mt-6">
          {authMode === "signup" ? (
            <input
              value={authName}
              onChange={(event) => onAuthNameChange(event.target.value)}
              required
              placeholder="Name"
              className="studio-input"
            />
          ) : null}
          <input
            value={authEmail}
            onChange={(event) => onAuthEmailChange(event.target.value)}
            required
            type="email"
            placeholder="Email"
            className="studio-input"
          />
          <input
            value={authPassword}
            onChange={(event) => onAuthPasswordChange(event.target.value)}
            required
            minLength={8}
            type="password"
            placeholder="Password"
            className="studio-input"
          />
        </div>

        {authError ? (
          <p className="mt-4 rounded-2xl bg-coral-100 px-4 py-3 text-sm font-semibold text-coral-950">
            {authError}
          </p>
        ) : null}

        <Button className="mt-4 w-full sm:mt-5" type="submit">
          <Sparkles className="size-4" />
          {authMode === "signin" ? "Sign in" : "Create account"}
        </Button>
        <button
          type="button"
          onClick={() =>
            onAuthModeChange(authMode === "signin" ? "signup" : "signin")
          }
          className="mt-4 w-full text-sm font-bold text-slate-600 underline-offset-4 hover:underline dark:text-slate-300"
        >
          {authMode === "signin"
            ? "Need an account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </section>
  );
}
