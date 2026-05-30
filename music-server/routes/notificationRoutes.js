const express = require("express");
const router = express.Router();
const notificationService = require("../services/notificationService");
const { protect } = require("../middleware/auth");

router.get("/test", (req, res) => {
  res.json({ success: true, message: "Notification route OK!" });
});

router.get("/unread-count", protect, async (req, res) => {
  try {
    const result = await notificationService.getUnreadCount(req.user._id);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("GET unread-count error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const includeTotal =
      req.query.includeTotal === "true" || req.query.includeTotal === "1";

    const result = await notificationService.getByUser(req.user._id, {
      page: Number(page),
      limit: Number(limit),
      includeTotal,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error("GET notifications error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch("/read-all", protect, async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user._id);
    res.json({ success: true });
  } catch (err) {
    console.error("markAllAsRead error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch("/:id/read", protect, async (req, res) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user._id);
    res.json({ success: true });
  } catch (err) {
    console.error("markAsRead error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    await notificationService.hide(req.params.id, req.user._id);
    res.json({ success: true });
  } catch (err) {
    console.error("hide notification error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
