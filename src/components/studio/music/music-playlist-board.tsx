"use client";

/* eslint-disable @next/next/no-img-element */

import { motion } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckSquare,
  Copy,
  Download,
  Edit3,
  Filter,
  FolderPlus,
  ListPlus,
  Play,
  Plus,
  RotateCcw,
  Search,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import type {
  StudioMusicDownload,
  StudioMusicItemProvider,
  StudioMusicLibraryItem,
  StudioMusicPlaylist,
  StudioMusicPlaylistItem,
} from "@/components/studio/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  pluginProviderBadgeClass,
  pluginProviderLabels,
  providerLabels,
} from "./music-model";

type MusicPlaylistBoardProps = {
  currentItem: StudioMusicLibraryItem | null;
  downloadingPlaylistId?: string;
  downloadsByItemKey: Map<string, StudioMusicDownload>;
  likedKeys: Set<string>;
  playlists: StudioMusicPlaylist[];
  onAddCurrent: (playlistId: string) => void;
  onDownloadItem: (item: StudioMusicLibraryItem) => void;
  onDownloadPlaylist: (playlist: StudioMusicPlaylist) => void;
  onDownloadItems: (
    playlist: StudioMusicPlaylist,
    items: StudioMusicPlaylistItem[],
  ) => Promise<void>;
  onCreatePlaylist: (name: string) => void;
  onDeletePlaylist: (playlist: StudioMusicPlaylist) => void;
  onLike: (item: StudioMusicLibraryItem) => void;
  onPlayItem: (
    item: StudioMusicPlaylistItem,
    playlist: StudioMusicPlaylist,
  ) => void;
  onPlayPlaylist: (playlist: StudioMusicPlaylist) => void;
  onReorderItems: (playlistId: string, itemIds: string[]) => void;
  onRemoveItem: (
    item: StudioMusicPlaylistItem,
    playlist: StudioMusicPlaylist,
  ) => void;
  onRemoveItems: (
    items: StudioMusicPlaylistItem[],
    playlist: StudioMusicPlaylist,
  ) => Promise<void>;
  onCopyItemsToPlaylist: (
    items: StudioMusicPlaylistItem[],
    playlistId: string,
  ) => Promise<void>;
  onUpdatePlaylist: (
    playlist: StudioMusicPlaylist,
    patch: Partial<
      Pick<
        StudioMusicPlaylist,
        "coverUrl" | "description" | "name" | "sortOrder"
      >
    >,
  ) => void;
  onUploadCover: (file: File) => Promise<string | null>;
  isBatching?: boolean;
};

const fallbackCover =
  "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=900&q=80";

type PlaylistCloudFilter = "all" | "ready" | "repair" | "unsaved";

const playlistCloudFilters: Array<{ key: PlaylistCloudFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "ready", label: "R2 ready" },
  { key: "repair", label: "待修复" },
  { key: "unsaved", label: "未保存" },
];

function getProviderLabel(provider: StudioMusicItemProvider) {
  return provider === "bilibili"
    ? pluginProviderLabels.bilibili
    : providerLabels[provider];
}

function getProviderClass(provider: StudioMusicItemProvider) {
  return provider === "bilibili"
    ? pluginProviderBadgeClass.bilibili
    : "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/8 dark:text-slate-200";
}

function getPlaylistItemCloudStatus(
  item: StudioMusicPlaylistItem,
  downloadsByItemKey: Map<string, StudioMusicDownload>,
) {
  const download = downloadsByItemKey.get(item.itemKey);

  if (!download) return "unsaved" as const;
  if (download.storageStatus === "ready") return "ready" as const;

  return "repair" as const;
}

function getCloudStatusLabel(status: "ready" | "repair" | "unsaved") {
  if (status === "ready") return "R2 ready";
  if (status === "repair") return "待修复";

  return "未保存";
}

function getCloudStatusClass(status: "ready" | "repair" | "unsaved") {
  if (status === "ready") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/30 dark:bg-emerald-400/12 dark:text-emerald-100";
  }

  if (status === "repair") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-300/30 dark:bg-amber-400/12 dark:text-amber-100";
  }

  return "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/8 dark:text-slate-300";
}

