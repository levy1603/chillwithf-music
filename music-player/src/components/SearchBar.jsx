// components/SearchBar.js
import React, { useState, useEffect, useRef } from "react";
import { FaSearch, FaTimes, FaFilter } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useMusicContext } from "../context/MusicContext";
import songAPI from "../api/songAPI";
import "../styles/components/SearchBar.css";

const SearchBar = () => {
  const { songs, getCoverURL, playSong } = useMusicContext();
  const [inputValue, setInputValue] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [noResult, setNoResult] = useState(false);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedAlbum, setSelectedAlbum] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [filterOptions, setFilterOptions] = useState({
    years: [],
    genres: [],
    albums: [],
    tags: [],
  });
  const [filterLoading, setFilterLoading] = useState(false);

  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const hasAnyFilter =
    !!inputValue.trim() ||
    !!selectedYear ||
    !!selectedGenre ||
    !!selectedAlbum ||
    !!selectedTag;

  /* ===== LOAD FILTER OPTIONS FROM BACKEND ===== */
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setFilterLoading(true);
        const res = await songAPI.getFilterOptions();
        const data = res.data?.data || res.data || {};

        setFilterOptions({
          years: Array.isArray(data.years) ? data.years : [],
          genres: Array.isArray(data.genres) ? data.genres : [],
          albums: Array.isArray(data.albums) ? data.albums : [],
          tags: Array.isArray(data.tags) ? data.tags : [],
        });
      } catch (err) {
        console.error("Lỗi tải filter options:", err);
        setFilterOptions({
          years: [],
          genres: [],
          albums: [],
          tags: [],
        });
      } finally {
        setFilterLoading(false);
      }
    };

    fetchFilterOptions();
  }, []);

  /* ===== CLICK OUTSIDE ===== */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowPanel(false);
        setIsExpanded(false);
        setNoResult(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ===== LOCAL SUGGESTIONS ===== */
  useEffect(() => {
    // Khi chưa nhập gì và chưa chọn filter nào
    // nhưng panel đang mở thì vẫn giữ panel mở để user chọn filter
    if (!hasAnyFilter) {
      setSuggestions([]);
      setNoResult(false);
      return;
    }

    const keyword = inputValue.toLowerCase().trim();

    const filtered = songs
      .filter((s) => {
        const matchKeyword =
          !keyword ||
          s.title?.toLowerCase().includes(keyword) ||
          s.artist?.toLowerCase().includes(keyword) ||
          s.featuring?.toLowerCase().includes(keyword) ||
          s.album?.toLowerCase().includes(keyword) ||
          s.genre?.toLowerCase().includes(keyword) ||
          s.tags?.some((tag) => tag.toLowerCase().includes(keyword));

        const matchYear =
          !selectedYear || String(s.releaseYear) === String(selectedYear);

        const matchGenre =
          !selectedGenre || s.genre === selectedGenre;

        const matchAlbum =
          !selectedAlbum || s.album === selectedAlbum;

        const matchTag =
          !selectedTag || s.tags?.includes(selectedTag);

        return (
          matchKeyword &&
          matchYear &&
          matchGenre &&
          matchAlbum &&
          matchTag
        );
      })
      .slice(0, 6);

    setSuggestions(filtered);
    setNoResult(filtered.length === 0);
    setShowPanel(true);
  }, [
    inputValue,
    songs,
    selectedYear,
    selectedGenre,
    selectedAlbum,
    selectedTag,
    hasAnyFilter,
  ]);

  /* ===== BUILD URL ===== */
  const buildSearchURL = () => {
    const params = new URLSearchParams();

    if (inputValue.trim()) params.set("q", inputValue.trim());
    if (selectedYear) params.set("year", selectedYear);
    if (selectedGenre) params.set("genre", selectedGenre);
    if (selectedAlbum) params.set("album", selectedAlbum);
    if (selectedTag) params.set("tag", selectedTag);

    return `/search?${params.toString()}`;
  };

  /* ===== EVENTS ===== */
  const handleMouseEnter = () => {
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    if (
      !hasAnyFilter &&
      document.activeElement !== inputRef.current &&
      !showPanel
    ) {
      setIsExpanded(false);
      setNoResult(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && hasAnyFilter) {
      setShowPanel(false);
      navigate(buildSearchURL());
    }

    if (e.key === "Escape") {
      handleClear();
      setIsExpanded(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (song) => {
    setShowPanel(false);
    setInputValue("");
    setIsExpanded(false);
    setNoResult(false);
    playSong(song, "home", songs);
    navigate(`/song/${song._id}`);
  };

  const handleSearch = () => {
    if (!hasAnyFilter) return;
    setShowPanel(false);
    navigate(buildSearchURL());
  };

  const handleClear = () => {
    setInputValue("");
    setSelectedYear("");
    setSelectedGenre("");
    setSelectedAlbum("");
    setSelectedTag("");
    setSuggestions([]);
    setShowPanel(true); 
    setNoResult(false);
    inputRef.current?.focus();
  };

  const handleIconClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      setShowPanel(true);
      setTimeout(() => inputRef.current?.focus(), 200);
    } else {
      handleSearch();
    }
  };

  const handleFilterButtonClick = () => {
    setIsExpanded(true);
    setShowPanel((prev) => !prev);
  };

  const toggleChip = (type, value) => {
    if (type === "year") {
      setSelectedYear((prev) => (prev === String(value) ? "" : String(value)));
    }

    if (type === "genre") {
      setSelectedGenre((prev) => (prev === value ? "" : value));
    }

    if (type === "album") {
      setSelectedAlbum((prev) => (prev === value ? "" : value));
    }

    if (type === "tag") {
      setSelectedTag((prev) => (prev === value ? "" : value));
    }

    setShowPanel(true);
    setIsExpanded(true);
  };

  const panelShouldShow = showPanel && isExpanded;

  return (
    <div
      className="search-bar-wrapper"
      ref={wrapperRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`
          search-bar
          ${isExpanded ? "expanded" : ""}
          ${panelShouldShow ? "panel-open" : ""}
        `}
      >
        <button
          type="button"
          className="search-icon-btn"
          onClick={handleIconClick}
        >
          <FaSearch />
        </button>

        <input
          ref={inputRef}
          type="text"
          placeholder="Tìm bài hát, nghệ sĩ, album hoặc mood..."
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowPanel(true);
            setIsExpanded(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsExpanded(true);
            setShowPanel(true);
          }}
          className="search-input"
        />

        <button
          type="button"
          className={`search-filter-toggle ${panelShouldShow ? "active" : ""}`}
          onClick={handleFilterButtonClick}
          title="Mở bộ lọc"
        >
          <FaFilter />
        </button>

        {hasAnyFilter && isExpanded && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={handleClear}
            title="Xóa tìm kiếm"
          >
            <FaTimes />
          </button>
        )}
      </div>

      {panelShouldShow && (
        <div className="search-panel">
          <div className="search-filters">
            <div className="search-filter-title">
              <FaFilter />
              <span>Bộ lọc nhanh</span>
            </div>

            {filterLoading ? (
              <div className="search-filter-loading">Đang tải bộ lọc...</div>
            ) : (
              <>
                {!!filterOptions.years.length && (
                  <div className="search-chip-group">
                    <span className="search-chip-label">Năm</span>
                    <div className="search-chip-list">
                      {filterOptions.years.map((year) => (
                        <button
                          key={year}
                          type="button"
                          className={`search-chip ${
                            selectedYear === String(year) ? "active" : ""
                          }`}
                          onClick={() => toggleChip("year", year)}
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!!filterOptions.genres.length && (
                  <div className="search-chip-group">
                    <span className="search-chip-label">Thể loại</span>
                    <div className="search-chip-list">
                      {filterOptions.genres.map((genre) => (
                        <button
                          key={genre}
                          type="button"
                          className={`search-chip ${
                            selectedGenre === genre ? "active" : ""
                          }`}
                          onClick={() => toggleChip("genre", genre)}
                        >
                          {genre}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!!filterOptions.albums.length && (
                  <div className="search-chip-group">
                    <span className="search-chip-label">Album</span>
                    <div className="search-chip-list">
                      {filterOptions.albums.map((album) => (
                        <button
                          key={album}
                          type="button"
                          className={`search-chip ${
                            selectedAlbum === album ? "active" : ""
                          }`}
                          onClick={() => toggleChip("album", album)}
                        >
                          {album}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!!filterOptions.tags.length && (
                  <div className="search-chip-group">
                    <span className="search-chip-label">Tag</span>
                    <div className="search-chip-list">
                      {filterOptions.tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className={`search-chip ${
                            selectedTag === tag ? "active" : ""
                          }`}
                          onClick={() => toggleChip("tag", tag)}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {hasAnyFilter ? (
            noResult ? (
              <div className="search-no-result">
                <span className="search-no-result-icon">🔍</span>
                <p>Không tìm thấy kết quả phù hợp</p>
                <strong>
                  {inputValue
                    ? `"${inputValue}"`
                    : "với bộ lọc hiện tại"}
                </strong>
              </div>
            ) : (
              <>
                <div className="search-panel-header">
                  <span>Gợi ý</span>
                  <button
                    type="button"
                    className="search-panel-all"
                    onClick={handleSearch}
                  >
                    Xem tất cả kết quả
                  </button>
                </div>

                <ul className="search-suggestions">
                  {suggestions.map((song) => (
                    <li
                      key={song._id}
                      className="suggestion-item"
                      onClick={() => handleSuggestionClick(song)}
                    >
                      <img
                        src={getCoverURL(song)}
                        alt={song.title}
                        className="suggestion-cover"
                        onError={(e) => {
                          e.target.src = "/images/default-cover.svg";
                        }}
                      />

                      <div className="suggestion-info">
                        <span className="suggestion-title">{song.title}</span>
                        <span className="suggestion-artist">
                          {song.artist}
                          {song.releaseYear ? ` • ${song.releaseYear}` : ""}
                        </span>
                      </div>

                      <span className="suggestion-tag">
                        {song.genre || "Bài hát"}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="search-panel-footer">
                  <span>Nhấn</span>
                  <kbd>Enter</kbd>
                  <span>để xem tất cả kết quả</span>
                </div>
              </>
            )
          ) : (
            <div className="search-empty-state">
              <div className="search-empty-state-icon">
                <FaFilter />
              </div>
              <p>Chọn bộ lọc để bắt đầu tìm kiếm</p>
              <span>
                Bạn có thể tìm theo năm, thể loại, album hoặc tag mà không cần nhập từ khóa
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
