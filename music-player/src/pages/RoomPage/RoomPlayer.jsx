// src/pages/RoomPage/RoomPlayer.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  FaPlay, FaPause, FaStepBackward, FaStepForward, FaVolumeUp,
  FaVolumeMute, FaCrown
} from "react-icons/fa";
import { MdMusicOff } from "react-icons/md";

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const getYoutubeVideoId = (url) => {
  if (!url || typeof url !== "string") return null;
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace("www.", "");

    if (host === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") return parsed.searchParams.get("v");
      if (parsed.pathname.startsWith("/shorts/")) {
        return parsed.pathname.split("/shorts/")[1]?.split("/")[0] || null;
      }
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/embed/")[1]?.split("/")[0] || null;
      }
    }
  } catch {
    return null;
  }
  return null;
};

const RoomPlayer = ({
  currentSong,
  playerState,
  isHost,
  canPrev = false,
  canNext = true,
  onPrev,
  onPlayPause,
  onSeek,
  onNext,
  onVolumeChange,
}) => {
  const audioRef = useRef(null);
  const youtubeContainerRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const progressRef = useRef(null);
  const [localVolume, setLocalVolume] = useState(playerState?.volume ?? 80);
  const [isMuted, setIsMuted] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const [youtubeDuration, setYoutubeDuration] = useState(0);
  const lastSyncRef = useRef(null);
  const isSyncingRef = useRef(false);
  const hasCurrentSong = Boolean(
    currentSong &&
    (
      currentSong.songId ||
      currentSong._id ||
      (typeof currentSong.title === "string" && currentSong.title.trim()) ||
      currentSong.audioUrl ||
      currentSong.youtubeUrl ||
      currentSong.videoFile
    )
  );
  const youtubeUrl = currentSong?.youtubeUrl || currentSong?.videoFile || null;
  const youtubeVideoId = getYoutubeVideoId(youtubeUrl);
  const isYoutubeSong = !!youtubeVideoId;
  const shouldSpinCover = hasCurrentSong && Boolean(playerState?.isPlaying);

  useEffect(() => {
    if (!hasCurrentSong || !isYoutubeSong) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }, [isYoutubeSong, currentSong?._id, currentSong?.songId]);

  /* ── Đồng bộ bài hát khi currentSong thay đổi ── */
  useEffect(() => {
    if (!hasCurrentSong || isYoutubeSong) return;
    const audio = audioRef.current;
    if (!audio || !currentSong?.audioUrl) return;

    audio.src = currentSong.audioUrl;
    audio.load();

    if (playerState?.isPlaying) {
      audio.play().catch(console.error);
    }
  }, [currentSong?.audioUrl, isYoutubeSong]);

  /* ── Đồng bộ playerState từ server ── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !hasCurrentSong || isYoutubeSong) return;

    const { isPlaying, currentTime, volume, timestamp } = playerState || {};

    // Tránh sync lại cùng 1 timestamp
    if (timestamp && timestamp === lastSyncRef.current) return;
    lastSyncRef.current = timestamp;

    isSyncingRef.current = true;

    // Tính thời gian thực (có trừ độ trễ mạng)
    const networkDelay = timestamp ? (Date.now() - timestamp) / 1000 : 0;
    const targetTime = (currentTime || 0) + networkDelay;

    // Chỉ seek nếu lệch > 1 giây
    if (Math.abs(audio.currentTime - targetTime) > 1) {
      audio.currentTime = targetTime;
    }

    // Sync volume
    if (volume !== undefined) {
      const vol = volume / 100;
      audio.volume = isMuted ? 0 : vol;
      setLocalVolume(volume);
    }

    // Sync play/pause
    if (isPlaying && audio.paused) {
      audio.play().catch(console.error);
    } else if (!isPlaying && !audio.paused) {
      audio.pause();
    }

    setTimeout(() => {
      isSyncingRef.current = false;
    }, 300);
  }, [playerState, isYoutubeSong]);

  /* ── Cập nhật thanh progress mỗi giây ── */
  useEffect(() => {
    if (!hasCurrentSong || isYoutubeSong) return;
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setDisplayTime(audio.currentTime);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    return () => audio.removeEventListener("timeupdate", onTimeUpdate);
  }, [isYoutubeSong]);

  /* ── Volume local ── */
  useEffect(() => {
    if (!hasCurrentSong || isYoutubeSong) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : localVolume / 100;
  }, [localVolume, isMuted, isYoutubeSong]);

  // YouTube iframe API bootstrap
  useEffect(() => {
    if (!hasCurrentSong || !isYoutubeSong) return;

    if (!window.YT || !window.YT.Player) {
      const existing = document.getElementById("youtube-iframe-api");
      if (!existing) {
        const script = document.createElement("script");
        script.id = "youtube-iframe-api";
        script.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(script);
      }
    }
  }, [isYoutubeSong]);

  // Create/destroy YouTube player
  useEffect(() => {
    if (!hasCurrentSong || !isYoutubeSong || !youtubeContainerRef.current) return;

    let destroyed = false;
    let poll;

    const createPlayer = () => {
      if (destroyed || !window.YT || !window.YT.Player) return;

      if (ytPlayerRef.current?.destroy) {
        ytPlayerRef.current.destroy();
      }

      ytPlayerRef.current = new window.YT.Player(youtubeContainerRef.current, {
        videoId: youtubeVideoId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: (event) => {
            const dur = event.target.getDuration?.() || 0;
            setYoutubeDuration(dur);
            event.target.setVolume?.(isMuted ? 0 : localVolume);
            if (playerState?.isPlaying) {
              event.target.playVideo?.();
            } else {
              event.target.pauseVideo?.();
            }
          },
        },
      });

      poll = window.setInterval(() => {
        const t = ytPlayerRef.current?.getCurrentTime?.();
        if (typeof t === "number" && !Number.isNaN(t)) setDisplayTime(t);
        const d = ytPlayerRef.current?.getDuration?.();
        if (typeof d === "number" && d > 0) setYoutubeDuration(d);
      }, 300);
    };

    if (window.YT?.Player) {
      createPlayer();
    } else {
      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevReady?.();
        createPlayer();
      };
    }

    return () => {
      destroyed = true;
      if (poll) window.clearInterval(poll);
      if (ytPlayerRef.current?.destroy) ytPlayerRef.current.destroy();
      ytPlayerRef.current = null;
      setYoutubeDuration(0);
    };
  }, [isYoutubeSong, youtubeVideoId]);

  // Sync host state to youtube player
  useEffect(() => {
    if (!hasCurrentSong || !isYoutubeSong || !ytPlayerRef.current) return;

    const target = playerState?.currentTime || 0;
    const current = ytPlayerRef.current.getCurrentTime?.() || 0;
    if (Math.abs(current - target) > 1.2) {
      ytPlayerRef.current.seekTo?.(target, true);
    }

    if (playerState?.isPlaying) ytPlayerRef.current.playVideo?.();
    else ytPlayerRef.current.pauseVideo?.();
  }, [isYoutubeSong, playerState?.currentTime, playerState?.isPlaying]);

  useEffect(() => {
    if (!hasCurrentSong || !isYoutubeSong || !ytPlayerRef.current) return;
    ytPlayerRef.current.setVolume?.(isMuted ? 0 : localVolume);
  }, [isYoutubeSong, localVolume, isMuted]);

  /* ── Handlers ── */
  const handleProgressClick = useCallback(
    (e) => {
      if (!isHost) return;
      const bar = progressRef.current;
      const currentDuration = isYoutubeSong
        ? youtubeDuration
        : (currentSong?.duration || 0);
      if (!bar || !currentDuration) return;

      const rect = bar.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const time = ratio * currentDuration;

      onSeek?.(Math.max(0, time));
    },
    [isHost, currentSong, onSeek, isYoutubeSong, youtubeDuration]
  );

  const handleVolumeChange = useCallback(
    (e) => {
      const vol = parseInt(e.target.value);
      setLocalVolume(vol);
      if (isHost) onVolumeChange?.(vol);
    },
    [isHost, onVolumeChange]
  );

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  /* ── Progress ratio ── */
  const duration = isYoutubeSong ? youtubeDuration : (currentSong?.duration || 0);
  const progressRatio = duration > 0 ? (displayTime / duration) * 100 : 0;

  /* ── Render: không có bài hát ── */
  if (!hasCurrentSong) {
    return (
      <div className="rp-empty">
        <MdMusicOff size={64} />
        <p>Chưa có bài hát nào đang phát</p>
        {isHost && (
          <p className="rp-empty-hint">
            Thêm bài hát vào hàng chờ để bắt đầu
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rp-wrap">
      <audio ref={audioRef} />
      {isYoutubeSong && <div ref={youtubeContainerRef} className="rp-youtube-frame" />}

      {/* Thumbnail */}
      <div className="rp-thumb-wrap">
        <img
          src={currentSong.thumbnail || "/images/default-cover.png"}
          alt={currentSong.title}
          className={`rp-thumb ${shouldSpinCover ? "rp-thumb--spin" : ""}`}
          onError={(e) => (e.currentTarget.src = "/images/default-cover.png")}
        />
        <div className="rp-thumb-glow" />
      </div>

      {/* Info */}
      <div className="rp-info">
        <h2 className="rp-title">{currentSong.title}</h2>
        <p className="rp-artist">{currentSong.artist}</p>
      </div>

      {/* Progress bar */}
      <div className="rp-progress-wrap">
        <span className="rp-time">{formatTime(displayTime)}</span>

        <div
          ref={progressRef}
          className={`rp-progress-bar ${isHost ? "rp-progress-bar--clickable" : ""}`}
          onClick={handleProgressClick}
        >
          <div
            className="rp-progress-fill"
            style={{ width: `${progressRatio}%` }}
          />
          <div
            className="rp-progress-thumb"
            style={{ left: `${progressRatio}%` }}
          />
        </div>

        <span className="rp-time">{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="rp-controls">
        {/* Previous */}
        <button
          className={`rp-btn ${!isHost || !canPrev ? "rp-btn--disabled" : ""}`}
          onClick={isHost && canPrev ? onPrev : undefined}
          disabled={!isHost || !canPrev}
          title="Bài trước"
        >
          <FaStepBackward />
        </button>

        {/* Play / Pause */}
        <button
          className={`rp-btn rp-btn--play ${!isHost ? "rp-btn--disabled" : ""}`}
          onClick={isHost ? onPlayPause : undefined}
          title={isHost ? "" : "Chỉ host mới điều khiển được"}
        >
          {playerState?.isPlaying ? <FaPause /> : <FaPlay />}
        </button>

        {/* Next */}
        <button
          className={`rp-btn ${!isHost ? "rp-btn--disabled" : ""}`}
          onClick={isHost && canNext ? onNext : undefined}
          disabled={!isHost || !canNext}
          title="Bài tiếp theo"
        >
          <FaStepForward />
        </button>

        {/* Volume */}
        <div className="rp-volume">
          <button className="rp-btn rp-btn--sm" onClick={handleToggleMute}>
            {isMuted || localVolume === 0 ? <FaVolumeMute /> : <FaVolumeUp />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={isMuted ? 0 : localVolume}
            onChange={handleVolumeChange}
            className="rp-volume-slider"
          />
        </div>
      </div>

      {/* Host badge */}
      {!isHost && (
        <div className="rp-listener-note">
          <FaCrown style={{ color: "gold" }} />
          <span>Host đang điều khiển nhạc</span>
        </div>
      )}
    </div>
  );
};

export default RoomPlayer;

