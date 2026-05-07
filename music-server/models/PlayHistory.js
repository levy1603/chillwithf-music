//models/PlayHistory.js
const mongoose = require("mongoose");

const playHistorySchema = new mongoose.Schema(
  {
    song: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Song",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
      default: null, 
    },
    playedAt: {
      type:    Date,
      default: Date.now, 
    },
  },
  { timestamps: false }
);

playHistorySchema.index({ playedAt: -1 });
playHistorySchema.index({ song: 1, playedAt: -1 });
playHistorySchema.index({ user: 1, playedAt: -1 });

module.exports = mongoose.model("PlayHistory", playHistorySchema);