// components/Header/index.js
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUser, FaChevronDown } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { useBackground } from "./useBackground";
import UserDropdown from "./UserDropdown";
import BackgroundPanel from "./BackgroundPanel";
import SearchBar from "../SearchBar";
import NotificationBell from "./NotificationBell";
import "./Header.css";
import getAvatarURL, { DEFAULT_AVATAR_URL } from "../../utils/getAvatarURL";
import logoImg from "../../assets/barbara-genshin-impact.gif";
import { MdMeetingRoom } from "react-icons/md";

const DEFAULT_AVATAR = DEFAULT_AVATAR_URL;

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const [showMenu, setShowMenu] = useState(false);
  const [showBgPanel, setShowBgPanel] = useState(false);

  const avatarURL = getAvatarURL(user?.avatar, 40);

  const { activeBg, getBgKey, applyBackground, resetBackground } =
    useBackground(user?._id);

  const closeAllPanels = useCallback(() => {
    setShowMenu(false);
    setShowBgPanel(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        closeAllPanels();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeAllPanels]);

  const handleLogout = useCallback(() => {
    resetBackground();
    closeAllPanels();
    logout();
  }, [resetBackground, closeAllPanels, logout]);

  const handleNavigate = useCallback(
    (path) => {
      closeAllPanels();
      navigate(path);
    },
    [closeAllPanels, navigate],
  );

  const handleToggleMenu = useCallback(() => {
    setShowMenu((prev) => !prev);
    setShowBgPanel(false);
  }, []);

  const handleShowBgPanel = useCallback(() => {
    setShowBgPanel(true);
  }, []);

  const handleBackToMenu = useCallback(() => {
    setShowBgPanel(false);
  }, []);

  return (
    <header className="header">
      {/* ===== LEFT ===== */}
      <div className="header-left">
        <Link to="/" className="header-logo">
          <div className="logo-icon-wrapper">
            <img src={logoImg} alt="ChillWithF Logo" className="logo-icon" />
            <span className="logo-wave-3" />
            <span className="logo-wave-4" />
            <span className="logo-wave-5" />
            <span className="logo-wave-6" />
            <span className="logo-wave-7" />
          </div>
          <h1>ChillWithF</h1>
        </Link>
        <SearchBar />
      </div>
            {/* ===== CENTER ===== */}
      <div className="header-center">
        <Link to="/rooms" className="room-music-btn">
          <MdMeetingRoom className="room-icon" />
          <span>Phòng nhạc</span>
          <span className="room-badge-live">LIVE</span>
        </Link>
      </div>

      {/* ===== RIGHT ===== */}
      <div className="header-user">
        {isAuthenticated ? (
          <>
            <NotificationBell />

            <div className="user-menu-wrapper" ref={menuRef}>
              <button
                type="button"
                className={`user-trigger ${showMenu ? "active" : ""}`}
                onClick={handleToggleMenu}
                aria-label="Mở menu người dùng"
              >
                <img
                  src={avatarURL}
                  alt="avatar"
                  className="user-avatar"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_AVATAR;
                  }}
                />
                <span className="user-name">{user?.username}</span>
                <FaChevronDown
                  className={`chevron ${showMenu ? "rotated" : ""}`}
                />
              </button>

              {showMenu && !showBgPanel && (
                <UserDropdown
                  user={user}
                  onNavigate={handleNavigate}
                  onShowBgPanel={handleShowBgPanel}
                  onLogout={handleLogout}
                />
              )}

              {showMenu && showBgPanel && (
                <BackgroundPanel
                  activeBg={activeBg}
                  getBgKey={getBgKey}
                  onApply={applyBackground}
                  onReset={resetBackground}
                  onBack={handleBackToMenu}
                  onClose={closeAllPanels}
                />
              )}
            </div>
          </>
        ) : (
          <Link to="/login" className="login-link">
            <FaUser /> Đăng nhập
          </Link>
        )}
      </div>
    </header>
  );
};

export default Header;
