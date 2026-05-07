// controllers/songController.js
const Song                    = require("../models/Song");
const User                    = require("../models/User");
const Playlist                = require("../models/Playlist");
const mm                      = require("music-metadata");
const path                    = require("path");
const axios                   = require("axios"); 
const notificationService     = require("../services/notificationService");
const PlayHistory             = require("../models/PlayHistory");
const { deleteSongFromCloudinary, deleteFromCloudinary } = require("../config/cloudinary");

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */

/* ── Đọc duration từ URL (Cloudinary) ── */
const getAudioDuration = async (audioUrl) => {
  if (!audioUrl) return 0;
  try {
    // Download một phần nhỏ để đọc metadata
    const response = await axios.get(audioUrl, {
      responseType: "arraybuffer",
      headers:      { Range: "bytes=0-1048576" },
      timeout:      10000,
    });

    const buffer   = Buffer.from(response.data);
    const metadata = await mm.parseBuffer(buffer, { duration: true });
    return Math.round(metadata.format.duration || 0);
  } catch (e) {
    console.log("⚠️ Không đọc được duration:", e.message);
    return 0;
  }
};

/* ── Parse tags ── */
const parseTags = (rawTags) => {
  if (!rawTags) return [];
  if (Array.isArray(rawTags)) return rawTags.filter(Boolean);
  try {
    const parsed = JSON.parse(rawTags);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return rawTags.split(",").map((t) => t.trim()).filter(Boolean);
  }
};

/* ── Lấy URL từ file được upload bởi Cloudinary ── */
const getFileUrl = (file) => {
  if (!file) return null;
  return file.path || null;
};

