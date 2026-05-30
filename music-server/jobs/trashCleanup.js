// jobs/trashCleanup.js
const SongTrash = require("../models/SongTrash");
const Song = require("../models/Song");
const User = require("../models/User");
const Playlist = require("../models/Playlist");
const { deleteFromCloudinary } = require("../config/cloudinary");

const deleteSongMedia = async (songData = {}) => {
  await Promise.allSettled([
    deleteFromCloudinary(songData.audioFile, "video"),
    deleteFromCloudinary(songData.coverImage, "image"),
    deleteFromCloudinary(songData.videoFile, "video"),
  ]);
};

const runCleanup = async () => {
  try {
    const expired = await SongTrash.find({
      expiresAt: { $lte: new Date() },
    }).lean();

    if (expired.length === 0) return;

    for (const item of expired) {
      await deleteSongMedia(item.songData);
      await Song.findByIdAndDelete(item.originalSongId);
      await User.updateMany(
        { favorites: item.originalSongId },
        { $pull: { favorites: item.originalSongId } }
      );
      await Playlist.updateMany(
        { songs: item.originalSongId },
        { $pull: { songs: item.originalSongId } }
      );
      await SongTrash.findByIdAndDelete(item._id);
      console.log(`[Cleanup] Deleted: "${item.songData.title}"`);
    }

    console.log(`[Cleanup] Done: ${expired.length} songs removed`);
  } catch (err) {
    console.error("[Cleanup] Error:", err.message);
  }
};

const startCleanupJob = () => {
  runCleanup();
  const INTERVAL = 24 * 60 * 60 * 1000;
  setInterval(runCleanup, INTERVAL);

  console.log("[Cleanup] Job started (runs every 24 hours)");
};

module.exports = { startCleanupJob, runCleanup };
