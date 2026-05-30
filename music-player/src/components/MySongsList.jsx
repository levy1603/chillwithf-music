// src/components/MySongsList.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaMusic, FaTrash, FaSpinner, FaCompactDisc,
  FaTimes, FaSave, FaUndo, FaClock,
  FaExclamationTriangle, FaEdit,
} from "react-icons/fa";
import songAPI  from "../api/songAPI";
import trashAPI from "../api/trashAPI";
import { useMusicContext } from "../context/MusicContext";
import { API_ORIGIN } from "../config/api";
import "../styles/components/MySongsList.css";

const BASE_URL = API_ORIGIN;

const getCoverURL = (song) => {
  if (!song?.coverImage) return "/images/default-cover.svg";
  if (song.coverImage.startsWith("http")) return song.coverImage;
  return `${BASE_URL}/uploads/covers/${song.coverImage}`;
};

const getTrashCoverURL = (songData) => {
  if (!songData?.coverImage) return "/images/default-cover.svg";
  if (songData.coverImage.startsWith("http")) return songData.coverImage;
  return `${BASE_URL}/uploads/covers/${songData.coverImage}`;
};

const formatTimeLeft = (seconds) => {
  if (seconds <= 0) return "Hết hạn";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d} ngày ${h} giờ`;
  if (h > 0) return `${h} giờ ${m} phút`;
  return `${m} phút`;
};

const getBarColor = (seconds) => {
  const pct = (seconds / (7 * 86400)) * 100;
  if (pct > 50) return "#1db954";
  if (pct > 25) return "#facc15";
  return "#f87171";
};

const genres = [
  "Pop","Rock","R&B","Hip-Hop","Jazz",
  "Classical","Electronic","Indie","Ballad","Khác",
];

// ════════════════════════════════════════════════════════
// CONFIRM MODAL
// ════════════════════════════════════════════════════════
const ConfirmModal = ({ isOpen, onClose, onConfirm, loading, type, songName }) => {
  if (!isOpen) return null;
  const isSoft = type === "soft";

  return (
    <div className="msl-confirm-overlay" onClick={onClose}>
      <div className="msl-confirm-box" onClick={(e) => e.stopPropagation()}>

        <div className={`msl-confirm-icon ${!isSoft ? "danger" : ""}`}>
          {isSoft ? <FaTrash /> : <FaExclamationTriangle />}
        </div>

        <h4>{isSoft ? "Xóa bài hát?" : "Xóa vĩnh viễn?"}</h4>

        <p>
          {isSoft ? (
            <>
              Bài <strong>"{songName}"</strong> sẽ được chuyển vào{" "}
              <strong style={{ color: "#f87171" }}>Thùng rác</strong>.
              Bạn có thể khôi phục trong vòng <strong>7 ngày</strong>.
            </>
          ) : (
            <>
              Bài <strong>"{songName}"</strong> sẽ bị xóa hoàn toàn
              và <strong>không thể khôi phục</strong>.
            </>
          )}
        </p>

        <div className="msl-confirm-actions">
          <button
            className="msl-btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            <FaTimes /> Hủy
          </button>
          <button
            className="msl-btn-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <><FaSpinner className="msl-spin" /> Đang xử lý...</>
            ) : isSoft ? (
              <><FaTrash /> Chuyển vào thùng rác</>
            ) : (
              <><FaExclamationTriangle /> Xóa vĩnh viễn</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════
const MySongsList = ({ onClose }) => {
  const navigate = useNavigate();
  const { currentSong, isPlaying, playSong, togglePlay, fetchSongs } =
    useMusicContext();

  const [activeTab, setActiveTab] = useState("songs");

  // Songs state
  const [songs, setSongs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm]   = useState({ title:"", artist:"", album:"", genre:"" });
  const [savingId, setSavingId]   = useState(null);
  const [editError, setEditError] = useState("");

  // Trash state
  const [trashItems, setTrashItems]         = useState([]);
  const [trashLoading, setTrashLoading]     = useState(false);
  const [trashError, setTrashError]         = useState("");
  const [restoringId, setRestoringId]       = useState(null);
  const [permDeletingId, setPermDeletingId] = useState(null);

  // Modal state
  const [modal, setModal] = useState({
    isOpen   : false,
    type     : "soft",
    songId   : null,
    songName : "",
    loading  : false,
  });

  // ════ FETCH ════
  const fetchMySongs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res  = await songAPI.getMySongs();
      const data = res.data?.data || res.data;
      setSongs(Array.isArray(data) ? data : []);
    } catch {
      setError("Không thể tải danh sách bài hát!");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrash = useCallback(async () => {
    try {
      setTrashLoading(true);
      setTrashError("");
      const res = await trashAPI.getTrash();
      setTrashItems(res.data?.data || []);
    } catch {
      setTrashError("Không thể tải thùng rác!");
    } finally {
      setTrashLoading(false);
    }
  }, []);

  useEffect(() => { fetchMySongs(); }, [fetchMySongs]);
  useEffect(() => {
    if (activeTab === "trash") fetchTrash();
  }, [activeTab, fetchTrash]);

  // ════ PLAY ════
  const handlePlay = (song) => {
    if (currentSong?._id === song._id) togglePlay();
    else playSong(song);
  };

  // ════ EDIT ════
  const handleOpenEdit = (song) => {
    setEditingId(song._id);
    setEditForm({
      title  : song.title  || "",
      artist : song.artist || "",
      album  : song.album  || "",
      genre  : song.genre  || "",
    });
    setEditError("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ title:"", artist:"", album:"", genre:"" });
    setEditError("");
  };

  const handleSaveEdit = async (songId) => {
    if (!editForm.title.trim())  return setEditError("Tên bài hát không được để trống!");
    if (!editForm.artist.trim()) return setEditError("Tên nghệ sĩ không được để trống!");
    setSavingId(songId);
    setEditError("");
    try {
      const formData = new FormData();
      Object.entries(editForm).forEach(([k, v]) => formData.append(k, v.trim()));
      await songAPI.update(songId, formData);
      setSongs((prev) =>
        prev.map((s) => s._id === songId ? { ...s, ...editForm } : s)
      );
      fetchSongs();
      handleCancelEdit();
    } catch (err) {
      setEditError(err.response?.data?.message || "Lỗi khi cập nhật!");
    } finally {
      setSavingId(null);
    }
  };

  // ════ SOFT DELETE ════
  const openSoftDeleteModal = (song) => {
    setModal({
      isOpen   : true,
      type     : "soft",
      songId   : song._id,
      songName : song.title,
      loading  : false,
    });
  };

  const handleSoftDelete = async () => {
    setModal((prev) => ({ ...prev, loading: true }));
    try {
      await trashAPI.softDelete(modal.songId);
      setSongs((prev) => prev.filter((s) => s._id !== modal.songId));
      fetchSongs();
      setModal({ isOpen: false, type: "soft", songId: null, songName: "", loading: false });
      setActiveTab("trash");
    } catch {
      setError("Không thể xóa bài hát!");
      setModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // ════ PERMANENT DELETE ════
  const openPermanentDeleteModal = (item) => {
    setModal({
      isOpen   : true,
      type     : "permanent",
      songId   : item._id,
      songName : item.songData?.title || "",
      loading  : false,
    });
  };

  const handlePermanentDelete = async () => {
    setModal((prev) => ({ ...prev, loading: true }));
    setPermDeletingId(modal.songId);
    try {
      await trashAPI.permanentDelete(modal.songId);
      setTrashItems((prev) => prev.filter((t) => t._id !== modal.songId));
      setModal({ isOpen: false, type: "soft", songId: null, songName: "", loading: false });
    } catch {
      setTrashError("Không thể xóa vĩnh viễn!");
      setModal((prev) => ({ ...prev, loading: false }));
    } finally {
      setPermDeletingId(null);
    }
  };

  // ════ RESTORE ════
  const handleRestore = async (trashId) => {
    setRestoringId(trashId);
    try {
      await trashAPI.restore(trashId);
      setTrashItems((prev) => prev.filter((t) => t._id !== trashId));
      fetchMySongs();
      fetchSongs();
    } catch {
      setTrashError("Không thể khôi phục!");
    } finally {
      setRestoringId(null);
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("vi-VN", {
      day:"2-digit", month:"2-digit", year:"numeric",
    });

  // ════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════
  return (
    <>
      {/* ── BACKDROP ── */}
      <div className="msl-backdrop" onClick={onClose}>

        {/* ── PANEL ── */}
        <div className="msl-panel" onClick={(e) => e.stopPropagation()}>

          {/* ── HEADER ── */}
          <div className="msl-header">
            <div className="msl-header-title">
              <FaCompactDisc />
              <span>Nhạc của tôi</span>
            </div>
            <button className="msl-close" onClick={onClose}>
              <FaTimes />
            </button>
          </div>

          {/* ── TABS ── */}
          <div className="msl-tabs">
            <button
              className={`msl-tab ${activeTab === "songs" ? "active" : ""}`}
              onClick={() => setActiveTab("songs")}
            >
              <FaMusic />
              <span>Đã upload</span>
              <span className="msl-tab-badge">{songs.length}</span>
            </button>
            <button
              className={`msl-tab ${activeTab === "trash" ? "active" : ""}`}
              onClick={() => setActiveTab("trash")}
            >
              <FaTrash />
              <span>Thùng rác</span>
              {trashItems.length > 0 && (
                <span className="msl-tab-badge danger">
                  {trashItems.length}
                </span>
              )}
            </button>
          </div>

          {/* ── BODY ── */}
          <div className="msl-body">

            {/* ══ TAB: SONGS ══ */}
            {activeTab === "songs" && (
              <>
                {loading ? (
                  <div className="msl-state">
                    <FaSpinner className="msl-spin" size={24} />
                    <p>Đang tải...</p>
                  </div>
                ) : error ? (
                  <div className="msl-state">
                    <p>{error}</p>
                    <button onClick={fetchMySongs}>Thử lại</button>
                  </div>
                ) : songs.length === 0 ? (
                  <div className="msl-state">
                    <FaMusic size={32} />
                    <p>Bạn chưa upload bài hát nào</p>
                    <button onClick={() => { onClose(); navigate("/upload"); }}>
                      Upload ngay
                    </button>
                  </div>
                ) : (
                  <div className="msl-list">
                    {songs.map((song) => {
                      const isCurrent  = currentSong?._id === song._id;
                      const isPlaying_ = isCurrent && isPlaying;
                      const isEditing  = editingId === song._id;

                      return (
                        <div
                          key={song._id}
                          className={`msl-song-item ${isCurrent ? "active" : ""}`}
                        >
                          {!isEditing ? (
                            <>
                              {/* Cover */}
                              <div
                                className="msl-song-cover"
                                onClick={() => handlePlay(song)}
                              >
                                <img
                                  src={getCoverURL(song)}
                                  alt={song.title}
                                  onError={(e) => {
                                    e.target.src = "/images/default-cover.svg";
                                  }}
                                />
                                {isPlaying_ && (
                                  <div className="msl-playing-indicator">
                                    <span /><span /><span />
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div
                                className="msl-song-info"
                                onClick={() => {
                                  onClose();
                                  navigate(`/song/${song._id}`);
                                }}
                              >
                                <p className="msl-song-title">{song.title}</p>
                                <p className="msl-song-artist">
                                  {song.artist} · {formatDate(song.createdAt)}
                                </p>
                              </div>

                              {/* Actions */}
                              <div className="msl-song-actions">
                                <button
                                  className="msl-btn-edit"
                                  onClick={() => handleOpenEdit(song)}
                                  title="Chỉnh sửa"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  className="msl-btn-soft-delete"
                                  onClick={() => openSoftDeleteModal(song)}
                                  title="Xóa vào thùng rác"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </>
                          ) : (
                            /* ── EDIT FORM ── */
                            <div className="msl-edit-form">
                              {editError && (
                                <div className="msl-edit-error">
                                  <FaTimes /> {editError}
                                </div>
                              )}

                              <div className="msl-edit-top">
                                <img
                                  className="msl-edit-cover"
                                  src={getCoverURL(song)}
                                  alt={song.title}
                                  onError={(e) => {
                                    e.target.src = "/images/default-cover.svg";
                                  }}
                                />
                                <div className="msl-edit-fields-top">
                                  <input
                                    className="msl-input"
                                    type="text"
                                    value={editForm.title}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, title: e.target.value })
                                    }
                                    placeholder="Tên bài hát *"
                                    maxLength={100}
                                  />
                                  <input
                                    className="msl-input"
                                    type="text"
                                    value={editForm.artist}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, artist: e.target.value })
                                    }
                                    placeholder="Nghệ sĩ *"
                                    maxLength={100}
                                  />
                                </div>
                              </div>

                              <div className="msl-edit-row">
                                <input
                                  className="msl-input"
                                  type="text"
                                  value={editForm.album}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, album: e.target.value })
                                  }
                                  placeholder="Album"
                                  maxLength={100}
                                />
                                <select
                                  className="msl-select"
                                  value={editForm.genre}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, genre: e.target.value })
                                  }
                                >
                                  <option value="">Thể loại...</option>
                                  {genres.map((g) => (
                                    <option key={g} value={g}>{g}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="msl-edit-actions">
                                <button
                                  className="msl-btn-cancel-edit"
                                  onClick={handleCancelEdit}
                                  disabled={savingId === song._id}
                                >
                                  <FaTimes /> Hủy
                                </button>
                                <button
                                  className="msl-btn-save-edit"
                                  onClick={() => handleSaveEdit(song._id)}
                                  disabled={savingId === song._id}
                                >
                                  {savingId === song._id ? (
                                    <><FaSpinner className="msl-spin" /> Đang lưu...</>
                                  ) : (
                                    <><FaSave /> Lưu</>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ══ TAB: TRASH ══ */}
            {activeTab === "trash" && (
              <>
                {trashLoading ? (
                  <div className="msl-state">
                    <FaSpinner className="msl-spin" size={24} />
                    <p>Đang tải...</p>
                  </div>
                ) : trashError ? (
                  <div className="msl-state">
                    <p>{trashError}</p>
                    <button onClick={fetchTrash}>Thử lại</button>
                  </div>
                ) : trashItems.length === 0 ? (
                  <div className="msl-state">
                    <FaTrash size={28} style={{ opacity: 0.25 }} />
                    <p>Thùng rác trống</p>
                  </div>
                ) : (
                  <div className="msl-list">
                    {/* Notice */}
                    <div className="msl-trash-notice">
                      <FaClock size={12} />
                      <span>Bài hát sẽ bị xóa vĩnh viễn sau 7 ngày kể từ khi xóa</span>
                    </div>

                    {trashItems.map((item) => {
                      const pct = Math.min(
                        100,
                        ((7 * 86400 - item.secondsLeft) / (7 * 86400)) * 100
                      );
                      return (
                        <div key={item._id} className="msl-trash-item">

                          {/* Cover */}
                          <div className="msl-trash-cover">
                            <img
                              src={getTrashCoverURL(item.songData)}
                              alt={item.songData?.title}
                              onError={(e) => {
                                e.target.src = "/images/default-cover.svg";
                              }}
                            />
                            <div className="msl-trash-cover-overlay" />
                          </div>

                          {/* Info */}
                          <div className="msl-trash-info">
                            <p className="msl-trash-title">
                              {item.songData?.title}
                            </p>
                            <p className="msl-trash-artist">
                              {item.songData?.artist || "Unknown"}
                            </p>
                            <div className="msl-trash-timer">
                              <FaClock size={9} />
                              <span>Còn {formatTimeLeft(item.secondsLeft)}</span>
                            </div>
                            <div className="msl-trash-bar-bg">
                              <div
                                className="msl-trash-bar-fill"
                                style={{
                                  width      : `${pct}%`,
                                  background : getBarColor(item.secondsLeft),
                                }}
                              />
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="msl-trash-actions">
                            <button
                              className="msl-btn-restore"
                              onClick={() => handleRestore(item._id)}
                              disabled={restoringId === item._id}
                              title="Khôi phục"
                            >
                              {restoringId === item._id ? (
                                <FaSpinner className="msl-spin" />
                              ) : (
                                <><FaUndo /><span>Khôi phục</span></>
                              )}
                            </button>
                            <button
                              className="msl-btn-del-perm"
                              onClick={() => openPermanentDeleteModal(item)}
                              disabled={permDeletingId === item._id}
                              title="Xóa vĩnh viễn"
                            >
                              <FaTrash />
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

          </div>{/* end msl-body */}
        </div>{/* end msl-panel */}
      </div>{/* end msl-backdrop */}

      {/* ── CONFIRM MODAL ── */}
      <ConfirmModal
        isOpen    = {modal.isOpen}
        type      = {modal.type}
        songName  = {modal.songName}
        loading   = {modal.loading}
        onClose   = {() => setModal((p) => ({ ...p, isOpen: false }))}
        onConfirm = {modal.type === "soft" ? handleSoftDelete : handlePermanentDelete}
      />
    </>
  );
};

export default MySongsList;
