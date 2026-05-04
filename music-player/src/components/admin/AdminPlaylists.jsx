// components/admin/AdminPlaylists.js
import React, { useEffect, useMemo, useState } from "react";
import { FaTrash, FaSearch, FaLock, FaGlobe } from "react-icons/fa";
import ConfirmModal from "../common/ConfirmModal";
import ToastMessage from "../common/ToastMessage";
import "../../styles/components/admin/AdminSongs.css";

const INITIAL_TOAST = {
  open: false,
  type: "info",
  message: "",
};

const AdminPlaylists = () => {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [toast, setToast] = useState(INITIAL_TOAST);

  const showToast = (type, message) => {
    setToast({ open: true, type, message });
  };

  const closeToast = () => {
    setToast(INITIAL_TOAST);
  };

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/playlists/public", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.success) {
          setPlaylists(data.data);
        } else {
          showToast("error", data.message || "Khong the tai danh sach playlist.");
        }
      } catch (error) {
        console.error("Loi tai playlist:", error);
        showToast("error", "Khong the tai danh sach playlist.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, []);

  const filtered = useMemo(
    () =>
      playlists.filter((playlist) =>
        playlist.name.toLowerCase().includes(search.toLowerCase())
      ),
    [playlists, search]
  );

  const openDeleteConfirm = (playlist) => {
    setSelectedPlaylist(playlist);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPlaylist) return;

    try {
      setDeletingId(selectedPlaylist._id);

      const token = localStorage.getItem("token");
      const res = await fetch(`/api/playlists/${selectedPlaylist._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Khong the xoa playlist.");
      }

      setPlaylists((prev) =>
        prev.filter((playlist) => playlist._id !== selectedPlaylist._id)
      );
      showToast("success", data.message || "Da xoa playlist.");
      setSelectedPlaylist(null);
    } catch (error) {
      console.error("Loi xoa playlist:", error);
      showToast("error", error.message || "Khong the xoa playlist.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner" />
        <p>Dang tai...</p>
      </div>
    );
  }

  return (
    <>
      <div className="admin-songs">
        <div className="admin-search">
          <FaSearch />
          <input
            type="text"
            placeholder="Tim playlist..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <span>{filtered.length} playlist</span>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Ten playlist</th>
              <th>Chu so huu</th>
              <th>So bai</th>
              <th>Che do</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((playlist, index) => (
              <tr key={playlist._id}>
                <td>{index + 1}</td>
                <td>{playlist.name}</td>
                <td>{playlist.owner?.username || "N/A"}</td>
                <td>{playlist.songs?.length || 0}</td>
                <td>
                  <span className={`role-badge ${playlist.isPublic ? "user" : "admin"}`}>
                    {playlist.isPublic ? (
                      <>
                        <FaGlobe /> Cong khai
                      </>
                    ) : (
                      <>
                        <FaLock /> Rieng tu
                      </>
                    )}
                  </span>
                </td>
                <td>
                  <button
                    className="btn-delete-song"
                    onClick={() => openDeleteConfirm(playlist)}
                    title="Xoa playlist"
                    disabled={deletingId === playlist._id}
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
        open={Boolean(selectedPlaylist)}
        title="Xoa playlist"
        message={
          selectedPlaylist
            ? `Ban co chac muon xoa playlist "${selectedPlaylist.name}"?`
            : ""
        }
        confirmText="Xoa playlist"
        cancelText="Huy"
        confirmVariant="danger"
        loading={deletingId === selectedPlaylist?._id}
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          if (!deletingId) setSelectedPlaylist(null);
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

export default AdminPlaylists;
