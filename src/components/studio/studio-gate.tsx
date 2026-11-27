"use client";

import { KeyRound, Lock, ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import { type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { blogConfig } from "@/config/site";

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
      <section className="mx-auto mt-10 w-full max-w-md px-2">
        <div className="anime-card p-6 text-center sm:p-8">
          <Badge>Studio Gate</Badge>
          <h1 className="mt-4 font-serif text-2xl font-bold">
            正在确认创作室通行权限
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            正在校验当前设备上的邀请码令牌，请稍候...
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto mt-6 w-full max-w-4xl sm:mt-10">
      <div className="anime-card grid overflow-hidden lg:grid-cols-[1.05fr_1fr]">
        {/* Left Anime Desk Illustration Panel */}
        <div className="relative min-h-[200px] overflow-hidden bg-slate-900 p-6 text-white sm:p-8 lg:min-h-[420px]">
          <Image
            src={blogConfig.images.defaultCover}
            alt="晴空书房创作桌插画"
            fill
            priority
            sizes="(min-width: 1024px) 460px, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/88 via-slate-950/42 to-slate-950/25" />

          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="relative size-11 overflow-hidden rounded-full border-2 border-white/60 shadow">
                <Image
                  src={blogConfig.images.avatar}
                  alt={blogConfig.author}
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-pink-200">
                  Private Studio
                </p>
                <p className="font-serif text-sm font-bold">
                  {blogConfig.brandPrefix} {blogConfig.brandConnector} 创作室
                </p>
              </div>
            </div>

            <div className="mt-8 lg:mt-0">
              <h1 className="font-serif text-2xl font-bold leading-snug sm:text-3xl">
                {!inviteVerified
                  ? "先输入邀请码，推开书房的门。"
                  : "欢迎回到你的写作书桌。"}
              </h1>
              <p className="mt-2.5 text-xs leading-6 text-white/82 sm:text-sm">
                {!inviteVerified
                  ? "后台所有读写接口都会校验邀请码与登录态，确保草稿、媒体库与音乐库仅限作者访问。"
                  : "登录后可撰写与发布文章、管理 Cloudflare R2 媒体、审核回复读者评论与播放云端曲库。"}
              </p>
            </div>
          </div>
        </div>

        {/* Right Clean Auth / Invite Form */}
        {!inviteVerified ? (
          <form onSubmit={onInviteSubmit} className="flex flex-col justify-center p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-accent-100 text-accent-600 dark:bg-accent-500/20 dark:text-accent-200">
                <KeyRound className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-accent-600 dark:text-accent-300">
                  Step 1 · Invite Only
                </p>
                <h2 className="font-serif text-xl font-bold">后台邀请码</h2>
              </div>
            </div>

            <label className="studio-label mt-6 block">
              邀请码
              <input
                value={inviteCode}
                onChange={(event) => onInviteChange(event.target.value)}
                required
                autoComplete="off"
                placeholder="请输入私有邀请码"
                className="studio-input mt-2"
              />
            </label>

            {inviteError ? (
              <p className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">
                {inviteError}
              </p>
            ) : null}

            <Button className="mt-5 w-full" type="submit">
              <ShieldCheck className="size-4" />
              验证邀请码
            </Button>
          </form>
        ) : (
          <form onSubmit={onAuthSubmit} className="flex flex-col justify-center p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                <Lock className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                  Step 2 · Better Auth
                </p>
                <h2 className="font-serif text-xl font-bold">
                  {authMode === "signin" ? "作者登录" : "注册作者账号"}
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {authMode === "signup" ? (
                <input
                  value={authName}
                  onChange={(event) => onAuthNameChange(event.target.value)}
                  required
                  placeholder="昵称"
                  className="studio-input"
                />
              ) : null}
              <input
                value={authEmail}
                onChange={(event) => onAuthEmailChange(event.target.value)}
                required
                type="email"
                placeholder="邮箱"
                className="studio-input"
              />
              <input
                value={authPassword}
                onChange={(event) => onAuthPasswordChange(event.target.value)}
                required
                minLength={8}
                type="password"
                placeholder="密码（至少 8 位）"
                className="studio-input"
              />
            </div>

            {authError ? (
              <p className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">
                {authError}
              </p>
            ) : null}

            <Button className="mt-5 w-full" type="submit">
              <Sparkles className="size-4" />
              {authMode === "signin" ? "进入创作室" : "创建账号"}
            </Button>

            <button
              type="button"
              onClick={() =>
                onAuthModeChange(authMode === "signin" ? "signup" : "signin")
              }
              className="mt-4 w-full text-center text-xs font-medium text-slate-500 underline-offset-4 transition hover:text-accent-600 hover:underline dark:text-slate-400 dark:hover:text-accent-300"
            >
              {authMode === "signin"
                ? "还没有账号？去注册一个"
                : "已有账号？直接登录"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
