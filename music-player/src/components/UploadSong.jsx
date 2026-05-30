// components/UploadSong.js
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  FaCloudUploadAlt,
  FaMusic,
  FaImage,
  FaVideo,
  FaSpinner,
  FaTimes,
  FaPlay,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaHistory,
  FaChevronDown,
  FaMicrophone,
} from "react-icons/fa";
import songAPI from "../api/songAPI";
import { API_ORIGIN } from "../config/api";
import LRCEditor from "./LRCEditor";
import "../styles/components/UploadSong.css";

/* ════════════════════════════════════════════════════════════
   CONSTANTS
════════════════════════════════════════════════════════════ */
const API_BASE = API_ORIGIN;
const MAX_AUDIO_SIZE = 20 * 1024 * 1024;
const MAX_COVER_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;

const GENRES = [
  "Pop",
  "Rock",
  "Ballad",
  "R&B",
  "Hip-Hop",
  "EDM",
  "Jazz",
  "Classical",
  "Indie",
  "Khác",
];

const CUR_YEAR = new Date().getFullYear();

const INITIAL_FORM = {
  title: "",
  artist: "",
  featuring: "",
  album: "",
  genre: "Pop",
  releaseYear: CUR_YEAR,
  lyrics: "",
};

const INITIAL_LRC = {
  lrcString: "",
  lines: [],
};

const STATUS_CONFIG = {
  pending: {
    label: "Chờ duyệt",
    icon: <FaClock />,
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.1)",
    border: "rgba(251,191,36,0.25)",
  },
  approved: {
    label: "Đã duyệt",
    icon: <FaCheckCircle />,
    color: "#34d399",
    bg: "rgba(52,211,153,0.1)",
    border: "rgba(52,211,153,0.25)",
  },
  rejected: {
    label: "Từ chối",
    icon: <FaTimesCircle />,
    color: "#f87171",
    bg: "rgba(248,113,113,0.1)",
    border: "rgba(248,113,113,0.25)",
  },
};

/* ════════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════════ */
const formatDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatFileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const normalizeTag = (value = "") =>
  value.trim().toLowerCase().replace(/\s+/g, "-");

const getSongCoverURL = (song) => {
  if (!song?.coverImage || song.coverImage === "default-cover.jpg") return null;
  return `${API_BASE}/uploads/covers/${song.coverImage}`;
};

const validateFileType = (file, expectedTypePrefix) => {
  if (!file) return false;
  return file.type.startsWith(expectedTypePrefix);
};

const createObjectPreview = (file, oldPreview) => {
  if (oldPreview) URL.revokeObjectURL(oldPreview);
  return URL.createObjectURL(file);
};

const buildLyricsLines = (lyrics = "") =>
  lyrics
    .split("\n")
    .map((lineText, i) => ({
      id: `auto-${i}`,
      time: 0,
      text: lineText,
    }))
    .filter((line) => line.text !== undefined);

