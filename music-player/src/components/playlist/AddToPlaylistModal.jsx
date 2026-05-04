// components/playlist/AddToPlaylistModal.js
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  FaTimes,
  FaPlus,
  FaCheck,
  FaMusic,
  FaLock,
  FaGlobe,
} from "react-icons/fa";
import { useMusicContext } from "../../context/MusicContext";
import playlistAPI from "../../api/playlistAPI";
import "../../styles/components/playlist/AddToPlaylistModal.css";

const DEFAULT_PLAYLIST_COVER = "/images/default-playlist.jpg";

const AddToPlaylistModal = ({ song, onClose }) => {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingPlaylistId, setAddingPlaylistId] = useState(null);
  const [addedPlaylistIds, setAddedPlaylistIds] = useState([]);
  const [error, setError] = useState("");

  const { getCoverURL } = useMusicContext();

  const fetchPlaylists = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await playlistAPI.getAll();
      setPlaylists(response.data || []);
    } catch (err) {
      console.error("Lỗi tải playlist:", err);
      setError(err.message || "Không thể tải danh sách playlist");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  useEffect(() => {
    setAddedPlaylistIds([]);
    setAddingPlaylistId(null);
    setError("");
  }, [song?._id]);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleClose = useCallback(() => {
    if (addingPlaylistId) return;
    onClose();
  }, [addingPlaylistId, onClose]);

  const handleAddToPlaylist = useCallback(
    async (playlistId) => {
      if (!song?._id) return;
      if (addingPlaylistId) return;
      if (addedPlaylistIds.includes(playlistId)) return;

      try {
        setAddingPlaylistId(playlistId);
        setError("");

        const response = await playlistAPI.addSong(playlistId, song._id);

        if (response.success) {
          setAddedPlaylistIds((prev) => [...prev, playlistId]);
        }
      } catch (err) {
        const message = err.message || "Không thể thêm bài hát";

        if (message.toLowerCase().includes("đã có")) {
          setAddedPlaylistIds((prev) => [...prev, playlistId]);
        } else {
          setError(message);
        }
      } finally {
        setAddingPlaylistId(null);
      }
    },
    [song?._id, addingPlaylistId, addedPlaylistIds]
  );

  const getPlaylistCover = useCallback(
    (playlist) => {
      const firstSong = playlist.songs?.[0];
      if (firstSong) return getCoverURL(firstSong);
      return DEFAULT_PLAYLIST_COVER;
    },
    [getCoverURL]
  );

  const playlistItems = useMemo(() => {
    return playlists.map((playlist) => {
      const isAdded = addedPlaylistIds.includes(playlist._id);
      const isAdding = addingPlaylistId === playlist._id;

      return {
        ...playlist,
        isAdded,
        isAdding,
      };
    });
  }, [playlists, addedPlaylistIds, addingPlaylistId]);

  const modalContent = (
    <div className="atp-overlay" onClick={handleClose}>
      <div className="atp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="atp-header">
          <div>
            <h3>Thêm vào Playlist</h3>
            <p className="atp-song-name">
              <FaMusic /> {song.title} - {song.artist}
            </p>
          </div>

          <button
            type="button"
            className="atp-close"
            onClick={handleClose}
            disabled={!!addingPlaylistId}
          >
            <FaTimes />
          </button>
        </div>

        {error && <p className="atp-error">{error}</p>}

        <div className="atp-body">
          {loading ? (
            <div className="atp-loading">
              <div className="atp-spinner" />
              <p>Đang tải...</p>
            </div>
          ) : playlists.length === 0 ? (
            <div className="atp-empty">
              <FaMusic />
              <p>Bạn chưa có playlist nào</p>
              <span>Hãy tạo playlist trong mục "Các Playlist"</span>
            </div>
          ) : (
            <ul className="atp-list">
              {playlistItems.map((playlist) => (
                <li
                  key={playlist._id}
                  className={`atp-item ${playlist.isAdded ? "is-added" : ""}`}
                  onClick={() => handleAddToPlaylist(playlist._id)}
                >
                  <img
                    src={getPlaylistCover(playlist)}
                    alt={playlist.name}
                    className="atp-cover"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_PLAYLIST_COVER;
                    }}
                  />

                  <div className="atp-info">
                    <span className="atp-name">{playlist.name}</span>
                    <span className="atp-meta">
                      {playlist.isPublic ? (
                        <>
                          <FaGlobe /> Công khai
                        </>
                      ) : (
                        <>
                          <FaLock /> Riêng tư
                        </>
                      )}
                      &nbsp;·&nbsp; {playlist.songs?.length || 0} bài
                    </span>
                  </div>

                  <button
                    type="button"
                    className={`atp-btn ${playlist.isAdded ? "added" : ""}`}
                    disabled={playlist.isAdding || playlist.isAdded}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToPlaylist(playlist._id);
                    }}
                  >
                    {playlist.isAdding ? (
                      <div className="atp-spinner small" />
                    ) : playlist.isAdded ? (
                      <FaCheck />
                    ) : (
                      <FaPlus />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AddToPlaylistModal;