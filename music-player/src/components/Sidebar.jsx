// components/Sidebar.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
import { useMusicContext } from "../context/MusicContext";
import "../styles/components/Sidebar.css";

const Sidebar = () => {
  const { isAuthenticated, user } = useAuth();
  const { songs = [] } = useMusicContext();
  const navigate = useNavigate();

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
        label: "Trang chu",
        icon: FaHome,
        end: true,
      },
    ];

    if (isAuthenticated) {
      links.push(
        {
          to: "/favorites",
          label: "Yeu thich",
          icon: FaHeart,
        },
        {
          to: "/playlist",
          label: "Nhac da nghe",
          icon: FaListUl,
        },
        {
          to: "/my-playlists",
          label: "Cac Playlist",
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
          : "Khac";
      acc[normalizedGenre] = (acc[normalizedGenre] || 0) + 1;
      return acc;
    }, {});

    const topGenreEntry = Object.entries(genreCounter).sort((a, b) => b[1] - a[1])[0];
    const topGenreName = topGenreEntry?.[0] || "Khac";
    const topGenreCount = topGenreEntry?.[1] || 0;

    const topLikedSong = [...safeSongs].sort(
      (a, b) => (b?.likeCount || 0) - (a?.likeCount || 0)
    )[0];
    const topLikedSongName = topLikedSong?.title || "Chua co du lieu";
    const topLikedSongLikes = topLikedSong?.likeCount || 0;

    const hotSong = [...safeSongs].sort((a, b) => {
      const scoreA = (a?.playCount || 0) * 0.7 + (a?.likeCount || 0) * 0.3;
      const scoreB = (b?.playCount || 0) * 0.7 + (b?.likeCount || 0) * 0.3;
      return scoreB - scoreA;
    })[0];
    const hotSongName = hotSong?.title || "Chua co du lieu";
    const hotSongPlays = hotSong?.playCount || 0;

    return [
      {
        key: "top-genre",
        label: "Top the loai bai",
        icon: FaLayerGroup,
        to: `/search?genre=${encodeURIComponent(topGenreName)}`,
        title: `Top the loai: ${topGenreName} (${topGenreCount} bai)`,
      },
      {
        key: "top-liked-song",
        label: "Bai hat duoc yeu thich",
        icon: FaHeart,
        to: "/search?sort=likes",
        title: `Bai duoc thich nhieu: ${topLikedSongName} (${topLikedSongLikes} luot thich)`,
      },
      {
        key: "hot-songs",
        label: "Nhac Hot",
        icon: FaCompactDisc,
        to: "/search?sort=popular",
        title: `Bai hot hien tai: ${hotSongName} (${hotSongPlays} luot nghe)`,
      },
    ];
  }, [songs]);

  const handleExploreClick = useCallback(
    (to) => {
      if (!to) return;
      navigate(to);
    },
    [navigate]
  );

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <button
        type="button"
        className="sidebar-toggle-btn"
        onClick={handleToggle}
        title={collapsed ? "Mo rong" : "Thu gon"}
        aria-label={collapsed ? "Mo rong sidebar" : "Thu gon sidebar"}
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

        {/* KHAM PHA */}
        <div className="sidebar-playlists">
          {!collapsed && (
            <h3 className="sidebar-title sidebar-title-with-icon">
              <FaCompass />
              <span>KHAM PHA</span>
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
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* ADMIN */}
        {isAuthenticated && user?.role === "admin" && (
          <div className="sidebar-admin">
            {!collapsed && <h3 className="sidebar-title">QUAN TRI</h3>}

            <NavLink
              to="/admin"
              className="sidebar-link sidebar-link-admin"
              title="Trang quan tri"
            >
              <FaUserShield />
              {!collapsed && <span>Quan tri</span>}
            </NavLink>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
