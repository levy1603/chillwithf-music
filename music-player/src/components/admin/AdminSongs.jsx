// components/admin/AdminSongs.js
import React, { useEffect, useMemo, useState } from "react";
import { FaTrash, FaSearch, FaHeadphones, FaHeart } from "react-icons/fa";
import { useMusicContext } from "../../context/MusicContext";
import ConfirmModal from "../common/ConfirmModal";
import ToastMessage from "../common/ToastMessage";
import "../../styles/components/admin/AdminSongs.css";

const INITIAL_TOAST = {
  open: false,
  type: "info",
  message: "",
};

const AdminSongs = () => {
  const { songs, fetchSongs, getCoverURL } = useMusicContext();
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);
  const [toast, setToast] = useState(INITIAL_TOAST);

  const showToast = (type, message) => {
    setToast({ open: true, type, message });
  };

  const closeToast = () => {
    setToast(INITIAL_TOAST);
  };

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const filtered = useMemo(
    () =>
      songs.filter(
        (song) =>
          song.title.toLowerCase().includes(search.toLowerCase()) ||
          song.artist.toLowerCase().includes(search.toLowerCase())
      ),
    [songs, search]
  );

  const openDeleteConfirm = (song) => {
    setSelectedSong(song);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSong) return;

    setDeletingId(selectedSong._id);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/songs/${selectedSong._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Khong the xoa bai hat.");
      }

      await fetchSongs();
      showToast("success", data.message || "Da xoa bai hat.");
      setSelectedSong(null);
    } catch (error) {
      console.error("Loi xoa bai hat:", error);
      showToast("error", error.message || "Khong the xoa bai hat.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="admin-songs">
        <div className="admin-search">
          <FaSearch />
          <input
            type="text"
            placeholder="Tim bai hat, nghe si..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <span>{filtered.length} bai hat</span>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Bai hat</th>
              <th>Nghe si</th>
              <th>Album</th>
              <th>Upload boi</th>
              <th>
                <FaHeadphones />
              </th>
              <th>
                <FaHeart />
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((song, index) => (
              <tr key={song._id}>
                <td>{index + 1}</td>
                <td>
                  <div className="song-cell">
                    <img
                      src={getCoverURL(song)}
                      alt={song.title}
                      onError={(event) => {
                        event.target.src = "/images/default-cover.jpg";
                      }}
                    />
                    <span>{song.title}</span>
                  </div>
                </td>
                <td>{song.artist}</td>
                <td>{song.album || "Single"}</td>
                <td>{song.uploadedBy?.username || "N/A"}</td>
                <td>{song.playCount || 0}</td>
                <td>{song.likeCount || 0}</td>
                <td>
                  <button
                    className="btn-delete-song"
                    onClick={() => openDeleteConfirm(song)}
                    disabled={deletingId === song._id}
                    title="Xoa bai hat"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={Boolean(selectedSong)}
        title="Xoa bai hat"
        message={
          selectedSong
            ? `Ban co chac muon xoa bai hat "${selectedSong.title}"?`
            : ""
        }
        confirmText="Xoa bai hat"
        cancelText="Huy"
        confirmVariant="danger"
        loading={deletingId === selectedSong?._id}
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          if (!deletingId) setSelectedSong(null);
        }}
      />

      <ToastMessage
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={closeToast}
      />
    </>
  );
};

export default AdminSongs;
