// src/components/admin/AdminSidebar.js
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaChartBar,
  FaMusic,
  FaUsers,
  FaListUl,
  FaCog,
  FaChevronLeft,
  FaChevronRight,
  FaArrowLeft,
  FaUserShield,
  FaCloudUploadAlt,  
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import getAvatarURL from "../../utils/getAvatarURL";
import "../../styles/components/admin/AdminSidebar.css";

const MENU_ITEMS = [
  { key: "stats",     label: "Dashboard",          icon: <FaChartBar />,        group: "main" },
  { key: "songs",     label: "Quản lý nhạc",        icon: <FaMusic />,           group: "main" },
  { key: "users",     label: "Quản lý tài khoản",   icon: <FaUsers />,           group: "main" },
  { key: "playlists", label: "Quản lý playlist",    icon: <FaListUl />,          group: "main" },
  { key: "uploads",   label: "Quản lý upload",      icon: <FaCloudUploadAlt />,  group: "upload" }, // ← mới
  { key: "settings",  label: "Cài đặt",             icon: <FaCog />,             group: "system" },
];

// Nhóm menu theo group
const GROUPS = [
  { key: "main",   label: "QUẢN TRỊ" },
  { key: "upload", label: "NỘI DUNG" },
  { key: "system", label: "HỆ THỐNG" },
];

const AdminSidebar = ({ collapsed, setCollapsed, activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const avatarSeed = user?._id || user?.email || user?.username;
  const avatarURL = getAvatarURL(user?.avatar, 32, avatarSeed);
  const fallbackAvatarURL = getAvatarURL(null, 32, avatarSeed);

  return (
    <aside className={`admin-sidebar ${collapsed ? "collapsed" : ""}`}>

      {/* ===== LOGO ===== */}
      <div className="admin-sidebar-logo">
        <div className="admin-logo-icon">
          <FaUserShield />
        </div>
        {!collapsed && (
          <div className="admin-logo-text">
            <span className="admin-logo-title">Admin Panel</span>
            <span className="admin-logo-sub">MusicVN</span>
          </div>
        )}
      </div>

      {/* ===== MENU ===== */}
      <nav className="admin-sidebar-nav">
        {GROUPS.map((group) => {
          const items = MENU_ITEMS.filter((item) => item.group === group.key);
          if (items.length === 0) return null;

          return (
            <div key={group.key} className="admin-nav-group">
              {/* Label nhóm - ẩn khi collapsed */}
              {!collapsed && (
                <span className="admin-nav-label">{group.label}</span>
              )}

              {items.map((item) => (
                <button
                  key={item.key}
                  className={`admin-nav-item ${activeTab === item.key ? "active" : ""}`}
                  onClick={() => setActiveTab(item.key)}
                  title={collapsed ? item.label : ""}
                >
                  <span className="admin-nav-icon">{item.icon}</span>
                  {!collapsed && (
                    <span className="admin-nav-text">{item.label}</span>
                  )}

                  {/* Badge ví dụ cho uploads - tuỳ chỉnh sau */}
                  {item.key === "uploads" && !collapsed && (
                    <span className="admin-nav-badge">New</span>
                  )}

                  {/* Active indicator */}
                  {activeTab === item.key && (
                    <span className="admin-nav-indicator" />
                  )}
                </button>
              ))}
            </div>
          );
        })}
      </nav>

      {/* ===== BOTTOM ===== */}
      <div className="admin-sidebar-bottom">
        {/* User info */}
        {!collapsed && (
          <div className="admin-user-info">
            <img
              src={avatarURL}
              alt={user?.username}
              onError={(e) => {
                e.currentTarget.src = fallbackAvatarURL;
              }}
            />
            <div>
              <span className="admin-user-name">{user?.username}</span>
              <span className="admin-user-role">Administrator</span>
            </div>
          </div>
        )}

        {/* Quay về trang User */}
        <button
          className="admin-back-btn"
          onClick={() => navigate("/")}
          title="Quay về trang User"
        >
          <FaArrowLeft />
          {!collapsed && <span>Quay về trang User</span>}
        </button>

        {/* Toggle collapse */}
        <button
          className="admin-toggle-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Mở rộng" : "Thu gọn"}
        >
          {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
        </button>
      </div>

    </aside>
  );
};

export default AdminSidebar;
