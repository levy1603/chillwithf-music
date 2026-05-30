// src/pages/NotificationsPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate }                from "react-router-dom";
import {
  FaBell, FaCheck, FaTrash, FaMusic,
  FaCheckCircle, FaTimesCircle, FaSpinner,
  FaArrowLeft, FaFilter,
} from "react-icons/fa";
import { useNotifications } from "../context/NotificationContext";
import { API_ORIGIN } from "../config/api";
import "../styles/pages/NotificationsPage.css";

/* ══════════════════════════════════════════
   Config theo type
══════════════════════════════════════════ */
const TYPE_CONFIG = {
  song_approved: {
    emoji: "✅",
    icon:  <FaCheckCircle />,
    color: "#34d399",
    bg:    "rgba(52,211,153,0.10)",
    label: "Bài hát được duyệt",
  },
  song_rejected: {
    emoji: "❌",
    icon:  <FaTimesCircle />,
    color: "#f87171",
    bg:    "rgba(248,113,113,0.10)",
    label: "Bài hát bị từ chối",
  },
  new_upload: {
    emoji: "🎵",
    icon:  <FaMusic />,
    color: "#fbbf24",
    bg:    "rgba(251,191,36,0.10)",
    label: "Upload mới",
  },
  system: {
    emoji: "🔔",
    icon:  <FaBell />,
    color: "#818cf8",
    bg:    "rgba(129,140,248,0.10)",
    label: "Hệ thống",
  },
};

/* ══════════════════════════════════════════
   Format thời gian
══════════════════════════════════════════ */
const formatTime = (dateStr) => {
  const diff  = Date.now() - new Date(dateStr);
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return "Vừa xong";
  if (mins  < 60) return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days  < 30) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

