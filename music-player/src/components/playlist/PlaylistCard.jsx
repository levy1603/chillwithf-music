// components/playlist/PlaylistCard.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  FaPlay,
  FaEllipsisV,
  FaEdit,
  FaTrash,
  FaLock,
  FaGlobe,
  FaMusic,
} from "react-icons/fa";
import { useMusicContext } from "../../context/MusicContext";
import "../../styles/components/playlist/PlaylistCard.css";

const DEFAULT_PLAYLIST_COVER = "/images/default-playlist.jpg";

const PlaylistCard = ({ playlist, onClick, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const { getCoverURL, playSong } = useMusicContext();

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

  const firstSong = useMemo(() => songs[0] || null, [songs]);

  const cardCover = useMemo(() => {
    return firstSong ? getCoverURL(firstSong) : DEFAULT_PLAYLIST_COVER;
  }, [firstSong, getCoverURL]);

  const handleToggleMenu = useCallback((e) => {
    e.stopPropagation();
    setShowMenu((prev) => !prev);
  }, []);

  const handleMenuAction = useCallback((e, action) => {
    e.stopPropagation();
    setShowMenu(false);
    action();
  }, []);

  const handlePlayPlaylist = useCallback(
    (e) => {
      e.stopPropagation();
      if (!hasSongs) return;
      playSong(songs[0], "playlist", songs);
    },
    [hasSongs, songs, playSong]
  );

  return (
    <div className="playlist-card" onClick={onClick}>
      <div className="card-cover">
        <img
          src={cardCover}
          alt={playlist.name}
          onError={(e) => {
            e.currentTarget.src = DEFAULT_PLAYLIST_COVER;
          }}
        />

        <div className="card-overlay">
          <button
            type="button"
            className="btn-play-card"
            onClick={handlePlayPlaylist}
            disabled={!hasSongs}
            title={hasSongs ? "Phát playlist" : "Playlist trống"}
            aria-label={hasSongs ? "Phát playlist" : "Playlist trống"}
          >
            <FaPlay />
          </button>
        </div>

        {!hasSongs && (
          <div className="card-empty-cover">
            <FaMusic />
          </div>
        )}
      </div>

      <div className="card-info">
        <div className="card-info-top">
          <div>
            <h4 className="card-name">{playlist.name}</h4>
            <p className="card-songs">{songs.length} bài hát</p>
          </div>

          <div className="card-menu-wrapper" ref={menuRef}>
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
              <div className="card-dropdown">
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

        <span className={`card-badge ${playlist.isPublic ? "public" : "private"}`}>
          {playlist.isPublic ? (
            <>
              <FaGlobe /> Công khai
            </>
          ) : (
            <>
              <FaLock /> Riêng tư
            </>
          )}
        </span>
      </div>
    </div>
  );
};

export default PlaylistCard;