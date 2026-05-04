// components/LRCEditor.js
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  FaPlay,
  FaPause,
  FaPlus,
  FaTrash,
  FaMicrophone,
  FaFileImport,
  FaFileExport,
  FaSync,
  FaKeyboard,
  FaClock,
  FaCheck,
} from "react-icons/fa";
import {
  parseLRC,
  generateLRC,
  formatLRCTime,
  getCurrentLineIndex,
} from "../utils/lrcParser";
import ConfirmModal from "./common/ConfirmModal";
import PasteLyricsModal from "./lrc/PasteLyricsModal";
import "../styles/components/LRCEditor.css";

/* ════════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════════ */
const createLine = (text = "", time = 0, idPrefix = "line") => ({
  id: `${idPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  time,
  text,
});

const buildInitialLines = (initialLRC, externalLines) => {
  if (initialLRC) {
    const parsed = parseLRC(initialLRC);
    if (parsed.length > 0) {
      return parsed.map((line, index) => ({
        id: `parsed-${index}`,
        time: line.time,
        text: line.text,
      }));
    }
  }

  if (externalLines && externalLines.length > 0) {
    return externalLines.map((line, index) => ({
      id: `auto-${index}`,
      time: 0,
      text: line.text,
    }));
  }

  return [createLine("", 0, "default")];
};

const parseEditTimeToSeconds = (value) => {
  const match = value.match(/^(\d{1,2}):(\d{2})\.(\d{2})$/);
  if (!match) return null;

  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  const centiseconds = parseInt(match[3], 10);

  return minutes * 60 + seconds + centiseconds / 100;
};

/* ════════════════════════════════════════════════════════════
   SUB: EditLine
════════════════════════════════════════════════════════════ */
const EditLine = React.memo(
  ({
    line,
    index,
    isActive,
    onTextChange,
    onTimeChange,
    onDelete,
    onAddAfter,
    onMarkTime,
    canMark,
  }) => {
    const [editTime, setEditTime] = useState(formatLRCTime(line.time));

    useEffect(() => {
      setEditTime(formatLRCTime(line.time));
    }, [line.time]);

    const handleTimeBlur = () => {
      const parsedTime = parseEditTimeToSeconds(editTime);

      if (parsedTime !== null) {
        onTimeChange(parsedTime);
      } else {
        setEditTime(formatLRCTime(line.time));
      }
    };

    return (
      <div className={`lrc-line lrc-edit-line${isActive ? " is-active" : ""}`}>
        <span className="lrc-line-index">{index + 1}</span>

        <div className="lrc-time-group">
          <input
            className="lrc-time-input"
            value={editTime}
            onChange={(e) => setEditTime(e.target.value)}
            onBlur={handleTimeBlur}
            placeholder="00:00.00"
            title="Thời gian (mm:ss.xx)"
          />

          {canMark && (
            <button
              type="button"
              className="lrc-mark-btn"
              onClick={onMarkTime}
              title="Đánh dấu thời gian audio hiện tại"
            >
              <FaClock />
            </button>
          )}
        </div>

        <input
          className={`lrc-text-input${isActive ? " active-text" : ""}`}
          value={line.text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={`Dòng ${index + 1}...`}
        />

        <div className="lrc-line-actions">
          <button
            type="button"
            className="lrc-action-btn lrc-add-btn"
            onClick={onAddAfter}
            title="Thêm dòng sau"
          >
            <FaPlus />
          </button>

          <button
            type="button"
            className="lrc-action-btn lrc-del-btn"
            onClick={onDelete}
            title="Xóa dòng này"
          >
            <FaTrash />
          </button>
        </div>
      </div>
    );
  }
);

EditLine.displayName = "EditLine";

/* ════════════════════════════════════════════════════════════
   SUB: SyncLine
════════════════════════════════════════════════════════════ */
const SyncLine = React.memo(
  ({ line, index, isCurrent, isDone, isActive, onClick, onMarkTime }) => (
    <div
      className={`lrc-line lrc-sync-line${isCurrent ? " sync-current" : ""}${
        isDone ? " sync-done" : ""
      }${isActive ? " is-active" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick();
        }
      }}
    >
      <span className="lrc-line-index">{index + 1}</span>

      <div className="lrc-sync-status">
        {isDone ? (
          <span className="sync-done-badge">
            <FaCheck /> {formatLRCTime(line.time)}
          </span>
        ) : (
          <span className="sync-pending-badge">chưa sync</span>
        )}
      </div>

      <span className={`lrc-sync-text${isCurrent ? " sync-text-active" : ""}`}>
        {line.text || <em>(trống)</em>}
      </span>

      <button
        type="button"
        className="lrc-mark-btn"
        onClick={(e) => {
          e.stopPropagation();
          onMarkTime();
        }}
        title="Đánh dấu thời điểm hiện tại"
      >
        <FaClock />
      </button>
    </div>
  )
);

