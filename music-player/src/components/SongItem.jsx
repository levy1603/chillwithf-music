// components/SongItem.js
import React, { useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaPlay,
  FaPause,
  FaHeart,
  FaRegHeart,
  FaPlus,
} from "react-icons/fa";
import { useMusicContext } from "../context/MusicContext";
import { useAuth } from "../context/AuthContext";
import AddToPlaylistModal from "./playlist/AddToPlaylistModal";
import ConfirmModal from "./common/ConfirmModal";
import "../styles/components/SongItem.css";

const DEFAULT_COVER = "/images/default-cover.svg";

const formatDuration = (seconds) => {
  if (!seconds || Number.isNaN(seconds)) return "--:--";
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainSeconds.toString().padStart(2, "0")}`;
};

const SongItem = ({ song, index, source = "home", queue = [] }) => {
  const {
    currentSong,
    isPlaying,
    songs,
    playSong,
    togglePlay,
    toggleFavorite,
    isFavorite,
    getCoverURL,
  } = useMusicContext();

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showLoginConfirm, setShowLoginConfirm] = useState(false);

  const songId = song?._id;
  const isCurrentSong = currentSong?._id === songId;
  const liked = songId ? isFavorite(songId) : false;

  const coverURL = useMemo(() => {
    if (!song) return DEFAULT_COVER;
    return getCoverURL(song) || DEFAULT_COVER;
  }, [song, getCoverURL]);

  const playQueue = useMemo(() => {
    if (Array.isArray(queue) && queue.length > 0) return queue;
    if (Array.isArray(songs)) return songs;
    return [];
  }, [queue, songs]);

  const playCountText = useMemo(() => {
    return `${(song?.playCount || 0).toLocaleString("vi-VN")} lượt nghe`;
  }, [song?.playCount]);

  const handlePlay = useCallback(
    (event) => {
      event.stopPropagation();

      if (!song) return;

      if (isCurrentSong) {
        togglePlay();
      } else {
        playSong(song, source, playQueue);
      }
    },
    [song, isCurrentSong, togglePlay, playSong, source, playQueue]
  );

  const handleFavorite = useCallback(
    async (event) => {
      event.stopPropagation();
      event.preventDefault();

      if (!songId) return;

      const result = await toggleFavorite(songId);

      if (result?.requiresAuth) {
        setShowLoginConfirm(true);
      }
    },
    [toggleFavorite, songId]
  );

  const handleOpenAddModal = useCallback(
    (event) => {
      event.stopPropagation();
      event.preventDefault();

      if (!song) return;

      if (!isAuthenticated) {
        setShowLoginConfirm(true);
        return;
      }

      setShowAddModal(true);
    },
    [song, isAuthenticated]
  );

  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false);
  }, []);

  const handleCloseLoginConfirm = useCallback(() => {
    setShowLoginConfirm(false);
  }, []);

  const handleGoToLogin = useCallback(() => {
    setShowLoginConfirm(false);
    navigate("/login");
  }, [navigate]);

  if (!song) return null;

  return (
    <>
      <div className={`song-item ${isCurrentSong ? "active" : ""}`}>
        <div className="song-index">
          {isCurrentSong && isPlaying ? (
            <div className="playing-animation">
              <span />
              <span />
              <span />
            </div>
          ) : (
            <span className="index-number">{index + 1}</span>
          )}
        </div>

        <button
          type="button"
          className="song-cover-wrapper"
          onClick={handlePlay}
          aria-label={
            isCurrentSong && isPlaying ? "Tạm dừng bài hát" : "Phát bài hát"
          }
        >
          <img
            src={coverURL}
            alt={song.title}
            className="song-cover"
            onError={(event) => {
              event.currentTarget.src = DEFAULT_COVER;
            }}
          />
          <div className="song-cover-overlay">
            {isCurrentSong && isPlaying ? <FaPause /> : <FaPlay />}
          </div>
        </button>

        <div className="song-info">
          <Link to={`/song/${song._id}`} className="song-title-link">
            <h4 className={`song-title ${isCurrentSong ? "highlight" : ""}`}>
              {song.title}
            </h4>
          </Link>
          <p className="song-artist">{song.artist}</p>
        </div>

        <div className="song-duration">{formatDuration(song.duration)}</div>
        <div className="song-album">{song.album || "Single"}</div>
        <div className="song-play-count">{playCountText}</div>

        <div className="song-actions">
          <button
            type="button"
            className={`fav-btn ${liked ? "liked" : ""}`}
            onClick={handleFavorite}
            title={liked ? "Bỏ yêu thích" : "Yêu thích"}
            aria-label={liked ? "Bỏ yêu thích" : "Yêu thích"}
          >
            {liked ? <FaHeart /> : <FaRegHeart />}
          </button>

          <button
            type="button"
            className="add-playlist-btn"
            onClick={handleOpenAddModal}
            title="Thêm vào playlist"
            aria-label="Thêm vào playlist"
          >
            <FaPlus />
          </button>
        </div>
      </div>

      {showAddModal && (
        <AddToPlaylistModal song={song} onClose={handleCloseAddModal} />
      )}

      <ConfirmModal
        open={showLoginConfirm}
        title="Cần đăng nhập"
        message="Bạn cần đăng nhập để sử dụng tính năng này."
        confirmText="Đăng nhập"
        cancelText="Để sau"
        confirmVariant="primary"
        onConfirm={handleGoToLogin}
        onClose={handleCloseLoginConfirm}
      />
    </>
  );
};

export default React.memo(SongItem);
