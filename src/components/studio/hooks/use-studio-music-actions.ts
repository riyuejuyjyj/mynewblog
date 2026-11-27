"use client";

import type {
  StudioMusicDownload,
  StudioMusicFavorite,
  StudioMusicLibraryItem,
  StudioMusicPlayHistory,
  StudioMusicPlaylist,
  StudioMusicPlaylistImportResult,
  StudioMusicSearchSource,
  StudioMusicSource,
  StudioMusicSourceVersionStatus,
  StudioMusicTrack,
  StudioPrepareMusicDownloadInput,
  StudioPrepareMusicDownloadResult,
  StudioQingMusicManifestStatus,
  StudioResolveMusicInput,
  StudioResolvePluginMusicInput,
  StudioView,
} from "@/components/studio/types";
import { trpc } from "@/trpc/client";

type UseStudioMusicActionsOptions = {
  activeView: StudioView;
  enabled: boolean;
  onOperation: (entry: string) => void;
};

export function useStudioMusicActions({
  activeView,
  enabled,
  onOperation,
}: UseStudioMusicActionsOptions) {
  const utils = trpc.useUtils();

  const musicTracks = trpc.music.playlist.useQuery(
    { includeDisabled: true, limit: 80 },
    { enabled },
  );
  const musicSources = trpc.music.sources.useQuery(undefined, { enabled });
  const musicSearchSources = trpc.music.searchSources.useQuery(undefined, {
    enabled,
  });
  const musicFavorites = trpc.music.favorites.useQuery(undefined, { enabled });
  const musicPlayHistory = trpc.music.playHistory.useQuery(
    { limit: 50 },
    { enabled },
  );
  const musicDownloads = trpc.music.downloads.useQuery(
    { limit: 50 },
    { enabled },
  );
  const musicPlaylists = trpc.music.playlists.useQuery(undefined, { enabled });
  const changqingVersion = trpc.music.checkChangqingSourceVersion.useQuery(
    undefined,
    {
      enabled: enabled && activeView === "music",
      retry: false,
      staleTime: 1000 * 60 * 30,
    },
  );
  const qingMusicManifest = trpc.music.qingMusicManifest.useQuery(undefined, {
    enabled: enabled && activeView === "music",
    retry: false,
    staleTime: 1000 * 60 * 30,
  });

  const upsertTrack = trpc.music.upsertTrack.useMutation({
    onSuccess: async () => {
      await utils.music.playlist.invalidate();
    },
  });
  const deleteTrack = trpc.music.deleteTrack.useMutation({
    onSuccess: async () => {
      await utils.music.playlist.invalidate();
    },
  });
  const resolveTrack = trpc.music.resolveTrack.useMutation();
  const resolvePluginTrack = trpc.music.resolvePluginTrack.useMutation();
  const toggleMusicFavorite = trpc.music.toggleFavorite.useMutation({
    onSuccess: async () => {
      await utils.music.favorites.invalidate();
    },
  });
  const createMusicPlaylist = trpc.music.createPlaylist.useMutation({
    onSuccess: async () => {
      await utils.music.playlists.invalidate();
    },
  });
  const importExternalMusicPlaylist =
    trpc.music.importExternalPlaylist.useMutation({
      onSuccess: async () => {
        await utils.music.playlists.invalidate();
      },
    });
  const updateMusicPlaylist = trpc.music.updatePlaylist.useMutation({
    onSuccess: async () => {
      await utils.music.playlists.invalidate();
    },
  });
  const deleteMusicPlaylist = trpc.music.deletePlaylist.useMutation({
    onSuccess: async () => {
      await utils.music.playlists.invalidate();
    },
  });
  const addMusicPlaylistItem = trpc.music.addPlaylistItem.useMutation({
    onSuccess: async () => {
      await utils.music.playlists.invalidate();
    },
  });
  const removeMusicPlaylistItem = trpc.music.removePlaylistItem.useMutation({
    onSuccess: async () => {
      await utils.music.playlists.invalidate();
    },
  });
  const reorderMusicPlaylistItems =
    trpc.music.reorderPlaylistItems.useMutation({
      onSuccess: async () => {
        await utils.music.playlists.invalidate();
      },
    });
  const recordMusicPlay = trpc.music.recordPlay.useMutation({
    onSuccess: async () => {
      await utils.music.playHistory.invalidate();
    },
  });
  const prepareMusicDownload = trpc.music.prepareDownload.useMutation({
    onError: (error, input) => {
      console.warn("[music.prepareDownload] failed", {
        data: error.data,
        input,
        message: error.message,
      });
    },
    onSuccess: async () => {
      await utils.music.downloads.invalidate();
    },
  });
  const deleteMusicDownload = trpc.music.deleteDownload.useMutation({
    onSuccess: async () => {
      await utils.music.downloads.invalidate();
    },
  });
  const importChangqingSource = trpc.music.importChangqingSource.useMutation({
    onSuccess: async () => {
      await utils.music.sources.invalidate();
    },
  });
  const updateChangqingSource = trpc.music.updateChangqingSource.useMutation({
    onSuccess: async () => {
      await utils.music.sources.invalidate();
      await utils.music.checkChangqingSourceVersion.invalidate();
    },
  });
  const importDefaultSearchSources =
    trpc.music.importDefaultSearchSources.useMutation({
      onSuccess: async () => {
        await utils.music.searchSources.invalidate();
        await utils.music.pluginSearch.invalidate();
      },
    });
  const updateSearchSource = trpc.music.updateSearchSource.useMutation({
    onSuccess: async () => {
      await utils.music.searchSources.invalidate();
      await utils.music.pluginSearch.invalidate();
    },
  });
  const testSearchSource = trpc.music.testSearchSource.useMutation({
    onSuccess: async () => {
      await utils.music.searchSources.invalidate();
    },
  });

  async function saveTrack(input: {
    id?: string;
    title: string;
    artist: string;
    album: string;
    coverUrl: string;
    audioUrl: string;
    lyric: string;
    provider: StudioMusicTrack["provider"];
    sourceSongId: string;
    quality: StudioMusicTrack["quality"];
    sortOrder: number;
    enabled: boolean;
  }) {
    await upsertTrack.mutateAsync(input);
    onOperation(`保存音乐：${input.title}`);
  }

  function removeTrack(track: StudioMusicTrack) {
    deleteTrack.mutate({ id: track.id });
    onOperation(`删除音乐：${track.title}`);
  }

  async function resolveMusic(input: StudioResolveMusicInput) {
    const result = await resolveTrack.mutateAsync(input);
    onOperation(`解析音源：${input.provider}/${input.quality}`);
    return result;
  }

  async function resolvePluginMusic(input: StudioResolvePluginMusicInput) {
    const result = await resolvePluginTrack.mutateAsync(input);
    const provider: StudioMusicTrack["provider"] =
      input.provider === "bilibili" ? "manual" : input.provider;

    onOperation(`在线播放：${input.provider}/${input.quality}`);

    return {
      audioUrl: result.audioUrl,
      lyric: result.lyric ?? "",
      lyricSource: result.lyricSource,
      provider,
      quality: input.quality,
      sourceFileName: input.provider,
      warnings: result.warnings,
    };
  }

  async function importChangqingMusicSource() {
    const source = await importChangqingSource.mutateAsync();
    onOperation(`导入音源：${source.name}`);
  }

  async function checkChangqingMusicVersion() {
    const result = await changqingVersion.refetch();

    if (!result.data) {
      throw new Error("没有拿到长青源远端版本信息。");
    }

    const status = result.data as StudioMusicSourceVersionStatus;
    onOperation(
      status.error
        ? `长青源远端检查失败：${status.error}`
        : status.updateAvailable
          ? `长青源发现新版：${status.remoteVersion}`
          : `长青源版本已对齐：${status.remoteVersion || status.localVersion}`,
    );

    return status;
  }

  async function updateChangqingMusicSource(sourceCode: string) {
    const source = await updateChangqingSource.mutateAsync({ sourceCode });
    onOperation(`更新长青源：${source.version}`);
  }

  async function importDefaultMusicSearchSources() {
    const sources = await importDefaultSearchSources.mutateAsync();
    onOperation(`同步搜索源：${sources.length} 个`);
  }

  async function updateMusicSearchSource(
    source: StudioMusicSearchSource,
    patch: Partial<
      Pick<
        StudioMusicSearchSource,
        "enabled" | "name" | "sortOrder" | "url" | "version"
      >
    >,
  ) {
    await updateSearchSource.mutateAsync({
      id: source.id,
      ...patch,
    });
    onOperation(`更新搜索源：${source.name}`);
  }

  async function testMusicSearchSource(
    source: StudioMusicSearchSource,
    keyword: string,
  ) {
    const result = await testSearchSource.mutateAsync({
      id: source.id,
      keyword,
    });
    onOperation(`测试搜索源：${source.name} ${result.total} 条`);
    return result;
  }

  async function toggleFavorite(input: StudioMusicLibraryItem) {
    const result = await toggleMusicFavorite.mutateAsync(input);
    onOperation(`${result.liked ? "收藏音乐" : "取消收藏"}：${input.title}`);
  }

  function recordPlay(input: StudioMusicLibraryItem) {
    recordMusicPlay.mutate(input, {
      onSuccess: () => {
        onOperation(`播放记录：${input.title}`);
      },
    });
  }

  async function prepareDownload(
    input: StudioPrepareMusicDownloadInput,
  ): Promise<StudioPrepareMusicDownloadResult> {
    try {
      const result = await prepareMusicDownload.mutateAsync(input);
      onOperation(`下载音乐：${input.title}`);
      return result as StudioPrepareMusicDownloadResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onOperation(`下载失败：${input.title} · ${message}`);
      throw error;
    }
  }

  async function deleteMusicDownloadRecord(download: StudioMusicDownload) {
    await deleteMusicDownload.mutateAsync({ id: download.id });
    onOperation(`删除下载：${download.title}`);
  }

  async function createPlaylist(name: string) {
    await createMusicPlaylist.mutateAsync({ name });
    onOperation(`创建歌单：${name}`);
  }

  async function importExternalPlaylist(
    url: string,
  ): Promise<StudioMusicPlaylistImportResult> {
    const result = await importExternalMusicPlaylist.mutateAsync({ url });
    onOperation(
      `导入 QQ 歌单 ${result.sourcePlaylistId}: ${result.importedCount}/${result.totalCount}`,
    );
    return result as StudioMusicPlaylistImportResult;
  }

  async function deletePlaylist(playlist: StudioMusicPlaylist) {
    await deleteMusicPlaylist.mutateAsync({ id: playlist.id });
    onOperation(`删除歌单：${playlist.name}`);
  }

  async function updatePlaylist(
    playlist: StudioMusicPlaylist,
    patch: Partial<
      Pick<
        StudioMusicPlaylist,
        "coverUrl" | "description" | "name" | "sortOrder"
      >
    >,
  ) {
    await updateMusicPlaylist.mutateAsync({ id: playlist.id, ...patch });
    onOperation(`更新歌单：${patch.name ?? playlist.name}`);
  }

  async function addPlaylistItem(
    playlistId: string,
    item: StudioMusicLibraryItem,
  ) {
    await addMusicPlaylistItem.mutateAsync({ item, playlistId });
    onOperation(`加入歌单：${item.title}`);
  }

  async function removePlaylistItem(input: {
    id: string;
    playlistId: string;
    title: string;
  }) {
    await removeMusicPlaylistItem.mutateAsync({
      id: input.id,
      playlistId: input.playlistId,
    });
    onOperation(`移出歌单：${input.title}`);
  }

  async function reorderPlaylistItems(playlistId: string, itemIds: string[]) {
    await reorderMusicPlaylistItems.mutateAsync({ itemIds, playlistId });
    onOperation("重排歌单歌曲");
  }

  return {
    deletingDownloadId:
      deleteMusicDownload.variables &&
      "id" in deleteMusicDownload.variables &&
      deleteMusicDownload.isPending
        ? deleteMusicDownload.variables.id
        : null,
    downloads: (musicDownloads.data ?? []) as StudioMusicDownload[],
    favorites: (musicFavorites.data ?? []) as StudioMusicFavorite[],
    isLoading: musicTracks.isLoading,
    isPlaylistImporting: importExternalMusicPlaylist.isPending,
    isResolving: resolveTrack.isPending || resolvePluginTrack.isPending,
    isSaving: upsertTrack.isPending,
    isSearchSourceUpdating:
      importDefaultSearchSources.isPending ||
      updateSearchSource.isPending ||
      testSearchSource.isPending,
    isSourceImporting: importChangqingSource.isPending,
    isSourceUpdating:
      updateChangqingSource.isPending || changqingVersion.isFetching,
    onAddPlaylistItem: addPlaylistItem,
    onCheckChangqingVersion: checkChangqingMusicVersion,
    onCreatePlaylist: createPlaylist,
    onDelete: removeTrack,
    onDeleteDownload: deleteMusicDownloadRecord,
    onDeletePlaylist: deletePlaylist,
    onImportChangqingSource: importChangqingMusicSource,
    onImportDefaultSearchSources: importDefaultMusicSearchSources,
    onImportExternalPlaylist: importExternalPlaylist,
    onPluginResolveMusic: resolvePluginMusic,
    onPrepareDownload: prepareDownload,
    onRecordPlay: recordPlay,
    onRemovePlaylistItem: removePlaylistItem,
    onReorderPlaylistItems: reorderPlaylistItems,
    onResolveMusic: resolveMusic,
    onSave: saveTrack,
    onTestSearchSource: testMusicSearchSource,
    onToggleFavorite: toggleFavorite,
    onUpdateChangqingSource: updateChangqingMusicSource,
    onUpdatePlaylist: updatePlaylist,
    onUpdateSearchSource: updateMusicSearchSource,
    playHistory: (musicPlayHistory.data ?? []) as StudioMusicPlayHistory[],
    playlists: (musicPlaylists.data ?? []) as StudioMusicPlaylist[],
    qingMusicStatus: qingMusicManifest.data as
      | StudioQingMusicManifestStatus
      | undefined,
    searchSources: (musicSearchSources.data ?? []) as StudioMusicSearchSource[],
    sources: (musicSources.data ?? []) as StudioMusicSource[],
    sourceVersionStatus: changqingVersion.data as
      | StudioMusicSourceVersionStatus
      | undefined,
    tracks: (musicTracks.data ?? []) as StudioMusicTrack[],
  };
}
