// components/MusicPlayer.js
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  FaPlay,
  FaPause,
  FaStepForward,
  FaStepBackward,
  FaRandom,
  FaRedo,
  FaHeart,
  FaRegHeart,
  FaChevronUp,
  FaChevronDown,
  FaListUl,
  FaClock,
} from "react-icons/fa";
import { useMusicContext } from "../context/MusicContext";
import {
  setFaviconWithStatus,
  resetFavicon,
  setPageTitle,
} from "../utils/dynamicFavicon";
import useSleepTimer from "../hooks/useSleepTimer";
import SleepTimerPanel from "./SleepTimerPanel";
import "../styles/components/MusicPlayer.css";

const DEFAULT_COVER = "/images/default-cover.svg";

const shuffleArray = (arr = []) => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const formatTime = (time) => {
  if (!Number.isFinite(time) || time < 0) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const MusicPlayer = () => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    repeat,
    shuffle,
    songs,
    playSource,
    currentQueue,
    togglePlay,
    playNext,
    playPrev,
    seekTo,
    setRepeat,
    setShuffle,
    toggleFavorite,
    isFavorite,
    getCoverURL,
    playSong,
  } = useMusicContext();

  const navigate = useNavigate();
  const playerRef = useRef(null);

  const [expanded, setExpanded] = useState(false);
  const [activePanel, setActivePanel] = useState(null); 
  const [displayQueue, setDisplayQueue] = useState([]);
  const isPlayingRef = useRef(isPlaying);
  const togglePlayRef = useRef(togglePlay);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    togglePlayRef.current = togglePlay;
  }, [togglePlay]);

  const {
    timerActive,
    timerMinutes,
    timeRemaining,
    formatRemaining,
    setTimerMinutes,
    setShowTimerPanel,
    startTimer,
    stopTimer,
  } = useSleepTimer(() => {
    if (isPlayingRef.current) {
      togglePlayRef.current();
    }
  });

  const isQueueOpen = activePanel === "queue";
  const isTimerOpen = activePanel === "timer";

  const currentSongId = currentSong?._id;

  const queueLabel = useMemo(() => {
    switch (playSource) {
      case "favorites":
        return "❤️ Từ yêu thích";
      case "playlist":
        return "🎵 Từ playlist";
      case "search":
        return "🔎 Từ tìm kiếm";
      case "album":
        return "💿 Từ album";
      case "history":
        return "🕘 Đã nghe gần đây";
      default:
        return "🎲 Gợi ý ngẫu nhiên";
    }
  }, [playSource]);

  const progressPercent = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    return Math.max(0, Math.min(100, (currentTime / duration) * 100));
  }, [currentTime, duration]);

  const buildQueue = useCallback(() => {
    if (playSource === "home") {
      const shuffled = shuffleArray(songs).slice(0, Math.min(20, songs.length));
      setDisplayQueue(shuffled);
      return;
    }

    setDisplayQueue(Array.isArray(currentQueue) ? currentQueue : []);
  }, [playSource, songs, currentQueue]);

  useEffect(() => {
    if (isQueueOpen) {
      buildQueue();
    }
  }, [isQueueOpen, buildQueue]);

  useEffect(() => {
    if (!currentSong) {
      resetFavicon();
      document.title = "ChillWithF 🎵";
      return;
    }

    const coverUrl = getCoverURL(currentSong);
    setFaviconWithStatus(coverUrl, isPlaying);
    setPageTitle(currentSong.title, currentSong.artist, isPlaying);
  }, [currentSong, isPlaying, getCoverURL]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (playerRef.current && !playerRef.current.contains(e.target)) {
        setActivePanel(null);
        setShowTimerPanel(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setShowTimerPanel]);

  const goToSongDetail = useCallback(() => {
    if (currentSongId) {
      navigate(`/song/${currentSongId}`);
    }
  }, [navigate, currentSongId]);

  const handleProgressClick = useCallback(
    (e) => {
      if (!duration || duration <= 0) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const rawPercent = (e.clientX - rect.left) / rect.width;
      const percent = Math.max(0, Math.min(1, rawPercent));

      seekTo(percent * duration);
    },
    [duration, seekTo]
  );

  const handleRepeat = useCallback(() => {
    const modes = ["none", "all", "one"];
    const nextMode = modes[(modes.indexOf(repeat) + 1) % modes.length];
    setRepeat(nextMode);
  }, [repeat, setRepeat]);

  const handleToggleQueue = useCallback(() => {
    if (!isQueueOpen) {
      buildQueue();
      setActivePanel("queue");
      setShowTimerPanel(false);
      return;
    }

    setActivePanel(null);
  }, [isQueueOpen, buildQueue, setShowTimerPanel]);

  const handleToggleTimer = useCallback(() => {
    if (!isTimerOpen) {
      setActivePanel("timer");
      setShowTimerPanel(true);
      return;
    }

    setActivePanel(null);
    setShowTimerPanel(false);
  }, [isTimerOpen, setShowTimerPanel]);

  const handleExpandToggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      if (!next) {
        setActivePanel(null);
        setShowTimerPanel(false);
      }
      return next;
    });
  }, [setShowTimerPanel]);

  const handlePlayFromQueue = useCallback(
    (song) => {
      const queueToPlay = playSource === "home" ? displayQueue : currentQueue;
      playSong(song, playSource, queueToPlay);
    },
    [playSong, playSource, displayQueue, currentQueue]
  );

  const handleRefreshQueue = useCallback(() => {
    buildQueue();
  }, [buildQueue]);

  const coverSrc = currentSong ? getCoverURL(currentSong) : DEFAULT_COVER;

  if (!currentSong) {
    return (
      <div className="player-wrapper">
        <div className="player-compact empty">
          <span>🎵 Chọn bài hát để phát</span>
        </div>
      </div>
    );
  }

  return (
    <div className="player-wrapper" ref={playerRef}>
      <div className={`player-compact ${expanded ? "expanded" : ""}`}>
        <div className={`player-expanded-area ${expanded ? "is-expanded" : ""}`}>
          <div className="player-expanded-area-inner">
            <div
              className="player-cover-large clickable"
              onClick={goToSongDetail}
              title="Xem chi tiết bài hát"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  goToSongDetail();
                }
              }}
            >
              <img
                src={coverSrc}
                alt={currentSong.title}
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_COVER;
                }}
              />
              <div className="cover-detail-overlay">
                <span>Xem chi tiết</span>
              </div>
            </div>

            <div
              className="player-expanded-info clickable"
              onClick={goToSongDetail}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  goToSongDetail();
                }
              }}
            >
              <h3>{currentSong.title}</h3>
              <p>{currentSong.artist}</p>
            </div>

            <div className="player-progress-large">
              <span>{formatTime(currentTime)}</span>
              <div className="progress-bar-large" onClick={handleProgressClick}>
                <div
                  className="progress-fill-large"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="progress-thumb-large" />
                </div>
              </div>
              <span>{formatTime(duration)}</span>
            </div>

            <div className="player-controls-large">
              <button
                type="button"
                className={`ctrl-btn ${shuffle ? "active" : ""}`}
                onClick={() => setShuffle(!shuffle)}
                title="Ngẫu nhiên"
                aria-label="Bật tắt phát ngẫu nhiên"
              >
                <FaRandom />
              </button>

              <button
                type="button"
                className="ctrl-btn"
                onClick={playPrev}
                aria-label="Phát bài trước"
              >
                <FaStepBackward />
              </button>

              <button
                type="button"
                className="ctrl-btn play-btn-large"
                onClick={togglePlay}
                aria-label={isPlaying ? "Tạm dừng" : "Phát"}
              >
                {isPlaying ? <FaPause /> : <FaPlay />}
              </button>

              <button
                type="button"
                className="ctrl-btn"
                onClick={playNext}
                aria-label="Phát bài tiếp theo"
              >
                <FaStepForward />
              </button>

              <button
                type="button"
                className={`ctrl-btn ${repeat !== "none" ? "active" : ""}`}
                onClick={handleRepeat}
                title={
                  repeat === "none"
                    ? "Không lặp"
                    : repeat === "all"
                    ? "Lặp tất cả"
                    : "Lặp 1 bài"
                }
                aria-label="Đổi chế độ lặp"
              >
                <FaRedo />
                {repeat === "one" && <span className="repeat-one">1</span>}
              </button>
            </div>

            <div className="player-expanded-bottom">
              <button
                type="button"
                className={`queue-icon-btn ${isQueueOpen ? "active" : ""}`}
                onClick={handleToggleQueue}
                title={isQueueOpen ? "Đóng danh sách" : "Xem danh sách"}
                aria-label="Mở danh sách phát"
              >
                <FaListUl />
              </button>

              <button
                type="button"
                className={`timer-icon-btn ${
                  timerActive ? "timer-active" : ""
                } ${isTimerOpen ? "timer-open" : ""}`}
                onClick={handleToggleTimer}
                title={
                  timerActive
                    ? `Hẹn giờ: còn ${formatRemaining(timeRemaining)}`
                    : "Hẹn giờ tắt nhạc"
                }
                aria-label="Mở hẹn giờ tắt nhạc"
              >
                <FaClock />
                {timerActive && (
                  <span className="timer-badge">
                    {formatRemaining(timeRemaining)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="player-bar">
          <div className="player-song-info">
            <div
              className="player-cover-small clickable"
              onClick={goToSongDetail}
              title="Xem chi tiết"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  goToSongDetail();
                }
              }}
            >
              <img
                src={coverSrc}
                alt={currentSong.title}
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_COVER;
                }}
              />
              {isPlaying && (
                <div className="cover-playing-indicator">
                  <span />
                  <span />
                  <span />
                </div>
              )}
              <div className="cover-detail-overlay-small">
                <span>🔍</span>
              </div>
            </div>

            <div
              className="player-song-text clickable"
              onClick={goToSongDetail}
              title="Xem chi tiết"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  goToSongDetail();
                }
              }}
            >
              <span className="player-song-name">{currentSong.title}</span>
              <span className="player-song-artist">{currentSong.artist}</span>
            </div>

            <button
              type="button"
              className={`fav-btn-player ${
                isFavorite(currentSong._id) ? "liked" : ""
              }`}
              onClick={() => toggleFavorite(currentSong._id)}
              aria-label="Yêu thích bài hát"
              title="Yêu thích"
            >
              {isFavorite(currentSong._id) ? <FaHeart /> : <FaRegHeart />}
            </button>
          </div>

          <div className="player-center">
            <div className="player-buttons">
              <button
                type="button"
                className={`ctrl-btn-sm ${shuffle ? "active" : ""}`}
                onClick={() => setShuffle(!shuffle)}
                title="Ngẫu nhiên"
                aria-label="Bật tắt phát ngẫu nhiên"
              >
                <FaRandom />
              </button>

              <button
                type="button"
                className="ctrl-btn-sm"
                onClick={playPrev}
                aria-label="Phát bài trước"
              >
                <FaStepBackward />
              </button>

              <button
                type="button"
                className="ctrl-btn-sm play-btn"
                onClick={togglePlay}
                aria-label={isPlaying ? "Tạm dừng" : "Phát"}
              >
                {isPlaying ? <FaPause /> : <FaPlay />}
              </button>

              <button
                type="button"
                className="ctrl-btn-sm"
                onClick={playNext}
                aria-label="Phát bài tiếp theo"
              >
                <FaStepForward />
              </button>

              <button
                type="button"
                className={`ctrl-btn-sm ${repeat !== "none" ? "active" : ""}`}
                onClick={handleRepeat}
                title={
                  repeat === "none"
                    ? "Không lặp"
                    : repeat === "all"
                    ? "Lặp tất cả"
                    : "Lặp 1 bài"
                }
                aria-label="Đổi chế độ lặp"
              >
                <FaRedo />
                {repeat === "one" && <span className="repeat-one">1</span>}
              </button>
            </div>

            <div className="player-progress">
              <span className="time">{formatTime(currentTime)}</span>
              <div className="progress-bar" onClick={handleProgressClick}>
                <div
                  className="progress-fill"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="progress-thumb" />
                </div>
              </div>
              <span className="time">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="player-right">
            {timerActive && !expanded && (
              <div
                className="timer-compact-badge"
                onClick={() => {
                  setExpanded(true);
                  setActivePanel("timer");
                  setShowTimerPanel(true);
                }}
                title="Hẹn giờ đang chạy"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setExpanded(true);
                    setActivePanel("timer");
                    setShowTimerPanel(true);
                  }
                }}
              >
                <FaClock />
                <span>{formatRemaining(timeRemaining)}</span>
              </div>
            )}

            <button
              type="button"
              className={`expand-btn ${expanded ? "is-expanded" : ""}`}
              onClick={handleExpandToggle}
              aria-label={expanded ? "Thu gọn player" : "Mở rộng player"}
              title={expanded ? "Thu gọn" : "Mở rộng"}
            >
              {expanded ? <FaChevronDown /> : <FaChevronUp />}
            </button>
          </div>
        </div>
      </div>

      {isQueueOpen && (
        <div className="queue-panel">
          <div className="queue-header">
            <h4>{queueLabel}</h4>
            {playSource === "home" && (
              <button
                type="button"
                className="queue-refresh-btn"
                onClick={handleRefreshQueue}
                title="Làm mới"
                aria-label="Làm mới danh sách"
              >
                <FaRandom />
              </button>
            )}
          </div>

          <div className="queue-list">
            {displayQueue.length === 0 ? (
              <div className="queue-empty-state">
                <p>Không có bài hát nào</p>
              </div>
            ) : (
              displayQueue.map((song, index) => {
                const active = currentSong._id === song._id;
                const liked = isFavorite(song._id);

                return (
                  <div
                    key={song._id}
                    className={`queue-item ${active ? "active" : ""}`}
                    onClick={() => handlePlayFromQueue(song)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handlePlayFromQueue(song);
                      }
                    }}
                  >
                    <div className="queue-index">
                      {active && isPlaying ? (
                        <div className="queue-playing-bars">
                          <span />
                          <span />
                          <span />
                        </div>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>

                    <img
                      src={getCoverURL(song)}
                      alt={song.title}
                      className="queue-cover"
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_COVER;
                      }}
                    />

                    <div className="queue-info">
                      <span className="queue-title">{song.title}</span>
                      <span className="queue-artist">{song.artist}</span>
                    </div>

                    <button
                      type="button"
                      className={`queue-fav-btn ${liked ? "liked" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(song._id);
                      }}
                      aria-label="Yêu thích bài hát"
                      title="Yêu thích"
                    >
                      {liked ? <FaHeart /> : <FaRegHeart />}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {isTimerOpen && (
        <div className="timer-panel">
          <SleepTimerPanel
            timerActive={timerActive}
            timerMinutes={timerMinutes}
            timeRemaining={timeRemaining}
            formatRemaining={formatRemaining}
            onSetMinutes={setTimerMinutes}
            onStart={startTimer}
            onStop={stopTimer}
            onClose={() => {
              setActivePanel(null);
              setShowTimerPanel(false);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default MusicPlayer;