/* ═══════════════════════════════════════════
   PUBLIC: Lấy danh sách bài đã duyệt
═══════════════════════════════════════════ */
const getSongs = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const { search, genre, artist, tag, year, album, sort } = req.query;

    const query = {
      status:    "approved",
      isDeleted: { $ne: true },
    };

    if (search) {
      query.$or = [
        { title:     { $regex: search, $options: "i" } },
        { artist:    { $regex: search, $options: "i" } },
        { album:     { $regex: search, $options: "i" } },
        { featuring: { $regex: search, $options: "i" } },
        { tags:      { $in: [new RegExp(search, "i")] } },
      ];
    }

    if (genre)  query.genre       = genre;
    if (artist) query.artist      = { $regex: artist, $options: "i" };
    if (album)  query.album       = { $regex: album,  $options: "i" };
    if (tag)    query.tags        = tag;
    if (year)   query.releaseYear = parseInt(year);

    let sortOption = { createdAt: -1 };
    if (sort === "popular") sortOption = { playCount:  -1 };
    else if (sort === "likes") sortOption = { likeCount: -1 };
    else if (sort === "title") sortOption = { title:      1 };
    else if (sort === "year")  sortOption = { releaseYear:-1 };

    const [total, songs] = await Promise.all([
      Song.countDocuments(query),
      Song.find(query)
        .populate("uploadedBy", "username avatar")
        .sort(sortOption)
        .skip(skip)
        .limit(limit),
    ]);

    res.status(200).json({
      success:     true,
      count:       songs.length,
      total,
      totalPages:  Math.ceil(total / limit),
      currentPage: page,
      data:        songs,
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════
   PUBLIC: Lấy 1 bài
═══════════════════════════════════════════ */
const getSong = async (req, res, next) => {
  try {
    const song = await Song.findOne({
      _id:       req.params.id,
      status:    "approved",
      isDeleted: { $ne: true },
    }).populate("uploadedBy", "username avatar");

    if (!song) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài hát",
      });
    }

    res.status(200).json({ success: true, data: song });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════
   PUBLIC: Lấy filter options
═══════════════════════════════════════════ */
const getSongFilterOptions = async (req, res, next) => {
  try {
    const baseMatch = {
      status:    "approved",
      isDeleted: { $ne: true },
    };

    const [years, genres, albums, tagsAgg] = await Promise.all([
      Song.distinct("releaseYear", baseMatch),
      Song.distinct("genre",       baseMatch),
      Song.distinct("album",       baseMatch),
      Song.aggregate([
        { $match:  baseMatch },
        { $unwind: "$tags" },
        { $match:  { tags: { $ne: null, $ne: "" } } },
        { $group:  { _id: "$tags" } },
        { $sort:   { _id: 1 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        years:  (years  || []).filter(Boolean).sort((a, b) => b - a),
        genres: (genres || []).filter(Boolean).sort(),
        albums: (albums || []).filter(Boolean).sort(),
        tags:   tagsAgg.map((t) => t._id).filter(Boolean),
      },
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════
   USER: Upload bài hát
═══════════════════════════════════════════ */
const createSong = async (req, res, next) => {
  const uploadedUrls = { audio: null, cover: null, video: null };

  try {
    const {
      title, artist, featuring, album,
      genre, releaseYear, lyrics, lrc, tags: rawTags,
    } = req.body;

    let audioFile  = "";
    let coverImage = "default-cover.jpg";
    let videoFile  = "";
    let duration   = 0;

    if (req.files) {
      if (req.files.audio?.[0]) {
        audioFile          = getFileUrl(req.files.audio[0]);
        uploadedUrls.audio = audioFile;
        duration           = await getAudioDuration(audioFile);
        console.log(`🎵 Duration: ${duration}s`);
      }
      if (req.files.cover?.[0]) {
        coverImage         = getFileUrl(req.files.cover[0]);
        uploadedUrls.cover = coverImage;
      }
      if (req.files.video?.[0]) {
        videoFile          = getFileUrl(req.files.video[0]);
        uploadedUrls.video = videoFile;
      }
    }

    if (!audioFile) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng upload file nhạc",
      });
    }

    const tags = parseTags(rawTags);

    const song = await Song.create({
      title,
      artist,
      featuring:   featuring   || "",
      album:       album       || "Single",
      genre:       genre       || "Pop",
      releaseYear: releaseYear ? parseInt(releaseYear) : new Date().getFullYear(),
      tags,
      lyrics:      lyrics      || "",
      lrc:         lrc         || "",
      duration,
      audioFile,   
      coverImage,  
      videoFile,   
      uploadedBy:  req.user._id,
      status:      "pending",
    });

    const populatedSong = await Song.findById(song._id)
      .populate("uploadedBy", "username avatar");

    console.log(`🎤 LRC:  ${lrc  ? `Có (${lrc.length} ký tự)` : "Không"}`);
    console.log(`🏷️  Tags: ${tags.length > 0 ? tags.join(", ") : "Không có"}`);

    try {
      await notificationService.notifyAllAdmins({
        sender:  req.user._id,
        type:    "new_upload",
        title:   "🎵 Bài hát mới chờ duyệt",
        message: `${req.user.username} vừa upload "${title}" (${genre}) - cần phê duyệt`,
        data: {
          songId:    song._id,
          songTitle: title,
          artist,
          coverImage,
          hasLRC:    !!lrc,
          hasTags:   tags.length > 0,
        },
      });
    } catch (notifErr) {
      console.error("⚠️ Lỗi gửi notification:", notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: "Upload thành công! Bài hát đang chờ Admin duyệt.",
      data:    populatedSong,
    });
  } catch (error) {
    console.error("❌ Lỗi createSong - rollback Cloudinary:", error.message);
    await Promise.allSettled([
      uploadedUrls.audio && deleteFromCloudinary(uploadedUrls.audio, "video"),
      uploadedUrls.cover && deleteFromCloudinary(uploadedUrls.cover, "image"),
      uploadedUrls.video && deleteFromCloudinary(uploadedUrls.video, "video"),
    ]);

    next(error);
  }
};

/* ═══════════════════════════════════════════
   USER: Lịch sử upload của tôi
═══════════════════════════════════════════ */
const getMySongs = async (req, res, next) => {
  try {
    const songs = await Song.find({
      uploadedBy: req.user._id,
      isDeleted:  { $ne: true },
    })
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "username avatar")
      .populate("reviewedBy", "username")
      .select("-__v");

    res.status(200).json({
      success: true,
      count:   songs.length,
      data:    songs,
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════
   ADMIN: Tất cả uploads
═══════════════════════════════════════════ */
const getAllUploadsAdmin = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (status && status !== "all") filter.status = status;

    const [total, songs, stats] = await Promise.all([
      Song.countDocuments(filter),
      Song.find(filter)
        .populate("uploadedBy", "username avatar email")
        .populate("reviewedBy", "username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Song.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const statsMap = { pending: 0, approved: 0, rejected: 0 };
    stats.forEach((s) => { statsMap[s._id] = s.count; });

    res.status(200).json({
      success:     true,
      count:       songs.length,
      total,
      totalPages:  Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      stats:       statsMap,
      data:        songs,
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════
   ADMIN: Duyệt bài
═══════════════════════════════════════════ */
const approveSong = async (req, res, next) => {
  try {
    const song = await Song.findByIdAndUpdate(
      req.params.id,
      {
        status:       "approved",
        reviewedBy:   req.user._id,
        reviewedAt:   new Date(),
        rejectReason: "",
      },
      { new: true }
    )
      .populate("uploadedBy", "username email")
      .populate("reviewedBy", "username");

    if (!song) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài hát",
      });
    }

    try {
      await notificationService.create({
        recipient: song.uploadedBy._id,
        sender:    req.user._id,
        type:      "song_approved",
        title:     "✅ Bài hát đã được duyệt!",
        message:   `Bài hát "${song.title}" của bạn đã được phê duyệt 🎉`,
        data: {
          songId:     song._id,
          songTitle:  song.title,
          artist:     song.artist,
          coverImage: song.coverImage,
        },
      });
    } catch (notifErr) {
      console.error("⚠️ Lỗi notification approve:", notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Đã duyệt bài "${song.title}"`,
      data:    song,
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════
   ADMIN: Từ chối bài
═══════════════════════════════════════════ */
const rejectSong = async (req, res, next) => {
  try {
    const rejectReason = req.body.reason || "Không đáp ứng tiêu chuẩn";

    const song = await Song.findByIdAndUpdate(
      req.params.id,
      {
        status:       "rejected",
        reviewedBy:   req.user._id,
        reviewedAt:   new Date(),
        rejectReason,
      },
      { new: true }
    )
      .populate("uploadedBy", "username email")
      .populate("reviewedBy", "username");

    if (!song) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài hát",
      });
    }

    try {
      await notificationService.create({
        recipient: song.uploadedBy._id,
        sender:    req.user._id,
        type:      "song_rejected",
        title:     "❌ Bài hát bị từ chối",
        message:   `Bài hát "${song.title}" chưa được phê duyệt.`,
        data: {
          songId:      song._id,
          songTitle:   song.title,
          artist:      song.artist,
          coverImage:  song.coverImage,
          rejectReason,
        },
      });
    } catch (notifErr) {
      console.error("⚠️ Lỗi notification reject:", notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Đã từ chối bài "${song.title}"`,
      data:    song,
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════
   USER/ADMIN: Update bài hát
═══════════════════════════════════════════ */
const updateSong = async (req, res, next) => {
  const newUrls = { audio: null, cover: null, video: null };

  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài hát",
      });
    }

    /* ── Kiểm tra quyền ── */
    const allowedWithoutAuth = ["lyrics", "lrc"];
    const onlyLyricsOrLRC    = Object.keys(req.body).every((k) =>
      allowedWithoutAuth.includes(k)
    );

    if (!onlyLyricsOrLRC) {
      if (
        song.uploadedBy.toString() !== req.user._id.toString() &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền chỉnh sửa bài hát này",
        });
      }
    }

    /* ── Build updateData ── */
    const updateData  = {};
    const textFields  = ["title", "artist", "featuring", "album", "genre", "lyrics", "lrc"];
    textFields.forEach((field) => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    if (req.body.releaseYear !== undefined) {
      updateData.releaseYear = parseInt(req.body.releaseYear);
    }
    if (req.body.tags !== undefined) {
      updateData.tags = parseTags(req.body.tags);
    }

    if (req.files?.cover?.[0]) {
      newUrls.cover         = getFileUrl(req.files.cover[0]);
      await deleteFromCloudinary(song.coverImage, "image");
      updateData.coverImage = newUrls.cover;
    }

    if (req.files?.video?.[0]) {
      newUrls.video         = getFileUrl(req.files.video[0]);
      await deleteFromCloudinary(song.videoFile, "video");
      updateData.videoFile  = newUrls.video;
    }

    if (req.files?.audio?.[0]) {
      newUrls.audio         = getFileUrl(req.files.audio[0]);
      await deleteFromCloudinary(song.audioFile, "video");
      updateData.audioFile  = newUrls.audio;
      updateData.duration   = await getAudioDuration(newUrls.audio);

      if (req.user.role !== "admin") {
        updateData.status       = "pending";
        updateData.reviewedBy   = null;
        updateData.reviewedAt   = null;
        updateData.rejectReason = "";

        try {
          await notificationService.notifyAllAdmins({
            sender:  req.user._id,
            type:    "new_upload",
            title:   "🔄 Bài hát được cập nhật - chờ duyệt lại",
            message: `${req.user.username} đã cập nhật "${song.title}" - cần duyệt lại`,
            data: {
              songId:    song._id,
              songTitle: song.title,
              artist:    song.artist,
              coverImage:song.coverImage,
            },
          });
        } catch (notifErr) {
          console.error("⚠️ Lỗi notification update:", notifErr.message);
        }
      }
    }

    const updatedSong = await Song.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("uploadedBy", "username avatar");

    res.status(200).json({
      success: true,
      message: "Cập nhật thành công",
      data:    updatedSong,
    });
  } catch (error) {
    console.error("❌ Lỗi updateSong - rollback Cloudinary:", error.message);
    await Promise.allSettled([
      newUrls.audio && deleteFromCloudinary(newUrls.audio, "video"),
      newUrls.cover && deleteFromCloudinary(newUrls.cover, "image"),
      newUrls.video && deleteFromCloudinary(newUrls.video, "video"),
    ]);

    next(error);
  }
};

/* ═══════════════════════════════════════════
   USER/ADMIN: Xóa bài hát
═══════════════════════════════════════════ */
const deleteSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài hát",
      });
    }

    if (
      song.uploadedBy.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa bài hát này",
      });
    }

    await Promise.all([
      deleteSongFromCloudinary(song),
      Song.findByIdAndDelete(req.params.id),
      User.updateMany(
        { favorites: req.params.id },
        { $pull: { favorites: req.params.id } }
      ),
      Playlist.updateMany(
        { songs: req.params.id },
        { $pull: { songs: req.params.id } }
      ),
      PlayHistory.deleteMany({ song: req.params.id }),
    ]);

    res.status(200).json({
      success: true,
      message: "Xóa bài hát thành công",
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════
   PUBLIC: Play song
═══════════════════════════════════════════ */
const playSong = async (req, res, next) => {
  try {
    const song = await Song.findByIdAndUpdate(
      req.params.id,
      { $inc: { playCount: 1 } },
      { new: true }
    );

    if (!song) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài hát",
      });
    }

    PlayHistory.create({
      song:     req.params.id,
      user:     req.user?._id || null,
      playedAt: new Date(),
    }).catch((err) => {
      console.error("⚠️ Lỗi lưu PlayHistory:", err.message);
    });

    res.status(200).json({
      success: true,
      data:    { playCount: song.playCount },
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════
   USER: Like / Unlike
═══════════════════════════════════════════ */
const likeSong = async (req, res, next) => {
  try {
    const songId = req.params.id;
    const userId = req.user._id;

    const [song, user] = await Promise.all([
      Song.findById(songId),
      User.findById(userId).select("favorites"),
    ]);

    if (!song) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài hát",
      });
    }

    const isLiked = user.favorites.includes(songId);

    if (isLiked) {
      await Promise.all([
        User.findByIdAndUpdate(userId, { $pull:     { favorites: songId } }),
        Song.findByIdAndUpdate(songId, { $inc:      { likeCount: -1 } }),
      ]);
      return res.status(200).json({
        success: true,
        message: "Đã bỏ thích",
        data:    { isLiked: false },
      });
    }

    await Promise.all([
      User.findByIdAndUpdate(userId, { $addToSet: { favorites: songId } }),
      Song.findByIdAndUpdate(songId, { $inc:      { likeCount: 1 } }),
    ]);

    res.status(200).json({
      success: true,
      message: "Đã thích",
      data:    { isLiked: true },
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════
   PUBLIC: Top bài hát
═══════════════════════════════════════════ */
const getTopSongs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const songs = await Song.find({
      status:    "approved",
      isDeleted: { $ne: true },
    })
      .populate("uploadedBy", "username avatar")
      .sort({ playCount: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      count:   songs.length,
      data:    songs,
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════ */
module.exports = {
  getSongs,
  getSong,
  getSongFilterOptions,
  createSong,
  updateSong,
  deleteSong,
  playSong,
  likeSong,
  getTopSongs,
  getMySongs,
  getAllUploadsAdmin,
  approveSong,
  rejectSong,
};