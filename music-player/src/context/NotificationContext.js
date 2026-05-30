// src/context/NotificationContext.js
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import notificationAPI from "../api/notificationAPI";

const NotificationContext = createContext();
const ACTIVE_POLL_INTERVAL = 30_000;
const HIDDEN_POLL_INTERVAL = 120_000;
const FOCUS_REFETCH_DEBOUNCE = 5_000;

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const timerRef = useRef(null);
  const inFlightRef = useRef(false);
  const lastFetchAtRef = useRef(0);
  const activeUserIdRef = useRef(null);

  const clearPollTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    activeUserIdRef.current = user?._id || null;
    setNotifications([]);
    setUnreadCount(0);
    setLoading(false);
    clearPollTimer();
    inFlightRef.current = false;
    lastFetchAtRef.current = 0;
  }, [user?._id, clearPollTimer]);

  const fetchNotifications = useCallback(
    async ({ silent = false, force = false } = {}) => {
      if (!isAuthenticated || !user?._id) return;
      if (inFlightRef.current && !force) return;

      const requestUserId = user._id;
      inFlightRef.current = true;

      if (!silent) setLoading(true);
      try {
        const result = await notificationAPI.getAll({ limit: 20 });
        if (activeUserIdRef.current !== requestUserId) return;

        setNotifications(result?.notifications || []);
        setUnreadCount(result?.unreadCount || 0);
        lastFetchAtRef.current = Date.now();
      } catch (err) {
        console.error("Loi fetch notifications:", err);
        if (err?.status === 401 || err?.statusCode === 401) {
          setNotifications([]);
          setUnreadCount(0);
        }
      } finally {
        inFlightRef.current = false;
        if (!silent) setLoading(false);
      }
    },
    [isAuthenticated, user?._id]
  );

  const scheduleNextPoll = useCallback(() => {
    clearPollTimer();
    if (!isAuthenticated || !user?._id) return;

    const isVisible = document.visibilityState === "visible";
    const nextDelay = isVisible ? ACTIVE_POLL_INTERVAL : HIDDEN_POLL_INTERVAL;

    timerRef.current = setTimeout(async () => {
      await fetchNotifications({ silent: true });
      scheduleNextPoll();
    }, nextDelay);
  }, [clearPollTimer, fetchNotifications, isAuthenticated, user?._id]);

  useEffect(() => {
    clearPollTimer();

    if (!isAuthenticated || !user?._id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const bootstrap = async () => {
      await fetchNotifications({ force: true });
      scheduleNextPoll();
    };

    bootstrap();

    return () => {
      clearPollTimer();
    };
  }, [
    isAuthenticated,
    user?._id,
    fetchNotifications,
    scheduleNextPoll,
    clearPollTimer,
  ]);

  useEffect(() => {
    if (!isAuthenticated || !user?._id) return undefined;

    const refetchWhenAttentionBack = async () => {
      const now = Date.now();
      const recentlyFetched = now - lastFetchAtRef.current < FOCUS_REFETCH_DEBOUNCE;
      if (recentlyFetched) {
        scheduleNextPoll();
        return;
      }

      await fetchNotifications({ silent: true, force: true });
      scheduleNextPoll();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refetchWhenAttentionBack();
      } else {
        scheduleNextPoll();
      }
    };

    const onFocus = () => {
      if (document.visibilityState === "visible") {
        refetchWhenAttentionBack();
      }
    };

    const onOnline = () => {
      refetchWhenAttentionBack();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, [isAuthenticated, user?._id, fetchNotifications, scheduleNextPoll]);

  const markAsRead = useCallback(
    async (id) => {
      if (!isAuthenticated) return;
      try {
        await notificationAPI.markRead(id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error("Loi markAsRead:", err);
      }
    },
    [isAuthenticated]
  );

  const markAllAsRead = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Loi markAllAsRead:", err);
    }
  }, [isAuthenticated]);

  const deleteNotification = useCallback(
    async (id) => {
      if (!isAuthenticated) return;
      try {
        const target = notifications.find((n) => n._id === id);
        await notificationAPI.delete(id);
        setNotifications((prev) => prev.filter((n) => n._id !== id));
        if (target && !target.isRead) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
      } catch (err) {
        console.error("Loi deleteNotification:", err);
      }
    },
    [isAuthenticated, notifications]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications phai dung trong NotificationProvider");
  }
  return context;
};
