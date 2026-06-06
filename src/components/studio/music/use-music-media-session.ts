"use client";

import { type RefObject, useEffect, useMemo, useRef } from "react";

type MusicMediaSessionItem = {
  album?: string;
  artist?: string;
  artwork?: string;
  title: string;
};

type UseMusicMediaSessionInput = {
  audioRef: RefObject<HTMLAudioElement | null>;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  item: MusicMediaSessionItem | null;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (value: number) => void;
  onTogglePlay: () => void;
};

const supportedActions: MediaSessionAction[] = [
  "play",
  "pause",
  "previoustrack",
  "nexttrack",
  "seekbackward",
  "seekforward",
  "seekto",
];

function canUseMediaSession() {
  return typeof navigator !== "undefined" && "mediaSession" in navigator;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getArtworkType(url: string) {
  const path = url.split(/[?#]/)[0]?.toLowerCase() ?? "";

  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";

  return "image/jpeg";
}

function setActionHandler(
  action: MediaSessionAction,
  handler: MediaSessionActionHandler | null,
) {
  if (!canUseMediaSession()) return;

  try {
    navigator.mediaSession.setActionHandler(action, handler);
  } catch {
    // Some browsers expose Media Session but not every action.
  }
}

export function useMusicMediaSession({
  audioRef,
  currentTime,
  duration,
  isPlaying,
  item,
  onNext,
  onPrevious,
  onSeek,
  onTogglePlay,
}: UseMusicMediaSessionInput) {
  const actionRef = useRef({
    onNext,
    onPrevious,
    onSeek,
    onTogglePlay,
  });
  const lastPositionSecondRef = useRef(-1);
  const artwork = useMemo<MediaImage[]>(
    () =>
      item?.artwork
        ? [
            {
              sizes: "512x512",
              src: item.artwork,
              type: getArtworkType(item.artwork),
            },
          ]
        : [],
    [item],
  );

  useEffect(() => {
    actionRef.current = {
      onNext,
      onPrevious,
      onSeek,
      onTogglePlay,
    };
  }, [onNext, onPrevious, onSeek, onTogglePlay]);

  useEffect(() => {
    if (!canUseMediaSession()) return;

    if (!item || typeof MediaMetadata === "undefined") {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      album: item.album ?? "",
      artist: item.artist ?? "",
      artwork,
      title: item.title,
    });
  }, [artwork, item]);

  useEffect(() => {
    if (!canUseMediaSession()) return;

    navigator.mediaSession.playbackState = item
      ? isPlaying
        ? "playing"
        : "paused"
      : "none";
  }, [isPlaying, item]);

  useEffect(() => {
    if (!canUseMediaSession()) return;

    const syncSeek = (nextTime: number) => {
      const audio = audioRef.current;
      const safeDuration = audio?.duration || duration;

      if (!audio || !Number.isFinite(safeDuration) || safeDuration <= 0) return;

      const next = clamp(nextTime, 0, safeDuration);

      if ("fastSeek" in audio && typeof audio.fastSeek === "function") {
        audio.fastSeek(next);
      } else {
        audio.currentTime = next;
      }

      actionRef.current.onSeek((next / safeDuration) * 100);
    };

    setActionHandler("play", () => {
      if (audioRef.current?.paused) {
        actionRef.current.onTogglePlay();
      }
    });
    setActionHandler("pause", () => {
      if (audioRef.current && !audioRef.current.paused) {
        actionRef.current.onTogglePlay();
      }
    });
    setActionHandler("previoustrack", () => actionRef.current.onPrevious());
    setActionHandler("nexttrack", () => actionRef.current.onNext());
    setActionHandler("seekbackward", (details) => {
      const offset = details.seekOffset ?? 10;
      syncSeek((audioRef.current?.currentTime ?? currentTime) - offset);
    });
    setActionHandler("seekforward", (details) => {
      const offset = details.seekOffset ?? 10;
      syncSeek((audioRef.current?.currentTime ?? currentTime) + offset);
    });
    setActionHandler("seekto", (details) => {
      if (typeof details.seekTime === "number") {
        syncSeek(details.seekTime);
      }
    });

    return () => {
      for (const action of supportedActions) {
        setActionHandler(action, null);
      }
    };
  }, [audioRef, currentTime, duration]);

  useEffect(() => {
    if (
      !canUseMediaSession() ||
      !item ||
      !("setPositionState" in navigator.mediaSession) ||
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      return;
    }

    const position = clamp(currentTime, 0, duration);
    const roundedSecond = Math.floor(position);

    if (lastPositionSecondRef.current === roundedSecond) return;

    lastPositionSecondRef.current = roundedSecond;

    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: audioRef.current?.playbackRate ?? 1,
        position,
      });
    } catch {
      // Ignore invalid transient media states while a new source is loading.
    }
  }, [audioRef, currentTime, duration, item]);
}
