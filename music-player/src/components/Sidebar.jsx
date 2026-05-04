// components/Sidebar.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { NavLink } from "react-router-dom";
import {
  FaHome,
  FaHeart,
  FaListUl,
  FaCompactDisc,
  FaChevronLeft,
  FaChevronRight,
  FaUserShield,
  FaLayerGroup,
  FaCompass,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import "../styles/components/Sidebar.css";

const EXPLORE_ITEMS = [
  { label: "Nhạc Việt Hot", icon: FaCompactDisc },
  { label: "Chill & Relax", icon: FaCompactDisc },
  { label: "Workout Mix", icon: FaCompactDisc },
];

const Sidebar = () => {
  const { isAuthenticated, user } = useAuth();

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      collapsed ? "72px" : "248px"
    );
  }, [collapsed]);

  const handleToggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebarCollapsed", String(next));
      document.documentElement.style.setProperty(
        "--sidebar-width",
        next ? "72px" : "248px"
      );
      return next;
    });
  }, []);

  const mainLinks = useMemo(() => {
    const links = [
      {
        to: "/",
        label: "Trang chủ",
        icon: FaHome,
        end: true,
      },
    ];

    if (isAuthenticated) {
      links.push(
        {
          to: "/favorites",
          label: "Yêu thích",
          icon: FaHeart,
        },
        {
          to: "/playlist",
          label: "Nhạc đã nghe",
          icon: FaListUl,
        },
        {
          to: "/my-playlists",
          label: "Các Playlist",
          icon: FaLayerGroup,
        }
      );
    }

    return links;
  }, [isAuthenticated]);

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <button
        type="button"
        className="sidebar-toggle-btn"
        onClick={handleToggle}
        title={collapsed ? "Mở rộng" : "Thu gọn"}
        aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
      >
        {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
      </button>

      <div className="sidebar-scroll">
        {/* MENU */}
        <nav className="sidebar-nav">
          {!collapsed && <h3 className="sidebar-title">MENU</h3>}

          {mainLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="sidebar-link"
                title={item.label}
                end={item.end}
              >
                <Icon />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* KHÁM PHÁ */}
        <div className="sidebar-playlists">
          {!collapsed && (
            <h3 className="sidebar-title sidebar-title-with-icon">
              <FaCompass />
              <span>KHÁM PHÁ</span>
            </h3>
          )}

          {EXPLORE_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.label}
                className="playlist-item"
                title={item.label}
              >
                <Icon />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* ADMIN */}
        {isAuthenticated && user?.role === "admin" && (
          <div className="sidebar-admin">
            {!collapsed && <h3 className="sidebar-title">QUẢN TRỊ</h3>}

            <NavLink
              to="/admin"
              className="sidebar-link sidebar-link-admin"
              title="Trang quản trị"
            >
              <FaUserShield />
              {!collapsed && <span>Quản trị</span>}
            </NavLink>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;