"use client";

import { ListPlus } from "lucide-react";
import { useState } from "react";

import type { StudioMusicPlaylist } from "@/components/studio/types";
import { Button } from "@/components/ui/button";

type MusicPlaylistPickerProps = {
  disabled?: boolean;
  playlists: StudioMusicPlaylist[];
  onAdd: (playlistId: string) => void;
};

export function MusicPlaylistPicker({
  disabled = false,
  playlists,
  onAdd,
}: MusicPlaylistPickerProps) {
  const [open, setOpen] = useState(false);
  const hasPlaylists = playlists.length > 0;

  return (
    <div className="relative">
      <Button
        disabled={disabled}
        size="icon"
        type="button"
        variant="ghost"
        title={hasPlaylists ? "加入歌单" : "先创建歌单"}
        onClick={() => setOpen((current) => !current)}
      >
        <ListPlus className="size-4" />
      </Button>
      {open ? (
        <div className="absolute right-0 top-12 z-40 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-slate-900">
          {hasPlaylists ? (
            playlists.map((playlist) => (
              <button
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-600 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                key={playlist.id}
                type="button"
                onClick={() => {
                  onAdd(playlist.id);
                  setOpen(false);
                }}
              >
                <span className="min-w-0 truncate">{playlist.name}</span>
                <span className="shrink-0 text-[10px] text-slate-400">
                  {playlist.items.length}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
              先到歌单页创建一个歌单。
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
