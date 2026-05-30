// src/pages/Playlist.js
import React, { useMemo, useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SongList from "../components/SongList";
import ConfirmModal from "../components/common/ConfirmModal";
import { useMusicContext } from "../context/MusicContext";
import { useAuth } from "../context/AuthContext";
import { FaHistory, FaTrash, FaMusic } from "react-icons/fa";
import songAPI from "../api/songAPI";
import "../styles/pages/Playlist.css";

const Playlist = () => {
  const { songs, listenedSongIds, clearListened } = useMusicContext();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [fetchedSongsById, setFetchedSongsById] = useState({});

  useEffect(() => {
    if (!isAuthenticated) return;

    if (listenedSongIds.length === 0) {
      setFetchedSongsById({});
      return;
    }

    const cachedIds = new Set(songs.map((song) => song?._id).filter(Boolean));
    const missingIds = listenedSongIds.filter(
      (id) => !cachedIds.has(id) && !fetchedSongsById[id],
    );

    if (missingIds.length === 0) return;

    let cancelled = false;

    (async () => {
      const results = await Promise.allSettled(
        missingIds.map((id) => songAPI.getById(id)),
      );

      if (cancelled) return;

      const resolved = {};
      results.forEach((result) => {
        if (result.status !== "fulfilled") return;
        const song = result.value?.data;
        if (!song?._id) return;
        resolved[song._id] = song;
      });

      if (Object.keys(resolved).length === 0) return;
      setFetchedSongsById((prev) => ({ ...prev, ...resolved }));
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, listenedSongIds, songs, fetchedSongsById]);

  const listenedSongs = useMemo(() => {
    const songMap = new Map(songs.map((song) => [song._id, song]));
    return listenedSongIds
      .map((id) => songMap.get(id) || fetchedSongsById[id])
      .filter(Boolean);
  }, [listenedSongIds, songs, fetchedSongsById]);

  const handleOpenClearConfirm = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  const handleCloseClearConfirm = useCallback(() => {
    setShowClearConfirm(false);
  }, []);

  const handleConfirmClearHistory = useCallback(() => {
    clearListened();
    setShowClearConfirm(false);
  }, [clearListened]);

  if (!isAuthenticated) {
    return (
      <div className="page-content">
        <div className="playlist-empty">
          <FaMusic className="playlist-empty-icon" />
          <p>Vui lòng đăng nhập để xem lịch sử nghe</p>
          <button
            type="button"
            className="playlist-login-btn"
            onClick={() => navigate("/login")}
          >
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  if (listenedSongs.length === 0) {
    return (
      <div className="page-content">
        <div className="playlist-empty">
          <FaHistory className="playlist-empty-icon" />
          <p>Bạn chưa nghe bài hát nào</p>
          <button
            type="button"
            className="playlist-login-btn"
            onClick={() => navigate("/")}
          >
            Khám phá nhạc
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-content">
        <div className="playlist-header">
          <div className="playlist-title">
            <FaHistory className="playlist-title-icon" />
            <div>
              <h2>Lịch sử nghe</h2>
              <span>{listenedSongs.length} bài hát</span>
            </div>
          </div>

          <button
            type="button"
            className="playlist-clear-btn"
            onClick={handleOpenClearConfirm}
            title="Xóa lịch sử"
          >
            <FaTrash /> Xóa lịch sử
          </button>
        </div>

        <SongList
          songs={listenedSongs}
          title=""
          source="history"
          queue={listenedSongs}
          emptyText="Bạn chưa có bài hát trong lịch sử nghe"
        />
      </div>

      <ConfirmModal
        open={showClearConfirm}
        title="Xóa lịch sử nghe"
        message="Bạn có chắc muốn xóa toàn bộ lịch sử nghe không? Hành động này không thể hoàn tác."
        confirmText="Xóa lịch sử"
        cancelText="Hủy"
        confirmVariant="danger"
        onConfirm={handleConfirmClearHistory}
        onClose={handleCloseClearConfirm}
      />
    </>
  );
};

export default Playlist;
