const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/auth");
const {
  getAdminSettings,
  updateAdminSettings,
  getPublicSystemState,
} = require("../controllers/adminController");

router.get("/public-settings", getPublicSystemState);
router.get("/settings", protect, admin, getAdminSettings);
router.put("/settings", protect, admin, updateAdminSettings);

module.exports = router;
