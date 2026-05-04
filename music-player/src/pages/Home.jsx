// src/pages/Home.js
import React, { useMemo, useState } from "react";
import {
  FaMusic,
  FaHeadphones,
  FaCompactDisc,
  FaWaveSquare,
  FaFire,
  FaSearch,
  FaHistory,
  FaStar,
} from "react-icons/fa";
import SongList from "../components/SongList";
import { useMusicContext } from "../context/MusicContext";
import "../styles/pages/Home.css";

const MOOD_CHIPS = [
  { key: "all", label: "Tất cả" },
  { key: "chill", label: "Chill" },
  { key: "pop", label: "Pop" },
  { key: "rock", label: "Rock" },
  { key: "ballad", label: "Ballad" },
  { key: "edm", label: "EDM" },
  { key: "indie", label: "Indie" },
];

const Home = () => {
  const {
    filteredSongs = [],
    searchTerm,
    loading,
    songs = [],
    recentlyPlayedSongs = [],
  } = useMusicContext();

  const [activeMood, setActiveMood] = useState("all");

  const totalSongs = useMemo(() => songs.length, [songs]);

  const totalPlays = useMemo(() => {
    return songs.reduce((sum, song) => sum + (song.playCount || 0), 0);
  }, [songs]);

  const totalArtists = useMemo(() => {
    const artists = new Set(
      songs.map((song) => song.artist).filter(Boolean)
    );
    return artists.size;
  }, [songs]);

  const sectionTitle = useMemo(() => {
    return searchTerm ? `Kết quả: "${searchTerm}"` : "Tất cả bài hát";
  }, [searchTerm]);

  const featuredPicks = useMemo(() => {
    return [...songs]
      .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
      .slice(0, 4);
  }, [songs]);

  const moodFilteredSongs = useMemo(() => {
    if (activeMood === "all") return filteredSongs;

    return filteredSongs.filter((song) => {
      const genre = song.genre?.toLowerCase?.() || "";
      const title = song.title?.toLowerCase?.() || "";
      const album = song.album?.toLowerCase?.() || "";
      const tags = Array.isArray(song.tags)
        ? song.tags.join(" ").toLowerCase()
        : "";

      return (
        genre.includes(activeMood) ||
        title.includes(activeMood) ||
        album.includes(activeMood) ||
        tags.includes(activeMood)
      );
    });
  }, [filteredSongs, activeMood]);

  if (loading) {
    return (
      <div className="home-page">
        <div className="home-loading">
          <div className="home-loading-spinner" />
          <p>Đang tải không gian âm nhạc...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* HERO */}
      <section className="home-hero">
        <div className="home-hero-content">
          <div className="home-hero-badge">
            <FaWaveSquare />
            <span>Không gian nghe nhạc dành riêng cho bạn</span>
          </div>

          <h1>
            {searchTerm
              ? "Khám phá kết quả tìm kiếm ngay bây giờ"
              : "Khám phá nhịp điệu theo phong cách của bạn"}
          </h1>

          <p>
            {searchTerm
              ? `Bạn đang tìm kiếm các bài hát liên quan đến "${searchTerm}". Hãy chọn và phát ngay những bản nhạc phù hợp nhất.`
              : "Lắng nghe, lưu lại những bài hát yêu thích và tận hưởng trải nghiệm âm nhạc hiện đại trong một không gian mang bản sắc riêng."}
          </p>

          <div className="home-hero-tags">
            <span className="home-hero-tag">
              <FaFire /> Xu hướng mới
            </span>
            <span className="home-hero-tag">
              <FaCompactDisc /> Playlist cá nhân
            </span>
            <span className="home-hero-tag">
              <FaHeadphones /> Nghe mọi lúc
            </span>
          </div>
        </div>

        <div className="home-hero-visual">
          <div className="home-orb orb-1" />
          <div className="home-orb orb-2" />
          <div className="home-orb orb-3" />

          <div className="home-visual-card">
            <div className="home-visual-top">
              <div className="home-visual-cover">
                <FaMusic />
              </div>

              <div className="home-visual-meta">
                <strong>{featuredPicks[0]?.title || "Night Echoes"}</strong>
                <span>{featuredPicks[0]?.artist || "ChillWithF Selection"}</span>
              </div>
            </div>

            <div className="home-visual-wave">
              {Array.from({ length: 18 }).map((_, index) => (
                <span
                  key={index}
                  className="wave-bar"
                  style={{ animationDelay: `${index * 0.08}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="home-stats">
        <div className="home-stat-card">
          <div className="home-stat-icon">
            <FaMusic />
          </div>
          <div className="home-stat-content">
            <span className="home-stat-number">{totalSongs}</span>
            <span className="home-stat-label">Bài hát</span>
          </div>
        </div>

        <div className="home-stat-card">
          <div className="home-stat-icon">
            <FaHeadphones />
          </div>
          <div className="home-stat-content">
            <span className="home-stat-number">
              {totalPlays.toLocaleString("vi-VN")}
            </span>
            <span className="home-stat-label">Lượt nghe</span>
          </div>
        </div>

        <div className="home-stat-card">
          <div className="home-stat-icon">
            <FaCompactDisc />
          </div>
          <div className="home-stat-content">
            <span className="home-stat-number">{totalArtists}</span>
            <span className="home-stat-label">Nghệ sĩ</span>
          </div>
        </div>
      </section>

      {/* MOOD CHIPS */}
      <section className="home-moods">
        <div className="home-section-header compact">
          <div>
            <h2>
              <FaWaveSquare /> Tâm trạng hôm nay
            </h2>
            <p>Chọn nhanh một mood để lọc bài hát phù hợp</p>
          </div>
        </div>

        <div className="home-mood-chips">
          {MOOD_CHIPS.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className={`home-mood-chip ${activeMood === chip.key ? "active" : ""}`}
              onClick={() => setActiveMood(chip.key)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </section>

      {/* FEATURED PICKS */}
      {featuredPicks.length > 0 && (
        <section className="home-featured">
          <div className="home-section-header">
            <div>
              <h2>
                <FaStar /> Featured Picks
              </h2>
              <p>Những bài hát được nghe nhiều và nổi bật nhất hiện tại</p>
            </div>
          </div>

          <div className="home-featured-grid">
            {featuredPicks.map((song) => (
              <div key={song._id} className="featured-card">
                <div className="featured-card-badge">
                  <FaFire /> Hot
                </div>

                <div className="featured-card-content">
                  <strong>{song.title}</strong>
                  <span>{song.artist}</span>
                  <small>
                    {(song.playCount || 0).toLocaleString("vi-VN")} lượt nghe
                  </small>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* RECENTLY PLAYED */}
      {recentlyPlayedSongs.length > 0 && (
        <section className="home-recently-played">
          <div className="home-section-header">
            <div>
              <h2>
                <FaHistory /> Nghe gần đây
              </h2>
              <p>Những bài hát bạn vừa phát gần đây</p>
            </div>
          </div>

          <div className="home-recent-grid">
            {recentlyPlayedSongs.slice(0, 6).map((song) => (
              <div key={song._id} className="recent-card">
                <div className="recent-card-icon">
                  <FaMusic />
                </div>

                <div className="recent-card-info">
                  <strong>{song.title}</strong>
                  <span>{song.artist}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SONG LIST */}
      <section className="home-song-section">
        <div className="home-section-header">
          <div>
            <h2>
              {searchTerm ? (
                <>
                  <FaSearch /> {sectionTitle}
                </>
              ) : (
                <>
                  <FaMusic />{" "}
                  {activeMood === "all"
                    ? sectionTitle
                    : `Mood: ${activeMood.charAt(0).toUpperCase() + activeMood.slice(1)}`}
                </>
              )}
            </h2>

            <p>
              {searchTerm
                ? `${moodFilteredSongs.length} bài hát phù hợp với tìm kiếm của bạn`
                : `${moodFilteredSongs.length} bài hát trong danh sách hiện tại`}
            </p>
          </div>
        </div>

        <SongList
          songs={moodFilteredSongs}
          title=""
          source="home"
          queue={songs}
        />
      </section>
    </div>
  );
};

export default Home;