/* ════════════════════════════════════════════════════════════
   SUB: UploadHistory
════════════════════════════════════════════════════════════ */
const UploadHistory = React.memo(
  ({ uploads, loading, error, show, onToggle, onRefresh }) => {
    const pendingCount = uploads.filter((u) => u.status === "pending").length;
    const approvedCount = uploads.filter((u) => u.status === "approved").length;
    const rejectedCount = uploads.filter((u) => u.status === "rejected").length;

    return (
      <div className="upload-history">
        <button type="button" className="history-toggle-btn" onClick={onToggle}>
          <FaHistory />
          <span>Lịch sử upload của bạn</span>

          <div className="history-badges">
            {uploads.length > 0 && (
              <span className="history-total-badge">{uploads.length}</span>
            )}

            {pendingCount > 0 && (
              <span className="history-status-badge badge-pending-sm">
                <FaClock /> {pendingCount} chờ
              </span>
            )}

            {rejectedCount > 0 && (
              <span className="history-status-badge badge-rejected-sm">
                <FaTimesCircle /> {rejectedCount} từ chối
              </span>
            )}
          </div>

          <FaChevronDown className={`history-chevron${show ? " open" : ""}`} />
        </button>

        {show && (
          <div className="history-content">
            {pendingCount > 0 && (
              <div className="history-pending-note">
                <FaClock />
                <span>
                  Bạn có <strong>{pendingCount}</strong> bài đang chờ Admin duyệt
                </span>
              </div>
            )}

            {error && (
              <div className="history-error">
                <FaTimes /> {error}
                <button type="button" onClick={onRefresh}>
                  Thử lại
                </button>
              </div>
            )}

            {loading ? (
              <div className="history-loading">
                <FaSpinner className="spinner" /> Đang tải lịch sử...
              </div>
            ) : uploads.length === 0 ? (
              <div className="history-empty">
                <FaMusic />
                <p>Chưa có bài hát nào được upload</p>
              </div>
            ) : (
              <>
                <div className="history-summary">
                  <div className="history-summary-item summary-approved">
                    <FaCheckCircle /> {approvedCount} đã duyệt
                  </div>
                  <div className="history-summary-item summary-pending">
                    <FaClock /> {pendingCount} chờ duyệt
                  </div>
                  <div className="history-summary-item summary-rejected">
                    <FaTimesCircle /> {rejectedCount} từ chối
                  </div>
                </div>

                <div className="history-list">
                  {uploads.map((song) => {
                    const cfg = STATUS_CONFIG[song.status] || STATUS_CONFIG.pending;
                    const coverURL = getSongCoverURL(song);

                    return (
                      <div
                        key={song._id}
                        className="history-item"
                        style={{ borderColor: cfg.border }}
                      >
                        <div className="history-cover">
                          {coverURL ? (
                            <img
                              src={coverURL}
                              alt={song.title}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <FaMusic />
                          )}
                        </div>

                        <div className="history-info">
                          <span className="history-title">{song.title}</span>

                          {song.featuring && (
                            <span className="history-featuring">
                              ft. {song.featuring}
                            </span>
                          )}

                          <span className="history-artist">{song.artist}</span>

                          <div className="history-meta-row">
                            {song.genre && (
                              <span className="history-meta-badge">{song.genre}</span>
                            )}
                            {song.releaseYear && (
                              <span className="history-meta-badge">
                                {song.releaseYear}
                              </span>
                            )}
                          </div>

                          {song.tags?.length > 0 && (
                            <div className="history-tags">
                              {song.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="history-tag">
                                  #{tag}
                                </span>
                              ))}
                              {song.tags.length > 3 && (
                                <span className="history-tag-more">
                                  +{song.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          <span className="history-date">
                            {formatDate(song.createdAt)}
                          </span>

                          {song.lrc && (
                            <span className="history-lrc-badge">
                              <FaMicrophone /> LRC
                            </span>
                          )}

                          {song.status === "rejected" && song.rejectReason && (
                            <span className="history-reject-reason">
                              ⚠️ {song.rejectReason}
                            </span>
                          )}
                        </div>

                        <div
                          className="history-status-badge-box"
                          style={{
                            color: cfg.color,
                            background: cfg.bg,
                            border: `1px solid ${cfg.border}`,
                          }}
                        >
                          {cfg.icon}
                          <span>{cfg.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <button type="button" className="history-refresh-btn" onClick={onRefresh}>
              🔄 Làm mới danh sách
            </button>
          </div>
        )}
      </div>
    );
  }
);

UploadHistory.displayName = "UploadHistory";

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
const UploadSong = () => {
  /* ── refs ── */
  const videoRef = useRef(null);
  const abortControllerRef = useRef(null);
  const audioInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const videoInputRef = useRef(null);

  /* ── form state ── */
  const [formData, setFormData] = useState(INITIAL_FORM);

  /* ── tags state ── */
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");

  /* ── file state ── */
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);

  /* ── upload state ── */
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadResult, setUploadResult] = useState(null);

  /* ── LRC state ── */
  const [lrcData, setLrcData] = useState(INITIAL_LRC);
  const [showLRC, setShowLRC] = useState(false);
  const [lrcExternalLines, setLrcExternalLines] = useState([]);

  /* ── history state ── */
  const [myUploads, setMyUploads] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  /* ── cleanup object URLs ── */
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
  }, [videoPreview]);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  /* ── history fetch ── */
  const fetchMyUploads = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const res = await songAPI.getMySongs();
      const raw = res.data;
      const data = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
        ? raw.data
        : [];

      setMyUploads(data);
    } catch {
      setHistoryError("Không thể tải lịch sử upload");
      setMyUploads([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyUploads();
  }, [fetchMyUploads]);

  /* ── computed ── */
  const syncedLineCount = useMemo(
    () => lrcData.lines.filter((line) => line.time > 0).length,
    [lrcData.lines]
  );

  const plainLineCount = useMemo(
    () => formData.lyrics.split("\n").filter((line) => line.trim()).length,
    [formData.lyrics]
  );

  const canSubmit = useMemo(() => {
    return (
      !!audioFile &&
      !!coverFile &&
      !!formData.title.trim() &&
      !!formData.artist.trim() &&
      !loading
    );
  }, [audioFile, coverFile, formData.title, formData.artist, loading]);

  /* ── generic form handler ── */
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "releaseYear" ? value : value,
    }));
  }, []);

  /* ── tag handlers ── */
  const handleTagKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();

        const newTag = normalizeTag(tagInput);

        if (newTag && !tags.includes(newTag) && tags.length < 10) {
          setTags((prev) => [...prev, newTag]);
          setTagInput("");
        }
      }

      if (e.key === "Backspace" && !tagInput && tags.length > 0) {
        setTags((prev) => prev.slice(0, -1));
      }
    },
    [tagInput, tags]
  );

  const removeTag = useCallback((tag) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  /* ── lyrics / lrc ── */
  const handleLyricsChange = useCallback((e) => {
    const text = e.target.value;

    setFormData((prev) => ({ ...prev, lyrics: text }));

    if (!text.trim()) {
      setLrcExternalLines([]);
      return;
    }

    const newLines = buildLyricsLines(text);
    setLrcExternalLines(newLines);
  }, []);

  const handleLRCChange = useCallback((lrcString, lines) => {
    setLrcData({ lrcString, lines });
  }, []);

  /* ── audio ── */
  const handleAudioChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateFileType(file, "audio/")) {
      setError("Vui lòng chọn file nhạc hợp lệ!");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_AUDIO_SIZE) {
      setError("File nhạc không được vượt quá 20MB!");
      e.target.value = "";
      return;
    }

    setAudioFile(file);
    setError("");
  }, []);

  /* ── cover ── */
  const handleCoverChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateFileType(file, "image/")) {
      setError("Vui lòng chọn file ảnh hợp lệ!");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_COVER_SIZE) {
      setError("Ảnh bìa không được vượt quá 5MB!");
      e.target.value = "";
      return;
    }

    setCoverFile(file);
    setCoverPreview((prev) => createObjectPreview(file, prev));
    setError("");
  }, []);

  /* ── video ── */
  const handleVideoChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateFileType(file, "video/")) {
      setError("Vui lòng chọn file video hợp lệ!");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      setError("Video không được vượt quá 200MB!");
      e.target.value = "";
      return;
    }

    setVideoFile(file);
    setVideoPreview((prev) => createObjectPreview(file, prev));
    setError("");
  }, []);

  const removeVideo = useCallback(() => {
    setVideoFile(null);
    setVideoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    if (videoRef.current) {
      videoRef.current.src = "";
      videoRef.current.load();
    }

    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  }, []);

  /* ── reset form ── */
  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM);
    setTags([]);
    setTagInput("");
    setAudioFile(null);
    setCoverFile(null);
    setVideoFile(null);

    setCoverPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    setVideoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    setUploadProgress(0);
    setLrcData(INITIAL_LRC);
    setLrcExternalLines([]);
    setShowLRC(false);

    if (audioInputRef.current) audioInputRef.current.value = "";
    if (coverInputRef.current) coverInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  }, []);

  /* ── cancel upload ── */
  const handleCancelUpload = useCallback(() => {
    abortControllerRef.current?.abort();
    setLoading(false);
    setUploadProgress(0);
    setError("Upload đã bị hủy");
  }, []);

  /* ── build form data ── */
  const buildRequestData = useCallback(() => {
    const data = new FormData();

    data.append("title", formData.title.trim());
    data.append("artist", formData.artist.trim());
    data.append("featuring", formData.featuring.trim());
    data.append("album", formData.album.trim() || "Single");
    data.append("genre", formData.genre);
    data.append("releaseYear", formData.releaseYear);
    data.append("lyrics", formData.lyrics);
    data.append("tags", JSON.stringify(tags));
    data.append("audio", audioFile);

    if (coverFile) data.append("cover", coverFile);
    if (videoFile) data.append("video", videoFile);
    if (lrcData.lrcString?.trim()) data.append("lrc", lrcData.lrcString);

    return data;
  }, [formData, tags, audioFile, coverFile, videoFile, lrcData.lrcString]);

  /* ── submit ── */
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      setError("");
      setUploadResult(null);
      setUploadProgress(0);

      if (!audioFile) {
        setError("Vui lòng chọn file nhạc!");
        return;
      }

      if (!coverFile) {
        setError("Vui lòng chọn ảnh bìa!");
        return;
      }

      if (!formData.title.trim()) {
        setError("Vui lòng nhập tên bài hát!");
        return;
      }

      if (!formData.artist.trim()) {
        setError("Vui lòng nhập tên nghệ sĩ!");
        return;
      }

      abortControllerRef.current = new AbortController();
      setLoading(true);

      try {
        const data = buildRequestData();

        await songAPI.create(
          data,
          (progress) => setUploadProgress(progress),
          abortControllerRef.current.signal
        );

        const syncedCount = lrcData.lines.filter((line) => line.time > 0).length;

        setUploadResult({
          title: formData.title,
          hasLRC: syncedCount > 0,
        });

        resetForm();
        await fetchMyUploads();
        setShowHistory(true);
      } catch (err) {
        if (err.name === "CanceledError" || err.name === "AbortError") return;

        setError(
          err?.response?.data?.message || err?.message || "Upload thất bại!"
        );
      } finally {
        setLoading(false);
      }
    },
    [audioFile, formData, buildRequestData, lrcData.lines, resetForm, fetchMyUploads]
  );

  return (
    <div className="upload-container">
      <h2 className="upload-title">
        <FaCloudUploadAlt /> Upload Bài Hát
      </h2>

      {error && (
        <div className="upload-error">
          <FaTimes /> {error}
          <button
            type="button"
            className="error-close-btn"
            onClick={() => setError("")}
          >
            <FaTimes />
          </button>
        </div>
      )}

      {uploadResult && (
        <div className="pending-notice">
          <div className="pending-notice-icon">
            <FaClock />
          </div>

          <div className="pending-notice-content">
            <h4>Upload thành công! 🎵</h4>
            <p>
              Bài hát <strong>"{uploadResult.title}"</strong> đang{" "}
              <span className="pending-highlight">chờ Admin duyệt</span>.
            </p>

            {uploadResult.hasLRC && (
              <p className="pending-lrc-info">
                🎤 Đã đính kèm lời đồng bộ (LRC / Karaoke)
              </p>
            )}

            <p className="pending-notice-sub">
              Bài hát sẽ xuất hiện công khai sau khi được phê duyệt.
            </p>
          </div>

          <button
            type="button"
            className="pending-notice-close"
            onClick={() => setUploadResult(null)}
          >
            <FaTimes />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="upload-form">
        {/* Audio + Cover */}
        <div className="upload-section">
          <h3 className="section-title">
            <FaMusic /> Thông tin nhạc
          </h3>

          <div className="upload-files">
            <label className={`file-upload-box${audioFile ? " has-file" : ""}`}>
              <FaMusic className="file-icon" />

              {audioFile ? (
                <div className="file-info">
                  <span className="file-name">{audioFile.name}</span>
                  <span className="file-size">
                    {formatFileSize(audioFile.size)}
                  </span>
                </div>
              ) : (
                <>
                  <span>Chọn file nhạc</span>
                  <small>MP3, WAV, FLAC (tối đa 20MB)</small>
                </>
              )}

              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={handleAudioChange}
                hidden
              />
            </label>

            <label
              className={`file-upload-box cover-box${coverFile ? " has-file" : ""}`}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="cover" className="cover-preview" />
              ) : (
                <>
                  <FaImage className="file-icon" />
                  <span>Chọn ảnh bìa *</span>
                  <small>JPG, PNG, WEBP (tối đa 5MB)</small>
                </>
              )}

              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                hidden
              />
            </label>
          </div>
        </div>

        {/* Video */}
        <div className="upload-section">
          <h3 className="section-title">
            <FaVideo /> Video bài hát
            <span className="optional-badge">Không bắt buộc</span>
          </h3>

          {!videoPreview ? (
            <label className="video-upload-box">
              <div className="video-upload-inner">
                <FaVideo className="video-upload-icon" />
                <p>Kéo thả hoặc nhấn để chọn video</p>
                <small>MP4, WEBM, MOV, AVI (tối đa 200MB)</small>
                <div className="video-upload-btn">
                  <FaCloudUploadAlt /> Chọn video
                </div>
              </div>

              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                hidden
              />
            </label>
          ) : (
            <div className="video-preview-wrapper">
              <video
                ref={videoRef}
                src={videoPreview}
                className="video-preview"
                controls
                preload="metadata"
              />

              <div className="video-file-info">
                <div className="video-file-detail">
                  <FaVideo />
                  <div>
                    <span className="video-file-name">{videoFile?.name}</span>
                    <span className="video-file-size">
                      {videoFile ? formatFileSize(videoFile.size) : ""}
                    </span>
                  </div>
                </div>

                <div className="video-actions">
                  <label className="change-video-btn">
                    <FaPlay /> Đổi video
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoChange}
                      hidden
                    />
                  </label>

                  <button
                    type="button"
                    className="remove-video-btn"
                    onClick={removeVideo}
                  >
                    <FaTimes /> Xóa
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="upload-section">
          <h3 className="section-title">
            <FaMusic /> Chi tiết bài hát
          </h3>

          <div className="form-grid">
            <div className="form-group">
              <label>Tên bài hát *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Nhập tên bài hát"
                maxLength={120}
                required
              />
            </div>

            <div className="form-group">
              <label>Nghệ sĩ chính *</label>
              <input
                type="text"
                name="artist"
                value={formData.artist}
                onChange={handleChange}
                placeholder="Nhập tên nghệ sĩ"
                maxLength={100}
                required
              />
            </div>

            <div className="form-group">
              <label>
                Nghệ sĩ ft.
                <span className="field-optional">Không bắt buộc</span>
              </label>
              <input
                type="text"
                name="featuring"
                value={formData.featuring}
                onChange={handleChange}
                placeholder="ft. Tên nghệ sĩ khác..."
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label>Album</label>
              <input
                type="text"
                name="album"
                value={formData.album}
                onChange={handleChange}
                placeholder="Single"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label>Thể loại</label>
              <select name="genre" value={formData.genre} onChange={handleChange}>
                {GENRES.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Năm phát hành</label>
              <input
                type="number"
                name="releaseYear"
                value={formData.releaseYear}
                onChange={handleChange}
                min="1900"
                max={CUR_YEAR}
                placeholder={CUR_YEAR}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="form-group">
            <label>
              Tags
              <span className="field-optional">Không bắt buộc</span>
            </label>

            <div className="tags-input-wrapper">
              <div className="tags-list">
                {tags.map((tag) => (
                  <span key={tag} className="tag-item">
                    #{tag}
                    <button
                      type="button"
                      className="tag-remove"
                      onClick={() => removeTag(tag)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <input
                type="text"
                className="tag-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={
                  tags.length < 10
                    ? "Nhập tag rồi Enter... (tối đa 10)"
                    : "Đã đủ 10 tags"
                }
                disabled={tags.length >= 10}
              />
            </div>

            {tags.length > 0 && (
              <span className="tags-hint">
                {tags.length}/10 tags • Nhấn Enter hoặc dấu phẩy để thêm
              </span>
            )}
          </div>

          {/* Lyrics */}
          <div className="form-group">
            <label>Lời bài hát (plain text)</label>
            <textarea
              name="lyrics"
              value={formData.lyrics}
              onChange={handleLyricsChange}
              placeholder={
                "Nhập hoặc paste lời bài hát vào đây...\n" +
                "Mỗi dòng 1 câu hát\n" +
                "Sẽ tự động tạo dòng trong LRC Editor bên dưới ✨"
              }
              rows="5"
            />

            {formData.lyrics.trim() && (
              <div className="lyrics-auto-hint">
                <span>✨</span>
                <span>
                  <strong>{plainLineCount} dòng</strong> đã được tạo tự động
                  trong LRC Editor — chỉ cần đồng bộ thời gian!
                </span>

                {!showLRC && (
                  <button
                    type="button"
                    className="lyrics-hint-open-btn"
                    onClick={() => setShowLRC(true)}
                  >
                    Mở LRC Editor →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* LRC toggle */}
          <div className="lrc-toggle-wrapper">
            <button
              type="button"
              className="lrc-toggle-btn"
              onClick={() => setShowLRC((prev) => !prev)}
            >
              <FaMicrophone />
              <span>
                {showLRC ? "Ẩn" : "Thêm"} đồng bộ lời theo thời gian (LRC / Karaoke)
              </span>

              {syncedLineCount > 0 && (
                <span className="lrc-synced-badge">
                  ✓ {syncedLineCount} dòng đã sync
                </span>
              )}

              {!showLRC && plainLineCount > 0 && syncedLineCount === 0 && (
                <span className="lrc-autofill-badge">
                  ✨ {plainLineCount} dòng sẵn sàng
                </span>
              )}

              <FaChevronDown className={`lrc-chevron${showLRC ? " open" : ""}`} />
            </button>

            {showLRC && (
              <LRCEditor
                audioFile={audioFile}
                onLRCChange={handleLRCChange}
                initialLRC=""
                externalLines={lrcExternalLines}
              />
            )}
          </div>
        </div>

        {/* Progress */}
        {loading && (
          <div className="upload-progress-wrapper">
            <div className="upload-progress-info">
              <span>Đang upload...</span>
              <span>{uploadProgress}%</span>
            </div>

            <div className="upload-progress-bar">
              <div
                className="upload-progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>

            {videoFile && (
              <p className="upload-progress-note">
                📹 Video đang được upload, vui lòng không đóng trang...
              </p>
            )}

            <button
              type="button"
              className="cancel-upload-btn"
              onClick={handleCancelUpload}
            >
              <FaTimes /> Hủy upload
            </button>
          </div>
        )}

        {/* Submit */}
        <button type="submit" className="upload-btn" disabled={!canSubmit}>
          {loading ? (
            <>
              <FaSpinner className="spinner" /> Đang upload {uploadProgress}%
            </>
          ) : (
            <>
              <FaCloudUploadAlt /> Upload bài hát
            </>
          )}
        </button>
      </form>

      <UploadHistory
        uploads={myUploads}
        loading={historyLoading}
        error={historyError}
        show={showHistory}
        onToggle={() => setShowHistory((prev) => !prev)}
        onRefresh={fetchMyUploads}
      />
    </div>
  );
};

export default UploadSong;
