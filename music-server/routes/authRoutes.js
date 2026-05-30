// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getMe,
  changePassword,
  googleLogin,
  googleCallback,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.get("/google", googleLogin);
router.get("/google/callback", googleCallback);
router.get("/me", protect, getMe);
router.put("/change-password", protect, changePassword);

module.exports = router;
