// src/pages/RoomPage/RoomQueue.jsx
import React, { useState, useCallback, useRef, useEffect } from "react";
import { FaMusic, FaTrash, FaSearch, FaPlus, FaPlay } from "react-icons/fa";

const formatDuration = (seconds) => {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const API_BASE_URL = (
  process.env.REACT_APP_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const toMediaUrl = (value, folder) => {
  if (!value || typeof value !== "string") return "";
  if (value.startsWith("http")) return value;
  if (value.startsWith("/uploads/")) return `${API_BASE_URL}${value}`;
  return `${API_BASE_URL}/uploads/${folder}/${value.replace(/^\/+/, "")}`;
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

const RoomQueue = ({
  queue,
  currentSong,
  isHost,
  currentUserId,
  onAddSong,
  onRemoveFromQueue,
  onPlayNow,
  onPlayDirect,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingSong, setIsAddingSong] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [youtubeQuery, setYoutubeQuery] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeError, setYoutubeError] = useState("");
  const searchTimeout = useRef(null);
  const latestSearchId = useRef(0);

  useEffect(() => {
    return () => {
      clearTimeout(searchTimeout.current);
    };
  }, []);

  // Tìm kiếm bài hát
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    clearTimeout(searchTimeout.current);

    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const searchId = ++latestSearchId.current;
    searchTimeout.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const token = localStorage.getItem("token");
        const res = await fetch(
          `/api/songs?search=${encodeURIComponent(query)}&limit=10`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (searchId === latestSearchId.current) {
          setSearchResults(data.songs || data.data || []);
        }
      } catch (err) {
        console.error("Lỗi tìm kiếm:", err);
      } finally {
        if (searchId === latestSearchId.current) {
          setIsSearching(false);
        }
      }
    }, 400);
  }, []);

  const handleAddSong = useCallback(
    async (song) => {
      if (!onAddSong || isAddingSong) return;

      try {
        setIsAddingSong(true);
        const normalizedSong = {
          ...song,
          _id: song?._id || song?.id || song?.songId || null,
          songId: song?.songId || song?._id || song?.id || null,
          title: song?.title || "Unknown",
          artist: song?.artist || "Unknown",
          duration: Number(song?.duration) || 0,
          thumbnail:
            song?.thumbnail ||
            song?.coverUrl ||
            toMediaUrl(song?.coverImage, "covers") ||
            "/images/default-cover.png",
          audioUrl: song?.audioUrl || toMediaUrl(song?.audioFile, "songs"),
          youtubeUrl:
            song?.youtubeUrl || song?.videoUrl || song?.videoURL || null,
          videoFile:
            song?.videoFile ||
            song?.youtubeUrl ||
            song?.videoUrl ||
            song?.videoURL ||
            null,
        };

        if (!normalizedSong.audioUrl && !normalizedSong.youtubeUrl) {
          console.error("Bài hát thiếu audioUrl/youtubeUrl:", song);
          return;
        }

        await onAddSong(normalizedSong);
        setSearchQuery("");
        setSearchResults([]);
        setShowSearch(false);
      } catch (err) {
        console.error("Lỗi thêm bài hát:", err);
      } finally {
        setIsAddingSong(false);
      }
    },
    [onAddSong, isAddingSong]
  );

  const handleOpenYoutubeSearch = useCallback(() => {
    const query = youtubeQuery.trim();
    if (!query) return;
    window.open(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }, [youtubeQuery]);

  const buildYoutubeSong = useCallback(async (rawUrl) => {
    const raw = rawUrl.trim();
    const videoId = getYoutubeVideoId(raw);
    if (!videoId) return null;

    let title = `YouTube ${videoId}`;
    let artist = "YouTube";
    let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    try {
      const oembedRes = await fetch(
        `https://noembed.com/embed?url=${encodeURIComponent(raw)}`
      );
      const oembed = await oembedRes.json();
      if (oembed?.title) title = oembed.title;
      if (oembed?.author_name) artist = oembed.author_name;
      if (oembed?.thumbnail_url) thumbnail = oembed.thumbnail_url;
    } catch {
      // fallback defaults
    }

    return {
      _id: `yt-${videoId}`,
      songId: `yt-${videoId}`,
      title,
      artist,
      duration: 0,
      thumbnail,
      youtubeUrl: raw,
      videoFile: raw,
      audioUrl: "",
    };
  }, []);

  const handleAddYoutubeUrl = useCallback(async () => {
    const raw = youtubeUrl.trim();
    const videoId = getYoutubeVideoId(raw);
    if (!videoId) {
      setYoutubeError("Link YouTube không hợp lệ");
      return;
    }

    setYoutubeError("");

    const youtubeSong = await buildYoutubeSong(raw);
    if (!youtubeSong) {
      setYoutubeError("Link YouTube không hợp lệ");
      return;
    }

    await handleAddSong(youtubeSong);
    setYoutubeUrl("");
  }, [youtubeUrl, handleAddSong, buildYoutubeSong]);

  const handlePlayYoutubeNow = useCallback(async () => {
    if (!isHost) return;

    const raw = youtubeUrl.trim();
    const youtubeSong = await buildYoutubeSong(raw);
    if (!youtubeSong) {
      setYoutubeError("Link YouTube không hợp lệ");
      return;
    }

    setYoutubeError("");
    onPlayDirect?.(youtubeSong);
    setYoutubeUrl("");
    setShowSearch(false);
  }, [isHost, youtubeUrl, buildYoutubeSong, onPlayDirect]);

  return (
    <div className="rq-wrap">
      {/* ── Header ── */}
      <div className="rq-header">
        <span className="rq-title">🎵 Hàng chờ ({queue.length})</span>
        <button
          className="rq-add-btn"
          onClick={() => setShowSearch((p) => !p)}
          title="Thêm bài hát"
        >
          <FaPlus />
        </button>
      </div>

      {/* ── Search panel ── */}
      {showSearch && (
        <div className="rq-search-panel">
          {/* Tìm trong thư viện */}
          <div className="rq-search-input-wrap">
            <FaSearch className="rq-search-icon" />
            <input
              type="text"
              placeholder="Tìm bài hát..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="rq-search-input"
              autoFocus
            />
          </div>

          <div className="rq-search-results">
            {isSearching && (
              <div className="rq-searching">Đang tìm...</div>
            )}

            {!isSearching && searchQuery && searchResults.length === 0 && (
              <div className="rq-no-result">Không tìm thấy bài hát</div>
            )}

            {searchResults.map((song) => (
              <div
                key={song._id || song.id || `${song.title}-${song.artist}`}
                className="rq-search-item"
                onClick={() => !isAddingSong && handleAddSong(song)}
              >
                <img
                  src={
                    song.thumbnail ||
                    song.coverUrl ||
                    toMediaUrl(song.coverImage, "covers") ||
                    "/images/default-cover.png"
                  }
                  alt={song.title}
                  className="rq-search-thumb"
                  onError={(e) =>
                    (e.currentTarget.src = "/images/default-cover.png")
                  }
                />
                <div className="rq-search-info">
                  <span className="rq-search-title">{song.title}</span>
                  <span className="rq-search-artist">{song.artist}</span>
                </div>
                <button
                  className="rq-search-add"
                  type="button"
                  disabled={isAddingSong}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddSong(song);
                  }}
                >
                  <FaPlus />
                </button>
              </div>
            ))}
          </div>

          {/* ── YouTube box ── */}
          <div className="rq-youtube-box">
            <div className="rq-youtube-head">YouTube</div>

            {/* Tìm trên YouTube */}
            <div className="rq-youtube-row">
              <input
                type="text"
                className="rq-search-input"
                placeholder="Tìm trên YouTube..."
                value={youtubeQuery}
                onChange={(e) => setYoutubeQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleOpenYoutubeSearch()}
              />
              <button
                type="button"
                className="rq-search-add"
                onClick={handleOpenYoutubeSearch}
              >
                Tìm
              </button>
            </div>

            {/* Dán link YouTube */}
            <div className="rq-youtube-row">
              <input
                type="text"
                className="rq-search-input"
                placeholder="Dán link YouTube để thêm vào hàng chờ..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddYoutubeUrl()}
              />
              <button
                type="button"
                className="rq-search-add"
                onClick={handleAddYoutubeUrl}
              >
                Thêm
              </button>
              {isHost && (
                <button
                  type="button"
                  className="rq-search-add"
                  onClick={handlePlayYoutubeNow}
                >
                  Phát ngay
                </button>
              )}
            </div>

            {youtubeError && (
              <div className="rq-no-result">{youtubeError}</div>
            )}
          </div>
        </div>
      )}

      {/* ── Now playing ── */}
      {currentSong && (
        <div className="rq-now-playing">
          <span className="rq-np-label">🎵 Đang phát</span>
          <div className="rq-np-item">
            <img
              src={currentSong.thumbnail || "/images/default-cover.png"}
              alt={currentSong.title}
              className="rq-np-thumb"
              onError={(e) =>
                (e.currentTarget.src = "/images/default-cover.png")
              }
            />
            <div className="rq-np-info">
              <span className="rq-np-title">{currentSong.title}</span>
              <span className="rq-np-artist">{currentSong.artist}</span>
            </div>
            <div className="rq-np-bars">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}

      {/* ── Queue list ── */}
      <div className="rq-list">
        {queue.length === 0 ? (
          <div className="rq-empty">
            <FaMusic size={32} />
            <p>Hàng chờ trống</p>
            <p>Thêm bài hát để tiếp tục</p>
          </div>
        ) : (
          queue.map((item, index) => {
            const canRemove =
              isHost || item.addedBy?.toString() === currentUserId;

            return (
              <div
                key={`${item.songId || item._id}-${index}`}
                className="rq-item"
              >
                <span className="rq-index">{index + 1}</span>

                <img
                  src={item.thumbnail || "/images/default-cover.png"}
                  alt={item.title}
                  className="rq-thumb"
                  onError={(e) =>
                    (e.currentTarget.src = "/images/default-cover.png")
                  }
                />

                <div className="rq-info">
                  <span className="rq-item-title">{item.title}</span>
                  <span className="rq-item-meta">
                    {item.artist} · {formatDuration(item.duration)}
                  </span>
                  <span className="rq-added-by">
                    Thêm bởi: {item.addedByName || "Unknown"}
                  </span>
                </div>

                <div className="rq-item-actions">
                  {isHost && (
                    <button
                      className="rq-action-btn rq-action-btn--play"
                      title="Phát ngay"
                      onClick={() => onPlayNow?.(item, index)}
                    >
                      <FaPlay />
                    </button>
                  )}

                  {canRemove && (
                    <button
                      className="rq-action-btn rq-action-btn--remove"
                      title="Xóa khỏi hàng chờ"
                      onClick={() => onRemoveFromQueue?.(index)}
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RoomQueue;