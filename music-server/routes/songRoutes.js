// routes/songRoutes.js
const express = require("express");
const router = express.Router();

const {
  getSongs,
  getSong,
  createSong,
  updateSong,
  deleteSong,
  playSong,
  likeSong,
  getTopSongs,
  getMySongs,
  getAllUploadsAdmin,
  approveSong,
  rejectSong,
  getSongFilterOptions,
} = require("../controllers/songController");

const { protect, admin } = require("../middleware/auth");
const { uploadSongFiles } = require("../middleware/upload");
const { softDelete } = require("../controllers/trashController");

// optionalAuth
const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      const jwt = require("jsonwebtoken");
      const User = require("../models/User");
      const token = header.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
    }
  } catch {
    req.user = null;
  }
  next();
};

/* ── ADMIN routes ── */
router.get("/admin/uploads", protect, admin, getAllUploadsAdmin);
router.patch("/admin/uploads/:id/approve", protect, admin, approveSong);
router.patch("/admin/uploads/:id/reject", protect, admin, rejectSong);

/* ── STATIC routes - /:id ── */
router.get("/filter-options", getSongFilterOptions);
router.get("/top", getTopSongs);
router.get("/my-songs", protect, getMySongs);
router.get("/", getSongs);

/* ── Upload ── */
router.post(
  "/",
  protect,
  uploadSongFiles.fields([
    { name: "audio", maxCount: 1 },
    { name: "cover", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  createSong
);

/* ── Dynamic /:id routes ── */
router.get("/:id", getSong);
router.put("/:id/play", optionalAuth, playSong);
router.put("/:id/like", protect, likeSong);
router.put("/:id/soft-delete", protect, softDelete);
router.delete("/:id", protect, deleteSong);
router.put(
  "/:id",
  protect,
  uploadSongFiles.fields([
    { name: "audio", maxCount: 1 },
    { name: "cover", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  updateSong
);

module.exports = router;
