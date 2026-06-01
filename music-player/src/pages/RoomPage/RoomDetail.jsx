// pages/RoomPage/RoomDetail.jsx
import React, {
  useState, useEffect, useRef, useCallback, useMemo, useReducer
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../../context/AuthContext";
import { FaAlignLeft, FaMicrophone, FaVideo, FaArrowLeft, FaCrown } from "react-icons/fa";
import songAPI from "../../api/songAPI";
import { API_BASE_URL, SOCKET_URL } from "../../config/api";
import { parseLRC, getCurrentLineIndex } from "../../utils/lrcParser";
import RoomPlayer from "./RoomPlayer";
import RoomChat from "./RoomChat";
import RoomUsers from "./RoomUsers";
import RoomQueue from "./RoomQueue";
import "./RoomPage.css";

const normalizeId = (id) => id?.toString?.() ?? "";
const hasPlayableSource = (song) =>
  !!(song?.audioUrl || song?.youtubeUrl || song?.videoFile);
const getSongIdentity = (song) =>
  normalizeId(song?.songId || song?._id || song?.audioUrl || song?.youtubeUrl || song?.videoFile);

const getYoutubeVideoId = (url) => {
  if (!url || typeof url !== "string") return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");

    if (host === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") return parsed.searchParams.get("v");
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/embed/")[1]?.split("/")[0] || null;
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        return parsed.pathname.split("/shorts/")[1]?.split("/")[0] || null;
      }
    }
  } catch {
    return null;
  }

  return null;
};

