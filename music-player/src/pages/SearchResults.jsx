// src/pages/SearchResults.js
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FaSearch,
  FaFilter,
  FaTimes,
  FaSpinner,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import SongList from "../components/SongList";
import songAPI from "../api/songAPI";
import "../styles/pages/SearchResults.css";

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "popular", label: "Phổ biến" },
  { value: "likes", label: "Lượt thích" },
  { value: "title", label: "Tên A-Z" },
  { value: "year", label: "Năm phát hành" },
];

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get("q") || "";
  const year = searchParams.get("year") || "";
  const genre = searchParams.get("genre") || "";
  const album = searchParams.get("album") || "";
  const tag = searchParams.get("tag") || "";
  const sort = searchParams.get("sort") || "newest";
  const page = parseInt(searchParams.get("page") || "1", 10);

  // Search within results
  const [innerKeyword, setInnerKeyword] = useState("");

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [filterOptions, setFilterOptions] = useState({
    years: [],
    genres: [],
    albums: [],
    tags: [],
  });

  const [filterLoading, setFilterLoading] = useState(false);

  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
  });

  const hasAnyFilter =
    !!query ||
    !!year ||
    !!genre ||
    !!album ||
    !!tag ||
    sort !== "newest";

  useEffect(() => {
    setInnerKeyword("");
  }, [query, year, genre, album, tag, sort, page]);

  /* ── Load filter options ── */
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setFilterLoading(true);
        const res = await songAPI.getFilterOptions();
        const data = res?.data || {};

        setFilterOptions({
          years: Array.isArray(data.years) ? data.years : [],
          genres: Array.isArray(data.genres) ? data.genres : [],
          albums: Array.isArray(data.albums) ? data.albums : [],
          tags: Array.isArray(data.tags) ? data.tags : [],
        });
      } catch (err) {
        console.error("Lỗi tải filter options:", err);
      } finally {
        setFilterLoading(false);
      }
    };

    fetchFilterOptions();
  }, []);

  /* ── Fetch search results ── */
  useEffect(() => {
    const fetchResults = async () => {
      if (!hasAnyFilter) {
        setResults([]);
        setPagination({
          total: 0,
          totalPages: 0,
          currentPage: 1,
        });
        return;
      }

      setLoading(true);
      setError("");

      try {
        const params = {
          page,
          limit: PAGE_SIZE,
        };

        if (query) params.search = query;
        if (year) params.year = year;
        if (genre) params.genre = genre;
        if (album) params.album = album;
        if (tag) params.tag = tag;

        if (sort === "popular") params.sort = "popular";
        else if (sort === "likes") params.sort = "likes";
        else if (sort === "title") params.sort = "title";
        else if (sort === "year") params.sort = "year";

        const res = await songAPI.getAll(params);
        const data = Array.isArray(res?.data) ? res.data : [];

        setResults(data);
        setPagination({
          total: res?.total || 0,
          totalPages: res?.totalPages || 0,
          currentPage: res?.currentPage || 1,
        });
      } catch (err) {
        console.error("Lỗi tìm kiếm:", err);
        setError(err?.message || "Không thể tải kết quả tìm kiếm");
        setResults([]);
        setPagination({
          total: 0,
          totalPages: 0,
          currentPage: 1,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, year, genre, album, tag, sort, page, hasAnyFilter]);

  /* ── Helpers ── */
  const activeFilters = useMemo(() => {
    const filters = [];
    if (query) filters.push({ key: "q", label: `Từ khóa: ${query}` });
    if (year) filters.push({ key: "year", label: `Năm: ${year}` });
    if (genre) filters.push({ key: "genre", label: `Thể loại: ${genre}` });
    if (album) filters.push({ key: "album", label: `Album: ${album}` });
    if (tag) filters.push({ key: "tag", label: `Tag: #${tag}` });
    if (sort && sort !== "newest") {
      const sortLabel =
        SORT_OPTIONS.find((item) => item.value === sort)?.label || sort;
      filters.push({ key: "sort", label: `Sắp xếp: ${sortLabel}` });
    }
    return filters;
  }, [query, year, genre, album, tag, sort]);

  const updateSearchParams = (updater, shouldResetPage = false) => {
    const params = new URLSearchParams(searchParams);
    updater(params);
    if (shouldResetPage) params.delete("page");
    setSearchParams(params);
  };

  const updatePage = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(newPage));
    setSearchParams(params);

    const target = document.querySelector(".search-results-header");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const removeFilter = (key) => {
    updateSearchParams((params) => {
      params.delete(key);
    }, true);
  };

  const clearAllFilters = () => {
    setSearchParams({});
    setInnerKeyword("");
  };

  const setSingleFilter = (key, value) => {
    updateSearchParams((params) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    }, true);
  };

  const toggleChipFilter = (key, value) => {
    const currentValue = searchParams.get(key) || "";
    updateSearchParams((params) => {
      if (currentValue === value) params.delete(key);
      else params.set(key, value);
    }, true);
  };

  const visiblePages = useMemo(() => {
    const totalPages = pagination.totalPages;
    const currentPage = pagination.currentPage;

    if (totalPages <= 1) return [];

    const pages = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }, [pagination]);

  const filteredResults = useMemo(() => {
    const keyword = innerKeyword.trim().toLowerCase();
    if (!keyword) return results;

    return results.filter((song) => {
      const title = song?.title?.toLowerCase?.() || "";
      const artist = song?.artist?.toLowerCase?.() || "";
      const albumName = song?.album?.toLowerCase?.() || "";
      const genreName = song?.genre?.toLowerCase?.() || "";
      const tags = Array.isArray(song?.tags)
        ? song.tags.join(" ").toLowerCase()
        : "";

      return (
        title.includes(keyword) ||
        artist.includes(keyword) ||
        albumName.includes(keyword) ||
        genreName.includes(keyword) ||
        tags.includes(keyword)
      );
    });
  }, [results, innerKeyword]);

  const renderChipGroup = (title, items, keyName, selectedValue, formatLabel) => {
    if (!items?.length) return null;

    return (
      <div className="search-sidebar-group">
        <label>{title}</label>
        <div className="search-chip-group">
          {items.map((item) => {
            const value = String(item);
            const isActive = selectedValue === value;

            return (
              <button
                key={value}
                type="button"
                className={`filter-chip-btn ${isActive ? "active" : ""}`}
                onClick={() => toggleChipFilter(keyName, value)}
              >
                {formatLabel ? formatLabel(item) : item}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="search-results-page">
      <div className="search-results-hero">
        <div className="search-results-hero-overlay" />
        <div className="search-results-hero-content">
          <span className="search-results-kicker">Khám phá âm thanh của bạn</span>
          <h1>Tìm kiếm bài hát theo cách riêng</h1>
          <p>
            Lọc nhanh bằng chip, thu hẹp kết quả tức thì, và khám phá danh sách
            nhạc theo phong cách hiện đại hơn.
          </p>
        </div>
      </div>

      <div className="search-layout">
        {/* Sidebar filters */}
        <aside className="search-sidebar">
          <div className="search-sidebar-card">
            <div className="search-sidebar-header">
              <FaFilter />
              <h3>Bộ lọc</h3>
            </div>

            <div className="search-sidebar-group">
              <label>Sắp xếp</label>
              <div className="search-chip-group">
                {SORT_OPTIONS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`filter-chip-btn ${
                      sort === item.value ? "active" : ""
                    }`}
                    onClick={() => setSingleFilter("sort", item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {filterLoading ? (
              <div className="search-sidebar-loading">
                <FaSpinner className="spinner-icon" />
                <span>Đang tải bộ lọc...</span>
              </div>
            ) : (
              <>
                {renderChipGroup(
                  "Năm phát hành",
                  filterOptions.years,
                  "year",
                  year
                )}

                {renderChipGroup(
                  "Thể loại",
                  filterOptions.genres,
                  "genre",
                  genre
                )}

                {renderChipGroup(
                  "Album",
                  filterOptions.albums,
                  "album",
                  album
                )}

                {renderChipGroup(
                  "Tag",
                  filterOptions.tags,
                  "tag",
                  tag,
                  (item) => `#${item}`
                )}
              </>
            )}

            <button className="search-sidebar-clear" onClick={clearAllFilters}>
              Xóa toàn bộ bộ lọc
            </button>
          </div>
        </aside>

        {/* Main results */}
        <div className="search-main">
          <div className="search-results-header">
            <div className="search-results-title-wrap">
              <FaSearch className="search-results-icon" />
              <div>
                <h2>Kết quả tìm kiếm</h2>
                <p>
                  {hasAnyFilter
                    ? results.length > 0
                      ? `Tìm thấy ${pagination.total} kết quả • Trang ${pagination.currentPage}/${Math.max(
                          pagination.totalPages,
                          1
                        )}`
                      : "Không tìm thấy kết quả phù hợp"
                    : "Nhập từ khóa hoặc chọn bộ lọc để tìm kiếm"}
                </p>
              </div>
            </div>

            <div className="search-within-box">
              <FaSearch className="search-within-icon" />
              <input
                type="text"
                placeholder="Tìm tiếp trong kết quả hiện tại..."
                value={innerKeyword}
                onChange={(e) => setInnerKeyword(e.target.value)}
              />
              {innerKeyword && (
                <button
                  type="button"
                  className="search-within-clear"
                  onClick={() => setInnerKeyword("")}
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="search-active-filters">
              <div className="search-active-filters-label">
                <FaFilter />
                <span>Bộ lọc đang áp dụng:</span>
              </div>

              <div className="search-filter-chips">
                {activeFilters.map((filter) => (
                  <button
                    key={filter.key}
                    className="search-filter-chip"
                    onClick={() => removeFilter(filter.key)}
                  >
                    <span>{filter.label}</span>
                    <FaTimes />
                  </button>
                ))}

                {activeFilters.length > 1 && (
                  <button
                    className="search-clear-all-btn"
                    onClick={clearAllFilters}
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>
            </div>
          )}

          {innerKeyword && !loading && !error && (
            <div className="search-within-summary">
              Hiển thị <strong>{filteredResults.length}</strong> /{" "}
              <strong>{results.length}</strong> bài hát trong trang hiện tại cho từ
              khóa "<strong>{innerKeyword}</strong>"
            </div>
          )}

          {loading ? (
            <div className="search-results-loading">
              <FaSpinner className="spinner-icon" />
              <p>Đang tìm kiếm...</p>
            </div>
          ) : error ? (
            <div className="search-results-empty">
              <FaSearch />
              <p>{error}</p>
              <span>Vui lòng thử lại sau</span>
            </div>
          ) : filteredResults.length > 0 ? (
            <>
              <SongList
                songs={filteredResults}
                title=""
                source="search"
                queue={filteredResults}
              />

              {pagination.totalPages > 1 && (
                <div className="search-pagination-wrapper">
                  <div className="search-pagination-summary">
                    Trang <strong>{pagination.currentPage}</strong> /{" "}
                    <strong>{pagination.totalPages}</strong> — Tổng{" "}
                    <strong>{pagination.total}</strong> kết quả
                  </div>

                  <div className="search-pagination">
                    <button
                      className="search-page-btn nav-btn"
                      onClick={() => updatePage(pagination.currentPage - 1)}
                      disabled={pagination.currentPage <= 1}
                    >
                      <FaChevronLeft /> Trước
                    </button>

                    {visiblePages[0] > 1 && (
                      <>
                        <button
                          className="search-page-btn"
                          onClick={() => updatePage(1)}
                        >
                          1
                        </button>
                        {visiblePages[0] > 2 && (
                          <span className="search-page-dots">...</span>
                        )}
                      </>
                    )}

                    {visiblePages.map((pageNum) => (
                      <button
                        key={pageNum}
                        className={`search-page-btn ${
                          pageNum === pagination.currentPage ? "active" : ""
                        }`}
                        onClick={() => updatePage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    ))}

                    {visiblePages[visiblePages.length - 1] <
                      pagination.totalPages && (
                      <>
                        {visiblePages[visiblePages.length - 1] <
                          pagination.totalPages - 1 && (
                          <span className="search-page-dots">...</span>
                        )}
                        <button
                          className="search-page-btn"
                          onClick={() => updatePage(pagination.totalPages)}
                        >
                          {pagination.totalPages}
                        </button>
                      </>
                    )}

                    <button
                      className="search-page-btn nav-btn"
                      onClick={() => updatePage(pagination.currentPage + 1)}
                      disabled={
                        pagination.currentPage >= pagination.totalPages
                      }
                    >
                      Sau <FaChevronRight />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="search-results-empty">
              <FaSearch />
              <p>
                {innerKeyword
                  ? "Không có bài hát nào khớp trong kết quả hiện tại"
                  : "Không tìm thấy bài hát nào"}
              </p>
              <span>
                {innerKeyword
                  ? "Thử từ khóa khác để lọc trong trang này"
                  : "Thử đổi từ khóa hoặc bộ lọc nhé!"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResults;
