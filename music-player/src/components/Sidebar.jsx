// components/Sidebar.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
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
  FaBars,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useMusicContext } from "../context/MusicContext";
import "../styles/components/Sidebar.css";

const Sidebar = () => {
  const { isAuthenticated, user } = useAuth();
  const { songs = [] } = useMusicContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 1024);
  const [mobileOpen, setMobileOpen] = useState(false);
  const showText = isMobile || !collapsed;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile, location.pathname, location.search]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      isMobile ? "0px" : collapsed ? "72px" : "248px"
    );
  }, [collapsed, isMobile]);

  const handleToggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
      return;
    }

    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebarCollapsed", String(next));
      document.documentElement.style.setProperty(
        "--sidebar-width",
        next ? "72px" : "248px"
      );
      return next;
    });
  }, [isMobile]);

  const mainLinks = useMemo(() => {
    const links = [
      {
        to: "/",
        label: "Trang Chủ",
        icon: FaHome,
        end: true,
      },
    ];

    if (isAuthenticated) {
      links.push(
        {
          to: "/favorites",
          label: "Yêu Thích",
          icon: FaHeart,
        },
        {
          to: "/playlist",
          label: "Nhạc Đã Nghe",
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

  const exploreItems = useMemo(() => {
    const safeSongs = Array.isArray(songs) ? songs : [];

    const genreCounter = safeSongs.reduce((acc, song) => {
      const rawGenre = song?.genre;
      const normalizedGenre =
        typeof rawGenre === "string" && rawGenre.trim()
          ? rawGenre.trim()
          : "Khác";
      acc[normalizedGenre] = (acc[normalizedGenre] || 0) + 1;
      return acc;
    }, {});

    const topGenreEntry = Object.entries(genreCounter).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const topGenreName = topGenreEntry?.[0] || "Khác";
    const topGenreCount = topGenreEntry?.[1] || 0;

    const topLikedSong = [...safeSongs].sort(
      (a, b) => (b?.likeCount || 0) - (a?.likeCount || 0)
    )[0];
    const topLikedSongName = topLikedSong?.title || "Chưa có dữ liệu";
    const topLikedSongLikes = topLikedSong?.likeCount || 0;

    const hotSong = [...safeSongs].sort((a, b) => {
      const scoreA = (a?.playCount || 0) * 0.7 + (a?.likeCount || 0) * 0.3;
      const scoreB = (b?.playCount || 0) * 0.7 + (b?.likeCount || 0) * 0.3;
      return scoreB - scoreA;
    })[0];
    const hotSongName = hotSong?.title || "Chưa có dữ liệu";
    const hotSongPlays = hotSong?.playCount || 0;

    return [
      {
        key: "top-genre",
        label: "Thể Loại Hàng Đầu",
        icon: FaLayerGroup,
        to: `/search?genre=${encodeURIComponent(topGenreName)}`,
        title: `Thể loại nổi bật: ${topGenreName} (${topGenreCount} bài)`,
      },
      {
        key: "top-liked-song",
        label: "Bài Hát Được Yêu Thích",
        icon: FaHeart,
        to: "/search?sort=likes",
        title: `Bài được thích nhiều nhất: ${topLikedSongName} (${topLikedSongLikes} lượt thích)`,
      },
      {
        key: "hot-songs",
        label: "Nhạc Hot",
        icon: FaCompactDisc,
        to: "/search?sort=popular",
        title: `Bài hot hiện tại: ${hotSongName} (${hotSongPlays} lượt nghe)`,
      },
    ];
  }, [songs]);

  const handleExploreClick = useCallback(
    (to) => {
      if (!to) return;
      if (isMobile) {
        setMobileOpen(false);
      }
      navigate(to);
    },
    [isMobile, navigate]
  );

  return (
    <>
      {isMobile && (
        <button
          type="button"
          className="sidebar-mobile-trigger"
          onClick={() => setMobileOpen(true)}
          aria-label="Mở menu điều hướng"
          title="Mở menu"
        >
          <FaBars />
        </button>
      )}

      {isMobile && mobileOpen && (
        <button
          type="button"
          className="sidebar-mobile-overlay"
          onClick={() => setMobileOpen(false)}
          aria-label="Đóng menu điều hướng"
        />
      )}

      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""} ${
          isMobile ? "mobile" : ""
        } ${isMobile && mobileOpen ? "mobile-open" : ""}`}
      >
      <button
        type="button"
        className="sidebar-toggle-btn"
        onClick={handleToggle}
        title={
          isMobile
            ? mobileOpen
              ? "Đóng menu"
              : "Mở menu"
            : collapsed
            ? "Mở Rộng"
            : "Thu Gọn"
        }
        aria-label={
          isMobile
            ? mobileOpen
              ? "Đóng thanh bên"
              : "Mở thanh bên"
            : collapsed
            ? "Mở rộng thanh bên"
            : "Thu gọn thanh bên"
        }
      >
        {isMobile ? (
          mobileOpen ? (
            <FaChevronLeft />
          ) : (
            <FaChevronRight />
          )
        ) : collapsed ? (
          <FaChevronRight />
        ) : (
          <FaChevronLeft />
        )}
      </button>

      <div className="sidebar-scroll">
        {/* MENU */}
        <nav className="sidebar-nav">
          {showText && <h3 className="sidebar-title">MENU</h3>}

          {mainLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="sidebar-link"
                title={item.label}
                end={item.end}
                onClick={() => {
                  if (isMobile) {
                    setMobileOpen(false);
                  }
                }}
              >
                <Icon />
                {showText && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* KHÁM PHÁ */}
        <div className="sidebar-playlists">
          {showText && (
            <h3 className="sidebar-title sidebar-title-with-icon">
              <FaCompass />
              <span>KHÁM PHÁ</span>
            </h3>
          )}

          {exploreItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.key}
                className="playlist-item"
                title={item.title || item.label}
                onClick={() => handleExploreClick(item.to)}
              >
                <Icon />
                {showText && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* QUẢN TRỊ */}
        {isAuthenticated && user?.role === "admin" && (
          <div className="sidebar-admin">
            {showText && <h3 className="sidebar-title">QUẢN TRỊ</h3>}

            <NavLink
              to="/admin"
              className="sidebar-link sidebar-link-admin"
              title="Trang Quản Trị"
              onClick={() => {
                if (isMobile) {
                  setMobileOpen(false);
                }
              }}
            >
              <FaUserShield />
              {showText && <span>Quản Trị</span>}
            </NavLink>
          </div>
        )}
      </div>
      </aside>
    </>
  );
};

export default Sidebar;
