"use client";

import { Cloud, Download, HardDriveDownload, Plus, Search } from "lucide-react";

import type {
  StudioQingMusicLevel,
  StudioQingMusicManifestStatus,
  StudioMusicSearchSource,
  StudioMusicSearchSourceTestResult,
  StudioMusicSource,
  StudioMusicSourceVersionStatus,
} from "@/components/studio/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pluginProviderLabels } from "./music-model";

type SourceSummary = {
  lyricReady: number;
  playable: number;
  searchable: number;
  total: number;
};

type PersistedSourceSummary = SourceSummary & {
  tested: number;
};

type MusicSourcesPanelProps = {
  changqingSource?: StudioMusicSource;
  enabledSearchPriorityText: string;
  enabledSources: StudioMusicSource[];
  hasChangqingSource: boolean;
  isSearchSourceUpdating: boolean;
  isSourceImporting: boolean;
  isSourceUpdating: boolean;
  persistedSearchSourceSummary: PersistedSourceSummary;
  qingMusicStatus?: StudioQingMusicManifestStatus;
  searchSources: StudioMusicSearchSource[];
  sourceTestKeyword: string;
  sourceTestResults: Record<string, StudioMusicSearchSourceTestResult>;
  sourceTestSummary: SourceSummary;
  sourceUpdateCode: string;
  sourceVersionStatus?: StudioMusicSourceVersionStatus;
  testingBatch: boolean;
  testingSourceId: string;
  onApplyRecommendedOrder: () => void;
  onCheckChangqingVersion: () => void;
  onDisableFailedSearchSources: () => void;
  onImportChangqingSource: () => void;
  onImportDefaultSearchSources: () => void;
  onSourceTestKeywordChange: (value: string) => void;
  onSourceUpdateCodeChange: (value: string) => void;
  onTestSearchSource: (source: StudioMusicSearchSource) => void;
  onTestSearchSourcesBatch: (onlyEnabled: boolean) => void;
  onUpdateChangqingSource: () => void;
  onUpdateSearchSource: (
    source: StudioMusicSearchSource,
    patch: Partial<
      Pick<
        StudioMusicSearchSource,
        "enabled" | "name" | "sortOrder" | "url" | "version"
      >
    >,
  ) => void;
};

function getEnabledSourceText(enabledSources: StudioMusicSource[]) {
  if (enabledSources.length === 0) {
    return "搜索仍走远程插件；导入后，拿到平台 ID 的歌曲会优先用 PG 内的长青源解析。";
  }

  return enabledSources
    .map(
      (source) =>
        `${source.name}：${source.providerKeys
          .map(
            (provider) =>
              pluginProviderLabels[
                provider as keyof typeof pluginProviderLabels
              ] ?? provider,
          )
          .join(" / ")}`,
    )
    .join("；");
}

function shouldCommitText(nextValue: string, currentValue: string) {
  return nextValue.trim() !== currentValue;
}

const qingMusicLevelLabels: Record<StudioQingMusicLevel, string> = {
  atmos: "Atmos",
  atmos_plus: "Atmos+",
  clear: "臻品",
  exhigh: "320k",
  hires: "Hi-Res",
  lossless: "无损",
  master: "母带",
  standard: "标准",
};

function getQingMusicQualityText(levels: StudioQingMusicLevel[]) {
  if (levels.length === 0) return "未声明";

  return levels.map((level) => qingMusicLevelLabels[level]).join(" / ");
}

