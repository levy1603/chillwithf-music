// server/socket/socketMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const socketAuthMiddleware = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("Không có token xác thực"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("username avatar _id isBanned");

    if (!user) {
      return next(new Error("Người dùng không tồn tại"));
    }

    if (user.isBanned) {
      return next(new Error("Tài khoản của bạn đã bị khóa"));
    }

    socket.user = {
      _id: user._id.toString(),
      username: user.username,
      avatar: user.avatar,
    };

    next();
  } catch (err) {
    console.error("[socketMiddleware]", err.message);
    next(new Error("Token không hợp lệ"));
  }
};

module.exports = socketAuthMiddleware;