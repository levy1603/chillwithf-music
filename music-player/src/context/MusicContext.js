// context/MusicContext.js
import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import songAPI from "../api/songAPI";
import userAPI from "../api/userAPI";
import { useAuth } from "./AuthContext";
import { API_ORIGIN } from "../config/api";

const MusicContext = createContext();

export const useMusicContext = () => useContext(MusicContext);

const BASE_URL = API_ORIGIN;
const MAX_RECENT_ITEMS = 10;
const SONGS_PAGE_SIZE = 100;

export const MusicProvider = ({ children }) => {
  const { user, isAuthenticated, updateUser } = useAuth();

  const [songs, setSongs] = useState([]);
  const [favoriteSongIds, setFavoriteSongIds] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [repeat, setRepeat] = useState("none");
  const [shuffle, setShuffle] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playSource, setPlaySource] = useState("home");
  const [currentQueue, setCurrentQueue] = useState([]);
  const [listenedSongIds, setListenedSongIds] = useState([]);
  const songsRequestIdRef = useRef(0);
  const searchRequestIdRef = useRef(0);

  const audioRef = useRef(new Audio());

  // Ensure any orphan audio instance is fully stopped when provider unmounts
  // (e.g. navigating to /login then remounting app routes).
  useEffect(() => {
    const audio = audioRef.current;

    return () => {
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute("src");
      audio.load();
    };
  }, []);

  const getListenedStorageKey = useCallback(() => {
    return user?._id ? `listened_${user._id}` : null;
  }, [user?._id]);

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     LOAD LISTENED HISTORY
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  useEffect(() => {
    const storageKey = getListenedStorageKey();

    if (!storageKey) {
      setListenedSongIds([]);
      return;
    }

    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : [];
      setListenedSongIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setListenedSongIds([]);
    }
  }, [getListenedStorageKey]);

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     FETCH SONGS / FAVORITES
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  const fetchSongs = useCallback(async () => {
    const requestId = songsRequestIdRef.current + 1;
    songsRequestIdRef.current = requestId;

    try {
      setLoading(true);
      const res = await songAPI.getAll({
        page: 1,
        limit: SONGS_PAGE_SIZE,
      });

      if (requestId !== songsRequestIdRef.current) return;

      const pageSongs = Array.isArray(res?.data) ? res.data : [];
      setSongs(pageSongs);

      const totalPages = Number(res?.totalPages) || 1;
      if (totalPages <= 1) return;

      // Load remaining pages in background so initial render stays fast
      // while still keeping a complete local catalog for features that
      // depend on `songs` (search suggestions, stats, etc.).
      (async () => {
        try {
          const pageRequests = [];
          for (let page = 2; page <= totalPages; page += 1) {
            pageRequests.push(songAPI.getAll({ page, limit: SONGS_PAGE_SIZE }));
          }

          const rest = await Promise.allSettled(pageRequests);
          if (requestId !== songsRequestIdRef.current) return;

          const merged = [...pageSongs];

          rest.forEach((result) => {
            if (result.status !== "fulfilled") return;
            const items = Array.isArray(result.value?.data) ? result.value.data : [];
            if (items.length > 0) merged.push(...items);
          });

          // Deduplicate in case backend data changes between page requests.
          const unique = Array.from(
            new Map(merged.map((song) => [song?._id, song])).values(),
          );
          setSongs(unique);
        } catch (error) {
          console.error("Failed to hydrate songs:", error);
        }
      })();
    } catch (error) {
      if (requestId === songsRequestIdRef.current) {
        console.error("Failed to fetch songs:", error);
      }
    } finally {
      if (requestId === songsRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await userAPI.getFavorites();
      const rawData = res.data?.data || res.data || [];
      const ids = Array.isArray(rawData) ? rawData.map((song) => song._id) : [];

      setFavoriteSongIds(ids);
      updateUser({ favoriteCount: ids.length });
    } catch (error) {
      console.error("Failed to fetch songs:", error);
    }
  }, [updateUser]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
    } else {
      setFavoriteSongIds([]);
    }
  }, [isAuthenticated, fetchFavorites]);

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     DOCUMENT TITLE
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  useEffect(() => {
    if (currentSong) {
      document.title = `${currentSong.title} â€” ${currentSong.artist} | ChillWithF`;
    } else {
      document.title = "ChillWithF";
    }
  }, [currentSong]);

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     AUDIO SOURCE
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  useEffect(() => {
    if (!currentSong) return;

    if (!currentSong.audioFile) {
      console.warn("BÃ i hÃ¡t nÃ y khÃ´ng cÃ³ audioFile!");
      return;
    }

    const audioURL = currentSong.audioFile.startsWith("http")
      ? currentSong.audioFile
      : `${BASE_URL}/uploads/songs/${currentSong.audioFile}`;

    if (audioRef.current.src !== audioURL) {
      audioRef.current.src = audioURL;
      audioRef.current.load();
    }

    setCurrentTime(0);
    setDuration(0);
    songAPI.play(currentSong._id).catch(() => {});
  }, [currentSong]);

  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!currentSong || !audioRef.current.src) return;

    if (isPlaying) {
      audioRef.current.play().catch((error) => console.log(error));
    } else {
      audioRef.current.pause();
    }
  }, [currentSong, isPlaying]);

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     AUDIO EVENTS
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  useEffect(() => {
    const audio = audioRef.current;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    const handleEnded = () => {
      if (repeat === "one") {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        playNext();
      }
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [repeat, shuffle, currentSong, currentQueue]);

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     LISTENED / RECENTLY PLAYED
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  const addToListened = useCallback(
    (songId) => {
      const storageKey = getListenedStorageKey();
      if (!storageKey || !songId) return;

      setListenedSongIds((prev) => {
        const filtered = prev.filter((id) => id !== songId);
        const next = [songId, ...filtered].slice(0, MAX_RECENT_ITEMS);
        localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    },
    [getListenedStorageKey],
  );

  const clearListened = useCallback(() => {
    const storageKey = getListenedStorageKey();
    if (!storageKey) return;

    localStorage.removeItem(storageKey);
    setListenedSongIds([]);
  }, [getListenedStorageKey]);

  const recentlyPlayedSongs = useMemo(() => {
    if (!Array.isArray(listenedSongIds) || listenedSongIds.length === 0)
      return [];

    return listenedSongIds
      .map((songId) => songs.find((song) => song._id === songId))
      .filter(Boolean);
  }, [listenedSongIds, songs]);

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     PLAYER CONTROLS
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  const togglePlay = useCallback(() => {
    if (!currentSong && songs.length > 0) {
      const defaultQueue = songs;
      const firstSong = songs[0];
      setCurrentSong(firstSong);
      setPlaySource("home");
      setCurrentQueue(defaultQueue);
      setIsPlaying(true);
      addToListened(firstSong._id);
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((error) => console.log(error));
    }

    setIsPlaying((prev) => !prev);
  }, [currentSong, songs, isPlaying, addToListened]);

  const playSong = useCallback(
    (song, source = null, queue = null) => {
      if (!song) return;

      setCurrentSong(song);
      setIsPlaying(true);
      addToListened(song._id);

      if (source) setPlaySource(source);
      if (queue) setCurrentQueue(queue);
    },
    [addToListened],
  );

  const playNext = useCallback(() => {
    if (!currentSong || currentQueue.length === 0) return;

    const currentIndex = currentQueue.findIndex(
      (song) => song._id === currentSong._id,
    );

    if (shuffle) {
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * currentQueue.length);
      } while (randomIndex === currentIndex && currentQueue.length > 1);

      const nextSong = currentQueue[randomIndex];
      if (nextSong) {
        playSong(nextSong, playSource, currentQueue);
      }
      return;
    }

    const nextIndex = (currentIndex + 1) % currentQueue.length;

    if (nextIndex === 0 && repeat === "none") {
      setIsPlaying(false);
      return;
    }

    const nextSong = currentQueue[nextIndex];
    if (nextSong) {
      playSong(nextSong, playSource, currentQueue);
    }
  }, [currentSong, currentQueue, shuffle, repeat, playSong, playSource]);

  const playPrev = useCallback(() => {
    if (!currentSong || currentQueue.length === 0) return;

    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    const currentIndex = currentQueue.findIndex(
      (song) => song._id === currentSong._id,
    );

    const prevIndex =
      (currentIndex - 1 + currentQueue.length) % currentQueue.length;

    const prevSong = currentQueue[prevIndex];
    if (prevSong) {
      playSong(prevSong, playSource, currentQueue);
    }
  }, [currentSong, currentQueue, playSong, playSource]);

  const seekTo = useCallback((time) => {
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const changeVolume = useCallback((vol) => {
    setVolume(vol);
    audioRef.current.volume = vol;
  }, []);

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     FAVORITES
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  const toggleFavorite = useCallback(
    async (songId) => {
      if (!isAuthenticated) {
        return {
          success: false,
          requiresAuth: true,
          message: "Vui lÃ²ng Ä‘Äƒng nháº­p Ä‘á»ƒ thÃ­ch bÃ i hÃ¡t!",
        };
      }

      try {
        const res = await songAPI.like(songId);
        const isLiked = !!res?.data?.isLiked;

        if (isLiked) {
          setFavoriteSongIds((prev) => {
            const next = prev.includes(songId) ? prev : [...prev, songId];
            updateUser({ favoriteCount: next.length });
            return next;
          });
        } else {
          setFavoriteSongIds((prev) => {
            const next = prev.filter((id) => id !== songId);
            updateUser({ favoriteCount: next.length });
            return next;
          });
        }

        return {
          success: true,
          isLiked,
        };
      } catch (error) {
      console.error("Failed to fetch songs:", error);

        return {
          success: false,
          requiresAuth: false,
          message: error?.message || "KhÃ´ng thá»ƒ cáº­p nháº­t yÃªu thÃ­ch",
        };
      }
    },
    [isAuthenticated, updateUser],
  );

  const isFavorite = useCallback(
    (songId) => favoriteSongIds.includes(songId),
    [favoriteSongIds],
  );

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     FILTERED SONGS
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  const filteredSongs = useMemo(() => {
    if (!searchTerm.trim()) return songs;
    return searchResults;
  }, [songs, searchTerm, searchResults]);

  useEffect(() => {
    const keyword = searchTerm.trim();
    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;

    if (!keyword) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);

        const first = await songAPI.getAll({
          search: keyword,
          page: 1,
          limit: SONGS_PAGE_SIZE,
        });

        if (cancelled || requestId !== searchRequestIdRef.current) return;

        const firstPageItems = Array.isArray(first?.data) ? first.data : [];
        const merged = [...firstPageItems];
        const totalPages = Number(first?.totalPages) || 1;

        if (totalPages > 1) {
          const pageRequests = [];
          for (let page = 2; page <= totalPages; page += 1) {
            pageRequests.push(
              songAPI.getAll({
                search: keyword,
                page,
                limit: SONGS_PAGE_SIZE,
              }),
            );
          }

          const rest = await Promise.allSettled(pageRequests);
          if (cancelled || requestId !== searchRequestIdRef.current) return;

          rest.forEach((result) => {
            if (result.status !== "fulfilled") return;
            const items = Array.isArray(result.value?.data) ? result.value.data : [];
            if (items.length > 0) merged.push(...items);
          });
        }

        const unique = Array.from(
          new Map(merged.map((song) => [song?._id, song])).values(),
        );
        setSearchResults(unique);
      } catch (error) {
        if (cancelled || requestId !== searchRequestIdRef.current) return;
        console.error("Failed to search songs:", error);
        setSearchResults([]);
      } finally {
        if (!cancelled && requestId === searchRequestIdRef.current) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  const getCoverURL = useCallback((song) => {
    if (!song || !song.coverImage) return "/images/default-cover.svg";
    if (song.coverImage.startsWith("http")) return song.coverImage;
    return `${BASE_URL}/uploads/covers/${song.coverImage}`;
  }, []);

  const fetchSongsAfterUpload = useCallback(async () => {
    await fetchSongs();

    if (user) {
      updateUser({ uploadCount: (user.uploadCount || 0) + 1 });
    }
  }, [fetchSongs, user, updateUser]);

  const value = {
    songs,
    filteredSongs,
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    repeat,
    shuffle,
    searchTerm,
    searchLoading,
    loading,
    favoriteSongIds,
    listenedSongIds,
    recentlyPlayedSongs,
    playSource,
    currentQueue,

    setSearchTerm,
    togglePlay,
    playSong,
    playNext,
    playPrev,
    seekTo,
    changeVolume,
    setRepeat,
    setShuffle,
    toggleFavorite,
    isFavorite,
    getCoverURL,
    fetchSongs,
    fetchSongsAfterUpload,
    clearListened,
  };

  return (
    <MusicContext.Provider value={value}>{children}</MusicContext.Provider>
  );
};



