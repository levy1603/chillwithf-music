// src/api/songAPI.js
import axiosClient from "./axiosClient";
import axios from "axios";

const BASE_URL = "http://localhost:5000/api";

/* â”€â”€ Helper: láº¥y token â”€â”€ */
const getToken = () => localStorage.getItem("token");

/* â”€â”€ Helper: táº¡o config upload cÃ³ progress â”€â”€ */
const createUploadConfig = (onProgress, signal) => ({
  headers: {
    "Content-Type": "multipart/form-data",
    Authorization: `Bearer ${getToken()}`,
  },
  signal,
  onUploadProgress: (progressEvent) => {
    if (onProgress && progressEvent.total) {
      const percent = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      onProgress(percent);
    }
  },
});

const songAPI = {
  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     PUBLIC - BÃ i Ä‘Ã£ Ä‘Æ°á»£c duyá»‡t
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

  // Láº¥y danh sÃ¡ch bÃ i hÃ¡t (chá»‰ approved)
  getAll: (params = {}) => {
    return axiosClient.get("/songs", { params });
  },

  // Láº¥y filter options
  getFilterOptions: () => {
    return axiosClient.get("/songs/filter-options");
  },

  // Top bÃ i hÃ¡t (chá»‰ approved)
  getTop: (limit = 10) => {
    return axiosClient.get("/songs/top", { params: { limit } });
  },

  // Chi tiáº¿t 1 bÃ i (chá»‰ approved)
  getById: (id) => {
    return axiosClient.get(`/songs/${id}`);
  },

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     USER - Quáº£n lÃ½ bÃ i cá»§a mÃ¬nh
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

  // Lá»‹ch sá»­ upload (cáº£ pending / rejected / approved)
  getMySongs: () => {
    return axiosClient.get("/songs/my-songs");
  },

  getMyUploads: () => {
    return axiosClient.get("/songs/my-songs");
  },

  // Upload bÃ i má»›i â†’ backend sáº½ set status: "pending"
  create: (formData, onProgress, signal) => {
    return axios
      .post(`${BASE_URL}/songs`, formData, createUploadConfig(onProgress, signal))
      .then((res) => res.data);
  },

  // Cáº­p nháº­t bÃ i hÃ¡t
  update: (id, formData, onProgress, signal) => {
    return axios
      .put(`${BASE_URL}/songs/${id}`, formData, createUploadConfig(onProgress, signal))
      .then((res) => res.data);
  },

  // XoÃ¡ bÃ i hÃ¡t
  delete: (id) => {
    return axiosClient.delete(`/songs/${id}`);
  },

  // TÄƒng lÆ°á»£t play
  play: (id) => {
    return axiosClient.put(`/songs/${id}/play`);
  },

  // Like / Unlike
  like: (id) => {
    return axiosClient.put(`/songs/${id}/like`);
  },

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     ADMIN - Quáº£n lÃ½ upload
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

  adminGetAllUploads: (params = {}) => {
    return axiosClient.get("/songs/admin/uploads", { params });
  },

  adminApproveSong: (id) => {
    return axiosClient.patch(`/songs/admin/uploads/${id}/approve`);
  },

  adminRejectSong: (id, reason = "") => {
    return axiosClient.patch(`/songs/admin/uploads/${id}/reject`, { reason });
  },

  adminDeleteSong: (id) => {
    return axiosClient.delete(`/songs/${id}`);
  },

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     HELPER
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

  // Láº¥y URL audio
  getAudioURL: (song) => {
    if (!song?.audioFile) return null;
    if (song.audioFile.startsWith("http")) return song.audioFile;
    return `${BASE_URL.replace("/api", "")}/uploads/songs/${song.audioFile}`;
  },

  // Láº¥y URL video
  getVideoURL: (song) => {
    const rawVideo =
      song?.videoFile ||
      song?.videoUrl ||
      song?.videoURL ||
      song?.youtubeUrl ||
      song?.youtubeURL;

    if (!rawVideo) return null;
    if (rawVideo.startsWith("http")) return rawVideo;
    return `${BASE_URL.replace("/api", "")}/uploads/videos/${rawVideo}`;
  },

  // Láº¥y URL cover
  getCoverURL: (song) => {
    if (!song?.coverImage) return null;
    if (song.coverImage === "default-cover.jpg") {
      return `${BASE_URL.replace("/api", "")}/uploads/covers/default-cover.jpg`;
    }
    if (song.coverImage.startsWith("http")) return song.coverImage;
    return `${BASE_URL.replace("/api", "")}/uploads/covers/${song.coverImage}`;
  },
};

export default songAPI;