SyncLine.displayName = "SyncLine";

/* ════════════════════════════════════════════════════════════
   SUB: PreviewMode
════════════════════════════════════════════════════════════ */
const PreviewMode = ({ lines, activeIndex, activeLineRef }) => {
  const visibleLines = useMemo(
    () => lines.filter((line) => line.text.trim()),
    [lines]
  );

  return (
    <div className="lrc-preview">
      <div className="lrc-preview-stage">
        {visibleLines.length === 0 ? (
          <p className="lrc-preview-empty">
            Chưa có lời. Hãy thêm lời ở tab "Soạn thảo".
          </p>
        ) : (
          visibleLines.map((line, index) => {
            const isActive = index === activeIndex;
            const isPast = index < activeIndex;

            return (
              <div
                key={line.id}
                ref={isActive ? activeLineRef : null}
                className={`lrc-preview-line${isActive ? " preview-active" : ""}${
                  isPast ? " preview-past" : ""
                }`}
              >
                <span className="preview-time">{formatLRCTime(line.time)}</span>
                <span className="preview-text">{line.text}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   MAIN: LRCEditor
════════════════════════════════════════════════════════════ */
const LRCEditor = ({
  audioFile,
  onLRCChange,
  initialLRC = "",
  externalLines = [],
}) => {
  const [lines, setLines] = useState(() =>
    buildInitialLines(initialLRC, externalLines)
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mode, setMode] = useState("edit");
  const [audioSrc, setAudioSrc] = useState(null);
  const [syncIndex, setSyncIndex] = useState(0);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);

  const prevExternalTextRef = useRef(
    externalLines.map((line) => line.text).join("\n")
  );
  const initializedExternalRef = useRef(false);

  const audioRef = useRef(null);
  const lyricsContainerRef = useRef(null);
  const activeLineRef = useRef(null);

  /* ── audio source ── */
  useEffect(() => {
    if (!audioFile) {
      setAudioSrc(null);
      return;
    }

    const url = URL.createObjectURL(audioFile);
    setAudioSrc(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [audioFile]);

  useEffect(() => {
    if (!initialLRC) return;

    const parsed = parseLRC(initialLRC);
    if (parsed.length === 0) return;

    setLines((prev) => {
      const hasMeaningfulContent = prev.some(
        (line) => line.text.trim() || line.time > 0
      );

      if (hasMeaningfulContent) return prev;

      return parsed.map((line, index) => ({
        id: `parsed-${index}`,
        time: line.time,
        text: line.text,
      }));
    });
  }, [initialLRC]);

  useEffect(() => {
    if (!externalLines || externalLines.length === 0) return;

    const currentExternalText = externalLines.map((line) => line.text).join("\n");

    if (!initializedExternalRef.current) {
      initializedExternalRef.current = true;
      prevExternalTextRef.current = currentExternalText;
      return;
    }

    if (prevExternalTextRef.current === currentExternalText) return;
    prevExternalTextRef.current = currentExternalText;

    setLines((prevLines) =>
      externalLines.map((extLine, index) => {
        const existingLine = prevLines.find((line) => line.id === `auto-${index}`);

        return {
          id: `auto-${index}`,
          text: extLine.text,
          time: existingLine?.time > 0 ? existingLine.time : 0,
        };
      })
    );

    setSyncIndex(0);
  }, [externalLines]);

  /* ── active line ── */
  useEffect(() => {
    const filledLines = lines.filter((line) => line.text.trim());
    setActiveIndex(getCurrentLineIndex(filledLines, currentTime));
  }, [lines, currentTime]);

  /* ── giữ syncIndex hợp lệ ── */
  useEffect(() => {
    if (syncIndex >= lines.length) {
      setSyncIndex(Math.max(0, lines.length - 1));
    }
  }, [syncIndex, lines.length]);

  /* ── auto scroll preview ── */
  useEffect(() => {
    if (activeLineRef.current && mode === "preview") {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex, mode]);

  /* ── notify parent ── */
  useEffect(() => {
    onLRCChange?.(generateLRC(lines), lines);
  }, [lines, onLRCChange]);

  /* ── audio handlers ── */
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  }, []);

  const handlePlayPause = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      if (audioRef.current.paused) {
        await audioRef.current.play();
        setIsPlaying(true);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error("Không thể phát audio:", error);
    }
  }, []);

  const handleSeek = useCallback((e) => {
    const time = Number(e.target.value);

    if (!audioRef.current) return;

    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  /* ── keyboard sync ── */
  const handleKeyDown = useCallback(
    (e) => {
      if (mode !== "sync") return;

      const targetTag = e.target?.tagName?.toLowerCase();
      if (targetTag === "input" || targetTag === "textarea") return;

      if (e.code === "Space") {
        e.preventDefault();

        if (syncIndex < lines.length) {
          const time = audioRef.current?.currentTime || 0;

          setLines((prev) =>
            prev.map((line, index) =>
              index === syncIndex ? { ...line, time } : line
            )
          );

          setSyncIndex((prev) => Math.min(prev + 1, lines.length - 1));
        }
      }

      if (e.code === "Enter") {
        e.preventDefault();
        setSyncIndex((prev) => Math.min(prev + 1, lines.length - 1));
      }

      if (e.code === "Backspace") {
        e.preventDefault();
        setSyncIndex((prev) => Math.max(prev - 1, 0));
      }
    },
    [mode, syncIndex, lines.length]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  /* ── CRUD ── */
  const addLine = useCallback((afterIndex) => {
    const newLine = createLine("", 0, "new");

    setLines((prev) => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, newLine);
      return next;
    });
  }, []);

  const deleteLine = useCallback((id) => {
    setLines((prev) => {
      const next = prev.filter((line) => line.id !== id);
      return next.length > 0 ? next : [createLine("", 0, "empty")];
    });
  }, []);

  const updateText = useCallback((id, text) => {
    setLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, text } : line))
    );
  }, []);

  const updateTime = useCallback((id, time) => {
    setLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, time } : line))
    );
  }, []);

  const markTimestamp = useCallback((id) => {
    const time = audioRef.current?.currentTime || 0;

    setLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, time } : line))
    );
  }, []);

  /* ── import/export ── */
  const handleImportLRC = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result;
      const parsed = parseLRC(content);

      if (parsed.length > 0) {
        setLines(
          parsed.map((line, index) => ({
            id: `import-${index}-${Date.now()}`,
            time: line.time,
            text: line.text,
          }))
        );
        setSyncIndex(0);
      }
    };

    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  }, []);

  const handleExportLRC = useCallback(() => {
    const lrcString = generateLRC(lines);

    const blob = new Blob([lrcString], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "lyrics.lrc";
    anchor.click();

    URL.revokeObjectURL(url);
  }, [lines]);

  const handleOpenPasteModal = useCallback(() => {
    setShowPasteModal(true);
  }, []);

  const handleClosePasteModal = useCallback(() => {
    setShowPasteModal(false);
  }, []);

  const handleConfirmPasteLyrics = useCallback((text) => {
    if (!text?.trim()) {
      setShowPasteModal(false);
      return;
    }

    const newLines = text
      .split("\n")
      .filter((line) => line.trim())
      .map((lineText, index) =>
        createLine(lineText.trim(), 0, `bulk-${index}`)
      );

    if (newLines.length > 0) {
      setLines(newLines);
      setSyncIndex(0);
    }

    setShowPasteModal(false);
  }, []);

  /* ── reset sync / timestamps ── */
  const resetSync = useCallback(() => {
    setSyncIndex(0);

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.pause();
    }

    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  const handleOpenResetConfirm = useCallback(() => {
    setShowResetConfirm(true);
  }, []);

  const handleCloseResetConfirm = useCallback(() => {
    setShowResetConfirm(false);
  }, []);

  const handleConfirmResetTimestamps = useCallback(() => {
    setLines((prev) => prev.map((line) => ({ ...line, time: 0 })));
    setSyncIndex(0);
    setShowResetConfirm(false);
  }, []);

  /* ── computed ── */
  const filledLines = useMemo(
    () => lines.filter((line) => line.text.trim()),
    [lines]
  );

  const progressPercent = useMemo(() => {
    if (duration <= 0) return 0;
    return (currentTime / duration) * 100;
  }, [currentTime, duration]);

  const syncedCount = useMemo(
    () => lines.filter((line) => line.time > 0).length,
    [lines]
  );

  const filledCount = filledLines.length;

  const isAutoFilled = useMemo(
    () => externalLines.filter((line) => line.text.trim()).length > 0,
    [externalLines]
  );

  return (
    <>
      <div className="lrc-editor">
        <div className="lrc-header">
          <div className="lrc-title">
            <FaMicrophone className="lrc-title-icon" />
            <span>Đồng bộ lời bài hát (LRC / Karaoke)</span>
            {isAutoFilled && (
              <span className="lrc-auto-badge">✨ Tự động từ lời bài hát</span>
            )}
          </div>

          <div className="lrc-mode-tabs">
            {[
              { key: "edit", label: "✏️ Soạn thảo" },
              { key: "sync", label: "🎵 Đồng bộ" },
              { key: "preview", label: "👁️ Xem trước" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`lrc-tab${mode === tab.key ? " active" : ""}`}
                onClick={() => setMode(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {audioFile ? (
          <div className="lrc-audio-player">
            <audio
              ref={audioRef}
              src={audioSrc || undefined}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />

            <div className="lrc-player-controls">
              <button
                type="button"
                className="lrc-play-btn"
                onClick={handlePlayPause}
              >
                {isPlaying ? <FaPause /> : <FaPlay />}
              </button>

              <div className="lrc-player-info">
                <div className="lrc-timeline">
                  <div className="lrc-timeline-track">
                    <div
                      className="lrc-seek-fill"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    className="lrc-seek-bar"
                  />
                </div>

                <div className="lrc-time-display">
                  <span>{formatLRCTime(currentTime)}</span>
                  <span>{formatLRCTime(duration)}</span>
                </div>
              </div>
            </div>

            {mode === "sync" && (
              <div className="lrc-sync-indicator">
                <div className="lrc-sync-info">
                  <span className="lrc-sync-line-num">
                    Dòng {Math.min(syncIndex + 1, lines.length)} / {lines.length}
                  </span>
                  <span className="lrc-sync-current-text">
                    {lines[syncIndex]?.text || "(trống)"}
                  </span>
                </div>

                <div className="lrc-sync-shortcuts">
                  <kbd>Space</kbd> đánh dấu &amp; tiếp
                  <kbd>↵</kbd> bỏ qua
                  <kbd>⌫</kbd> quay lại
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="lrc-no-audio">
            <FaClock />
            <p>Vui lòng chọn file nhạc để sử dụng tính năng đồng bộ</p>
          </div>
        )}

        <div className="lrc-toolbar">
          <div className="lrc-toolbar-left">
            <button
              type="button"
              className="lrc-tool-btn"
              onClick={() => addLine(lines.length - 1)}
            >
              <FaPlus /> Thêm dòng
            </button>

            <button
              type="button"
              className="lrc-tool-btn"
              onClick={handleOpenPasteModal}
            >
              <FaKeyboard /> Paste lời
            </button>

            <label className="lrc-tool-btn" style={{ cursor: "pointer" }}>
              <FaFileImport /> Import .lrc
              <input
                type="file"
                accept=".lrc,.txt"
                onChange={handleImportLRC}
                hidden
              />
            </label>

            <button
              type="button"
              className="lrc-tool-btn"
              onClick={handleExportLRC}
            >
              <FaFileExport /> Export .lrc
            </button>

            {mode === "sync" && (
              <button
                type="button"
                className="lrc-tool-btn lrc-reset-btn"
                onClick={resetSync}
              >
                <FaSync /> Reset vị trí
              </button>
            )}

            {syncedCount > 0 && (
              <button
                type="button"
                className="lrc-tool-btn lrc-reset-time-btn"
                onClick={handleOpenResetConfirm}
              >
                <FaSync /> Reset timestamp
              </button>
            )}
          </div>

          <div className="lrc-toolbar-right">
            <span className="lrc-line-count">
              {filledCount} dòng • {syncedCount} đã sync
              {filledCount > 0 && syncedCount === filledCount && (
                <span className="lrc-all-synced"> ✅ Hoàn tất!</span>
              )}
            </span>
          </div>
        </div>

        {isAutoFilled && syncedCount === 0 && mode !== "preview" && (
          <div className="lrc-autofill-banner">
            <span className="lrc-autofill-icon">✨</span>
            <div className="lrc-autofill-text">
              <strong>{filledCount} dòng</strong> đã được tạo tự động từ lời bài hát.
              Chuyển sang tab <strong>🎵 Đồng bộ</strong> để đánh dấu thời gian.
            </div>
            <button
              type="button"
              className="lrc-autofill-action"
              onClick={() => setMode("sync")}
            >
              Đồng bộ ngay →
            </button>
          </div>
        )}

        {mode === "edit" && (
          <div className="lrc-lines-container" ref={lyricsContainerRef}>
            {lines.map((line, index) => (
              <EditLine
                key={line.id}
                line={line}
                index={index}
                isActive={index === activeIndex}
                onTextChange={(text) => updateText(line.id, text)}
                onTimeChange={(time) => updateTime(line.id, time)}
                onDelete={() => deleteLine(line.id)}
                onAddAfter={() => addLine(index)}
                onMarkTime={() => markTimestamp(line.id)}
                canMark={!!audioFile}
              />
            ))}
          </div>
        )}

        {mode === "sync" && (
          <div className="lrc-sync-container">
            <div className="lrc-sync-guide">
              ▶ Phát nhạc → Nhấn <kbd>Space</kbd> khi câu bắt đầu để đánh dấu timestamp
            </div>

            {filledCount > 0 && (
              <div className="lrc-sync-progress">
                <div className="lrc-sync-progress-bar">
                  <div
                    className="lrc-sync-progress-fill"
                    style={{
                      width: `${
                        filledCount > 0 ? (syncedCount / filledCount) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="lrc-sync-progress-text">
                  {syncedCount} / {filledCount} dòng đã đồng bộ
                </span>
              </div>
            )}

            <div className="lrc-lines-container">
              {lines.map((line, index) => (
                <SyncLine
                  key={line.id}
                  line={line}
                  index={index}
                  isCurrent={index === syncIndex}
                  isDone={line.time > 0}
                  isActive={index === activeIndex}
                  onClick={() => setSyncIndex(index)}
                  onMarkTime={() => markTimestamp(line.id)}
                />
              ))}
            </div>
          </div>
        )}

        {mode === "preview" && (
          <PreviewMode
            lines={lines}
            activeIndex={activeIndex}
            activeLineRef={activeLineRef}
          />
        )}
      </div>

      <PasteLyricsModal
        open={showPasteModal}
        title="Paste lời bài hát"
        confirmText="Nhập lời"
        cancelText="Hủy"
        onConfirm={handleConfirmPasteLyrics}
        onClose={handleClosePasteModal}
      />

      <ConfirmModal
        open={showResetConfirm}
        title="Reset timestamp"
        message="Bạn có chắc muốn reset tất cả timestamp về 0 không? Thao tác này sẽ giữ nguyên nội dung lời nhưng xóa toàn bộ thời gian đã đồng bộ."
        confirmText="Reset"
        cancelText="Hủy"
        confirmVariant="danger"
        onConfirm={handleConfirmResetTimestamps}
        onClose={handleCloseResetConfirm}
      />
    </>
  );
};

export default LRCEditor;