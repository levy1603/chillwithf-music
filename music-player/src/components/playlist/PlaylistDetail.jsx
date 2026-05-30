// components/playlist/PlaylistDetail.js
import React, { useMemo, useCallback } from "react";
import {
  FaArrowLeft,
  FaPlay,
  FaEdit,
  FaTrash,
  FaLock,
  FaGlobe,
  FaMusic,
  FaTrashAlt,
} from "react-icons/fa";
import { useMusicContext } from "../../context/MusicContext";
import "../../styles/components/playlist/PlaylistDetail.css";

const PlaylistDetail = ({
  playlist,
  onBack,
  onEdit,
  onDelete,
  onRemoveSong,
  removingSong = false,
  deleting = false,
}) => {
  const { playSong, getCoverURL } = useMusicContext();

  const songs = useMemo(
    () => (playlist?.songs || []).filter(Boolean),
    [playlist?.songs]
  );

  const playlistCover = useMemo(() => {
    const firstSong = songs[0];
    return firstSong ? getCoverURL(firstSong) : "/images/default-playlist.jpg";
  }, [songs, getCoverURL]);

  const formatDuration = useCallback((seconds) => {
    if (!seconds) return "--:--";

    const minutes = Math.floor(seconds / 60);
    const remainSeconds = seconds % 60;

    return `${minutes}:${remainSeconds.toString().padStart(2, "0")}`;
  }, []);

  const handlePlayAll = useCallback(() => {
    if (!songs.length || deleting) return;
    playSong(songs[0], "playlist", songs);
  }, [songs, deleting, playSong]);

  const handlePlaySong = useCallback(
    (song) => {
      if (deleting) return;
      playSong(song, "playlist", songs);
    },
    [deleting, playSong, songs]
  );

  const handleRemoveSongClick = useCallback(
    (event, songId) => {
      event.stopPropagation();
      if (removingSong || deleting) return;
      onRemoveSong(songId);
    },
    [removingSong, deleting, onRemoveSong]
  );

  const handleDeletePlaylist = useCallback(() => {
    if (deleting) return;
    onDelete();
  }, [deleting, onDelete]);

  const handleEditPlaylist = useCallback(() => {
    if (deleting) return;
    onEdit();
  }, [deleting, onEdit]);

  return (
    <div className="playlist-detail">
      <div className="detail-header">
        <button className="btn-back" onClick={onBack} disabled={deleting}>
          <FaArrowLeft /> Quay lại
        </button>
      </div>

      <div className="detail-hero">
        <img
          src={playlistCover}
          alt={playlist.name}
          className="detail-cover"
          onError={(e) => {
            e.currentTarget.src = "/images/default-playlist.jpg";
          }}
        />

        <div className="detail-meta">
          <span
            className={`detail-badge ${
              playlist.isPublic ? "public" : "private"
            }`}
          >
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

          <h2 className="detail-name">{playlist.name}</h2>

          {playlist.description && (
            <p className="detail-desc">{playlist.description}</p>
          )}

          <p className="detail-info">
            <FaMusic /> {songs.length} bài hát
          </p>

          <div className="detail-actions">
            <button
              className="btn-play-all"
              onClick={handlePlayAll}
              disabled={!songs.length || deleting}
            >
              <FaPlay /> Phát tất cả
            </button>

            <button
              className="btn-edit"
              onClick={handleEditPlaylist}
              disabled={deleting}
            >
              <FaEdit /> Chỉnh sửa
            </button>

            <button
              className="btn-delete"
              onClick={handleDeletePlaylist}
              disabled={deleting}
            >
              <FaTrash /> {deleting ? "Đang xóa..." : "Xóa playlist"}
            </button>
          </div>
        </div>
      </div>

      <div className="detail-songs">
        <h3>Danh sách bài hát</h3>

        {!songs.length ? (
          <div className="detail-empty">
            <FaMusic />
            <p>Playlist này chưa có bài hát nào</p>
          </div>
        ) : (
          <table className="songs-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Bài hát</th>
                <th>Nghệ sĩ</th>
                <th>Thời lượng</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {songs.map((song, index) => (
                <tr
                  key={song._id}
                  className="song-row"
                  onClick={() => handlePlaySong(song)}
                >
                  <td className="song-index">{index + 1}</td>

                  <td className="song-title">
                    <img
                      src={getCoverURL(song)}
                      alt={song.title}
                      onError={(e) => {
                        e.currentTarget.src = "/images/default-cover.svg";
                      }}
                    />
                    <span>{song.title}</span>
                  </td>

                  <td className="song-artist">{song.artist}</td>

                  <td className="song-duration">
                    {formatDuration(song.duration)}
                  </td>

                  <td className="song-remove">
                    <button
                      type="button"
                      onClick={(e) => handleRemoveSongClick(e, song._id)}
                      title="Xóa khỏi playlist"
                      disabled={removingSong || deleting}
                    >
                      <FaTrashAlt />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {removingSong && (
          <div className="detail-processing-text">
            Đang xóa bài hát khỏi playlist...
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistDetail;
