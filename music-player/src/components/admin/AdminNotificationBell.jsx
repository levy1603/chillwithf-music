// src/components/admin/AdminNotificationBell.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  FaBell, FaCheck, FaMusic, FaSpinner,
  FaUser, FaUserPlus, FaCheckCircle, FaTimesCircle,
  FaExternalLinkAlt, FaTrash,
} from "react-icons/fa";
import { useNotifications } from "../../context/NotificationContext";
import getAvatarURL from "../../utils/getAvatarURL";
import "../../styles/components/admin/AdminNotificationBell.css";

/* ══════════════════════════════════════════
   Config theo type
══════════════════════════════════════════ */
const TYPE_CONFIG = {
  new_upload: {
    icon:  "🎵",
    color: "#fbbf24",
    label: "Upload mới",
    bg:    "rgba(251,191,36,0.08)",
  },
  song_approved: {
    icon:  "✅",
    color: "#34d399",
    label: "Đã duyệt",
    bg:    "rgba(52,211,153,0.08)",
  },
  song_rejected: {
    icon:  "❌",
    color: "#f87171",
    label: "Từ chối",
    bg:    "rgba(248,113,113,0.08)",
  },
  system: {
    icon:  "🔔",
    color: "#818cf8",
    label: "Hệ thống",
    bg:    "rgba(129,140,248,0.08)",
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
  return `${days} ngày trước`;
};

const AdminNotifAvatar = ({ noti, cfg }) => {
  if (noti.type === "new_upload") {
    const avatarSeed =
      noti.sender?._id || noti.sender?.email || noti.sender?.username;
    const userAvatar = noti.sender?.avatar
      ? getAvatarURL(noti.sender.avatar, 40, avatarSeed)
      : null;

    return (
      <div className="admin-noti-cover">
        {userAvatar ? (
          <img
            src={userAvatar}
            alt={noti.sender?.username || "User"}
            className="admin-noti-cover-img admin-noti-user-avatar"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <div
            className="admin-noti-cover-placeholder"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            <FaUser />
          </div>
        )}
        <span className="admin-noti-type-badge">{cfg.icon}</span>
      </div>
    );
  }

  if (noti.type === "song_approved") {
    return (
      <div className="admin-noti-cover">
        <div
          className="admin-noti-cover-placeholder"
          style={{ background: cfg.bg, color: cfg.color }}
        >
          <FaCheckCircle />
        </div>
        <span className="admin-noti-type-badge">{cfg.icon}</span>
      </div>
    );
  }

  if (noti.type === "song_rejected") {
    return (
      <div className="admin-noti-cover">
        <div
          className="admin-noti-cover-placeholder"
          style={{ background: cfg.bg, color: cfg.color }}
        >
          <FaTimesCircle />
        </div>
        <span className="admin-noti-type-badge">{cfg.icon}</span>
      </div>
    );
  }

  return (
    <div className="admin-noti-cover">
      <div
        className="admin-noti-cover-placeholder"
        style={{ background: cfg.bg, color: cfg.color }}
      >
        <FaBell />
      </div>
      <span className="admin-noti-type-badge">{cfg.icon}</span>
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
const AdminNotificationBell = ({ onNavigateToSong }) => {
  const [isOpen,       setIsOpen]       = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const dropdownRef                     = useRef(null);

  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  /* ── Click outside ── */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Toggle dropdown ── */
  const handleToggle = () => {
    if (!isOpen) fetchNotifications();
    setIsOpen((prev) => !prev);
  };

  /* ── Filter ── */
  const filtered = notifications.filter((n) => {
    if (activeFilter === "unread")     return !n.isRead;
    if (activeFilter === "new_upload") return n.type === "new_upload";
    return true;
  });

  /* ── Đếm upload mới chưa đọc ── */
  const newUploadCount = notifications.filter(
    (n) => n.type === "new_upload" && !n.isRead
  ).length;

  /* ── Click item ── */
  const handleClickItem = async (noti) => {
    if (!noti.isRead) await markAsRead(noti._id);
    if (noti.type === "new_upload" && noti.data?.songId) {
      onNavigateToSong?.(noti.data.songId);
      setIsOpen(false);
    }
  };

  /* ── Xóa tất cả đã đọc ── */
  const clearRead = () => {
    notifications
      .filter((n) => n.isRead)
      .forEach((n) => deleteNotification(n._id));
  };

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div className="admin-notif-wrapper" ref={dropdownRef}>

      {/* ── Bell Button ── */}
      <button
        className={`admin-notif-bell ${isOpen ? "active" : ""}`}
        onClick={handleToggle}
        title="Thông báo"
      >
        <FaBell />

        {/* Badge số unread */}
        {unreadCount > 0 && (
          <span className="admin-notif-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        {/* Pulse dot khi có upload mới */}
        {newUploadCount > 0 && (
          <span className="admin-notif-pulse" />
        )}
      </button>

      {/* ── Dropdown ── */}
      {isOpen && (
        <div className="admin-notif-dropdown">

          {/* ════ HEADER ════ */}
          <div className="admin-notif-header">
            <div className="admin-notif-header-top">
              <h3 className="admin-notif-title">
                Thông báo
                {unreadCount > 0 && (
                  <span className="admin-notif-unread-pill">
                    {unreadCount} mới
                  </span>
                )}
              </h3>

              <div className="admin-notif-header-actions">
                {unreadCount > 0 && (
                  <button
                    className="admin-notif-action-btn"
                    onClick={markAllAsRead}
                    title="Đánh dấu tất cả đã đọc"
                  >
                    <FaCheck /> Đọc tất cả
                  </button>
                )}
                {notifications.some((n) => n.isRead) && (
                  <button
                    className="admin-notif-action-btn danger"
                    onClick={clearRead}
                    title="Xóa thông báo đã đọc"
                  >
                    <FaTrash /> Xóa đã đọc
                  </button>
                )}
              </div>
            </div>

            {/* Filter tabs */}
            <div className="admin-notif-filters">
              {[
                {
                  key:   "all",
                  label: "Tất cả",
                  count: notifications.length,
                },
                {
                  key:   "unread",
                  label: "Chưa đọc",
                  count: unreadCount,
                },
                {
                  key:   "new_upload",
                  label: "Upload mới",
                  count: notifications.filter((n) => n.type === "new_upload").length,
                },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  className={`admin-notif-filter ${activeFilter === key ? "active" : ""}`}
                  onClick={() => setActiveFilter(key)}
                >
                  {label}
                  {count > 0 && (
                    <span className="filter-count">{count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ════ LIST ════ */}
          <div className="admin-notif-list">
            {loading ? (
              <div className="admin-notif-loading">
                <FaSpinner className="spin" />
                <span>Đang tải thông báo...</span>
              </div>

            ) : filtered.length === 0 ? (
              <div className="admin-notif-empty">
                <FaBell className="empty-bell" />
                <p>Không có thông báo nào</p>
                {activeFilter !== "all" && (
                  <button onClick={() => setActiveFilter("all")}>
                    Xem tất cả
                  </button>
                )}
              </div>

            ) : (
              filtered.map((noti) => {
                const cfg = TYPE_CONFIG[noti.type] || TYPE_CONFIG.system;

                return (
                  <div
                    key={noti._id}
                    className={`admin-notif-item ${!noti.isRead ? "unread" : ""}`}
                    style={{
                      background: !noti.isRead ? cfg.bg        : "transparent",
                      borderLeft: !noti.isRead
                        ? `3px solid ${cfg.color}`
                        : "3px solid transparent",
                    }}
                    onClick={() => handleClickItem(noti)}
                  >

                    {/* 👈 Avatar theo type - KHÔNG dùng avatar Admin */}
                    <AdminNotifAvatar noti={noti} cfg={cfg} />

                    {/* Content */}
                    <div className="admin-noti-content">
                      <div className="admin-noti-top">
                        <span
                          className="admin-noti-type-label"
                          style={{ color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                        <span className="admin-noti-time">
                          {formatTime(noti.createdAt)}
                        </span>
                      </div>

                      <p className="admin-noti-title">{noti.title}</p>
                      <p className="admin-noti-msg">{noti.message}</p>

                      {/* Song info */}
                      {noti.data?.songTitle && (
                        <div className="admin-noti-song-info">
                          <FaMusic />
                          <span>{noti.data.songTitle}</span>
                          {noti.data.artist && (
                            <span className="noti-artist">
                              — {noti.data.artist}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Sender - chỉ hiện với new_upload */}
                      {noti.type === "new_upload" && noti.sender?.username && (
                        <div className="admin-noti-sender">
                          <FaUserPlus />
                          <span>bởi {noti.sender.username}</span>
                        </div>
                      )}

                      {/* CTA */}
                      {noti.type === "new_upload" && (
                        <div className="admin-noti-cta">
                          <FaExternalLinkAlt />
                          <span>Nhấn để xem & duyệt bài</span>
                        </div>
                      )}
                    </div>

                    {/* Right: dot + delete */}
                    <div className="admin-noti-right">
                      {!noti.isRead && (
                        <span
                          className="admin-unread-dot"
                          style={{ background: cfg.color }}
                        />
                      )}
                      <button
                        className="admin-noti-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(noti._id);
                        }}
                        title="Xóa thông báo"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ════ FOOTER ════ */}
          {notifications.length > 0 && (
            <div className="admin-notif-footer">
              <span className="admin-notif-footer-info">
                Hiển thị {filtered.length}/{notifications.length} thông báo
              </span>
              {newUploadCount > 0 && (
                <span className="admin-notif-footer-urgent">
                  🔴 {newUploadCount} bài chờ duyệt
                </span>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default AdminNotificationBell;
