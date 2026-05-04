// src/components/admin/AdminUploads.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FaCloudUploadAlt, FaMusic, FaCheckCircle,
  FaTimesCircle, FaTrash, FaSearch, FaFilter,
  FaEye, FaClock, FaUser, FaSpinner, FaSync,
  FaExclamationTriangle, FaVideo, FaBell,
  FaMicrophone, FaTag, FaCalendarAlt,
  FaAlignLeft,
} from "react-icons/fa";
import songAPI from "../../api/songAPI";
import ConfirmModal from "../common/ConfirmModal";
import ToastMessage from "../common/ToastMessage";
import "../../styles/components/admin/AdminUploads.css";

/* ════════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
════════════════════════════════════════════════════════════ */
const STATUS_CONFIG = {
  pending:  { label: "Chờ duyệt", className: "badge-pending",  icon: <FaClock /> },
  approved: { label: "Đã duyệt",  className: "badge-approved", icon: <FaCheckCircle /> },
  rejected: { label: "Từ chối",   className: "badge-rejected", icon: <FaTimesCircle /> },
};

const INITIAL_TOAST = {
  open: false,
  type: "info",
  message: "",
};

const formatDuration = (seconds) => {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const formatDate = (iso) => {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const getImageURL = (song) => {
  if (!song?.coverImage || song.coverImage === "default-cover.jpg") return null;
  if (song.coverImage.startsWith("http")) return song.coverImage;
  return `http://localhost:5000/uploads/covers/${song.coverImage}`;
};

const getAudioURL = (song) => {
  if (!song?.audioFile) return null;
  if (song.audioFile.startsWith("http")) return song.audioFile;
  return `http://localhost:5000/uploads/songs/${song.audioFile}`;
};

const getVideoURL = (song) => {
  if (!song?.videoFile || song.videoFile === "") return null;
  if (song.videoFile.startsWith("http")) return song.videoFile;
  return `http://localhost:5000/uploads/videos/${song.videoFile}`;
};

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
const AdminUploads = ({ highlightSongId, onClearHighlight }) => {
  const [uploads,       setUploads]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [searchTerm,    setSearchTerm]    = useState("");
  const [filterStatus,  setFilterStatus]  = useState("all");
  const [selected,      setSelected]      = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal,   setRejectModal]   = useState(null);
  const [rejectReason,  setRejectReason]  = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast,         setToast]         = useState(INITIAL_TOAST);
  const [stats,         setStats]         = useState({
    total: 0, pending: 0, approved: 0, rejected: 0,
  });

  const highlightRowRef = useRef(null);

  const showToast = useCallback((type, message) => {
    setToast({ open: true, type, message });
  }, []);

  const closeToast = useCallback(() => {
    setToast(INITIAL_TOAST);
  }, []);

  /* ── Fetch ── */
  const fetchUploads = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params    = filterStatus !== "all" ? { status: filterStatus } : {};
      const res       = await songAPI.adminGetAllUploads(params);
      const data      = res.data?.data  || res.data || [];
      const statsData = res.data?.stats || {};

      setUploads(Array.isArray(data) ? data : []);
      setStats({
        total:    statsData.pending + statsData.approved + statsData.rejected || data.length,
        pending:  statsData.pending  || 0,
        approved: statsData.approved || 0,
        rejected: statsData.rejected || 0,
      });
    } catch (err) {
      console.error("Lỗi fetch uploads:", err);
      setError("Không thể tải danh sách upload. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchUploads(); }, [fetchUploads]);

  /* ── Auto scroll khi có highlight ── */
  useEffect(() => {
    if (!highlightSongId || loading) return;
    const targetSong = uploads.find((u) => u._id === highlightSongId);
    if (targetSong && filterStatus !== "all" && filterStatus !== targetSong.status) {
      setFilterStatus("all");
    }
    const timer = setTimeout(() => {
      highlightRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => clearTimeout(timer);
  }, [highlightSongId, loading, uploads, filterStatus]);

  /* ── Filter ── */
  const filtered = uploads.filter((u) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.title?.toLowerCase().includes(term)               ||
      u.artist?.toLowerCase().includes(term)              ||
      u.featuring?.toLowerCase().includes(term)           ||
      u.uploadedBy?.username?.toLowerCase().includes(term)||
      u.tags?.some((t) => t.toLowerCase().includes(term))
    );
  });

  /* Actions */
  const handleApprove = useCallback(async (id) => {
    setActionLoading(id);
    try {
      const res = await songAPI.adminApproveSong(id);
      const updated = res.data?.data || res.data;
      setUploads((prev) => prev.map((u) => (u._id === id ? { ...u, ...updated } : u)));
      setStats((prev) => ({ ...prev, approved: prev.approved + 1, pending: Math.max(0, prev.pending - 1) }));
      if (selected?._id === id) setSelected((prev) => ({ ...prev, ...updated }));
      if (id === highlightSongId) onClearHighlight?.();
      showToast("success", "Đã duyệt bài hát.");
    } catch (err) {
      showToast("error", err.response?.data?.message || "Duyệt thất bại!");
    } finally {
      setActionLoading(null);
    }
  }, [selected, highlightSongId, onClearHighlight, showToast]);

  const openRejectModal = (upload) => {
    setRejectModal({ id: upload._id, title: upload.title });
    setRejectReason("");
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal) return;
    const { id } = rejectModal;
    setActionLoading(id);
    setRejectModal(null);
    try {
      const res = await songAPI.adminRejectSong(id, rejectReason);
      const updated = res.data?.data || res.data;
      setUploads((prev) => prev.map((u) => (u._id === id ? { ...u, ...updated } : u)));
      setStats((prev) => ({ ...prev, rejected: prev.rejected + 1, pending: Math.max(0, prev.pending - 1) }));
      if (selected?._id === id) setSelected((prev) => ({ ...prev, ...updated }));
      if (id === highlightSongId) onClearHighlight?.();
      showToast("success", "Đã từ chối bài hát.");
    } catch (err) {
      showToast("error", err.response?.data?.message || "Từ chối thất bại!");
    } finally {
      setActionLoading(null);
      setRejectReason("");
    }
  };

  const handleDelete = useCallback((id) => {
    const song = uploads.find((item) => item._id === id);
    setDeleteConfirm({
      id,
      title: song?.title || "upload này",
    });
  }, [uploads]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirm) return;

    const { id } = deleteConfirm;
    setActionLoading(id);
    try {
      await songAPI.adminDeleteSong(id);
      setUploads((prev) => prev.filter((u) => u._id !== id));
      setStats((prev) => {
        const song = uploads.find((u) => u._id === id);
        return { ...prev, total: Math.max(0, prev.total - 1), [song?.status]: Math.max(0, prev[song?.status] - 1) };
      });
      if (selected?._id === id) setSelected(null);
      if (highlightSongId === id) onClearHighlight?.();
      setDeleteConfirm(null);
      showToast("success", "Đã xoá upload.");
    } catch (err) {
      showToast("error", err.response?.data?.message || "Xoá thất bại!");
    } finally {
      setActionLoading(null);
    }
  }, [deleteConfirm, selected, uploads, highlightSongId, onClearHighlight, showToast]);

  /* Loading / Error */
  if (loading) {
    return (
      <div className="au-loading">
        <div className="au-spinner" />
        <span>Đang tải danh sách upload...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="au-error-state">
        <FaExclamationTriangle />
        <p>{error}</p>
        <button className="au-retry-btn" onClick={fetchUploads}>
          <FaSync /> Thử lại
        </button>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <div className="au-wrapper">

      {/* Header */}
      <div className="au-header">
        <div className="au-header-left">
          <FaCloudUploadAlt className="au-header-icon" />
          <div>
            <h1 className="au-title">Quản lý Upload</h1>
            <p className="au-subtitle">Duyệt và quản lý các bài hát được tải lên</p>
          </div>
        </div>
        <button className="au-refresh-btn" onClick={fetchUploads}>
          <FaSync /> Làm mới
        </button>
      </div>

      {/* Highlight banner */}
      {highlightSongId && (
        <div className="au-highlight-banner">
          <div className="au-highlight-banner-left">
            <FaBell className="au-highlight-bell" />
            <span>
              Bạn đang xem bài hát từ thông báo —
              <strong> cuộn xuống để tìm bài được đánh dấu</strong>
            </span>
          </div>
          <button className="au-highlight-banner-close" onClick={onClearHighlight}>✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="au-stats-grid">
        {[
          { label: "Tổng upload", value: stats.pending + stats.approved + stats.rejected, color: "blue",   icon: <FaCloudUploadAlt /> },
          { label: "Chờ duyệt",   value: stats.pending,                                  color: "yellow", icon: <FaClock /> },
          { label: "Đã duyệt",    value: stats.approved,                                 color: "green",  icon: <FaCheckCircle /> },
          { label: "Từ chối",     value: stats.rejected,                                 color: "red",    icon: <FaTimesCircle /> },
        ].map((card) => (
          <div key={card.label} className={`au-stat-card au-stat-${card.color}`}>
            <div className="au-stat-icon">{card.icon}</div>
            <div className="au-stat-info">
              <span className="au-stat-value">{card.value}</span>
              <span className="au-stat-label">{card.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="au-toolbar">
        <div className="au-search-box">
          <FaSearch className="au-search-icon" />
          <input
            type="text"
            placeholder="Tìm theo tên bài, nghệ sĩ, tag, người upload..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="au-search-input"
          />
          {searchTerm && (
            <button className="au-search-clear" onClick={() => setSearchTerm("")}>✕</button>
          )}
        </div>
        <div className="au-filter-group">
          <FaFilter className="au-filter-icon" />
          {[
            { key: "all",      label: "Tất cả"    },
            { key: "pending",  label: "Chờ duyệt" },
            { key: "approved", label: "Đã duyệt"  },
            { key: "rejected", label: "Từ chối"   },
          ].map((f) => (
            <button
              key={f.key}
              className={`au-filter-btn ${filterStatus === f.key ? "active" : ""}`}
              onClick={() => setFilterStatus(f.key)}
            >
              {f.label}
              {f.key !== "all" && stats[f.key] > 0 && (
                <span className="au-filter-count">{stats[f.key]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="au-table-wrapper">
        {filtered.length === 0 ? (
          <div className="au-empty">
            <FaCloudUploadAlt />
            <p>
              {searchTerm
                ? `Không tìm thấy kết quả cho "${searchTerm}"`
                : "Không có upload nào"}
            </p>
          </div>
        ) : (
          <table className="au-table">
            <thead>
              <tr>
                <th>Bài hát</th>
                <th>Người upload</th>
                <th>Thể loại / Năm</th>
                <th>Thời lượng</th>
                <th>Ngày upload</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((upload) => {
                const statusCfg     = STATUS_CONFIG[upload.status] || STATUS_CONFIG.pending;
                const isLoading     = actionLoading === upload._id;
                const coverURL      = getImageURL(upload);
                const isHighlighted = upload._id === highlightSongId;

                return (
                  <tr
                    key={upload._id}
                    ref={isHighlighted ? highlightRowRef : null}
                    className={`au-table-row
                      ${isLoading     ? "au-row-loading"     : ""}
                      ${selected?._id === upload._id ? "au-row-selected"   : ""}
                      ${isHighlighted ? "au-row-highlighted" : ""}
                    `}
                  >
                    {/* Bài hát */}
                    <td>
                      <div className="au-song-cell">
                        <div className="au-cover">
                          {coverURL ? (
                            <img src={coverURL} alt={upload.title}
                              onError={(e) => { e.target.style.display = "none"; }} />
                          ) : (
                            <FaMusic className="au-cover-placeholder" />
                          )}
                        </div>
                        <div className="au-song-info">
                          {isHighlighted && (
                            <span className="au-highlighted-tag">
                              <FaBell /> Từ thông báo
                            </span>
                          )}
                          <span className="au-song-title">{upload.title}</span>

                          {/*  Featuring */}
                          <span className="au-song-artist">
                            {upload.artist}
                            {upload.featuring && (
                              <span className="au-featuring"> ft. {upload.featuring}</span>
                            )}
                          </span>

                          {/*  Tags */}
                          {upload.tags?.length > 0 && (
                            <div className="au-song-tags">
                              {upload.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="au-song-tag">#{tag}</span>
                              ))}
                              {upload.tags.length > 3 && (
                                <span className="au-song-tag-more">+{upload.tags.length - 3}</span>
                              )}
                            </div>
                          )}

                          {/*  Badges: LRC + Video */}
                          <div className="au-song-badges">
                            {upload.lrc && (
                              <span className="au-badge-mini au-badge-lrc">
                                <FaMicrophone /> LRC
                              </span>
                            )}
                            {upload.videoFile && (
                              <span className="au-badge-mini au-badge-video">
                                <FaVideo /> MV
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Người upload */}
                    <td>
                      <div className="au-uploader-cell">
                        <FaUser className="au-uploader-icon" />
                        <span>{upload.uploadedBy?.username || "N/A"}</span>
                      </div>
                    </td>

                    {/*  Thể loại + Ngôn ngữ */}
                    <td>
                      <div className="au-genre-lang">
                        <span className="au-genre-tag">{upload.genre || "N/A"}</span>
                        {upload.releaseYear && (
                          <span className="au-year-tag">{upload.releaseYear}</span>
                        )}
                      </div>
                    </td>

                    {/* Thời lượng */}
                    <td className="au-duration">{formatDuration(upload.duration)}</td>

                    {/* Ngày upload */}
                    <td className="au-date">{formatDate(upload.createdAt)}</td>

                    {/* Trạng thái */}
                    <td>
                      <span className={`au-badge ${statusCfg.className}`}>
                        {statusCfg.icon} {statusCfg.label}
                      </span>
                      {upload.status === "rejected" && upload.rejectReason && (
                        <p className="au-reject-reason-preview">{upload.rejectReason}</p>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td>
                      <div className="au-actions">
                        <button
                          className="au-btn au-btn-view"
                          onClick={() => setSelected(upload)}
                          title="Xem chi tiết"
                          disabled={isLoading}
                        >
                          {isLoading ? <FaSpinner className="au-spin" /> : <FaEye />}
                        </button>
                        {upload.status !== "approved" && (
                          <button
                            className="au-btn au-btn-approve"
                            onClick={() => handleApprove(upload._id)}
                            title="Duyệt bài"
                            disabled={isLoading}
                          >
                            <FaCheckCircle />
                          </button>
                        )}
                        {upload.status !== "rejected" && (
                          <button
                            className="au-btn au-btn-reject"
                            onClick={() => openRejectModal(upload)}
                            title="Từ chối"
                            disabled={isLoading}
                          >
                            <FaTimesCircle />
                          </button>
                        )}
                        <button
                          className="au-btn au-btn-delete"
                          onClick={() => handleDelete(upload._id)}
                          title="Xoá"
                          disabled={isLoading}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {searchTerm && filtered.length > 0 && (
        <p className="au-search-result">
          Tìm thấy <strong>{filtered.length}</strong> kết quả cho "{searchTerm}"
        </p>
      )}

      {/* Modals */}
      {selected && (
        <UploadDetailModal
          upload={selected}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={openRejectModal}
          onDelete={handleDelete}
          actionLoading={actionLoading}
        />
      )}
      {rejectModal && (
        <RejectReasonModal
          title={rejectModal.title}
          reason={rejectReason}
          onReasonChange={setRejectReason}
          onConfirm={handleRejectConfirm}
          onCancel={() => { setRejectModal(null); setRejectReason(""); }}
        />
      )}
      <ConfirmModal
        open={Boolean(deleteConfirm)}
        title="Xoá upload"
        message={
          deleteConfirm
            ? `Bạn có chắc muốn xoá "${deleteConfirm.title}"?`
            : ""
        }
        confirmText="Xoá upload"
        cancelText="Huỷ"
        confirmVariant="danger"
        loading={actionLoading === deleteConfirm?.id}
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          if (!actionLoading) setDeleteConfirm(null);
        }}
      />
      <ToastMessage
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={closeToast}
      />
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   MODAL: Chi tiết upload
════════════════════════════════════════════════════════════ */
const UploadDetailModal = ({
  upload, onClose, onApprove, onReject, onDelete, actionLoading,
}) => {
  const statusCfg = STATUS_CONFIG[upload.status] || STATUS_CONFIG.pending;
  const isLoading = actionLoading === upload._id;
  const coverURL  = getImageURL(upload);
  const audioURL  = getAudioURL(upload);
  const videoURL  = getVideoURL(upload);

  const [activeTab, setActiveTab] = useState("info");

  /*  Tự động chuyển tab nếu tab hiện tại không còn hợp lệ */
  useEffect(() => {
    if (activeTab === "video"  && !videoURL)      setActiveTab("info");
    if (activeTab === "lyrics" && !upload.lyrics) setActiveTab("info");
    if (activeTab === "lrc"    && !upload.lrc)    setActiveTab("info");
  }, [activeTab, videoURL, upload.lyrics, upload.lrc]);

  /* Tabs config */
  const tabs = [
    { key: "info",   label: "Thông tin",    icon: <FaMusic />,      always: true  },
    { key: "audio",  label: "Nghe thử",     icon: <>🎧</>,          always: !!audioURL },
    { key: "video",  label: "Video MV",     icon: <FaVideo />,      always: !!videoURL },
    { key: "lyrics", label: "Lời bài hát",  icon: <FaAlignLeft />,  always: !!upload.lyrics },
    { key: "lrc",    label: "LRC Karaoke",  icon: <FaMicrophone />, always: !!upload.lrc },
  ].filter((t) => t.always);

  return (
    <div className="au-modal-overlay" onClick={onClose}>
      <div className="au-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="au-modal-header">
          <h2>Chi tiết Upload</h2>
          <button className="au-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Top: Cover + Info */}
        <div className="au-modal-top">
          <div className="au-modal-cover">
            {coverURL ? (
              <img src={coverURL} alt={upload.title} />
            ) : (
              <div className="au-modal-cover-placeholder"><FaMusic /></div>
            )}
          </div>

          <div className="au-modal-summary">
            <h3 className="au-modal-title">{upload.title}</h3>

            {/*  Featuring */}
            <p className="au-modal-artist">
              {upload.artist}
              {upload.featuring && (
                <span className="au-modal-featuring"> ft. {upload.featuring}</span>
              )}
            </p>

            <span className={`au-badge ${statusCfg.className}`}>
              {statusCfg.icon} {statusCfg.label}
            </span>

            {upload.status === "rejected" && upload.rejectReason && (
              <div className="au-modal-reject-reason">
                <FaExclamationTriangle />
                <span>{upload.rejectReason}</span>
              </div>
            )}

            {/*  Quick meta với các field mới */}
            <div className="au-modal-quick-meta">
              <span><FaUser /> {upload.uploadedBy?.username || "N/A"}</span>
              <span>🎵 {upload.genre || "N/A"}</span>
              {upload.releaseYear && <span><FaCalendarAlt /> {upload.releaseYear}</span>}
              <span>⏱ {formatDuration(upload.duration)}</span>
              {videoURL && <span className="au-has-video-tag"><FaVideo /> Có MV</span>}
              {upload.lrc && <span className="au-has-lrc-tag"><FaMicrophone /> Có LRC</span>}
            </div>

            {/*  Tags */}
            {upload.tags?.length > 0 && (
              <div className="au-modal-tags">
                <FaTag className="au-modal-tags-icon" />
                {upload.tags.map((tag) => (
                  <span key={tag} className="au-modal-tag">#{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="au-modal-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`au-modal-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="au-modal-tab-content">

          {/* Tab: Thông tin */}
          {activeTab === "info" && (
            <div className="au-modal-meta">
              {[
                { label: "Người upload", value: upload.uploadedBy?.username || "N/A"    },
                { label: "Email",        value: upload.uploadedBy?.email    || "N/A"    },
                { label: "Nghệ sĩ ft.",  value: upload.featuring            || "Không có" },
                { label: "Album",        value: upload.album                || "Single" },
                { label: "Thể loại",     value: upload.genre                || "N/A"    },
                { label: "Năm phát hành",value: upload.releaseYear          || "N/A"    },
                { label: "Thời lượng",   value: formatDuration(upload.duration)         },
                { label: "Ngày upload",  value: formatDate(upload.createdAt)            },
                { label: "File video",   value: videoURL ? " Có video MV"  : "❌ Không có" },
                { label: "LRC Karaoke",  value: upload.lrc ? ` Có (${upload.lrc.split("\n").length} dòng)` : "❌ Không có" },
                { label: "Tags",         value: upload.tags?.length > 0 ? upload.tags.map(t => `#${t}`).join("  ") : "Không có" },
                ...(upload.reviewedBy ? [
                  { label: "Người duyệt", value: upload.reviewedBy?.username  },
                  { label: "Ngày duyệt",  value: formatDate(upload.reviewedAt) },
                ] : []),
              ].map((row) => (
                <div key={row.label} className="au-meta-row">
                  <span className="au-meta-label">{row.label}</span>
                  <span className="au-meta-value">{row.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tab: Nghe thử */}
          {activeTab === "audio" && audioURL && (
            <div className="au-tab-audio">
              <div className="au-audio-cover">
                {coverURL ? (
                  <img src={coverURL} alt={upload.title} />
                ) : (
                  <div className="au-audio-cover-placeholder"><FaMusic /></div>
                )}
                <div className="au-audio-wave">
                  <span /><span /><span /><span /><span />
                </div>
              </div>
              <p className="au-audio-song-name">
                {upload.title}
                {upload.featuring && <span className="au-audio-featuring"> ft. {upload.featuring}</span>}
                {" — "}{upload.artist}
              </p>
              <audio controls src={audioURL} className="au-audio-player" preload="metadata" />
            </div>
          )}

          {/* Tab: Video MV */}
          {activeTab === "video" && videoURL && (
            <div className="au-tab-video">
              <div className="au-video-container">
                <video
                  controls src={videoURL}
                  className="au-video-player"
                  preload="metadata"
                  poster={coverURL || undefined}
                >
                  Trình duyệt không hỗ trợ video.
                </video>
              </div>
              <div className="au-video-info">
                <FaVideo className="au-video-info-icon" />
                <div>
                  <p className="au-video-info-title">{upload.title} — MV</p>
                  <p className="au-video-info-sub">{upload.videoFile}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Lời bài hát */}
          {activeTab === "lyrics" && upload.lyrics && (
            <div className="au-tab-lyrics">
              <pre className="au-lyrics-content">{upload.lyrics}</pre>
            </div>
          )}

          {/* Tab: LRC Karaoke */}
          {activeTab === "lrc" && upload.lrc && (
            <div className="au-tab-lrc">
              <div className="au-lrc-header">
                <FaMicrophone className="au-lrc-icon" />
                <div>
                  <span className="au-lrc-title">Lời đồng bộ (LRC / Karaoke)</span>
                  <span className="au-lrc-count">
                    {upload.lrc.split("\n").filter((l) => l.trim()).length} dòng
                  </span>
                </div>
              </div>

              {/* Parse và hiển thị LRC */}
              <div className="au-lrc-lines">
                {upload.lrc
                  .split("\n")
                  .filter((line) => line.trim())
                  .map((line, i) => {
                    // Parse timestamp [mm:ss.xx]
                    const match = line.match(/^\[(\d{2}:\d{2}\.\d{2})\](.*)/);
                    if (match) {
                      return (
                        <div key={i} className="au-lrc-line">
                          <span className="au-lrc-time">[{match[1]}]</span>
                          <span className="au-lrc-text">{match[2]}</span>
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="au-lrc-line au-lrc-line-raw">
                        <span className="au-lrc-text">{line}</span>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="au-modal-footer">
          {upload.status !== "approved" && (
            <button
              className="au-modal-btn au-modal-btn-approve"
              onClick={() => onApprove(upload._id)}
              disabled={isLoading}
            >
              {isLoading
                ? <><FaSpinner className="au-spin" /> Đang xử lý...</>
                : <><FaCheckCircle /> Duyệt bài</>
              }
            </button>
          )}
          {upload.status !== "rejected" && (
            <button
              className="au-modal-btn au-modal-btn-reject"
              onClick={() => onReject(upload)}
              disabled={isLoading}
            >
              <FaTimesCircle /> Từ chối
            </button>
          )}
          <button
            className="au-modal-btn au-modal-btn-delete"
            onClick={() => onDelete(upload._id)}
            disabled={isLoading}
          >
            <FaTrash /> Xoá
          </button>
          <button className="au-modal-btn au-modal-btn-cancel" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   MODAL: Từ chối
════════════════════════════════════════════════════════════ */
const RejectReasonModal = ({ title, reason, onReasonChange, onConfirm, onCancel }) => {
  const QUICK_REASONS = [
    "Chất lượng âm thanh kém",
    "Nội dung vi phạm bản quyền",
    "Thông tin bài hát không chính xác",
    "File bị lỗi hoặc không phát được",
    "Nội dung không phù hợp",
  ];

  return (
    <div className="au-modal-overlay" onClick={onCancel}>
      <div className="au-reject-modal" onClick={(e) => e.stopPropagation()}>
        <div className="au-modal-header">
          <h2><FaTimesCircle /> Từ chối bài hát</h2>
          <button className="au-modal-close" onClick={onCancel}>✕</button>
        </div>

        <div className="au-reject-modal-body">
          <p className="au-reject-song-name">Bài hát: <strong>"{title}"</strong></p>
          <p className="au-reject-quick-label">Chọn nhanh:</p>
          <div className="au-reject-quick-list">
            {QUICK_REASONS.map((r) => (
              <button
                key={r}
                className={`au-reject-quick-btn ${reason === r ? "active" : ""}`}
                onClick={() => onReasonChange(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <label className="au-reject-custom-label">Hoặc nhập lý do khác:</label>
          <textarea
            className="au-reject-textarea"
            placeholder="Nhập lý do từ chối..."
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={3}
          />
        </div>

        <div className="au-modal-footer">
          <button className="au-modal-btn au-modal-btn-reject" onClick={onConfirm}>
            <FaTimesCircle /> Xác nhận từ chối
          </button>
          <button className="au-modal-btn au-modal-btn-cancel" onClick={onCancel}>
            Huỷ
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUploads;


