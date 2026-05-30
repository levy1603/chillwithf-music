const Song = require("../models/Song");
const SongTrash = require("../models/SongTrash");
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

const getTrash = async (req, res) => {
  try {
    const items = await SongTrash.find({ userId: req.user._id })
      .sort({ deletedAt: -1 })
      .lean();

    const now = Date.now();
    const data = items.map((item) => ({
      ...item,
      secondsLeft: Math.max(
        0,
        Math.floor((new Date(item.expiresAt).getTime() - now) / 1000)
      ),
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error("[getTrash]", error);
    res.status(500).json({ success: false, message: "Loi server" });
  }
};

const softDelete = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const song = await Song.findOne({
      _id: id,
      uploadedBy: userId,
      isDeleted: false,
    });

    if (!song) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay bai hat",
      });
    }

    await SongTrash.create({
      originalSongId: song._id,
      userId,
      songData: {
        title: song.title,
        artist: song.artist,
        album: song.album,
        genre: song.genre,
        audioFile: song.audioFile,
        coverImage: song.coverImage,
        videoFile: song.videoFile,
        duration: song.duration,
        playCount: song.playCount,
        status: song.status,
      },
    });

    await Song.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    res.json({
      success: true,
      message: "Da chuyen vao thung rac",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  } catch (error) {
    console.error("[softDelete]", error);
    res.status(500).json({ success: false, message: "Loi server" });
  }
};

const restore = async (req, res) => {
  try {
    const { trashId } = req.params;
    const userId = req.user._id;

    const trashItem = await SongTrash.findOne({ _id: trashId, userId });
    if (!trashItem) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay hoac da het han khoi phuc",
      });
    }

    const originalSong = await Song.findById(trashItem.originalSongId);
    if (!originalSong) {
      await SongTrash.findByIdAndDelete(trashId);
      return res.status(404).json({
        success: false,
        message: "Bai hat goc khong con ton tai, khong the khoi phuc",
      });
    }

    await Song.findByIdAndUpdate(trashItem.originalSongId, {
      isDeleted: false,
      deletedAt: null,
    });

    await SongTrash.findByIdAndDelete(trashId);

    res.json({ success: true, message: "Khoi phuc thanh cong" });
  } catch (error) {
    console.error("[restore]", error);
    res.status(500).json({ success: false, message: "Loi server" });
  }
};

const permanentDelete = async (req, res) => {
  try {
    const { trashId } = req.params;
    const userId = req.user._id;

    const trashItem = await SongTrash.findOne({ _id: trashId, userId });
    if (!trashItem) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay",
      });
    }

    await deleteSongMedia(trashItem.songData);

    await Song.findByIdAndDelete(trashItem.originalSongId);
    await User.updateMany(
      { favorites: trashItem.originalSongId },
      { $pull: { favorites: trashItem.originalSongId } }
    );
    await Playlist.updateMany(
      { songs: trashItem.originalSongId },
      { $pull: { songs: trashItem.originalSongId } }
    );
    await SongTrash.findByIdAndDelete(trashId);

    res.json({ success: true, message: "Da xoa vinh vien" });
  } catch (error) {
    console.error("[permanentDelete]", error);
    res.status(500).json({ success: false, message: "Loi server" });
  }
};

module.exports = { getTrash, softDelete, restore, permanentDelete };
