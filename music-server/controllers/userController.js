// controllers/userController.js
const User        = require("../models/User");
const Song        = require("../models/Song");
const Playlist    = require("../models/Playlist");
const PlayHistory = require("../models/PlayHistory");
const {
  deleteFromCloudinary,
} = require("../config/cloudinary");

/* ═══════════════════════════════════════════
   GET FAVORITES
═══════════════════════════════════════════ */
const getFavorites = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path:    "favorites",
      match:   { status: "approved", isDeleted: { $ne: true } },
      populate: { path: "uploadedBy", select: "username avatar" },
    });

    res.status(200).json({
      success: true,
      count:   user.favorites.length,
      data:    user.favorites,
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════
   UPDATE PROFILE
═══════════════════════════════════════════ */
const updateProfile = async (req, res, next) => {
  try {
    const { username, nickname, bio } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tên người dùng không được để trống!",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        username: username.trim(),
        nickname: nickname?.trim() || "",
        bio:      bio?.trim()      || "",
      },
      { new: true, runValidators: true }
    ).select("-password");

    const [uploadCount] = await Promise.all([
      Song.countDocuments({ uploadedBy: req.user._id }),
    ]);

    const favoriteCount = updatedUser.favorites?.length || 0;

    res.status(200).json({
      success: true,
      message: "Cập nhật thông tin thành công!",
      data:    { ...updatedUser.toObject(), uploadCount, favoriteCount },
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════
   UPDATE AVATAR - Cloudinary
═══════════════════════════════════════════ */
const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn ảnh!",
      });
    }

    const newAvatarUrl = req.file.path;
    const currentUser = await User.findById(req.user._id);

    if (currentUser.avatar) {
      const isCloudinaryUrl = currentUser.avatar.includes("cloudinary.com");
      const isLocalUrl      = currentUser.avatar.startsWith("/uploads/avatars/");

      if (isCloudinaryUrl) {
        await deleteFromCloudinary(currentUser.avatar, "image");
      } else if (isLocalUrl) {
        const path = require("path");
        const fs   = require("fs");
        const oldPath = path.join(__dirname, "..", currentUser.avatar);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
          console.log(`🗑️  Đã xóa avatar local cũ: ${oldPath}`);
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: newAvatarUrl },
      { new: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Cập nhật avatar thành công!",
      data: {
        avatar: newAvatarUrl,
        user:   updatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════
   GET ALL USERS (Admin)
═══════════════════════════════════════════ */
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select("-password -__v")
      .sort({ createdAt: -1 });

    const usersWithCount = await Promise.all(
      users.map(async (user) => {
        const uploadCount = await Song.countDocuments({ uploadedBy: user._id });
        return { ...user.toObject(), uploadCount };
      })
    );

    res.status(200).json({
      success: true,
      count:   users.length,
      data:    usersWithCount,
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════
   DELETE USER (Admin)
═══════════════════════════════════════════ */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Không thể xóa tài khoản Admin!",
      });
    }

    if (user.avatar) {
      if (user.avatar.includes("cloudinary.com")) {
        await deleteFromCloudinary(user.avatar, "image");
      } else if (user.avatar.startsWith("/uploads/avatars/")) {
        const path = require("path");
        const fs   = require("fs");
        const oldPath = path.join(__dirname, "..", user.avatar);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    const userSongs = await Song.find({ uploadedBy: req.params.id });
    const { deleteSongFromCloudinary } = require("../config/cloudinary");

    await Promise.all(
      userSongs.map((song) => deleteSongFromCloudinary(song))
    );

    await Promise.all([
      Song.deleteMany({ uploadedBy: req.params.id }),
      Playlist.deleteMany({ owner: req.params.id }),
      PlayHistory.deleteMany({ user: req.params.id }),
      User.findByIdAndDelete(req.params.id),
    ]);

    res.status(200).json({
      success: true,
      message: "Xóa người dùng thành công",
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════
   UPDATE USER ROLE (Admin)
═══════════════════════════════════════════ */
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role không hợp lệ",
      });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Không thể đổi role của chính mình!",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    res.status(200).json({
      success: true,
      message: `Đã ${role === "admin" ? "cấp" : "thu hồi"} quyền Admin`,
      data:    user,
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════
   TOGGLE BAN USER (Admin)
═══════════════════════════════════════════ */
const toggleBanUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Không thể khóa tài khoản Admin!",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: !user.isBanned },
      { new: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: updatedUser.isBanned ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản",
      data:    updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════
   THỐNG KÊ TUẦN (7 ngày gần nhất)
═══════════════════════════════════════════ */
const getDailyStats = async () => {
  const now    = new Date();
  const LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const MONTHS = [
    "Th1","Th2","Th3","Th4","Th5","Th6",
    "Th7","Th8","Th9","Th10","Th11","Th12",
  ];

  // ── Tính ngày đầu tuần (Thứ 2) ──
  const startOfWeek  = new Date(now);
  const currentDay   = now.getDay(); // 0 = CN
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  startOfWeek.setDate(now.getDate() + diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const days = await Promise.all(
    Array.from({ length: 7 }, async (_, i) => {
      const startDay = new Date(startOfWeek);
      startDay.setDate(startOfWeek.getDate() + i);
      startDay.setHours(0, 0, 0, 0);

      const endDay = new Date(startDay);
      endDay.setHours(23, 59, 59, 999);

      const dayOfWeek = startDay.getDay();
      const label     = LABELS[dayOfWeek];
      const dateStr   = `${startDay.getDate()}/${MONTHS[startDay.getMonth()]}`;
      const isToday   = startDay.toDateString() === now.toDateString();

      const [songsCount, usersCount, playsCount] = await Promise.all([
        Song.countDocuments({
          createdAt: { $gte: startDay, $lte: endDay },
          status:    "approved",
        }),
        User.countDocuments({
          createdAt: { $gte: startDay, $lte: endDay },
        }),
        PlayHistory.countDocuments({
          playedAt: { $gte: startDay, $lte: endDay },
        }),
      ]);

      return {
        day:     `${label}\n${dateStr}`,
        label,
        date:    dateStr,
        songs:   songsCount,
        users:   usersCount,
        plays:   playsCount,
        isToday,
      };
    })
  );

  return days;
};

/* ═══════════════════════════════════════════
   THỐNG KÊ 12 THÁNG
═══════════════════════════════════════════ */
const getMonthlyStats = async () => {
  const now = new Date();

  const months = await Promise.all(
    Array.from({ length: 12 }, async (_, i) => {
      const monthIndex = 11 - i;
      const date       = new Date(now.getFullYear(), now.getMonth() - monthIndex, 1);
      const startMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endMonth   = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      const label      = `T${date.getMonth() + 1}`;

      const [songsCount, usersCount, playsCount] = await Promise.all([
        Song.countDocuments({
          createdAt: { $gte: startMonth, $lte: endMonth },
          status:    "approved",
        }),
        User.countDocuments({
          createdAt: { $gte: startMonth, $lte: endMonth },
        }),
        PlayHistory.countDocuments({
          playedAt: { $gte: startMonth, $lte: endMonth },
        }),
      ]);

      return {
        month: label,
        songs: songsCount,
        users: usersCount,
        plays: playsCount,
      };
    })
  );

  return months.reverse();
};

/* ═══════════════════════════════════════════
   TỔNG HỢP STATS (Admin)
═══════════════════════════════════════════ */
const getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalSongs,
      totalAdmins,
      totalPlays,
      recentSongs,
      recentUsers,
      dailyStats,
      monthlyStats,
    ] = await Promise.all([
      User.countDocuments(),
      Song.countDocuments({ status: "approved" }),
      User.countDocuments({ role: "admin" }),
      PlayHistory.countDocuments(),
      Song.find({ status: "approved" })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("uploadedBy", "username"),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("-password"),
      getDailyStats(),
      getMonthlyStats(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalSongs,
        totalAdmins,
        totalPlays,
        recentSongs,
        recentUsers,
        dailyStats,
        monthlyStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════ */
module.exports = {
  getFavorites,
  updateProfile,
  updateAvatar,
  getAllUsers,
  deleteUser,
  updateUserRole,
  toggleBanUser,
  getStats,
};