function SourceTestResultCard({
  result,
}: {
  result: StudioMusicSearchSourceTestResult;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-300">
      <span
        className={cn(
          "mr-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black",
          result.ok && result.total > 0
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-200"
            : "bg-coral-500/10 text-coral-600 dark:text-coral-200",
        )}
      >
        {pluginProviderLabels[result.provider]} {result.ok ? "OK" : "ERROR"}
      </span>
      {result.keyword} · {result.total} 条 · {result.elapsedMs}ms
      {result.sample.length > 0 ? (
        <span className="ml-2 text-slate-400">
          {result.sample
            .map((item) => `${item.title}-${item.artist}`)
            .join(" / ")}
        </span>
      ) : null}
      {result.error ? (
        <span className="ml-2 text-coral-500">{result.error}</span>
      ) : null}
      {result.resolve ? (
        <span className="mt-2 block text-slate-400">
          解析：
          <span
            className={cn(
              "mx-1 font-black",
              result.resolve.audioOk ? "text-emerald-500" : "text-coral-500",
            )}
          >
            {result.resolve.audioOk ? "可播放" : "不可播放"}
          </span>
          · 歌词
          <span
            className={cn(
              "mx-1 font-black",
              result.resolve.lyricOk ? "text-emerald-500" : "text-slate-400",
            )}
          >
            {result.resolve.lyricOk ? "有" : "无"}
          </span>
          · {result.resolve.elapsedMs}ms · {result.resolve.title}
          {result.resolve.lyricSource ? (
            <span className="ml-1">
              来源 {pluginProviderLabels[result.resolve.lyricSource]}
            </span>
          ) : null}
          {result.resolve.error ? (
            <span className="ml-2 text-coral-500">{result.resolve.error}</span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

export function MusicSourcesPanel({
  changqingSource,
  enabledSearchPriorityText,
  enabledSources,
  hasChangqingSource,
  isSearchSourceUpdating,
  isSourceImporting,
  isSourceUpdating,
  persistedSearchSourceSummary,
  qingMusicStatus,
  searchSources,
  sourceTestKeyword,
  sourceTestResults,
  sourceTestSummary,
  sourceUpdateCode,
  sourceVersionStatus,
  testingBatch,
  testingSourceId,
  onApplyRecommendedOrder,
  onCheckChangqingVersion,
  onDisableFailedSearchSources,
  onImportChangqingSource,
  onImportDefaultSearchSources,
  onSourceTestKeywordChange,
  onSourceUpdateCodeChange,
  onTestSearchSource,
  onTestSearchSourcesBatch,
  onUpdateChangqingSource,
  onUpdateSearchSource,
}: MusicSourcesPanelProps) {
  const testResults = Object.values(sourceTestResults);
  const qingMusicLines = qingMusicStatus?.lines ?? [];
  const enabledQingMusicLines = qingMusicLines.filter((line) => line.enabled);

  return (
    <>
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/30 dark:bg-emerald-400/12 dark:text-emerald-100">
            PG 音源配置
          </Badge>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-slate-950 dark:text-white">
              {enabledSources.length > 0
                ? `已启用 ${enabledSources.length} 个解析源`
                : "还没有启用的 PG 解析源"}
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-300">
              {getEnabledSourceText(enabledSources)}
            </p>
          </div>
          {sourceVersionStatus ? (
            <Badge
              className={
                sourceVersionStatus.error
                  ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-300/30 dark:bg-amber-400/12 dark:text-amber-100"
                  : sourceVersionStatus.updateAvailable
                    ? "border-coral-200 bg-coral-50 text-coral-700 dark:border-coral-300/30 dark:bg-coral-400/12 dark:text-coral-100"
                    : "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-300/30 dark:bg-sky-400/12 dark:text-sky-100"
              }
            >
              {sourceVersionStatus.error
                ? "远端检查失败"
                : sourceVersionStatus.updateAvailable
                  ? "发现新版"
                  : `v${sourceVersionStatus.remoteVersion || changqingSource?.version || "?"}`}
            </Badge>
          ) : null}
          <Button
            disabled={isSourceUpdating}
            type="button"
            variant="glass"
            onClick={onCheckChangqingVersion}
          >
            <Search className="size-4" />
            检查更新
          </Button>
          <Button
            disabled={isSourceImporting || isSourceUpdating}
            type="button"
            variant={hasChangqingSource ? "glass" : "soft"}
            onClick={onImportChangqingSource}
          >
            <Plus className="size-4" />
            {hasChangqingSource ? "刷新长青源" : "导入长青源"}
          </Button>
        </div>

        {sourceVersionStatus ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/6 dark:text-slate-300">
            <p>
              本地版本 {sourceVersionStatus.localVersion || "未导入"} / 远端版本{" "}
              {sourceVersionStatus.remoteVersion || "未知"}
            </p>
            {sourceVersionStatus.description ? (
              <p className="mt-1">{sourceVersionStatus.description}</p>
            ) : null}
            {sourceVersionStatus.error ? (
              <p className="mt-1 text-amber-600 dark:text-amber-200">
                {sourceVersionStatus.error}
              </p>
            ) : null}
            {sourceVersionStatus.updateUrl ? (
              <a
                className="mt-1 inline-flex text-emerald-600 underline-offset-4 hover:underline dark:text-emerald-200"
                href={sourceVersionStatus.updateUrl}
                rel="noreferrer"
                target="_blank"
              >
                打开长青更新页
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
          <textarea
            className="min-h-20 resize-y rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-xs font-semibold outline-none transition placeholder:text-slate-400 focus:border-emerald-300 dark:border-white/10 dark:bg-slate-950/40 dark:placeholder:text-slate-500"
            onChange={(event) => onSourceUpdateCodeChange(event.target.value)}
            placeholder="拿到新版长青 JS 后粘贴到这里，再写入 PG。版本会优先读取更新 JSON。"
            value={sourceUpdateCode}
          />
          <Button
            className="self-start"
            disabled={isSourceUpdating || sourceUpdateCode.trim().length < 100}
            type="button"
            variant="soft"
            onClick={onUpdateChangqingSource}
          >
            <Download className="size-4" />
            写入新版脚本
          </Button>
        </div>
      </div>

      <div className="mb-6 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-300/30 dark:bg-indigo-400/12 dark:text-indigo-100">
            QingMusic 在线线路
          </Badge>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-950 dark:text-white">
              {qingMusicStatus
                ? `${enabledQingMusicLines.length}/${qingMusicLines.length} 条线路启用`
                : "等待远端线路清单"}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
              下载缓存写入 R2；生产播放优先 R2，未缓存时按在线线路解析。
            </p>
          </div>
          <Badge className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/30 dark:bg-emerald-400/12 dark:text-emerald-100">
            <HardDriveDownload className="size-3.5" />
            R2 下载缓存
          </Badge>
          <Badge className="gap-1 border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-300/30 dark:bg-sky-400/12 dark:text-sky-100">
            <Cloud className="size-3.5" />
            在线播放
          </Badge>
          {qingMusicStatus?.url ? (
            <a
              className="text-xs font-black text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-200"
              href={qingMusicStatus.url}
              rel="noreferrer"
              target="_blank"
            >
              打开清单
            </a>
          ) : null}
        </div>

        {qingMusicStatus?.error ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700 dark:border-amber-300/30 dark:bg-amber-400/12 dark:text-amber-100">
            QingMusic 清单读取失败：{qingMusicStatus.error}
          </div>
        ) : qingMusicLines.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {qingMusicLines.map((line) => (
              <div
                key={line.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/6"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-black text-slate-950 dark:text-white">
                    {line.name}
                  </span>
                  <Badge
                    className={
                      line.enabled
                        ? "bg-emerald-100 text-emerald-950 dark:bg-emerald-400/15 dark:text-emerald-100"
                        : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
                    }
                  >
                    {pluginProviderLabels[line.id]}
                  </Badge>
                </div>
                <p className="mt-2 text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-300">
                  {getQingMusicQualityText(line.levels)}
                </p>
                <p className="mt-2 truncate text-[10px] font-semibold text-slate-400">
                  {line.searchApi} / {line.detailApi}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs font-bold text-slate-500 dark:border-white/10 dark:bg-white/6 dark:text-slate-300">
            远端暂未返回可用线路。
          </div>
        )}
      </div>

      <div className="mb-6 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-300/30 dark:bg-sky-400/12 dark:text-sky-100">
            远程搜索源
          </Badge>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-950 dark:text-white">
              {searchSources.length > 0
                ? `已配置 ${searchSources.length} 个搜索插件`
                : "还没有写入 PG 的搜索插件"}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
              这些源负责搜索歌曲和拿平台 ID；长青源负责按 ID 解析播放地址。
            </p>
          </div>
          <Button
            disabled={isSearchSourceUpdating}
            type="button"
            variant="glass"
            onClick={onImportDefaultSearchSources}
          >
            <Plus className="size-4" />
            同步默认搜索源
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/6">
          <span className="text-xs font-black text-slate-500 dark:text-slate-300">
            单源测试关键词
          </span>
          <input
            className="h-10 min-w-56 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-sky-300 dark:border-white/10 dark:bg-slate-950/40"
            onChange={(event) => onSourceTestKeywordChange(event.target.value)}
            value={sourceTestKeyword}
          />
          <Button
            disabled={testingBatch || isSearchSourceUpdating}
            type="button"
            variant="glass"
            onClick={() => onTestSearchSourcesBatch(true)}
          >
            {testingBatch ? "测试中" : "测试启用源"}
          </Button>
          <Button
            disabled={testingBatch || isSearchSourceUpdating}
            type="button"
            variant="ghost"
            onClick={() => onTestSearchSourcesBatch(false)}
          >
            测试全部
          </Button>
          <Button
            disabled={
              testingBatch || isSearchSourceUpdating || testResults.length === 0
            }
            type="button"
            variant="ghost"
            onClick={onDisableFailedSearchSources}
          >
            停用异常源
          </Button>
          <Button
            disabled={isSearchSourceUpdating || searchSources.length === 0}
            type="button"
            variant="ghost"
            onClick={onApplyRecommendedOrder}
          >
            推荐排序
          </Button>
          <span className="text-xs font-semibold text-slate-400">
            测试某个插件是否真的能搜到结果。
          </span>
        </div>

        {persistedSearchSourceSummary.tested > 0 ? (
          <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-black text-sky-700 dark:border-sky-300/30 dark:bg-sky-400/12 dark:text-sky-100">
            最近体检：{persistedSearchSourceSummary.tested}/
            {persistedSearchSourceSummary.total} 已测试，
            {persistedSearchSourceSummary.searchable} 可搜索，
            {persistedSearchSourceSummary.playable} 可播放，
            {persistedSearchSourceSummary.lyricReady} 有歌词
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-500 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-300">
          当前搜索优先级：{" "}
          <span className="font-black text-slate-900 dark:text-white">
            {enabledSearchPriorityText}
          </span>
          <span className="ml-2 text-slate-400">
            系统会优先并行请求最近体检可播放、响应更快的源。
          </span>
        </div>

        <div className="mt-4 grid gap-3">
          {searchSources.map((source) => (
            <div
              className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/6 lg:grid-cols-[110px_minmax(120px,160px)_1fr_90px_92px_auto_auto]"
              key={source.id}
            >
              <Badge className="justify-center border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-200">
                {pluginProviderLabels[source.provider]}
              </Badge>
              <input
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-sky-300 dark:border-white/10 dark:bg-slate-950/40"
                defaultValue={source.name}
                onBlur={(event) => {
                  if (shouldCommitText(event.currentTarget.value, source.name)) {
                    onUpdateSearchSource(source, {
                      name: event.currentTarget.value,
                    });
                  }
                }}
              />
              <input
                className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-sky-300 dark:border-white/10 dark:bg-slate-950/40"
                defaultValue={source.url}
                onBlur={(event) => {
                  if (shouldCommitText(event.currentTarget.value, source.url)) {
                    onUpdateSearchSource(source, {
                      url: event.currentTarget.value,
                    });
                  }
                }}
              />
              <input
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-sky-300 dark:border-white/10 dark:bg-slate-950/40"
                defaultValue={source.version}
                onBlur={(event) => {
                  if (shouldCommitText(event.currentTarget.value, source.version)) {
                    onUpdateSearchSource(source, {
                      version: event.currentTarget.value,
                    });
                  }
                }}
              />
              <input
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-sky-300 dark:border-white/10 dark:bg-slate-950/40"
                defaultValue={source.sortOrder}
                type="number"
                onBlur={(event) => {
                  const sortOrder = Number(event.currentTarget.value);

                  if (
                    Number.isFinite(sortOrder) &&
                    sortOrder !== source.sortOrder
                  ) {
                    onUpdateSearchSource(source, { sortOrder });
                  }
                }}
              />
              <Button
                disabled={isSearchSourceUpdating}
                type="button"
                variant={source.enabled ? "glass" : "soft"}
                onClick={() =>
                  onUpdateSearchSource(source, { enabled: !source.enabled })
                }
              >
                {source.enabled ? "停用" : "启用"}
              </Button>
              <Button
                disabled={isSearchSourceUpdating || testingSourceId === source.id}
                type="button"
                variant="ghost"
                onClick={() => onTestSearchSource(source)}
              >
                <Search className="size-4" />
                {testingSourceId === source.id ? "测试中" : "测试"}
              </Button>
              {source.lastTestedAt ? (
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-500 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-300 lg:col-span-7">
                  最近：
                  <span
                    className={cn(
                      "mx-1 font-black",
                      source.lastTestPlayable
                        ? "text-emerald-500"
                        : "text-coral-500",
                    )}
                  >
                    {source.lastTestPlayable ? "可播放" : "不可播放"}
                  </span>
                  · 搜索 {source.lastTestResultCount} 条 ·{" "}
                  {source.lastTestElapsedMs}ms · {source.lastTestKeyword}
                  {source.lastTestLyric ? " · 有歌词" : " · 无歌词"}
                  {source.lastTestError ? (
                    <span className="ml-2 text-coral-500">
                      {source.lastTestError}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {testResults.length > 0 ? (
          <div className="mt-4 grid gap-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700 dark:border-emerald-300/30 dark:bg-emerald-400/12 dark:text-emerald-100">
              体检摘要：{sourceTestSummary.searchable}/{sourceTestSummary.total} 可搜索，
              {sourceTestSummary.playable}/{sourceTestSummary.total} 可播放，
              {sourceTestSummary.lyricReady}/{sourceTestSummary.total} 有歌词
            </div>
            {testResults.map((result) => (
              <SourceTestResultCard key={result.sourceId} result={result} />
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}
