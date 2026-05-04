// pages/SongDetail.jsx
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaPlay,
  FaPause,
  FaHeart,
  FaRegHeart,
  FaArrowLeft,
  FaEdit,
  FaHeadphones,
  FaMusic,
  FaCompactDisc,
  FaCalendarAlt,
  FaTimes,
  FaSave,
  FaSpinner,
  FaChevronLeft,
  FaVideo,
  FaAlignLeft,
  FaPlus,
  FaMicrophone,
} from "react-icons/fa";
import songAPI from "../api/songAPI";
import { useMusicContext } from "../context/MusicContext";
import { useAuth } from "../context/AuthContext";
import AddToPlaylistModal from "../components/playlist/AddToPlaylistModal";
import { parseLRC, getCurrentLineIndex } from "../utils/lrcParser";
import "../styles/pages/SongDetail.css";
import getAvatarURL, { DEFAULT_AVATAR_URL } from "../utils/getAvatarURL";

const DEFAULT_AVATAR = DEFAULT_AVATAR_URL;
const DEFAULT_COVER = "/images/default-cover.jpg";

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const getSafeCoverURL = (song, getCoverURL) => {
  if (!song) return DEFAULT_COVER;
  return getCoverURL(song) || DEFAULT_COVER;
};

/* ══════════════════════════════════════════
   SUB: KaraokeLyrics
══════════════════════════════════════════ */
const KaraokeLyrics = React.memo(({ lrcText, currentTime }) => {
  const [lines, setLines] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const activeLineRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const parsedLines = lrcText ? parseLRC(lrcText) : [];
    setLines(parsedLines);
    setActiveIndex(-1);
  }, [lrcText]);

  useEffect(() => {
    setActiveIndex(getCurrentLineIndex(lines, currentTime));
  }, [lines, currentTime]);

  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex]);

  if (!lines.length) return null;

  return (
    <div className="karaoke-container" ref={containerRef}>
      <div className="karaoke-badge">
        <FaMicrophone /> Karaoke
      </div>

      <div className="karaoke-lines">
        {lines.map((line, index) => {
          const isActive = index === activeIndex;
          const isPast = index < activeIndex;

          return (
            <div
              key={`${line.time}-${index}`}
              ref={isActive ? activeLineRef : null}
              className={[
                "karaoke-line",
                isActive ? "karaoke-active" : "",
                isPast ? "karaoke-past" : "",
                !isActive && !isPast ? "karaoke-future" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {isActive && <div className="karaoke-line-indicator" />}
              <span className="karaoke-line-text">{line.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

KaraokeLyrics.displayName = "KaraokeLyrics";

/* ══════════════════════════════════════════
   SUB: LyricsDisplay
══════════════════════════════════════════ */
const LyricsDisplay = React.memo(
  ({
    song,
    currentTime,
    isCurrentSong,
    isPlaying,
    isAuthenticated,
    onEditClick,
  }) => {
    const [viewMode, setViewMode] = useState("auto");

    useEffect(() => {
      setViewMode("auto");
    }, [song?._id]);

    const hasLRC = !!song?.lrc;
    const hasLyrics = !!song?.lyrics;
    const hasAnyContent = hasLRC || hasLyrics;

    const showKaraoke = hasLRC && isCurrentSong && viewMode !== "plain";
    const showLRCHint = hasLRC && !isCurrentSong && viewMode !== "plain";
    const showPlain =
      hasLyrics && (viewMode === "plain" || (!showKaraoke && !showLRCHint));

    return (
      <div className="song-lyrics-section">
        <div className="lyrics-header">
          <h2>🎤 Lời bài hát</h2>

          <div className="lyrics-header-actions">
            {hasLRC && hasLyrics && (
              <div className="lyrics-view-toggle">
                <button
                  type="button"
                  className={`view-toggle-btn ${
                    viewMode !== "plain" ? "active" : ""
                  }`}
                  onClick={() => setViewMode("auto")}
                >
                  <FaMicrophone /> Karaoke
                </button>

                <button
                  type="button"
                  className={`view-toggle-btn ${
                    viewMode === "plain" ? "active" : ""
                  }`}
                  onClick={() => setViewMode("plain")}
                >
                  <FaAlignLeft /> Thường
                </button>
              </div>
            )}

            {hasLRC && (
              <span className="lrc-indicator-badge">
                <FaMicrophone /> LRC
              </span>
            )}

            {isAuthenticated && (
              <button
                type="button"
                className="edit-lyrics-btn"
                onClick={onEditClick}
              >
                <FaEdit /> {hasAnyContent ? "Sửa lời" : "Thêm lời"}
              </button>
            )}
          </div>
        </div>

        <div className="lyrics-content">
          {showKaraoke && (
            <KaraokeLyrics lrcText={song.lrc} currentTime={currentTime} />
          )}

          {showLRCHint && (
            <div className="lrc-hint">
              <FaMicrophone className="lrc-hint-icon" />
              <p>Bài hát này có lời đồng bộ (Karaoke)</p>
              <span>Nhấn phát nhạc để xem hiệu ứng karaoke</span>
            </div>
          )}

          {showPlain && <pre className="lyrics-text">{song.lyrics}</pre>}

          {!hasAnyContent && (
            <div className="no-lyrics">
              <FaMusic className="no-lyrics-icon" />
              <p>Chưa có lời bài hát</p>

              {isAuthenticated ? (
                <button
                  type="button"
                  className="add-lyrics-btn"
                  onClick={onEditClick}
                >
                  <FaEdit /> Thêm lời bài hát
                </button>
              ) : (
                <p className="login-hint">Đăng nhập để thêm lời bài hát</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

LyricsDisplay.displayName = "LyricsDisplay";

/* ══════════════════════════════════════════
   SUB: VideoPlayer
══════════════════════════════════════════ */
const VideoPlayer = React.memo(
  ({ videoURL, videoRef, song, getCoverURL, isPlaying, onPlayToggle }) => {
    if (!videoURL) {
      return (
        <div className="no-video">
          <FaVideo className="no-video-icon" />
          <p>Bài hát này chưa có video</p>
          <span>Hãy upload video trong phần chỉnh sửa bài hát</span>
        </div>
      );
    }

    return (
      <div className="video-player-wrapper">
        <video
          ref={videoRef}
          className="song-video-player"
          src={videoURL}
          poster={getSafeCoverURL(song, getCoverURL)}
          preload="metadata"
          muted
          playsInline
        />

        <div className="video-overlay" onClick={onPlayToggle}>
          <div className={`video-play-icon ${isPlaying ? "hide" : ""}`}>
            <FaPlay />
          </div>
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";

/* ══════════════════════════════════════════
   SUB: TabSwitcher
══════════════════════════════════════════ */
const TabSwitcher = React.memo(
  ({
    collapsed,
    activeTab,
    miniActiveTabs,
    onTabToggle,
    onMiniTabToggle,
    videoURL,
    hasLRC,
    isThisSongPlaying,
  }) => {
    const isActive = useCallback(
      (tab) => (collapsed ? miniActiveTabs.has(tab) : activeTab === tab),
      [collapsed, miniActiveTabs, activeTab]
    );

    const handleToggle = useCallback(
      (tab) => {
        if (collapsed) onMiniTabToggle(tab);
        else onTabToggle(tab);
      },
      [collapsed, onMiniTabToggle, onTabToggle]
    );

    return (
      <div className="tab-icon-switcher">
        <button
          type="button"
          className={`tab-icon-btn ${isActive("lyrics") ? "active" : ""}`}
          onClick={() => handleToggle("lyrics")}
          title="Lời bài hát"
        >
          <FaAlignLeft />
          {hasLRC && <span className="lrc-dot" title="Có LRC" />}
        </button>

        <button
          type="button"
          className={`tab-icon-btn ${isActive("video") ? "active" : ""} ${
            !videoURL ? "disabled" : ""
          }`}
          onClick={() => handleToggle("video")}
          title={!videoURL ? "Chưa có video" : "Video"}
          disabled={!videoURL}
        >
          <FaVideo />

          {isThisSongPlaying && isActive("video") && videoURL && (
            <span className="playing-dot-icon" />
          )}

          {!videoURL && <span className="no-video-dot" />}
        </button>
      </div>
    );
  }
);

TabSwitcher.displayName = "TabSwitcher";

/* ══════════════════════════════════════════
   MAIN: SongDetail
══════════════════════════════════════════ */
const SongDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const {
    currentSong,
    isPlaying,
    playSong,
    togglePlay,
    toggleFavorite,
    isFavorite,
    getCoverURL,
    fetchSongs,
    currentTime,
  } = useMusicContext();

  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  const [miniActiveTabs, setMiniActiveTabs] = useState(new Set());

  const [showLyricsModal, setShowLyricsModal] = useState(false);
  const [newLyrics, setNewLyrics] = useState("");
  const [lyricsError, setLyricsError] = useState("");
  const [savingLyrics, setSavingLyrics] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);

  const videoRef = useRef(null);
  const miniVideoRef = useRef(null);

  const isCurrentSong = useMemo(() => {
    return !!(currentSong && currentSong._id === song?._id);
  }, [currentSong, song]);

  const isThisSongPlaying = useMemo(() => {
    return isCurrentSong && isPlaying;
  }, [isCurrentSong, isPlaying]);

  const videoURL = useMemo(() => {
    return song ? songAPI.getVideoURL(song) : null;
  }, [song]);

  const coverURL = useMemo(() => {
    return getSafeCoverURL(song, getCoverURL);
  }, [song, getCoverURL]);

  /* ── fetch song ── */
  useEffect(() => {
    let cancelled = false;

    const fetchSongDetail = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await songAPI.getById(id);
        const songData = res.data;

        if (cancelled) return;

        setSong(songData);
        setNewLyrics(songData.lyrics || "");
        setActiveTab(null);
        setMiniActiveTabs(new Set());
      } catch {
        if (!cancelled) {
          setError("Không tìm thấy bài hát");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchSongDetail();
    window.scrollTo({ top: 0, behavior: "smooth" });

    return () => {
      cancelled = true;
    };
  }, [id]);

  /* ── sync video play/pause ── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isCurrentSong || !videoURL) return;

    let cancelled = false;

    if (isPlaying) {
      video.play().catch((err) => {
        if (!cancelled && err.name !== "AbortError") {
          console.warn("Video play failed:", err.message);
        }
      });
    } else {
      video.pause();
    }

    return () => {
      cancelled = true;
    };
  }, [isCurrentSong, isPlaying, videoURL]);

  useEffect(() => {
    const video = miniVideoRef.current;
    if (!video || !isCurrentSong || !videoURL) return;

    let cancelled = false;

    if (isPlaying) {
      video.play().catch((err) => {
        if (!cancelled && err.name !== "AbortError") {
          console.warn("Mini video play failed:", err.message);
        }
      });
    } else {
      video.pause();
    }

    return () => {
      cancelled = true;
    };
  }, [isCurrentSong, isPlaying, videoURL]);

  /* ── sync currentTime -> video ── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isCurrentSong) return;

    if (Math.abs(video.currentTime - currentTime) > 2) {
      video.currentTime = currentTime;
    }
  }, [isCurrentSong, currentTime]);

  useEffect(() => {
    const video = miniVideoRef.current;
    if (!video || !isCurrentSong) return;

    if (Math.abs(video.currentTime - currentTime) > 2) {
      video.currentTime = currentTime;
    }
  }, [isCurrentSong, currentTime]);

  /* ── handlers ── */
  const handlePlay = useCallback(() => {
    if (!song) return;

    if (isCurrentSong) togglePlay();
    else playSong(song);
  }, [song, isCurrentSong, togglePlay, playSong]);

  const handleTabToggle = useCallback(
    (tab) => {
      if (tab === "video" && !videoURL) return;
      setActiveTab((prev) => (prev === tab ? null : tab));
    },
    [videoURL]
  );

  const handleMiniTabToggle = useCallback(
    (tab) => {
      if (tab === "video" && !videoURL) return;

      setMiniActiveTabs((prev) => {
        const next = new Set(prev);
        if (next.has(tab)) next.delete(tab);
        else next.add(tab);
        return next;
      });
    },
    [videoURL]
  );

  const openLyricsModal = useCallback(() => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/song/${id}` } });
      return;
    }

    setNewLyrics(song?.lyrics || "");
    setLyricsError("");
    setShowLyricsModal(true);
  }, [isAuthenticated, navigate, id, song]);

  const closeLyricsModal = useCallback(() => {
    setShowLyricsModal(false);
    setLyricsError("");
  }, []);

  const handleSaveLyrics = useCallback(async () => {
    if (!song) return;

    const trimmedLyrics = newLyrics.trim();

    if (trimmedLyrics.length > 10000) {
      setLyricsError("Lời bài hát không được vượt quá 10,000 ký tự!");
      return;
    }

    setSavingLyrics(true);
    setLyricsError("");

    try {
      const formData = new FormData();
      formData.append("lyrics", trimmedLyrics);

      await songAPI.update(song._id, formData);

      setSong((prev) => ({
        ...prev,
        lyrics: trimmedLyrics,
      }));

      setShowLyricsModal(false);
      fetchSongs();
    } catch (err) {
      setLyricsError(
        err.response?.data?.message || "Lỗi khi lưu lời bài hát!"
      );
    } finally {
      setSavingLyrics(false);
    }
  }, [song, newLyrics, fetchSongs]);

  /* ── loading / error ── */
  if (loading) {
    return (
      <div className="song-detail-page">
        <div className="loading-container">
          <FaSpinner className="spinner-icon" />
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="song-detail-page">
        <div className="error-container">
          <p>{error || "Không tìm thấy bài hát"}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="back-btn"
          >
            <FaArrowLeft /> Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="song-detail-page">
      {/* LEFT SIDEBAR */}
      <div className="left-sidebar">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="back-button"
        >
          <FaArrowLeft />
        </button>

        {collapsed && (
          <div className="mini-view" onClick={() => setCollapsed(false)}>
            <div className={`mini-vinyl ${isThisSongPlaying ? "spinning" : ""}`}>
              <div
                className="mini-vinyl-bg"
                style={{ backgroundImage: `url(${coverURL})` }}
              />
              <div className="mini-vinyl-overlay" />
              <div className="mini-vinyl-hole" />
            </div>

            <div className="mini-info">
              <span className="mini-title">{song.title}</span>
              <span className="mini-artist">
                {song.artist}
                {song.featuring ? ` ft. ${song.featuring}` : ""}
              </span>
            </div>

            <button
              type="button"
              className="mini-play-btn"
              onClick={(e) => {
                e.stopPropagation();
                handlePlay();
              }}
            >
              {isThisSongPlaying ? <FaPause /> : <FaPlay />}
            </button>
          </div>
        )}
      </div>

      {/* MAIN CONTAINER */}
      <div className={`song-detail-container ${collapsed ? "collapsed" : ""}`}>
        {!collapsed && (
          <div className="song-info-section">
            <button
              type="button"
              className="collapse-btn"
              onClick={() => setCollapsed(true)}
              title="Thu gọn"
            >
              <FaChevronLeft />
            </button>

            <div className="panel-content">
              {/* VINYL */}
              <div className="vinyl-wrapper">
                <div
                  className={`vinyl-needle ${isThisSongPlaying ? "playing" : ""}`}
                >
                  <div className="needle-base" />
                  <div className="needle-arm" />
                  <div className="needle-head" />
                </div>

                <div
                  className={`vinyl-disk ${isThisSongPlaying ? "spinning" : ""}`}
                  style={{ backgroundImage: `url(${coverURL})` }}
                >
                  <div className="vinyl-overlay" />
                  <div className="vinyl-grooves">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <div key={n} className={`vinyl-groove groove-${n}`} />
                    ))}
                  </div>
                  <div className="vinyl-center-ring">
                    <div className="vinyl-hole" />
                  </div>
                  <div className="vinyl-shine" />
                </div>
              </div>

              {/* META */}
              <div className="song-meta">
                <h1 className="song-detail-title">{song.title}</h1>

                <p className="song-detail-artist">
                  {song.artist}
                  {song.featuring && (
                    <span className="song-detail-featuring">
                      {" "}
                      ft. {song.featuring}
                    </span>
                  )}
                </p>

                <div className="song-stats">
                  <div className="stat-item">
                    <FaCompactDisc />
                    <span>{song.album || "Single"}</span>
                  </div>

                  <div className="stat-item">
                    <FaMusic />
                    <span>{song.genre || "Pop"}</span>
                  </div>

                  {song.releaseYear && (
                    <div className="stat-item">
                      <FaCalendarAlt />
                      <span>Năm phát hành: {song.releaseYear}</span>
                    </div>
                  )}

                  <div className="stat-item">
                    <FaHeadphones />
                    <span>{song.playCount?.toLocaleString() || 0} lượt nghe</span>
                  </div>

                  <div className="stat-item">
                    <FaCalendarAlt />
                    <span>Đăng ngày: {formatDate(song.createdAt)}</span>
                  </div>
                </div>

                {song.lrc && (
                  <div className="song-lrc-badge">
                    <FaMicrophone /> Có lời đồng bộ Karaoke
                  </div>
                )}

                {song.tags?.length > 0 && (
                  <div className="song-tags-box">
                    {song.tags.map((tag) => (
                      <span key={tag} className="song-tag-item">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="song-actions-detail">
                  <button
                    type="button"
                    className={`action-btn play-btn-large ${
                      isThisSongPlaying ? "playing" : ""
                    }`}
                    onClick={handlePlay}
                    aria-label={isThisSongPlaying ? "Dừng" : "Phát"}
                  >
                    {isThisSongPlaying ? <FaPause /> : <FaPlay />}
                  </button>

                  <button
                    type="button"
                    className={`action-btn fav-btn-large ${
                      isFavorite(song._id) ? "liked" : ""
                    }`}
                    onClick={() => toggleFavorite(song._id)}
                    aria-label={isFavorite(song._id) ? "Bỏ thích" : "Yêu thích"}
                  >
                    {isFavorite(song._id) ? <FaHeart /> : <FaRegHeart />}
                    {isFavorite(song._id) ? "Đã thích" : "Yêu thích"}
                  </button>

                  {isAuthenticated && (
                    <button
                      type="button"
                      className="action-btn add-pl-btn"
                      onClick={() => setShowAddModal(true)}
                    >
                      <FaPlus /> Thêm vào playlist
                    </button>
                  )}
                </div>

                {song.uploadedBy && (
                  <div className="uploader-info">
                    <img
                      src={getAvatarURL(song.uploadedBy.avatar, 30)}
                      alt={song.uploadedBy.username}
                      className="uploader-avatar"
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_AVATAR;
                      }}
                    />
                    <span>
                      Upload bởi <strong>{song.uploadedBy.username}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* RIGHT */}
        <div className="song-right-section">
          <TabSwitcher
            collapsed={collapsed}
            activeTab={activeTab}
            miniActiveTabs={miniActiveTabs}
            onTabToggle={handleTabToggle}
            onMiniTabToggle={handleMiniTabToggle}
            videoURL={videoURL}
            hasLRC={!!song.lrc}
            isThisSongPlaying={isThisSongPlaying}
          />

          {!collapsed && activeTab !== null && (
            <div className="tab-content">
              {activeTab === "lyrics" && (
                <LyricsDisplay
                  song={song}
                  currentTime={currentTime}
                  isCurrentSong={isCurrentSong}
                  isPlaying={isThisSongPlaying}
                  isAuthenticated={isAuthenticated}
                  onEditClick={openLyricsModal}
                />
              )}

              {activeTab === "video" && (
                <div className="song-video-section">
                  <VideoPlayer
                    videoURL={videoURL}
                    videoRef={videoRef}
                    song={song}
                    getCoverURL={getCoverURL}
                    isPlaying={isThisSongPlaying}
                    onPlayToggle={handlePlay}
                  />
                </div>
              )}
            </div>
          )}

          {collapsed && miniActiveTabs.size > 0 && (
            <div
              className={`mini-panels-container ${
                miniActiveTabs.size === 2 ? "two-panels" : ""
              }`}
            >
              {miniActiveTabs.has("lyrics") && (
                <div className="tab-content mini-panel">
                  <LyricsDisplay
                    song={song}
                    currentTime={currentTime}
                    isCurrentSong={isCurrentSong}
                    isPlaying={isThisSongPlaying}
                    isAuthenticated={isAuthenticated}
                    onEditClick={openLyricsModal}
                  />
                </div>
              )}

              {miniActiveTabs.has("video") && (
                <div className="tab-content mini-panel">
                  <div className="song-video-section">
                    <VideoPlayer
                      videoURL={videoURL}
                      videoRef={miniVideoRef}
                      song={song}
                      getCoverURL={getCoverURL}
                      isPlaying={isThisSongPlaying}
                      onPlayToggle={handlePlay}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* LYRICS MODAL */}
      {showLyricsModal && (
        <div className="lyrics-modal-overlay" onClick={closeLyricsModal}>
          <div className="lyrics-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{song.lyrics ? "Sửa lời bài hát" : "Thêm lời bài hát"}</h3>

              <button
                type="button"
                className="modal-close-btn"
                onClick={closeLyricsModal}
              >
                <FaTimes />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-song-info">
                <strong>{song.title}</strong> — {song.artist}
              </p>

              {lyricsError && (
                <div className="lyrics-modal-error">
                  <FaTimes /> {lyricsError}
                </div>
              )}

              <textarea
                className="lyrics-textarea"
                placeholder="Nhập lời bài hát tại đây..."
                value={newLyrics}
                onChange={(e) => setNewLyrics(e.target.value)}
                rows={15}
                maxLength={10000}
              />

              <span className="lyrics-char-count">{newLyrics.length}/10,000</span>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={closeLyricsModal}
              >
                Hủy
              </button>

              <button
                type="button"
                className="modal-save-btn"
                onClick={handleSaveLyrics}
                disabled={savingLyrics}
              >
                {savingLyrics ? (
                  <>
                    <FaSpinner className="spinner" /> Đang lưu...
                  </>
                ) : (
                  <>
                    <FaSave /> Lưu lời bài hát
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD TO PLAYLIST */}
      {showAddModal && (
        <AddToPlaylistModal
          song={song}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
};

export default SongDetail;
