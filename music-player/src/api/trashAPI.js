import axios from "axios";
import { API_BASE_URL } from "../config/api";

const BASE = API_BASE_URL;

const authHeader = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

const trashAPI = {
  // Lấy danh sách thùng rác
  getTrash: () =>
    axios.get(`${BASE}/trash`, authHeader()),

  // Chuyển bài vào thùng rác
  softDelete: (songId) =>
    axios.put(`${BASE}/songs/${songId}/soft-delete`, {}, authHeader()),

  // Khôi phục bài từ thùng rác
  restore: (trashId) =>
    axios.put(`${BASE}/trash/${trashId}/restore`, {}, authHeader()),

  // Xóa vĩnh viễn
  permanentDelete: (trashId) =>
    axios.delete(`${BASE}/trash/${trashId}/permanent`, authHeader()),
};

export default trashAPI;
