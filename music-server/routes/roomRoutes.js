// server/routes/roomRoutes.js
const express = require("express");
const router = express.Router();

// ✅ Sửa đường dẫn đúng với file auth của bạn
const { protect } = require("../middleware/auth");

const {
  getRooms,
  getRoomById,
  createRoom,
  verifyRoomPassword,
  closeRoom,
  getRoomMessages,
  getYoutubePlaylistVideos,
} = require("../controllers/roomController");

// Public routes
router.get("/", getRooms);
router.get("/youtube/playlist", getYoutubePlaylistVideos);
router.get("/:id", getRoomById);
router.post("/:id/verify-password", protect, verifyRoomPassword);

// Protected routes (cần đăng nhập)
router.post("/", protect, createRoom);
router.delete("/:id", protect, closeRoom);
router.get("/:id/messages", protect, getRoomMessages);

module.exports = router;
