const mongoose = require("mongoose");

const songTrashSchema = new mongoose.Schema(
  {
    originalSongId: {
      type     : mongoose.Schema.Types.ObjectId,
      ref      : "Song",
      required : true,
    },
    userId: {
      type     : mongoose.Schema.Types.ObjectId,
      ref      : "User",
      required : true,
    },

    songData: {
      title      : { type: String },
      artist     : { type: String },
      album      : { type: String },
      genre      : { type: String },
      audioFile  : { type: String },
      coverImage : { type: String },
      videoFile  : { type: String },
      duration   : { type: Number, default: 0 },
      playCount  : { type: Number, default: 0 },
      status     : { type: String },
    },
    deletedAt: {
      type    : Date,
      default : Date.now,
    },

    expiresAt: {
      type    : Date,
      default : () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: false }
);

songTrashSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
songTrashSchema.index({ userId: 1, deletedAt: -1 });

module.exports = mongoose.model("SongTrash", songTrashSchema);
