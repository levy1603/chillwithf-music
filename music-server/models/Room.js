// server/models/Room.js
const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên phòng là bắt buộc"],
      trim: true,
      maxlength: [50, "Tên phòng tối đa 50 ký tự"],
    },

    type: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },

    password: {
      type: String,
      default: null,
      select: false, 
    },

    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    maxUsers: {
      type: Number,
      default: 10,
      min: 2,
      max: 50,
    },

    // Danh sách user đang online trong phòng (lưu userId)
    onlineUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Bài hát đang phát
    currentSong: {
      songId: {
        type: String,
        default: null,
      },
      title: String,
      artist: String,
      thumbnail: String,
      duration: Number,
      audioUrl: String,
      youtubeUrl: String,
      videoFile: String,
    },

    // Trạng thái player
    playerState: {
      isPlaying: { type: Boolean, default: false },
      currentTime: { type: Number, default: 0 },
      volume: { type: Number, default: 80 },
      updatedAt: { type: Date, default: Date.now },
    },

    // Hàng chờ bài hát
    queue: [
      {
        songId: {
          type: String,
        },
        title: String,
        artist: String,
        thumbnail: String,
        duration: Number,
        audioUrl: String,
        youtubeUrl: String,
        videoFile: String,
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        addedByName: String,
      },
    ],

    playbackHistory: [
      {
        songId: String,
        title: String,
        artist: String,
        thumbnail: String,
        duration: Number,
        audioUrl: String,
        youtubeUrl: String,
        videoFile: String,
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual: số người đang online
roomSchema.virtual("currentUsers").get(function () {
  return this.onlineUsers.length;
});

roomSchema.set("toJSON", { virtuals: true });
roomSchema.set("toObject", { virtuals: true });

// Index để query nhanh
roomSchema.index({ isActive: 1, type: 1, createdAt: -1 });
roomSchema.index({ host: 1 });

module.exports = mongoose.model("Room", roomSchema);