export function MusicPlaylistBoard({
  currentItem,
  downloadingPlaylistId = "",
  downloadsByItemKey,
  likedKeys,
  playlists,
  onAddCurrent,
  onDownloadItem,
  onDownloadItems,
  onDownloadPlaylist,
  onCreatePlaylist,
  onDeletePlaylist,
  onLike,
  onPlayItem,
  onPlayPlaylist,
  onReorderItems,
  onRemoveItem,
  onRemoveItems,
  onCopyItemsToPlaylist,
  onUpdatePlaylist,
  onUploadCover,
  isBatching = false,
}: MusicPlaylistBoardProps) {
  const [selectedId, setSelectedId] = useState(playlists[0]?.id ?? "");
  const [editingId, setEditingId] = useState("");
  const [draftCoverUrl, setDraftCoverUrl] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draggingItemId, setDraggingItemId] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [newName, setNewName] = useState("");
  const [itemSearchText, setItemSearchText] = useState("");
  const [providerFilter, setProviderFilter] =
    useState<StudioMusicItemProvider | "all">("all");
  const [cloudFilter, setCloudFilter] = useState<PlaylistCloudFilter>("all");
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [batchTargetPlaylistId, setBatchTargetPlaylistId] = useState("");
  const selectedPlaylist =
    playlists.find((playlist) => playlist.id === selectedId) ??
    playlists[0] ??
    null;
  const editing = Boolean(
    selectedPlaylist && editingId === selectedPlaylist.id,
  );
  const coverStack = useMemo(
    () =>
      [
        selectedPlaylist?.coverUrl,
        ...(selectedPlaylist?.items ?? []).map((item) => item.coverUrl),
      ]
        .filter((cover): cover is string => Boolean(cover))
        .slice(0, 4),
    [selectedPlaylist],
  );
  const providerOptions = useMemo(() => {
    const providers = selectedPlaylist?.items.map((item) => item.provider) ?? [];

    return Array.from(new Set(providers));
  }, [selectedPlaylist]);
  const filteredItems = useMemo(() => {
    const keyword = itemSearchText.trim().toLowerCase();
    const items = selectedPlaylist?.items ?? [];

    return items.filter((item) => {
      const matchesKeyword =
        !keyword ||
        [item.title, item.artist, item.album, item.sourceSongId]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      const matchesProvider =
        providerFilter === "all" || item.provider === providerFilter;
      const cloudStatus = getPlaylistItemCloudStatus(item, downloadsByItemKey);
      const matchesCloud =
        cloudFilter === "all" ||
        (cloudFilter === "ready" && cloudStatus === "ready") ||
        (cloudFilter === "repair" && cloudStatus === "repair") ||
        (cloudFilter === "unsaved" && cloudStatus === "unsaved");

      return matchesKeyword && matchesProvider && matchesCloud;
    });
  }, [
    cloudFilter,
    downloadsByItemKey,
    itemSearchText,
    providerFilter,
    selectedPlaylist,
  ]);
  const playlistCloudCounts = useMemo(() => {
    const items = selectedPlaylist?.items ?? [];
    const counts = {
      ready: 0,
      repair: 0,
      unsaved: 0,
    };

    for (const item of items) {
      counts[getPlaylistItemCloudStatus(item, downloadsByItemKey)] += 1;
    }

    return counts;
  }, [downloadsByItemKey, selectedPlaylist]);
  const selectedItems = useMemo(
    () => filteredItems.filter((item) => selectedItemIds.has(item.id)),
    [filteredItems, selectedItemIds],
  );
  const visibleSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedItemIds.has(item.id));
  const copyTargetPlaylist =
    playlists.find((playlist) => playlist.id === batchTargetPlaylistId) ??
    playlists.find((playlist) => playlist.id !== selectedPlaylist?.id) ??
    null;
  const copyTargetPlaylistId = copyTargetPlaylist?.id ?? "";
  const hasCopyTarget = Boolean(copyTargetPlaylistId);

  function createPlaylist() {
    const name = newName.trim();

    if (!name) return;

    onCreatePlaylist(name);
    setNewName("");
  }

  function selectPlaylist(playlistId: string) {
    setSelectedId(playlistId);
    setSelectedItemIds(new Set());
    setBatchTargetPlaylistId("");
  }

  function toggleItemSelection(itemId: string) {
    setSelectedItemIds((current) => {
      const next = new Set(current);

      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }

      return next;
    });
  }

  function toggleVisibleSelection() {
    setSelectedItemIds((current) => {
      const next = new Set(current);

      if (visibleSelected) {
        for (const item of filteredItems) {
          next.delete(item.id);
        }
      } else {
        for (const item of filteredItems) {
          next.add(item.id);
        }
      }

      return next;
    });
  }

  async function batchDownloadSelected() {
    if (!selectedPlaylist || selectedItems.length === 0) return;

    await onDownloadItems(selectedPlaylist, selectedItems);
    setSelectedItemIds(new Set());
  }

  async function batchRemoveSelected() {
    if (!selectedPlaylist || selectedItems.length === 0) return;

    await onRemoveItems(selectedItems, selectedPlaylist);
    setSelectedItemIds(new Set());
  }

  async function batchCopySelected() {
    if (!copyTargetPlaylistId || selectedItems.length === 0) return;

    await onCopyItemsToPlaylist(selectedItems, copyTargetPlaylistId);
    setSelectedItemIds(new Set());
  }

  function startEditing(playlist: StudioMusicPlaylist) {
    setEditingId(playlist.id);
    setDraftCoverUrl(playlist.coverUrl);
    setDraftDescription(playlist.description);
    setDraftName(playlist.name);
  }

  function saveEditing(playlist: StudioMusicPlaylist) {
    const name = draftName.trim();

    if (!name) return;

    onUpdatePlaylist(playlist, {
      coverUrl: draftCoverUrl.trim(),
      description: draftDescription.trim(),
      name,
    });
    setEditingId("");
  }

  async function uploadCover(file: File | undefined) {
    if (!file) return;

    setUploadingCover(true);

    try {
      const url = await onUploadCover(file);

      if (url) {
        setDraftCoverUrl(url);
      }
    } finally {
      setUploadingCover(false);
    }
  }

  function moveItem(
    playlist: StudioMusicPlaylist,
    index: number,
    direction: -1 | 1,
  ) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= playlist.items.length) return;

    const itemIds = playlist.items.map((item) => item.id);
    const current = itemIds[index];
    itemIds[index] = itemIds[nextIndex];
    itemIds[nextIndex] = current;
    onReorderItems(playlist.id, itemIds);
  }

  function reorderByDrag(
    playlist: StudioMusicPlaylist,
    targetItemId: string,
  ) {
    if (!draggingItemId || draggingItemId === targetItemId) return;

    const itemIds = playlist.items.map((item) => item.id);
    const fromIndex = itemIds.indexOf(draggingItemId);
    const toIndex = itemIds.indexOf(targetItemId);

    if (fromIndex < 0 || toIndex < 0) return;

    const [movedItemId] = itemIds.splice(fromIndex, 1);
    itemIds.splice(toIndex, 0, movedItemId);
    onReorderItems(playlist.id, itemIds);
  }

  return (
    <section className="pb-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold text-slate-400">Playlists</p>
          <h1 className="text-5xl font-black tracking-[0]">歌单</h1>
          <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-300">
            {playlists.length} 个歌单
          </p>
        </div>
        <div className="flex min-w-[280px] max-w-md flex-1 gap-2">
          <input
            className="h-11 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-emerald-300 dark:border-white/10 dark:bg-white/8"
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") createPlaylist();
            }}
            placeholder="新建歌单"
            value={newName}
          />
          <Button type="button" variant="soft" onClick={createPlaylist}>
            <Plus className="size-4" />
            创建
          </Button>
        </div>
      </div>

      {playlists.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 px-6 py-16 text-center dark:border-white/10">
          <ListPlus className="mx-auto size-9 text-emerald-500" />
          <p className="mt-4 text-sm font-bold text-slate-500 dark:text-slate-300">
            还没有歌单，先创建一个收藏夹式歌单吧。
          </p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-3">
            {playlists.map((playlist) => {
              const active = selectedPlaylist?.id === playlist.id;

              return (
                <button
                  className={cn(
                    "grid w-full grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 rounded-3xl border p-3 text-left transition",
                    active
                      ? "border-emerald-200 bg-emerald-50 shadow-sm dark:border-emerald-300/25 dark:bg-emerald-400/12"
                      : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/50 dark:hover:bg-white/6",
                  )}
                  key={playlist.id}
                  type="button"
                  onClick={() => selectPlaylist(playlist.id)}
                >
                  <img
                    alt={playlist.name}
                    className="size-16 rounded-2xl object-cover"
                    src={
                      playlist.coverUrl ||
                      playlist.items[0]?.coverUrl ||
                      fallbackCover
                    }
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-slate-950 dark:text-white">
                      {playlist.name}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-300">
                      {playlist.items.length} 首歌曲
                    </span>
                  </span>
                  <Button
                    size="icon"
                    type="button"
                    variant="ghost"
                    title="删除歌单"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeletePlaylist(playlist);
                    }}
                  >
                    <Trash2 className="size-4 text-coral-500" />
                  </Button>
                </button>
              );
            })}
          </div>

          {selectedPlaylist ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/50"
              initial={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid gap-5 border-b border-slate-100 p-5 dark:border-white/10 lg:grid-cols-[220px_minmax(0,1fr)_auto]">
                <div className="grid aspect-square grid-cols-2 gap-1 overflow-hidden rounded-3xl bg-slate-100 dark:bg-white/8">
                  {(coverStack.length > 0 ? coverStack : [fallbackCover]).map(
                    (cover, index) => (
                      <img
                        alt=""
                        className="size-full object-cover"
                        key={`${cover}-${index}`}
                        src={cover}
                      />
                    ),
                  )}
                </div>
                <div className="min-w-0 self-end">
                  {editing ? (
                    <div className="space-y-3">
                      <input
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-2xl font-black outline-none transition focus:border-emerald-300 dark:border-white/10 dark:bg-white/8"
                        onChange={(event) => setDraftName(event.target.value)}
                        value={draftName}
                      />
                      <textarea
                        className="min-h-20 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-emerald-300 dark:border-white/10 dark:bg-white/8"
                        onChange={(event) =>
                          setDraftDescription(event.target.value)
                        }
                        placeholder="歌单描述"
                        value={draftDescription}
                      />
                      <input
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold outline-none transition focus:border-emerald-300 dark:border-white/10 dark:bg-white/8"
                        onChange={(event) =>
                          setDraftCoverUrl(event.target.value)
                        }
                        placeholder="封面 URL"
                        value={draftCoverUrl}
                      />
                      <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white text-xs font-black text-slate-500 transition hover:border-emerald-300 hover:text-emerald-600 dark:border-white/10 dark:bg-white/8 dark:text-slate-300">
                        <Plus className="size-4" />
                        {uploadingCover ? "上传中..." : "上传封面到 R2"}
                        <input
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingCover}
                          type="file"
                          onChange={(event) => {
                            const [file] = Array.from(
                              event.currentTarget.files ?? [],
                            );
                            void uploadCover(file);
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-black uppercase text-emerald-500">
                        Playlist
                      </p>
                      <h2 className="mt-2 truncate text-4xl font-black">
                        {selectedPlaylist.name}
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm font-semibold text-slate-500 dark:text-slate-300">
                        {selectedPlaylist.description ||
                          `${selectedPlaylist.items.length} 首歌曲`}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap items-end justify-end gap-2">
                  {editing ? (
                    <>
                      <Button
                        type="button"
                        variant="soft"
                        onClick={() => saveEditing(selectedPlaylist)}
                      >
                        <Check className="size-4" />
                        保存
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setEditingId("")}
                      >
                        <X className="size-4" />
                        取消
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => startEditing(selectedPlaylist)}
                      >
                        <Edit3 className="size-4" />
                        编辑
                      </Button>
                      <Button
                        type="button"
                        variant="soft"
                        onClick={() => onPlayPlaylist(selectedPlaylist)}
                      >
                        <Play className="size-4" />
                        播放
                      </Button>
                      <Button
                        disabled={
                          selectedPlaylist.items.length === 0 ||
                          downloadingPlaylistId === selectedPlaylist.id
                        }
                        type="button"
                        variant="glass"
                        onClick={() => onDownloadPlaylist(selectedPlaylist)}
                      >
                        <Download className="size-4" />
                        {downloadingPlaylistId === selectedPlaylist.id
                          ? "补存中"
                          : "补存 R2"}
                      </Button>
                      <Button
                        disabled={!currentItem}
                        type="button"
                        variant="glass"
                        onClick={() => onAddCurrent(selectedPlaylist.id)}
                      >
                        <Plus className="size-4" />
                        当前歌曲
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10 lg:grid-cols-[minmax(180px,1fr)_auto_auto]">
                <label className="flex h-11 min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-500 dark:border-white/10 dark:bg-white/8 dark:text-slate-300">
                  <Search className="size-4" />
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                    onChange={(event) => setItemSearchText(event.target.value)}
                    placeholder="搜索歌单内歌曲"
                    value={itemSearchText}
                  />
                </label>
                <label className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-500 dark:border-white/10 dark:bg-white/8 dark:text-slate-300">
                  <Filter className="size-4" />
                  <select
                    className="bg-transparent outline-none"
                    onChange={(event) =>
                      setProviderFilter(
                        event.target.value as StudioMusicItemProvider | "all",
                      )
                    }
                    value={providerFilter}
                  >
                    <option value="all">全部来源</option>
                    {providerOptions.map((provider) => (
                      <option key={provider} value={provider}>
                        {getProviderLabel(provider)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/8">
                  {playlistCloudFilters.map((filter) => {
                    const count =
                      filter.key === "all"
                        ? selectedPlaylist.items.length
                        : filter.key === "ready"
                          ? playlistCloudCounts.ready
                          : filter.key === "repair"
                            ? playlistCloudCounts.repair
                            : playlistCloudCounts.unsaved;

                    return (
                      <button
                        className={cn(
                          "rounded-xl px-3 py-2 text-xs font-black transition",
                          cloudFilter === filter.key
                            ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
                            : "text-slate-500 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10",
                        )}
                        key={filter.key}
                        type="button"
                        onClick={() => setCloudFilter(filter.key)}
                      >
                        {filter.label}{" "}
                        <span className="opacity-70">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-white/10">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant={visibleSelected ? "soft" : "glass"}
                    onClick={toggleVisibleSelection}
                  >
                    {visibleSelected ? (
                      <CheckSquare className="size-4" />
                    ) : (
                      <Square className="size-4" />
                    )}
                    {visibleSelected ? "取消当前筛选" : "选择当前筛选"}
                  </Button>
                  <span className="rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-500 dark:border-white/10 dark:text-slate-300">
                    已选 {selectedItems.length}
                  </span>
                </div>
                {selectedItems.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      disabled={isBatching || downloadingPlaylistId === selectedPlaylist.id}
                      type="button"
                      variant="glass"
                      onClick={() => void batchDownloadSelected()}
                    >
                      <Download className="size-4" />
                      补存所选
                    </Button>
                    <label className="flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-500 dark:border-white/10 dark:bg-white/8 dark:text-slate-300">
                      <FolderPlus className="size-4" />
                      <select
                        className="max-w-40 bg-transparent outline-none"
                        disabled={!hasCopyTarget || isBatching}
                        onChange={(event) =>
                          setBatchTargetPlaylistId(event.target.value)
                        }
                        value={copyTargetPlaylistId}
                      >
                        {playlists
                          .filter((playlist) => playlist.id !== selectedPlaylist.id)
                          .map((playlist) => (
                            <option key={playlist.id} value={playlist.id}>
                              {playlist.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <Button
                      disabled={!hasCopyTarget || isBatching}
                      type="button"
                      variant="glass"
                      onClick={() => void batchCopySelected()}
                    >
                      <Copy className="size-4" />
                      复制
                    </Button>
                    <Button
                      disabled={isBatching}
                      type="button"
                      variant="ghost"
                      onClick={() => void batchRemoveSelected()}
                    >
                      <X className="size-4" />
                      移出
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="max-h-[520px] overflow-y-auto">
                {selectedPlaylist.items.length === 0 ? (
                  <p className="px-6 py-14 text-center text-sm font-bold text-slate-500 dark:text-slate-300">
                    这个歌单还空着，播放一首歌后点“当前歌曲”加入。
                  </p>
                ) : null}
                {selectedPlaylist.items.length > 0 && filteredItems.length === 0 ? (
                  <p className="px-6 py-14 text-center text-sm font-bold text-slate-500 dark:text-slate-300">
                    当前筛选下没有歌曲。
                  </p>
                ) : null}
                {filteredItems.map((item) => {
                  const index = selectedPlaylist.items.findIndex(
                    (playlistItem) => playlistItem.id === item.id,
                  );
                  const liked = likedKeys.has(item.itemKey);
                  const cloudStatus = getPlaylistItemCloudStatus(
                    item,
                    downloadsByItemKey,
                  );
                  const selected = selectedItemIds.has(item.id);

                  return (
                    <div
                      className={cn(
                        "group grid grid-cols-[72px_minmax(220px,1fr)_minmax(120px,180px)_160px] items-center px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-white/6",
                        selected &&
                          "bg-emerald-50/70 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-400/10 dark:ring-emerald-300/20",
                        draggingItemId === item.id &&
                          "bg-emerald-50 opacity-70 dark:bg-emerald-400/12",
                      )}
                      draggable
                      key={item.id}
                      onDragEnd={() => setDraggingItemId("")}
                      onDragOver={(event) => event.preventDefault()}
                      onDragStart={(event) => {
                        setDraggingItemId(item.id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        reorderByDrag(selectedPlaylist, item.id);
                        setDraggingItemId("");
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          className={cn(
                            "grid size-8 place-items-center rounded-xl border transition",
                            selected
                              ? "border-emerald-300 bg-emerald-500 text-white"
                              : "border-slate-200 bg-white text-slate-400 hover:border-emerald-300 hover:text-emerald-500 dark:border-white/10 dark:bg-white/8",
                          )}
                          type="button"
                          aria-label={selected ? "取消选择" : "选择歌曲"}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleItemSelection(item.id);
                          }}
                        >
                          {selected ? (
                            <Check className="size-4" />
                          ) : (
                            <Square className="size-4" />
                          )}
                        </button>
                        <span className="text-xs font-black text-slate-400">
                          {index + 1}
                        </span>
                      </div>
                      <button
                        className="flex min-w-0 items-center gap-3 text-left"
                        type="button"
                        onClick={() => onPlayItem(item, selectedPlaylist)}
                      >
                        <img
                          alt={item.title}
                          className="size-12 rounded-xl object-cover"
                          src={item.coverUrl || fallbackCover}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black text-slate-950 dark:text-white">
                            {item.title}
                          </span>
                          <span className="mt-1 block truncate text-xs font-semibold text-slate-500 dark:text-slate-300">
                            {item.artist || "Unknown"}
                          </span>
                        </span>
                      </button>
                      <div className="flex min-w-0 flex-col items-start gap-1">
                        <span className="truncate text-sm text-slate-500 dark:text-slate-300">
                          {item.album || "-"}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black",
                              getProviderClass(item.provider),
                            )}
                          >
                            {getProviderLabel(item.provider)}
                          </span>
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black",
                              getCloudStatusClass(cloudStatus),
                            )}
                          >
                            {getCloudStatusLabel(cloudStatus)}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                        <Button
                          size="icon"
                          type="button"
                          variant="ghost"
                          title={
                            cloudStatus === "ready" ? "已在 R2" : "补存到 R2"
                          }
                          onClick={() => onDownloadItem(item)}
                        >
                          {cloudStatus === "ready" ? (
                            <Download className="size-4 text-emerald-500" />
                          ) : (
                            <RotateCcw className="size-4 text-amber-500" />
                          )}
                        </Button>
                        <Button
                          disabled={index === 0}
                          size="icon"
                          type="button"
                          variant="ghost"
                          title="上移"
                          onClick={() => moveItem(selectedPlaylist, index, -1)}
                        >
                          <ArrowUp className="size-4 text-slate-400" />
                        </Button>
                        <Button
                          disabled={index === selectedPlaylist.items.length - 1}
                          size="icon"
                          type="button"
                          variant="ghost"
                          title="下移"
                          onClick={() => moveItem(selectedPlaylist, index, 1)}
                        >
                          <ArrowDown className="size-4 text-slate-400" />
                        </Button>
                        <Button
                          size="icon"
                          type="button"
                          variant="ghost"
                          title="喜欢"
                          onClick={() => onLike(item)}
                        >
                          <span
                            className={cn(
                              "size-2 rounded-full",
                              liked ? "bg-coral-500" : "bg-slate-300",
                            )}
                          />
                        </Button>
                        <Button
                          size="icon"
                          type="button"
                          variant="ghost"
                          title="移出歌单"
                          onClick={() => onRemoveItem(item, selectedPlaylist)}
                        >
                          <X className="size-4 text-slate-400" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : null}
        </div>
      )}
    </section>
  );
}
