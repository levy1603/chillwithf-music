// components/playlist/PlaylistItem.js
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  FaPlay,
  FaEdit,
  FaTrash,
  FaLock,
  FaGlobe,
  FaEllipsisV,
  FaMusic,
} from "react-icons/fa";
import { useMusicContext } from "../../context/MusicContext";
import "../../styles/components/playlist/PlaylistItem.css";

const DEFAULT_PLAYLIST_COVER = "/images/default-playlist.jpg";

const PlaylistItem = ({ playlist, index, onClick, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const { getCoverURL } = useMusicContext();

  const songs = useMemo(() => playlist?.songs || [], [playlist?.songs]);
  const hasSongs = songs.length > 0;

  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const itemCover = useMemo(() => {
    const firstSong = songs[0];
    return firstSong ? getCoverURL(firstSong) : DEFAULT_PLAYLIST_COVER;
  }, [songs, getCoverURL]);

  const handleToggleMenu = useCallback((e) => {
    e.stopPropagation();
    setShowMenu((prev) => !prev);
  }, []);

  const handleMenuAction = useCallback((e, action) => {
    e.stopPropagation();
    setShowMenu(false);
    action();
  }, []);

  return (
    <div className="playlist-item-row" onClick={onClick}>
      <span className="item-index">{index}</span>

      <div className="item-cover">
        {hasSongs ? (
          <img
            src={itemCover}
            alt={playlist.name}
            onError={(e) => {
              e.currentTarget.src = DEFAULT_PLAYLIST_COVER;
            }}
          />
        ) : (
          <div className="item-cover-empty">
            <FaMusic />
          </div>
        )}

        <div className="item-play-overlay">
          <FaPlay />
        </div>
      </div>

      <div className="item-info">
        <h4>{playlist.name}</h4>
        <p>{playlist.description || "Không có mô tả"}</p>
      </div>

      <span className="item-song-count">{songs.length} bài</span>

      <span className={`item-badge ${playlist.isPublic ? "public" : "private"}`}>
        {playlist.isPublic ? <FaGlobe /> : <FaLock />}
      </span>

      <div
        className="item-menu-wrapper"
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="btn-menu"
          onClick={handleToggleMenu}
          aria-label="Mở menu playlist"
          title="Tùy chọn"
        >
          <FaEllipsisV />
        </button>

        {showMenu && (
          <div className="item-dropdown">
            <button type="button" onClick={(e) => handleMenuAction(e, onEdit)}>
              <FaEdit /> Chỉnh sửa
            </button>

            <button
              type="button"
              className="danger"
              onClick={(e) => handleMenuAction(e, onDelete)}
            >
              <FaTrash /> Xóa
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistItem;