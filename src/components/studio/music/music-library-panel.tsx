"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckSquare, Download, Filter, Heart, Plus } from "lucide-react";
import type { ReactNode } from "react";

import type {
  StudioMusicPlaylist,
  StudioMusicSearchCandidate,
  StudioMusicTrack,
} from "@/components/studio/types";
import { Button } from "@/components/ui/button";
import { MusicTrackTable } from "./music-track-table";

type MusicLibraryPanelProps = {
  currentLiked: boolean;
  currentTrack: StudioMusicTrack | null;
  downloadMessage: string;
  downloadProgress: ReactNode;
  isLoading: boolean;
  isPlaying: boolean;
  likedKeys: Set<string>;
  playError: string;
  playlists: StudioMusicPlaylist[];
  resolvingTrackId: string | null;
  searchCandidates: StudioMusicSearchCandidate[];
  searchKeyword: string;
  searchLoading: boolean;
  tracks: StudioMusicTrack[];
  onAddCandidateToPlaylist: (
    candidate: StudioMusicSearchCandidate,
    playlistId: string,
  ) => void;
  onAddTrackToPlaylist: (track: StudioMusicTrack, playlistId: string) => void;
  onCreateTrack: () => void;
  onDelete: (track: StudioMusicTrack) => void;
  onDownloadCandidate: (candidate: StudioMusicSearchCandidate) => void;
  onDownloadCurrent: () => void;
  onDownloadTrack: (track: StudioMusicTrack) => void;
  onEdit: (track: StudioMusicTrack) => void;
  onLikeCandidate: (candidate: StudioMusicSearchCandidate) => void;
  onLikeCurrent: () => void;
  onLikeTrack: (track: StudioMusicTrack) => void;
  onPlay: (track: StudioMusicTrack, index: number) => void;
  onPlayCandidate: (candidate: StudioMusicSearchCandidate) => void;
  onTogglePlay: () => void;
};

export function MusicLibraryPanel({
  currentLiked,
  currentTrack,
  downloadMessage,
  downloadProgress,
  isLoading,
  isPlaying,
  likedKeys,
  playError,
  playlists,
  resolvingTrackId,
  searchCandidates,
  searchKeyword,
  searchLoading,
  tracks,
  onAddCandidateToPlaylist,
  onAddTrackToPlaylist,
  onCreateTrack,
  onDelete,
  onDownloadCandidate,
  onDownloadCurrent,
  onDownloadTrack,
  onEdit,
  onLikeCandidate,
  onLikeCurrent,
  onLikeTrack,
  onPlay,
  onPlayCandidate,
  onTogglePlay,
}: MusicLibraryPanelProps) {
  const albumCount = new Set(tracks.map((track) => track.album).filter(Boolean))
    .size;

  return (
    <>
      <div className="mb-8">
        <p className="mb-2 text-xs font-bold text-slate-400">后退</p>
        <h1 className="text-5xl font-black tracking-[0]">喜欢</h1>
        <div className="mt-8 flex flex-wrap items-center gap-8 text-sm font-semibold">
          <span className="text-emerald-500">歌曲{tracks.length}</span>
          <span>歌单0</span>
          <span>专辑{albumCount}</span>
          <span>有声节目0</span>
          <span>视频0</span>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Button type="button" onClick={onTogglePlay}>
          <span className="grid size-5 place-items-center rounded-full bg-white/18">
            ▶
          </span>
          播放
        </Button>
        <Button type="button" variant="glass" onClick={onDownloadCurrent}>
          <Download className="size-4" />
          下载
        </Button>
        <Button type="button" variant="glass">
          <CheckSquare className="size-4" />
          批量
        </Button>
        <Button type="button" variant="soft" onClick={onCreateTrack}>
          <Plus className="size-4" />
          添加音乐
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="icon"
            type="button"
            variant="ghost"
            title="喜欢"
            onClick={onLikeCurrent}
          >
            <Heart
              className={
                currentLiked ? "size-5 fill-coral-500 text-coral-500" : "size-5"
              }
            />
          </Button>
          <Button size="icon" type="button" variant="ghost" title="筛选">
            <Filter className="size-5" />
          </Button>
        </div>
      </div>

      <MusicTrackTable
        currentTrack={currentTrack}
        isLoading={isLoading}
        isPlaying={isPlaying}
        likedKeys={likedKeys}
        playlists={playlists}
        resolvingTrackId={resolvingTrackId}
        searchCandidates={searchCandidates}
        searchKeyword={searchKeyword}
        searchLoading={searchLoading}
        tracks={tracks}
        onAddCandidateToPlaylist={onAddCandidateToPlaylist}
        onAddTrackToPlaylist={onAddTrackToPlaylist}
        onDelete={onDelete}
        onDownloadCandidate={onDownloadCandidate}
        onDownloadTrack={onDownloadTrack}
        onEdit={onEdit}
        onLikeCandidate={onLikeCandidate}
        onLikeTrack={onLikeTrack}
        onPlay={onPlay}
        onPlayCandidate={onPlayCandidate}
      />

      <AnimatePresence>
        {playError ? (
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl bg-coral-100 px-4 py-3 text-sm font-bold text-coral-950 dark:bg-coral-400/15 dark:text-coral-100"
            exit={{ opacity: 0, y: -8 }}
            initial={{ opacity: 0, y: 8 }}
          >
            {playError}
          </motion.p>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {downloadMessage ? (
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-bold text-emerald-950 dark:bg-emerald-400/15 dark:text-emerald-100"
            exit={{ opacity: 0, y: -8 }}
            initial={{ opacity: 0, y: 8 }}
          >
            {downloadMessage}
          </motion.p>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>{downloadProgress}</AnimatePresence>
    </>
  );
}
