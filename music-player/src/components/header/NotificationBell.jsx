// components/Header/NotificationBell.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  FaBell,
  FaCheck,
  FaMusic,
  FaSpinner,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../context/NotificationContext";
import { API_ORIGIN } from "../../config/api";
import "./NotificationBell.css";

const API_BASE = API_ORIGIN;

const TYPE_CONFIG = {
  song_approved: {
    emoji: "✅",
    icon: <FaCheckCircle />,
    color: "#34d399",
    bg: "rgba(52,211,153,0.12)",
    label: "Đã duyệt",
  },
  song_rejected: {
    emoji: "❌",
    icon: <FaTimesCircle />,
    color: "#f87171",
    bg: "rgba(248,113,113,0.12)",
    label: "Từ chối",
  },
  system: {
    emoji: "🔔",
    icon: <FaBell />,
    color: "#818cf8",
    bg: "rgba(129,140,248,0.12)",
    label: "Hệ thống",
  },
  new_upload: {
    emoji: "🎵",
    icon: <FaMusic />,
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.12)",
    label: "Upload",
  },
};

const getCoverURL = (coverImage) => {
  if (!coverImage) return null;
  return `${API_BASE}/uploads/covers/${coverImage}`;
};

const NotificationAvatar = ({ noti }) => {
  const config = TYPE_CONFIG[noti.type] || TYPE_CONFIG.system;

  if (noti.type === "song_approved" || noti.type === "song_rejected") {
    const coverURL = noti.data?.coverImage
      ? getCoverURL(noti.data.coverImage)
      : null;

    return (
      <div className="noti-avatar">
        {coverURL ? (
          <img
            src={coverURL}
            alt="cover"
            className="noti-avatar-img"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div
            className="noti-avatar-icon"
            style={{ background: config.bg, color: config.color }}
          >
            <FaMusic />
          </div>
        )}

        <span className="noti-type-badge">{config.emoji}</span>
      </div>
    );
  }

  return (
    <div className="noti-avatar">
      <div
        className="noti-avatar-icon"
        style={{ background: config.bg, color: config.color }}
      >
        {config.icon}
      </div>

      <span className="noti-type-badge">{config.emoji}</span>
    </div>
  );
};

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications,
  } = useNotifications();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = useCallback(() => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen((prev) => !prev);
  }, [isOpen, fetchNotifications]);

  const handleClickItem = useCallback(
    async (noti) => {
      if (!noti.isRead) {
        await markAsRead(noti._id);
      }

      setIsOpen(false);

      if (noti.data?.songId) {
        navigate(`/song/${noti.data.songId}`);
      }
    },
    [markAsRead, navigate]
  );

  const handleViewAll = useCallback(() => {
    setIsOpen(false);
    navigate("/notifications");
  }, [navigate]);

  const formatTime = useCallback((dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "Vừa xong";
    if (mins < 60) return `${mins} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  }, []);

  return (
    <div className="notification-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className={`notification-bell ${isOpen ? "active" : ""}`}
        onClick={handleToggle}
        aria-label="Thông báo"
      >
        <FaBell />

        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <span className="notification-title">
              Thông báo
              {unreadCount > 0 && (
                <span className="header-unread-count">{unreadCount} mới</span>
              )}
            </span>

            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-mark-all"
                onClick={markAllAsRead}
              >
                <FaCheck /> Đọc tất cả
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-loading">
                <FaSpinner className="spin" /> Đang tải...
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <FaBell className="notification-empty-icon" />
                <p className="notification-empty-text">Không có thông báo nào</p>
                <p className="notification-empty-sub">
                  Bạn sẽ nhận thông báo khi có cập nhật mới
                </p>
              </div>
            ) : (
              notifications.map((noti) => {
                const config = TYPE_CONFIG[noti.type] || TYPE_CONFIG.system;

                return (
                  <div
                    key={noti._id}
                    className={`notification-item ${!noti.isRead ? "unread" : ""}`}
                    style={{
                      borderLeft: !noti.isRead
                        ? `3px solid ${config.color}`
                        : "3px solid transparent",
                    }}
                    onClick={() => handleClickItem(noti)}
                  >
                    <NotificationAvatar noti={noti} />

                    <div className="noti-content">
                      <div className="noti-content-top">
                        <span
                          className="noti-type-label"
                          style={{ color: config.color }}
                        >
                          {config.label}
                        </span>

                        <span className="noti-time">
                          {formatTime(noti.createdAt)}
                        </span>
                      </div>

                      <p className="noti-title">{noti.title}</p>
                      <p className="noti-message">{noti.message}</p>

                      {noti.type === "song_rejected" &&
                        noti.data?.rejectReason && (
                          <p className="noti-reject-reason">
                            ⚠️ {noti.data.rejectReason}
                          </p>
                        )}
                    </div>

                    <div className="noti-actions">
                      {!noti.isRead && (
                        <span
                          className="unread-dot"
                          style={{ background: config.color }}
                        />
                      )}

                      <button
                        type="button"
                        className="noti-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(noti._id);
                        }}
                        title="Xóa"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="notification-footer">
            <button
              type="button"
              className="notification-view-all"
              onClick={handleViewAll}
            >
              <FaBell />
              Xem tất cả thông báo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
