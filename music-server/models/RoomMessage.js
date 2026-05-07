// server/models/RoomMessage.js
const mongoose = require("mongoose");

const roomMessageSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    username: String,
    avatar: String,

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, "Tin nhắn tối đa 500 ký tự"],
    },

    type: {
      type: String,
      enum: ["text", "system"], 
      default: "text",
    },
  },
  {
    timestamps: true,
  }
);

roomMessageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 86400 }
);

roomMessageSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model("RoomMessage", roomMessageSchema);