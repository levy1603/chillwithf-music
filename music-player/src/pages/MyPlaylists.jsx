// src/pages/MyPlaylists.js
import React, { useState, useCallback } from "react";
import { FaThLarge, FaList, FaPlus } from "react-icons/fa";
import PlaylistCard from "../components/playlist/PlaylistCard";
import PlaylistItem from "../components/playlist/PlaylistItem";
import PlaylistModal from "../components/playlist/PlaylistModal";
import PlaylistDetail from "../components/playlist/PlaylistDetail";
import ConfirmModal from "../components/common/ConfirmModal";
import usePlaylists from "../hooks/usePlaylists";
import "../styles/pages/MyPlaylists.css";

const VIEW_MODE = {
  GRID: "grid",
  LIST: "list",
};

const MyPlaylists = () => {
  const [viewMode, setViewMode] = useState(VIEW_MODE.GRID);
  const [showModal, setShowModal] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState(null);

  const {
    playlists,
    selectedPlaylist,
    editingPlaylist,
    loading,
    loadingDetail,
    saving,
    deleting,
    removingSong,
    error,
    selectPlaylistById,
    clearSelectedPlaylist,
    startCreatePlaylist,
    startEditPlaylist,
    clearEditingPlaylist,
    savePlaylist,
    deletePlaylist,
    removeSongFromPlaylist,
  } = usePlaylists();

  const handleOpenCreateModal = useCallback(() => {
    startCreatePlaylist();
    setShowModal(true);
  }, [startCreatePlaylist]);

  const handleOpenEditModal = useCallback(
    (playlist) => {
      startEditPlaylist(playlist);
      setShowModal(true);
    },
    [startEditPlaylist]
  );

  const handleCloseModal = useCallback(() => {
    if (saving) return;
    clearEditingPlaylist();
    setShowModal(false);
  }, [clearEditingPlaylist, saving]);

  const handleSavePlaylist = useCallback(
    async (formData) => {
      const result = await savePlaylist(formData);

      if (result.success) {
        handleCloseModal();
      }
    },
    [savePlaylist, handleCloseModal]
  );

  const handleAskDeletePlaylist = useCallback((playlist) => {
    setPlaylistToDelete(playlist);
  }, []);

  const handleCloseDeleteModal = useCallback(() => {
    if (deleting) return;
    setPlaylistToDelete(null);
  }, [deleting]);

  const handleConfirmDeletePlaylist = useCallback(async () => {
    if (!playlistToDelete?._id) return;

    const result = await deletePlaylist(playlistToDelete._id);

    if (result?.success) {
      setPlaylistToDelete(null);
    }
  }, [playlistToDelete, deletePlaylist]);

  const handleSelectPlaylist = useCallback(
    async (playlistId) => {
      if (loadingDetail) return;
      await selectPlaylistById(playlistId);
    },
    [selectPlaylistById, loadingDetail]
  );

  const handleRemoveSong = useCallback(
    async (songId) => {
      if (!selectedPlaylist?._id || removingSong) return;
      await removeSongFromPlaylist(selectedPlaylist._id, songId);
    },
    [selectedPlaylist, removingSong, removeSongFromPlaylist]
  );

  const renderHeader = () => (
    <div className="myplaylists-header">
      <div className="myplaylists-title">
        <h2>Các Playlist</h2>
        <span className="playlist-count">{playlists.length} playlist</span>
      </div>

      <div className="myplaylists-actions">
        <div className="view-toggle">
          <button
            type="button"
            className={`toggle-btn ${
              viewMode === VIEW_MODE.GRID ? "active" : ""
            }`}
            onClick={() => setViewMode(VIEW_MODE.GRID)}
            title="Dạng lưới"
          >
            <FaThLarge />
          </button>

          <button
            type="button"
            className={`toggle-btn ${
              viewMode === VIEW_MODE.LIST ? "active" : ""
            }`}
            onClick={() => setViewMode(VIEW_MODE.LIST)}
            title="Dạng danh sách"
          >
            <FaList />
          </button>
        </div>

        <button
          type="button"
          className="btn-create"
          onClick={handleOpenCreateModal}
        >
          <FaPlus />
          <span>Tạo Playlist</span>
        </button>
      </div>
    </div>
  );

  const renderError = () =>
    error ? <div className="myplaylists-error">{error}</div> : null;

  const renderEmptyState = () => (
    <div className="myplaylists-empty">
      <p>Bạn chưa có playlist nào</p>
      <button
        type="button"
        className="btn-create"
        onClick={handleOpenCreateModal}
      >
        <FaPlus /> Tạo playlist đầu tiên
      </button>
    </div>
  );

  const renderGridView = () => (
    <div className="playlists-grid">
      {playlists.map((playlist) => (
        <PlaylistCard
          key={playlist._id}
          playlist={playlist}
          onClick={() => handleSelectPlaylist(playlist._id)}
          onEdit={() => handleOpenEditModal(playlist)}
          onDelete={() => handleAskDeletePlaylist(playlist)}
        />
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="playlists-list">
      {playlists.map((playlist, index) => (
        <PlaylistItem
          key={playlist._id}
          playlist={playlist}
          index={index + 1}
          onClick={() => handleSelectPlaylist(playlist._id)}
          onEdit={() => handleOpenEditModal(playlist)}
          onDelete={() => handleAskDeletePlaylist(playlist)}
        />
      ))}
    </div>
  );

  const renderPlaylistContent = () => {
    if (playlists.length === 0) {
      return renderEmptyState();
    }

    return viewMode === VIEW_MODE.GRID
      ? renderGridView()
      : renderListView();
  };

  if (loading) {
    return (
      <div className="myplaylists-loading">
        <div className="spinner" />
        <p>Đang tải playlist...</p>
      </div>
    );
  }

  return (
    <div className="myplaylists-wrapper">
      {loadingDetail ? (
        <div className="myplaylists-loading">
          <div className="spinner" />
          <p>Đang tải chi tiết playlist...</p>
        </div>
      ) : selectedPlaylist ? (
        <PlaylistDetail
          playlist={selectedPlaylist}
          onBack={clearSelectedPlaylist}
          onEdit={() => handleOpenEditModal(selectedPlaylist)}
          onDelete={() => handleAskDeletePlaylist(selectedPlaylist)}
          onRemoveSong={handleRemoveSong}
          removingSong={removingSong}
          deleting={deleting}
        />
      ) : (
        <div className="myplaylists-page">
          {renderHeader()}
          {renderError()}
          {renderPlaylistContent()}
        </div>
      )}

      {showModal && (
        <PlaylistModal
          playlist={editingPlaylist}
          onSave={handleSavePlaylist}
          onClose={handleCloseModal}
          saving={saving}
        />
      )}

      <ConfirmModal
        open={!!playlistToDelete}
        title="Xóa playlist"
        message={`Bạn có chắc muốn xóa playlist "${
          playlistToDelete?.name || ""
        }" không? Hành động này không thể hoàn tác.`}
        confirmText="Xóa playlist"
        cancelText="Hủy"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleConfirmDeletePlaylist}
        onClose={handleCloseDeleteModal}
      />
    </div>
  );
};

export default MyPlaylists;