/* ══════════════════════════════════════════
   Avatar theo type
══════════════════════════════════════════ */
const NotifAvatar = ({ noti, cfg }) => {
  const coverURL = noti.data?.coverImage
    ? `${API_ORIGIN}/uploads/covers/${noti.data.coverImage}`
    : null;

  if (noti.type === "song_approved" || noti.type === "song_rejected") {
    return (
      <div className="np-avatar">
        {coverURL ? (
          <img
            src={coverURL}
            alt="cover"
            className="np-avatar-img"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ) : (
          <div className="np-avatar-icon" style={{ background: cfg.bg, color: cfg.color }}>
            <FaMusic />
          </div>
        )}
        <span className="np-avatar-badge">{cfg.emoji}</span>
      </div>
    );
  }

  return (
    <div className="np-avatar">
      <div className="np-avatar-icon" style={{ background: cfg.bg, color: cfg.color }}>
        {cfg.icon}
      </div>
      <span className="np-avatar-badge">{cfg.emoji}</span>
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
const NotificationsPage = () => {
  const navigate                    = useNavigate();
  const [activeFilter, setActiveFilter] = useState("all");

  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  /* ── Fetch khi vào trang ── */
  useEffect(() => {
    fetchNotifications();
  }, []);

  /* ── Filter ── */
  const filtered = notifications.filter((n) => {
    if (activeFilter === "unread")        return !n.isRead;
    if (activeFilter === "song_approved") return n.type === "song_approved";
    if (activeFilter === "song_rejected") return n.type === "song_rejected";
    if (activeFilter === "system")        return n.type === "system";
    return true;
  });

  /* ── Click item ── */
  const handleClickItem = async (noti) => {
    if (!noti.isRead) await markAsRead(noti._id);
    if (noti.data?.songId) navigate(`/song/${noti.data.songId}`);
  };

  /* ── Xóa tất cả đã đọc ── */
  const clearAllRead = () => {
    notifications
      .filter((n) => n.isRead)
      .forEach((n) => deleteNotification(n._id));
  };

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div className="np-page">

      {/* ════ HEADER ════ */}
      <div className="np-header">
        <button className="np-back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>

        <div className="np-header-info">
          <h1 className="np-title">
            <FaBell /> Thông báo
          </h1>
          {unreadCount > 0 && (
            <span className="np-unread-badge">{unreadCount} chưa đọc</span>
          )}
        </div>

        {/* Actions */}
        <div className="np-header-actions">
          {unreadCount > 0 && (
            <button className="np-action-btn" onClick={markAllAsRead}>
              <FaCheck /> Đọc tất cả
            </button>
          )}
          {notifications.some((n) => n.isRead) && (
            <button className="np-action-btn danger" onClick={clearAllRead}>
              <FaTrash /> Xóa đã đọc
            </button>
          )}
        </div>
      </div>

      {/* ════ FILTER TABS ════ */}
      <div className="np-filters">
        {[
          { key: "all",          label: "Tất cả",      count: notifications.length },
          { key: "unread",       label: "Chưa đọc",    count: unreadCount },
          { key: "song_approved",label: "Được duyệt",  count: notifications.filter((n) => n.type === "song_approved").length },
          { key: "song_rejected",label: "Bị từ chối",  count: notifications.filter((n) => n.type === "song_rejected").length },
          { key: "system",       label: "Hệ thống",    count: notifications.filter((n) => n.type === "system").length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            className={`np-filter-btn ${activeFilter === key ? "active" : ""}`}
            onClick={() => setActiveFilter(key)}
          >
            {label}
            {count > 0 && <span className="np-filter-count">{count}</span>}
          </button>
        ))}
      </div>

      {/* ════ CONTENT ════ */}
      <div className="np-content">
        {loading ? (
          /* Loading */
          <div className="np-loading">
            <FaSpinner className="np-spin" />
            <span>Đang tải thông báo...</span>
          </div>

        ) : filtered.length === 0 ? (
          /* Empty */
          <div className="np-empty">
            <FaBell className="np-empty-icon" />
            <p className="np-empty-title">Không có thông báo nào</p>
            <p className="np-empty-sub">
              {activeFilter !== "all"
                ? "Thử chọn bộ lọc khác"
                : "Bạn chưa có thông báo nào"}
            </p>
            {activeFilter !== "all" && (
              <button
                className="np-empty-btn"
                onClick={() => setActiveFilter("all")}
              >
                Xem tất cả
              </button>
            )}
          </div>

        ) : (
          /* List */
          <div className="np-list">
            {filtered.map((noti) => {
              const cfg = TYPE_CONFIG[noti.type] || TYPE_CONFIG.system;

              return (
                <div
                  key={noti._id}
                  className={`np-item ${!noti.isRead ? "unread" : ""}`}
                  style={{
                    borderLeft: !noti.isRead
                      ? `4px solid ${cfg.color}`
                      : "4px solid transparent",
                    background: !noti.isRead ? cfg.bg : "transparent",
                  }}
                  onClick={() => handleClickItem(noti)}
                >
                  {/* Avatar */}
                  <NotifAvatar noti={noti} cfg={cfg} />

                  {/* Content */}
                  <div className="np-item-content">
                    <div className="np-item-top">
                      <span
                        className="np-item-type"
                        style={{ color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                      <span className="np-item-time">
                        {formatTime(noti.createdAt)}
                      </span>
                    </div>

                    <p className="np-item-title">{noti.title}</p>
                    <p className="np-item-msg">{noti.message}</p>

                    {/* Song info */}
                    {noti.data?.songTitle && (
                      <div className="np-item-song">
                        <FaMusic />
                        <span>{noti.data.songTitle}</span>
                        {noti.data.artist && (
                          <span className="np-item-artist">
                            — {noti.data.artist}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Lý do từ chối */}
                    {noti.type === "song_rejected" && noti.data?.rejectReason && (
                      <div className="np-item-reason">
                        <span>Lý do:</span> {noti.data.rejectReason}
                      </div>
                    )}

                    {/* Unread indicator */}
                    {!noti.isRead && (
                      <span className="np-item-new-tag">Mới</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="np-item-actions">
                    {!noti.isRead && (
                      <div
                        className="np-unread-dot"
                        style={{ background: cfg.color }}
                      />
                    )}
                    <button
                      className="np-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(noti._id);
                      }}
                      title="Xóa thông báo"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default NotificationsPage;