const getYoutubeEmbedUrl = (url) => {
  const videoId = getYoutubeVideoId(url);
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`;
};

// ─── Reducer để quản lý state tập trung ───────────────────────────────────────
const initialRoomState = {
  room: null,
  users: [],
  messages: [],
  queue: [],
  previousSong: null,
  currentSong: null,
  playerState: { isPlaying: false, currentTime: 0, volume: 80 },
  isHost: false,
};

function roomReducer(state, action) {
  switch (action.type) {
    case "INIT":
      return {
        ...state,
        room: action.payload.room,
        users: action.payload.users ?? [],
        messages: action.payload.messages ?? [],
        queue: action.payload.room?.queue ?? action.payload.queue ?? [],
        previousSong: null,
        currentSong: action.payload.room?.currentSong ?? action.payload.currentSong ?? null,
        playerState: action.payload.playerState ?? state.playerState,
        isHost: normalizeId(action.payload.room?.host?._id) === action.payload.currentUserId,
      };

    case "USER_JOINED":
      return {
        ...state,
        users: state.users.some(
          (u) => normalizeId(u._id) === normalizeId(action.payload._id)
        )
          ? state.users
          : [...state.users, action.payload],
      };

    case "USER_LEFT":
      if (Array.isArray(action.payload?.users)) {
        return { ...state, users: action.payload.users };
      }
      return {
        ...state,
        users: state.users.filter(
          (u) => normalizeId(u._id) !== normalizeId(action.payload?.userId)
        ),
      };

    case "SONG_CHANGED": {
      const incomingSong = action.payload.song;
      const currentSongId = normalizeId(state.currentSong?.songId || state.currentSong?._id);
      const incomingSongId = normalizeId(incomingSong?.songId || incomingSong?._id);
      const isSameSong = !!currentSongId && currentSongId === incomingSongId;
      return {
        ...state,
        previousSong: isSameSong ? state.previousSong : (state.currentSong ?? state.previousSong),
        currentSong: incomingSong,
        playerState: action.payload.playerState ?? state.playerState,
      };
    }

    case "PLAYER_SYNC":
      return { ...state, playerState: action.payload };

    case "QUEUE_UPDATED":
      return { ...state, queue: action.payload ?? [] };

    case "NEW_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload] };

    case "HOST_CHANGED": {
      const newHostId = normalizeId(action.payload?.newHostId);
      return {
        ...state,
        isHost: newHostId === action.payload.currentUserId,
        room: state.room
          ? { ...state.room, host: { ...(state.room.host ?? {}), _id: newHostId } }
          : state.room,
      };
    }

    case "CLEAR_PREVIOUS_SONG":
      return { ...state, previousSong: null };

    default:
      return state;
  }
}

// ─── Sub-components ────────────────────────────────────────────────────────────
const RoomLyricsPanel = React.memo(({ song, currentTime, isPlaying }) => {
  const lines = useMemo(() => parseLRC(song?.lrc ?? ""), [song?.lrc]);
  const activeIndex = useMemo(
    () => getCurrentLineIndex(lines, currentTime ?? 0),
    [lines, currentTime]
  );
  const activeLineRef = useRef(null);

  useEffect(() => {
    activeLineRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex]);

  if (!song) {
    return <div className="room-media-empty"><p>Chưa có bài đang phát</p></div>;
  }

  if (lines.length > 0) {
    return (
      <div className="room-lyrics-wrap">
        <div className="room-lyrics-head">
          <span className="room-lyrics-badge"><FaMicrophone /> Karaoke</span>
          <span className="room-lyrics-song">{song.title}</span>
        </div>
        <div className="room-karaoke-lines">
          {lines.map((line, index) => (
            <p
              key={`${line.time}-${index}`}
              ref={index === activeIndex ? activeLineRef : null}
              className={[
                "room-karaoke-line",
                index === activeIndex ? "active" : "",
                index < activeIndex ? "past" : "",
              ].filter(Boolean).join(" ")}
            >
              {line.text}
            </p>
          ))}
        </div>
        {!isPlaying && (
          <p className="room-lyrics-hint">
            Nhạc đang tạm dừng, lyric đồng bộ sẽ tiếp tục khi phát.
          </p>
        )}
      </div>
    );
  }

  if (song?.lyrics) {
    return (
      <div className="room-lyrics-wrap">
        <div className="room-lyrics-head">
          <span className="room-lyrics-badge"><FaAlignLeft /> Lyric</span>
          <span className="room-lyrics-song">{song.title}</span>
        </div>
        <pre className="room-lyrics-plain">{song.lyrics}</pre>
      </div>
    );
  }

  return <div className="room-media-empty"><p>Bài hát này chưa có lyric</p></div>;
});
RoomLyricsPanel.displayName = "RoomLyricsPanel";

// ─────────────────────────────────────────────────────────────────────────────
const RoomVideoPanel = React.memo(({ videoURL, song, videoRef, isHost, onTogglePlayPause }) => {
  const youtubeEmbedUrl = useMemo(() => getYoutubeEmbedUrl(videoURL), [videoURL]);

  if (!song) {
    return <div className="room-media-empty"><p>Chưa có bài đang phát</p></div>;
  }
  if (!videoURL) {
    return <div className="room-media-empty"><p>Bài hát này chưa có video</p></div>;
  }

  if (youtubeEmbedUrl) {
    return (
      <div className="room-video-wrap">
        <iframe
          className="room-video-iframe"
          src={youtubeEmbedUrl}
          title={song.title || "YouTube video"}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
        <div className="room-video-note">
          Video YouTube dang phat o che do nhung.
          {isHost ? " Dong bo Play/Pause theo host khong ap dung voi YouTube iframe." : ""}
        </div>
      </div>
    );
  }

  return (
    <div className="room-video-wrap">
      <video
        ref={videoRef}
        className="room-video-player"
        src={videoURL}
        poster={song.thumbnail ?? "/images/default-cover.svg"}
        preload="metadata"
        muted
        playsInline
      />
      <div className="room-video-note">
        {isHost
          ? "Host có thể bấm nút Play/Pause để đồng bộ video."
          : "Video được đồng bộ theo host."}
      </div>
      {isHost && (
        <button type="button" className="room-video-sync-btn" onClick={onTogglePlayPause}>
          Đồng bộ Play/Pause
        </button>
      )}
    </div>
  );
});
RoomVideoPanel.displayName = "RoomVideoPanel";

// ─── Password Modal ────────────────────────────────────────────────────────────
const PasswordModal = React.memo(({
  password, onChange, onSubmit, error, isSubmitting
}) => (
  <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="pw-modal-title">
    <div className="modal-box join-room-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2 id="pw-modal-title">Nhập mật khẩu phòng</h2>
      </div>
      <form onSubmit={onSubmit} className="create-room-form">
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="form-group">
          <label htmlFor="room-password-input">Mật khẩu</label>
          <input
            id="room-password-input"
            type="password"
            value={password}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Nhập mật khẩu phòng..."
            autoFocus
            autoComplete="current-password"
          />
        </div>
        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? "Đang xác thực..." : "Vào phòng"}
        </button>
      </form>
    </div>
  </div>
));
PasswordModal.displayName = "PasswordModal";

const ConfirmActionModal = React.memo(({
  title, description, confirmText, cancelText, onConfirm, onCancel,
}) => (
  <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
    <div className="modal-box join-room-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2 id="confirm-modal-title">{title}</h2>
      </div>
      <div className="create-room-form">
        <p>{description}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="submit-btn" onClick={onConfirm}>
            {confirmText}
          </button>
          <button type="button" className="submit-btn" onClick={onCancel}>
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  </div>
));
ConfirmActionModal.displayName = "ConfirmActionModal";

const NoticeModal = React.memo(({ title, message, buttonText, onClose }) => (
  <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="notice-modal-title">
    <div className="modal-box join-room-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2 id="notice-modal-title">{title}</h2>
      </div>
      <div className="create-room-form">
        <p>{message}</p>
        <button type="button" className="submit-btn" onClick={onClose}>
          {buttonText}
        </button>
      </div>
    </div>
  </div>
));
NoticeModal.displayName = "NoticeModal";

// ─── Custom hook: useRoomSocket ────────────────────────────────────────────────
function useRoomSocket({ roomId, user, onKicked, onClosed }) {
  const socketRef = useRef(null);
  const [state, dispatch] = useReducer(roomReducer, initialRoomState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [passwordPrompt, setPasswordPrompt] = useState({
    show: false, error: "", isSubmitting: false,
  });

  const currentUserId = useMemo(() => normalizeId(user?._id), [user?._id]);

  useEffect(() => {
    setLoading(true);
    setError("");

    const token = localStorage.getItem("token");
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.emit("room:join", { roomId });
    let initTimeout = window.setTimeout(() => {
      setError("Khong ket noi duoc den phong. Vui long thu lai.");
      setLoading(false);
    }, 10000);

    const clearInitTimeout = () => {
      if (initTimeout) {
        window.clearTimeout(initTimeout);
        initTimeout = null;
      }
    };

    // ── Handlers ──────────────────────────────────────────────────────────────
    const onInit = (data) => {
      clearInitTimeout();
      dispatch({ type: "INIT", payload: { ...data, currentUserId } });
      setPasswordPrompt({ show: false, error: "", isSubmitting: false });
      setLoading(false);
    };

    const onUserJoined = (payload) => {
      const joinedUser = payload?.user ?? payload;
      if (joinedUser?._id) dispatch({ type: "USER_JOINED", payload: joinedUser });
    };

    const onUserLeft = (payload) =>
      dispatch({ type: "USER_LEFT", payload });

    const onSongChanged = ({ song, playerState }) =>
      dispatch({ type: "SONG_CHANGED", payload: { song, playerState } });

    const onPlayerSync = (ps) =>
      dispatch({ type: "PLAYER_SYNC", payload: ps });

    const onQueueUpdated = (q) =>
      dispatch({ type: "QUEUE_UPDATED", payload: q });

    const onNewMessage = (msg) =>
      dispatch({ type: "NEW_MESSAGE", payload: msg });

    const onHostChanged = (payload) =>
      dispatch({ type: "HOST_CHANGED", payload: { ...payload, currentUserId } });

    const onKickedHandler = () => onKicked?.();
    const onClosedHandler = () => onClosed?.();

    const onRoomError = ({ code = "", message = "" } = {}) => {
      const nonFatalCodes = new Set([
        "QUEUE_EMPTY",
        "HISTORY_EMPTY",
        "NOT_HOST",
        "NO_PERMISSION",
        "INVALID_SONG",
        "MSG_TOO_LONG",
        "NOT_IN_ROOM",
        "CANNOT_KICK_SELF",
      ]);
      if (nonFatalCodes.has(code)) {
        if (code === "HISTORY_EMPTY") {
          dispatch({ type: "CLEAR_PREVIOUS_SONG" });
        }
        if (code === "QUEUE_EMPTY") {
          dispatch({ type: "QUEUE_UPDATED", payload: [] });
        }
        if (process.env.NODE_ENV === "development") {
          console.warn("[room:error]", code, message);
        }
        return;
      }

      const lower = message.toLowerCase();
      const isPasswordIssue =
        lower.includes("password") ||
        lower.includes("mat khau") ||
        lower.includes("mật khẩu");

      if (isPasswordIssue) {
        clearInitTimeout();
        setPasswordPrompt({ show: true, error: message, isSubmitting: false });
        setLoading(false);
        return;
      }
      clearInitTimeout();
      setError(message || "Có lỗi xảy ra");
      setLoading(false);
    };

    const onConnectError = (err) => {
      clearInitTimeout();
      setError(err?.message || "Khong the ket noi socket");
      setLoading(false);
    };

    // ── Register ───────────────────────────────────────────────────────────────
    socket.on("room:init", onInit);
    socket.on("room:user-joined", onUserJoined);
    socket.on("room:user-left", onUserLeft);
    socket.on("room:song-changed", onSongChanged);
    socket.on("room:player-sync", onPlayerSync);
    socket.on("room:queue-updated", onQueueUpdated);
    socket.on("room:new-message", onNewMessage);
    socket.on("room:host-changed", onHostChanged);
    socket.on("room:kicked", onKickedHandler);
    socket.on("room:closed", onClosedHandler);
    socket.on("room:error", onRoomError);
    socket.on("connect_error", onConnectError);

    return () => {
      clearInitTimeout();
      socket.emit("room:leave", { roomId });
      socket.off("room:init", onInit);
      socket.off("room:user-joined", onUserJoined);
      socket.off("room:user-left", onUserLeft);
      socket.off("room:song-changed", onSongChanged);
      socket.off("room:player-sync", onPlayerSync);
      socket.off("room:queue-updated", onQueueUpdated);
      socket.off("room:new-message", onNewMessage);
      socket.off("room:host-changed", onHostChanged);
      socket.off("room:kicked", onKickedHandler);
      socket.off("room:closed", onClosedHandler);
      socket.off("room:error", onRoomError);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
    };
  }, [roomId, currentUserId]); // bỏ user object ra khỏi deps → chỉ dùng currentUserId

  const submitPassword = useCallback((password) => {
    if (!password.trim() || !socketRef.current) return;
    setPasswordPrompt((prev) => ({ ...prev, isSubmitting: true, error: "" }));
    socketRef.current.emit("room:join", { roomId, password });
  }, [roomId]);

  return { socketRef, state, loading, error, passwordPrompt, submitPassword };
}

// ─── Custom hook: useSongDetail ────────────────────────────────────────────────
function useSongDetail(songId) {
  const [songDetail, setSongDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!songId || songId.startsWith("yt-")) {
      setSongDetail(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setSongDetail(null);

    songAPI.getById(songId)
      .then((res) => { if (!cancelled) setSongDetail(res?.data ?? null); })
      .catch((err) => { if (!cancelled) console.warn("Fetch song detail failed:", err?.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [songId]);

  return { songDetail, isLoading };
}

// ─── Custom hook: useVideoSync ────────────────────────────────────────────────
function useVideoSync(videoRef, videoURL, playerState, songId) {
  // Ref để track songId trước đó → reset video khi đổi bài
  const prevSongIdRef = useRef(null);
  const isYoutubeUrl = useMemo(() => !!getYoutubeVideoId(videoURL), [videoURL]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoURL || isYoutubeUrl) return;

    // Reset về đầu khi đổi bài
    if (prevSongIdRef.current !== songId) {
      prevSongIdRef.current = songId;
      video.currentTime = playerState.currentTime ?? 0;
    }

    const timeDiff = Math.abs((video.currentTime ?? 0) - (playerState.currentTime ?? 0));
    if (timeDiff > 1.5) {
      video.currentTime = playerState.currentTime ?? 0;
    }

    if (playerState.isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [videoURL, playerState.currentTime, playerState.isPlaying, songId, isYoutubeUrl]);
}

// ─── Main Component ────────────────────────────────────────────────────────────
const RoomDetail = () => {
  const { roomId } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  // UI state
  const [activeSidebarTab, setActiveSidebarTab] = useState("chat");
  const [activeMediaTab, setActiveMediaTab] = useState("lyrics");
  const [isSongMiniView, setIsSongMiniView] = useState(false);
  const [miniMediaTabs, setMiniMediaTabs] = useState(new Set(["lyrics"]));
  const [roomPassword, setRoomPassword] = useState("");
  const [displayCurrentTime, setDisplayCurrentTime] = useState(0);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [roomNotice, setRoomNotice] = useState({
    open: false,
    title: "",
    message: "",
  });

  // Redirect nếu chưa đăng nhập
  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  // Socket & room state
  const { socketRef, state, loading, error, passwordPrompt, submitPassword } = useRoomSocket({
    roomId,
    user,
    onKicked: () => {
      setRoomNotice({
        open: true,
        title: "Thông báo",
        message: "Bạn đã bị kick khỏi phòng.",
      });
    },
    onClosed: () => {
      setRoomNotice({
        open: true,
        title: "Thông báo",
        message: "Phòng đã bị đóng bởi host.",
      });
    },
  });

  const { room, users, messages, queue, previousSong, currentSong, playerState, isHost } = state;

  // Song detail
  const currentSongId = useMemo(
    () => normalizeId(currentSong?.songId || currentSong?._id),
    [currentSong]
  );
  const { songDetail, isLoading: isSongDetailLoading } = useSongDetail(currentSongId);

  const activeSongForMedia = useMemo(() => {
    if (!currentSong) return null;
    return {
      ...currentSong,
      ...(songDetail ?? {}),
      _id: currentSongId || songDetail?._id || null,
    };
  }, [currentSong, songDetail, currentSongId]);

  const videoURL = useMemo(
    () => (activeSongForMedia ? songAPI.getVideoURL(activeSongForMedia) : null),
    [activeSongForMedia]
  );

  // Video đồng bộ
  useVideoSync(videoRef, videoURL, playerState, currentSongId);

  // Đồng hồ local để lyric chạy mượt ngay cả khi server sync thưa
  useEffect(() => {
    setDisplayCurrentTime(playerState.currentTime ?? 0);
  }, [playerState.currentTime, currentSongId]);

  useEffect(() => {
    if (!playerState.isPlaying) return undefined;

    const timer = window.setInterval(() => {
      setDisplayCurrentTime((prev) => prev + 0.25);
    }, 250);

    return () => window.clearInterval(timer);
  }, [playerState.isPlaying, currentSongId]);

  // Tự động bỏ tab video khi không có URL
  useEffect(() => {
    if (videoURL) return;
    setMiniMediaTabs((prev) => {
      if (!prev.has("video")) return prev;
      const next = new Set(prev);
      next.delete("video");
      return next;
    });
    setActiveMediaTab((prev) => (prev === "video" ? "lyrics" : prev));
  }, [videoURL]);

  // ── Socket emit helpers ───────────────────────────────────────────────────────
  const emit = useCallback(
    (event, payload = {}) => socketRef.current?.emit(event, { roomId, ...payload }),
    [roomId]
  );

  const handlePlayPause = useCallback(() => {
    if (!isHost) return;
    emit("room:play-pause");
  }, [isHost, emit]);

  const handleSeek = useCallback(
    (time) => { if (isHost) emit("room:seek", { time }); },
    [isHost, emit]
  );

  const currentSongIdentity = useMemo(
    () => getSongIdentity(currentSong),
    [currentSong]
  );
  const hasNextSong = useMemo(
    () => Array.isArray(queue) && queue.some((item) => {
      if (!hasPlayableSource(item)) return false;
      const itemIdentity = getSongIdentity(item);
      if (!itemIdentity) return false;
      if (!currentSongIdentity) return true;
      return itemIdentity !== currentSongIdentity;
    }),
    [queue, currentSongIdentity]
  );
  const hasPreviousSong = useMemo(
    () => hasPlayableSource(previousSong),
    [previousSong]
  );

  const handleNextSong = useCallback(() => {
    if (!isHost) return;
    if (!hasNextSong) return;
    emit("room:next-song");
  }, [isHost, hasNextSong, emit]);

  const handlePrevSong = useCallback(() => {
    if (!isHost) return;
    if (!hasPreviousSong) return;
    emit("room:prev-song");
  }, [isHost, hasPreviousSong, emit]);

  const handleVolumeChange = useCallback(
    (volume) => { if (isHost) emit("room:volume-change", { volume }); },
    [isHost, emit]
  );

  const handleAddToQueue = useCallback(
    (song) => emit("room:add-queue", { song }),
    [emit]
  );

  const handleRemoveFromQueue = useCallback(
    (index) => { if (index != null) emit("room:remove-queue", { index }); },
    [emit]
  );

  const handlePlayNow = useCallback(
    (queueItem, index) => {
      if (!isHost || !queueItem) return;
      const song = {
        _id: queueItem.songId ?? queueItem._id ?? null,
        songId: queueItem.songId ?? queueItem._id ?? null,
        title: queueItem.title,
        artist: queueItem.artist,
        thumbnail: queueItem.thumbnail,
        duration: queueItem.duration ?? 0,
        audioUrl: queueItem.audioUrl,
        youtubeUrl: queueItem.youtubeUrl || null,
        videoFile: queueItem.videoFile || queueItem.youtubeUrl || null,
      };
      emit("room:change-song", { song });
      if (Number.isInteger(index) && index >= 0) {
        emit("room:remove-queue", { index });
      }
    },
    [isHost, emit]
  );

  const handlePlayDirect = useCallback(
    (song) => {
      if (!isHost || !song) return;
      emit("room:change-song", { song });
    },
    [isHost, emit]
  );

  const handleSendMessage = useCallback(
    (content) => emit("room:send-message", { content }),
    [emit]
  );

  const handleKickUser = useCallback(
    (userId) => { if (isHost) emit("room:kick-user", { userId }); },
    [isHost, emit]
  );

  const handleTransferHost = useCallback(
    (newHostId) => { if (isHost && newHostId) emit("room:transfer-host", { newHostId }); },
    [isHost, emit]
  );

  const handleCloseRoom = useCallback(async () => {
    if (!isHost) return;
    setShowCloseConfirm(true);
  }, [isHost]);

  const handleConfirmCloseRoom = useCallback(async () => {
    if (!isHost) return;
    setShowCloseConfirm(false);

    emit("room:close");

    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Close room fallback failed:", err);
    }
  }, [isHost, emit, roomId]);

  const handleRoomNoticeClose = useCallback(() => {
    setRoomNotice({ open: false, title: "", message: "" });
    navigate("/rooms");
  }, [navigate]);

  // ── View toggle ───────────────────────────────────────────────────────────────
  const handleToggleSongView = useCallback(() => {
    if (!isSongMiniView) {
      setMiniMediaTabs(new Set([activeMediaTab]));
      setIsSongMiniView(true);
    } else {
      setActiveMediaTab((current) => {
        if (miniMediaTabs.has(current)) return current;
        return miniMediaTabs.has("lyrics") ? "lyrics" : "video";
      });
      setIsSongMiniView(false);
    }
  }, [isSongMiniView, activeMediaTab, miniMediaTabs]);

  const handleMiniMediaTabToggle = useCallback(
    (tab) => {
      if (tab === "video" && !videoURL) return;
      setMiniMediaTabs((prev) => {
        const next = new Set(prev);
        next.has(tab) ? next.delete(tab) : next.add(tab);
        return next;
      });
    },
    [videoURL]
  );

  const handleSubmitPassword = useCallback(
    (e) => {
      e.preventDefault();
      submitPassword(roomPassword);
    },
    [roomPassword, submitPassword]
  );

  // ── Render helpers ────────────────────────────────────────────────────────────
  const lyricsPanel = useMemo(() => {
    if (isSongDetailLoading) return <div className="room-media-loading">Đang tải lyric...</div>;
    return (
      <RoomLyricsPanel
        song={activeSongForMedia}
        currentTime={displayCurrentTime}
        isPlaying={playerState.isPlaying}
      />
    );
  }, [isSongDetailLoading, activeSongForMedia, displayCurrentTime, playerState.isPlaying]);

  const videoPanel = useMemo(() => {
    if (isSongDetailLoading) return <div className="room-media-loading">Đang tải video...</div>;
    return (
      <RoomVideoPanel
        videoURL={videoURL}
        song={activeSongForMedia}
        videoRef={videoRef}
        isHost={isHost}
        onTogglePlayPause={handlePlayPause}
      />
    );
  }, [isSongDetailLoading, videoURL, activeSongForMedia, isHost, handlePlayPause]);

  // ── Loading / Error states ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="room-loading">
        <div className="loading-spinner large" />
        <p>Đang vào phòng...</p>
        {passwordPrompt.show && (
          <PasswordModal
            password={roomPassword}
            onChange={setRoomPassword}
            onSubmit={handleSubmitPassword}
            error={passwordPrompt.error}
            isSubmitting={passwordPrompt.isSubmitting}
          />
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="room-error">
        <h2>❌ {error}</h2>
        <button onClick={() => navigate("/rooms")}>Quay lại</button>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div className="room-detail">
      {/* Topbar */}
      <header className="room-topbar">
        <div className="room-topbar-left">
          <button className="back-btn" onClick={() => navigate("/rooms")}>
            <FaArrowLeft /> Rời phòng
          </button>
          <div className="room-info">
            <h2>{room?.name}</h2>
            <span className="room-user-count">👥 {users.length}/{room?.maxUsers}</span>
            {isHost && (
              <span className="host-badge">
                <FaCrown /> Host
              </span>
            )}
          </div>
        </div>
        {isHost && (
          <div className="room-topbar-right">
            <button className="host-danger-btn" onClick={handleCloseRoom}>
              Đóng phòng
            </button>
          </div>
        )}
      </header>

      {/* Main */}
      <div className="room-main">
        <div className={`room-content ${isSongMiniView ? "song-mini" : ""}`}>
          {/* Player section */}
          <section className="room-player-section">
            <div className="room-player-head">
              <span className="room-player-title">Bài hát</span>
              <button
                type="button"
                className="room-player-view-btn"
                onClick={handleToggleSongView}
              >
                {isSongMiniView ? "Mở rộng" : "Thu gọn"}
              </button>
            </div>

            <div className={`room-player-main ${isSongMiniView ? "hidden" : ""}`}>
              <RoomPlayer
                currentSong={currentSong}
                playerState={playerState}
                isHost={isHost}
                canPrev={hasPreviousSong}
                canNext={hasNextSong}
                onPrev={handlePrevSong}
                onPlayPause={handlePlayPause}
                onSeek={handleSeek}
                onNext={handleNextSong}
                onVolumeChange={handleVolumeChange}
              />
            </div>

            {isSongMiniView && (
              <div className="room-song-mini-card">
                <img
                  className="room-song-mini-thumb"
                  src={activeSongForMedia?.thumbnail ?? "/images/default-cover.svg"}
                  alt={activeSongForMedia?.title ?? "song cover"}
                />
                <div className="room-song-mini-meta">
                  <strong>{activeSongForMedia?.title ?? "Chưa có bài hát nào"}</strong>
                  <span>{activeSongForMedia?.artist ?? "Hãy thêm bài hát vào hàng chờ"}</span>
                </div>
                {isHost && (
                  <button
                    type="button"
                    className="room-song-mini-play"
                    onClick={handlePlayPause}
                    aria-label={playerState.isPlaying ? "Pause" : "Play"}
                  >
                    {playerState.isPlaying ? "⏸" : "▶"}
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Media section */}
          <section className="room-media-section">
            <div className="room-media-head">
              <span className="room-media-title">Lyric / Video</span>
            </div>

            {!isSongMiniView ? (
              <>
                <div className="room-media-tabs" role="tablist">
                  {[
                    { key: "lyrics", label: "Lyric", icon: <FaAlignLeft /> },
                    { key: "video", label: "Video", icon: <FaVideo /> },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      role="tab"
                      aria-selected={activeMediaTab === tab.key}
                      className={`room-media-tab ${activeMediaTab === tab.key ? "active" : ""}`}
                      onClick={() => setActiveMediaTab(tab.key)}
                      disabled={tab.key === "video" && !videoURL}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>
                <div className="room-media-content" role="tabpanel">
                  {activeMediaTab === "lyrics" ? lyricsPanel : videoPanel}
                </div>
              </>
            ) : (
              <>
                <div className="room-media-mini-tabs">
                  {[
                    { key: "lyrics", label: "Lyric", icon: <FaAlignLeft /> },
                    { key: "video", label: "Video", icon: <FaVideo /> },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      className={`room-media-mini-tab ${miniMediaTabs.has(tab.key) ? "active" : ""}`}
                      onClick={() => handleMiniMediaTabToggle(tab.key)}
                      disabled={tab.key === "video" && !videoURL}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                <div className={`room-media-mini-content ${miniMediaTabs.size === 2 ? "two-panels" : ""}`}>
                  {miniMediaTabs.size === 0 ? (
                    <div className="room-media-empty">
                      <p>Chọn Lyric hoặc Video để hiển thị trong mini view</p>
                    </div>
                  ) : (
                    <>
                      {miniMediaTabs.has("lyrics") && (
                        <div className="room-media-mini-panel">{lyricsPanel}</div>
                      )}
                      {miniMediaTabs.has("video") && (
                        <div className="room-media-mini-panel">{videoPanel}</div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="room-sidebar">
          <div className="sidebar-tabs" role="tablist">
            {[
              { key: "chat", label: "💬 Chat" },
              { key: "queue", label: "🎵 Hàng chờ" },
              { key: "users", label: `👥 ${users.length}` },
            ].map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeSidebarTab === tab.key}
                className={`sidebar-tab ${activeSidebarTab === tab.key ? "active" : ""}`}
                onClick={() => setActiveSidebarTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="sidebar-content" role="tabpanel">
            {activeSidebarTab === "chat" && (
              <RoomChat messages={messages} currentUser={user} onSend={handleSendMessage} />
            )}
            {activeSidebarTab === "queue" && (
              <RoomQueue
                queue={queue}
                currentSong={currentSong}
                isHost={isHost}
                currentUserId={user?._id}
                onAddSong={handleAddToQueue}
                onRemoveFromQueue={handleRemoveFromQueue}
                onPlayNow={handlePlayNow}
                onPlayDirect={handlePlayDirect}
              />
            )}
            {activeSidebarTab === "users" && (
              <RoomUsers
                users={users}
                hostId={room?.host?._id}
                currentUserId={user?._id}
                isHost={isHost}
                onKick={handleKickUser}
                onTransferHost={handleTransferHost}
              />
            )}
          </div>
        </aside>
      </div>

      {/* Password Modal */}
      {passwordPrompt.show && (
        <PasswordModal
          password={roomPassword}
          onChange={setRoomPassword}
          onSubmit={handleSubmitPassword}
          error={passwordPrompt.error}
          isSubmitting={passwordPrompt.isSubmitting}
        />
      )}

      {showCloseConfirm && (
        <ConfirmActionModal
          title="Đóng phòng"
          description="Đóng phòng ngay bây giờ? Tất cả thành viên sẽ bị thoát."
          confirmText="Đóng phòng"
          cancelText="Hủy"
          onConfirm={handleConfirmCloseRoom}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}

      {roomNotice.open && (
        <NoticeModal
          title={roomNotice.title}
          message={roomNotice.message}
          buttonText="Quay lại danh sách phòng"
          onClose={handleRoomNoticeClose}
        />
      )}
    </div>
  );
};

export default RoomDetail;
