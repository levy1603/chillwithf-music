const Room = require("../models/Room");
const RoomMessage = require("../models/RoomMessage");
const bcrypt = require("bcryptjs");

const sanitizeRoom = (room) => {
  const obj = room.toObject ? room.toObject() : { ...room };
  delete obj.password;
  return obj;
};

const getRooms = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;

    const filter = { isActive: true };
    if (type && ["public", "private"].includes(type)) {
      filter.type = type;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [rooms, total] = await Promise.all([
      Room.find(filter)
        .populate("host", "username avatar")
        .select("-password -queue")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Room.countDocuments(filter),
    ]);

    const roomsWithUserCount = rooms.map((room) => ({
      ...room,
      currentUsers: Array.isArray(room.onlineUsers) ? room.onlineUsers.length : 0,
    }));

    res.json({
      success: true,
      rooms: roomsWithUserCount,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (err) {
    console.error("[getRooms]", err);
    res.status(500).json({ success: false, message: "Loi server" });
  }
};

const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate("host", "username avatar")
      .populate("onlineUsers", "username avatar")
      .select("-password");

    if (!room) {
      return res.status(404).json({ success: false, message: "Phong khong ton tai" });
    }

    if (!room.isActive) {
      return res.status(404).json({ success: false, message: "Phong da bi dong" });
    }

    res.json({ success: true, room: sanitizeRoom(room) });
  } catch (err) {
    console.error("[getRoomById]", err);
    res.status(500).json({ success: false, message: "Loi server" });
  }
};

const createRoom = async (req, res) => {
  try {
    const { name, type, maxUsers, password } = req.body;
    const userId = req.user._id;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Ten phong la bat buoc" });
    }

    let hashedPassword = null;
    if (type === "private") {
      if (!password || !password.trim()) {
        return res.status(400).json({
          success: false,
          message: "Phong rieng tu can co mat khau",
        });
      }
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const room = await Room.create({
      name: name.trim(),
      type: type || "public",
      maxUsers: Math.min(Math.max(parseInt(maxUsers, 10) || 10, 2), 50),
      password: hashedPassword,
      host: userId,
      onlineUsers: [userId],
    });

    await room.populate("host", "username avatar");

    res.status(201).json({
      success: true,
      room: sanitizeRoom(room),
    });
  } catch (err) {
    console.error("[createRoom]", err);
    res.status(500).json({ success: false, message: "Loi server" });
  }
};

const verifyRoomPassword = async (req, res) => {
  try {
    const { password } = req.body;

    const room = await Room.findById(req.params.id).select("+password");

    if (!room) {
      return res.status(404).json({ success: false, message: "Phong khong ton tai" });
    }

    if (room.type !== "private") {
      return res.json({ success: true });
    }

    const isMatch = await bcrypt.compare(password, room.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Mat khau khong dung" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[verifyRoomPassword]", err);
    res.status(500).json({ success: false, message: "Loi server" });
  }
};

const closeRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).select("host");

    if (!room) {
      return res.status(404).json({ success: false, message: "Phong khong ton tai" });
    }

    if (room.host.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Chi host moi co quyen dong phong" });
    }

    await Promise.all([
      RoomMessage.deleteMany({ room: room._id }),
      Room.findByIdAndDelete(room._id),
    ]);

    res.json({ success: true, message: "Da xoa phong" });
  } catch (err) {
    console.error("[closeRoom]", err);
    res.status(500).json({ success: false, message: "Loi server" });
  }
};

const getRoomMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const messages = await RoomMessage.find({ room: req.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    res.json({
      success: true,
      messages: messages.reverse(),
    });
  } catch (err) {
    console.error("[getRoomMessages]", err);
    res.status(500).json({ success: false, message: "Loi server" });
  }
};

module.exports = {
  getRooms,
  getRoomById,
  createRoom,
  verifyRoomPassword,
  closeRoom,
  getRoomMessages,
};
