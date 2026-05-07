// jobs/trashCleanup.js
const SongTrash = require("../models/SongTrash");
const Song      = require("../models/Song");
const fs        = require("fs");
const path      = require("path");

const deletePhysicalFile = (filename, subFolder) => {
  if (!filename) return;
  if (filename === "default-cover.jpg") return;
  if (filename.startsWith("http")) return;
  try {
    const filePath = path.join(__dirname, "..", "uploads", subFolder, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Cleanup] ✅ Deleted: uploads/${subFolder}/${filename}`);
    }
  } catch (err) {
    console.error(`[Cleanup] ❌ deleteFile error:`, err.message);
  }
};

const runCleanup = async () => {
  try {
    const expired = await SongTrash.find({
      expiresAt: { $lte: new Date() },
    }).lean();

    if (expired.length === 0) return;

    for (const item of expired) {
      deletePhysicalFile(item.songData.audioFile,  "songs");
      deletePhysicalFile(item.songData.coverImage, "covers");
      await Song.findByIdAndDelete(item.originalSongId);
      await SongTrash.findByIdAndDelete(item._id);
      console.log(`[Cleanup] 🗑️ Deleted: "${item.songData.title}"`);
    }

    console.log(`[Cleanup] ✅ Done: ${expired.length} songs removed`);
  } catch (err) {
    console.error("[Cleanup] ❌ Error:", err.message);
  }
};

const startCleanupJob = () => {
  runCleanup();
  const INTERVAL = 24 * 60 * 60 * 1000; 
  setInterval(runCleanup, INTERVAL);

  console.log("[Cleanup] ✅ Job started (runs every 24 hours)");
};

module.exports = { startCleanupJob, runCleanup };