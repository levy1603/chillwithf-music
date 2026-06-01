// controllers/songController.js
const Song                    = require("../models/Song");
const User                    = require("../models/User");
const Playlist                = require("../models/Playlist");
const mm                      = require("music-metadata");
const axios                   = require("axios"); 
const notificationService     = require("../services/notificationService");
const { getSettingsValue }    = require("../services/adminSettingService");
const PlayHistory             = require("../models/PlayHistory");
const {
  cloudinary,
  deleteSongFromCloudinary,
  deleteFromCloudinary,
} = require("../config/cloudinary");

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   HELPERS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* â”€â”€ Äá»c duration tá»« URL (Cloudinary) â”€â”€ */
const getAudioDuration = async (audioUrl) => {
  if (!audioUrl) return 0;
  try {
    // Download má»™t pháº§n nhá» Ä‘á»ƒ Ä‘á»c metadata
    const response = await axios.get(audioUrl, {
      responseType: "arraybuffer",
      headers:      { Range: "bytes=0-1048576" },
      timeout:      10000,
    });

    const buffer   = Buffer.from(response.data);
    const metadata = await mm.parseBuffer(buffer, { duration: true });
    return Math.round(metadata.format.duration || 0);
  } catch (e) {
    console.log("âš ï¸ KhÃ´ng Ä‘á»c Ä‘Æ°á»£c duration:", e.message);
    return 0;
  }
};

/* â”€â”€ Parse tags â”€â”€ */
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

/* â”€â”€ Láº¥y URL tá»« file Ä‘Æ°á»£c upload bá»Ÿi Cloudinary â”€â”€ */
const getFileUrl = (file) => {
  if (!file) return null;
  return file.path || null;
};

const extractCloudinaryPublicId = (url = "") => {
  if (!url || !url.includes("cloudinary.com")) return null;

  const uploadMarker = "/upload/";
  const uploadIndex = url.indexOf(uploadMarker);
  if (uploadIndex === -1) return null;

  let publicPath = url.slice(uploadIndex + uploadMarker.length);
  publicPath = publicPath.split(/[?#]/)[0];
  publicPath = publicPath.replace(/^v\d+\//, "");
  publicPath = publicPath.replace(/\.[^/.]+$/, "");

  return publicPath || null;
};

const buildAudioUrlFromVideo = (videoUrl = "") => {
  const publicId = extractCloudinaryPublicId(videoUrl);
  if (!publicId) return null;

  return cloudinary.url(publicId, {
    resource_type: "video",
    format: "mp3",
    secure: true,
  });
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PUBLIC: Láº¥y danh sÃ¡ch bÃ i Ä‘Ã£ duyá»‡t
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PUBLIC: Láº¥y 1 bÃ i
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
        message: "KhÃ´ng tÃ¬m tháº¥y bÃ i hÃ¡t",
      });
    }

    res.status(200).json({ success: true, data: song });
  } catch (error) {
    next(error);
  }
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PUBLIC: Láº¥y filter options
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
        { $match:  { tags: { $nin: [null, ""] } } },
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   USER: Upload bÃ i hÃ¡t
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const createSong = async (req, res, next) => {
  const uploadedUrls = { audio: null, cover: null, video: null };

  try {
    const settings = await getSettingsValue({ createIfMissing: true, useCache: true });
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
        console.log(`ðŸŽµ Duration: ${duration}s`);
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

    if (!audioFile && videoFile) {
      const extractedAudioUrl = buildAudioUrlFromVideo(videoFile);

      if (extractedAudioUrl) {
        audioFile = extractedAudioUrl;
        duration = await getAudioDuration(audioFile);
        console.log("ðŸŽ¬â†’ðŸŽµ Tá»± Ä‘á»™ng dÃ¹ng audio tÃ¡ch tá»« video");
      }
    }

    if (!audioFile) {
      return res.status(400).json({
        success: false,
        message: "Vui lÃ²ng upload file nháº¡c hoáº·c video cÃ³ audio",
      });
    }

    const maxUploadsPerDay = Number(
      settings?.moderation?.maxUploadsPerUserPerDay || 8
    );
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setHours(23, 59, 59, 999);

    const uploadedToday = await Song.countDocuments({
      uploadedBy: req.user._id,
      createdAt: { $gte: dayStart, $lte: dayEnd },
      isDeleted: { $ne: true },
    });

    if (uploadedToday >= maxUploadsPerDay) {
      return res.status(429).json({
        success: false,
        message: `Ban da dat gioi han ${maxUploadsPerDay} bai upload trong hom nay`,
      });
    }

    const tags = parseTags(rawTags);
    const autoApprove = Boolean(settings?.moderation?.autoApproveUploads);

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
      status:      autoApprove ? "approved" : "pending",
    });

    const populatedSong = await Song.findById(song._id)
      .populate("uploadedBy", "username avatar");

    console.log(`ðŸŽ¤ LRC:  ${lrc  ? `CÃ³ (${lrc.length} kÃ½ tá»±)` : "KhÃ´ng"}`);
    console.log(`ðŸ·ï¸  Tags: ${tags.length > 0 ? tags.join(", ") : "KhÃ´ng cÃ³"}`);

    if (!autoApprove) {
      try {
        await notificationService.notifyAllAdmins({
          sender: req.user._id,
          type: "new_upload",
          title: "ðŸŽµ BÃ i hÃ¡t má»›i chá» duyá»‡t",
          message: `${req.user.username} vá»«a upload "${title}" (${genre}) - cáº§n phÃª duyá»‡t`,
          data: {
            songId: song._id,
            songTitle: title,
            artist,
            coverImage,
            hasLRC: !!lrc,
            hasTags: tags.length > 0,
          },
        });
      } catch (notifErr) {
        console.error("âš ï¸ Lá»—i gá»­i notification:", notifErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: autoApprove
        ? "Upload thanh cong! Bai hat da duoc duyet tu dong."
        : "Upload thÃ nh cÃ´ng! BÃ i hÃ¡t Ä‘ang chá» Admin duyá»‡t.",
      data:    populatedSong,
    });
  } catch (error) {
    console.error("âŒ Lá»—i createSong - rollback Cloudinary:", error.message);
    await Promise.allSettled([
      uploadedUrls.audio && deleteFromCloudinary(uploadedUrls.audio, "video"),
      uploadedUrls.cover && deleteFromCloudinary(uploadedUrls.cover, "image"),
      uploadedUrls.video && deleteFromCloudinary(uploadedUrls.video, "video"),
    ]);

    next(error);
  }
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   USER: Lá»‹ch sá»­ upload cá»§a tÃ´i
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ADMIN: Táº¥t cáº£ uploads
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ADMIN: Duyá»‡t bÃ i
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
        message: "KhÃ´ng tÃ¬m tháº¥y bÃ i hÃ¡t",
      });
    }

    try {
      await notificationService.create({
        recipient: song.uploadedBy._id,
        sender:    req.user._id,
        type:      "song_approved",
        title:     "âœ… BÃ i hÃ¡t Ä‘Ã£ Ä‘Æ°á»£c duyá»‡t!",
        message:   `BÃ i hÃ¡t "${song.title}" cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c phÃª duyá»‡t ðŸŽ‰`,
        data: {
          songId:     song._id,
          songTitle:  song.title,
          artist:     song.artist,
          coverImage: song.coverImage,
        },
      });
    } catch (notifErr) {
      console.error("âš ï¸ Lá»—i notification approve:", notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: `ÄÃ£ duyá»‡t bÃ i "${song.title}"`,
      data:    song,
    });
  } catch (error) {
    next(error);
  }
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ADMIN: Tá»« chá»‘i bÃ i
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const rejectSong = async (req, res, next) => {
  try {
    const rejectReason = req.body.reason || "KhÃ´ng Ä‘Ã¡p á»©ng tiÃªu chuáº©n";

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
        message: "KhÃ´ng tÃ¬m tháº¥y bÃ i hÃ¡t",
      });
    }

    try {
      await notificationService.create({
        recipient: song.uploadedBy._id,
        sender:    req.user._id,
        type:      "song_rejected",
        title:     "âŒ BÃ i hÃ¡t bá»‹ tá»« chá»‘i",
        message:   `BÃ i hÃ¡t "${song.title}" chÆ°a Ä‘Æ°á»£c phÃª duyá»‡t.`,
        data: {
          songId:      song._id,
          songTitle:   song.title,
          artist:      song.artist,
          coverImage:  song.coverImage,
          rejectReason,
        },
      });
    } catch (notifErr) {
      console.error("âš ï¸ Lá»—i notification reject:", notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: `ÄÃ£ tá»« chá»‘i bÃ i "${song.title}"`,
      data:    song,
    });
  } catch (error) {
    next(error);
  }
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   USER/ADMIN: Update bÃ i hÃ¡t
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const updateSong = async (req, res, next) => {
  const newUrls = { audio: null, cover: null, video: null };

  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({
        success: false,
        message: "KhÃ´ng tÃ¬m tháº¥y bÃ i hÃ¡t",
      });
    }

    /* â”€â”€ Kiá»ƒm tra quyá»n â”€â”€ */
    if (
      song.uploadedBy.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Báº¡n khÃ´ng cÃ³ quyá»n chá»‰nh sá»­a bÃ i hÃ¡t nÃ y",
      });
    }

    /* â”€â”€ Build updateData â”€â”€ */
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

    const oldMedia = {
      audio: song.audioFile,
      cover: song.coverImage,
      video: song.videoFile,
    };

    if (req.files?.cover?.[0]) {
      newUrls.cover         = getFileUrl(req.files.cover[0]);
      updateData.coverImage = newUrls.cover;
    }

    if (req.files?.video?.[0]) {
      newUrls.video         = getFileUrl(req.files.video[0]);
      updateData.videoFile  = newUrls.video;
    }

    if (req.files?.audio?.[0]) {
      newUrls.audio         = getFileUrl(req.files.audio[0]);
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
            title:   "ðŸ”„ BÃ i hÃ¡t Ä‘Æ°á»£c cáº­p nháº­t - chá» duyá»‡t láº¡i",
            message: `${req.user.username} Ä‘Ã£ cáº­p nháº­t "${song.title}" - cáº§n duyá»‡t láº¡i`,
            data: {
              songId:    song._id,
              songTitle: song.title,
              artist:    song.artist,
              coverImage:song.coverImage,
            },
          });
        } catch (notifErr) {
          console.error("âš ï¸ Lá»—i notification update:", notifErr.message);
        }
      }
    }

    const updatedSong = await Song.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("uploadedBy", "username avatar");

    const cleanupTasks = [];
    if (newUrls.cover && oldMedia.cover && oldMedia.cover !== newUrls.cover) {
      cleanupTasks.push(deleteFromCloudinary(oldMedia.cover, "image"));
    }
    if (newUrls.video && oldMedia.video && oldMedia.video !== newUrls.video) {
      cleanupTasks.push(deleteFromCloudinary(oldMedia.video, "video"));
    }
    if (newUrls.audio && oldMedia.audio && oldMedia.audio !== newUrls.audio) {
      cleanupTasks.push(deleteFromCloudinary(oldMedia.audio, "video"));
    }

    if (cleanupTasks.length > 0) {
      Promise.allSettled(cleanupTasks).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: "Cáº­p nháº­t thÃ nh cÃ´ng",
      data:    updatedSong,
    });
  } catch (error) {
    console.error("âŒ Lá»—i updateSong - rollback Cloudinary:", error.message);
    await Promise.allSettled([
      newUrls.audio && deleteFromCloudinary(newUrls.audio, "video"),
      newUrls.cover && deleteFromCloudinary(newUrls.cover, "image"),
      newUrls.video && deleteFromCloudinary(newUrls.video, "video"),
    ]);

    next(error);
  }
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   USER/ADMIN: XÃ³a bÃ i hÃ¡t
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const deleteSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({
        success: false,
        message: "KhÃ´ng tÃ¬m tháº¥y bÃ i hÃ¡t",
      });
    }

    if (
      song.uploadedBy.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Báº¡n khÃ´ng cÃ³ quyá»n xÃ³a bÃ i hÃ¡t nÃ y",
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
      message: "XÃ³a bÃ i hÃ¡t thÃ nh cÃ´ng",
    });
  } catch (error) {
    next(error);
  }
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PUBLIC: Play song
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
        message: "KhÃ´ng tÃ¬m tháº¥y bÃ i hÃ¡t",
      });
    }

    PlayHistory.create({
      song:     req.params.id,
      user:     req.user?._id || null,
      playedAt: new Date(),
    }).catch((err) => {
      console.error("âš ï¸ Lá»—i lÆ°u PlayHistory:", err.message);
    });

    res.status(200).json({
      success: true,
      data:    { playCount: song.playCount },
    });
  } catch (error) {
    next(error);
  }
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   USER: Like / Unlike
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
        message: "KhÃ´ng tÃ¬m tháº¥y bÃ i hÃ¡t",
      });
    }

    const isLiked = user.favorites.some(
      (id) => id.toString() === songId.toString()
    );

    if (isLiked) {
      await Promise.all([
        User.findByIdAndUpdate(userId, { $pull:     { favorites: songId } }),
        Song.findByIdAndUpdate(songId, { $inc:      { likeCount: -1 } }),
      ]);
      return res.status(200).json({
        success: true,
        message: "ÄÃ£ bá» thÃ­ch",
        data:    { isLiked: false },
      });
    }

    await Promise.all([
      User.findByIdAndUpdate(userId, { $addToSet: { favorites: songId } }),
      Song.findByIdAndUpdate(songId, { $inc:      { likeCount: 1 } }),
    ]);

    res.status(200).json({
      success: true,
      message: "ÄÃ£ thÃ­ch",
      data:    { isLiked: true },
    });
  } catch (error) {
    next(error);
  }
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PUBLIC: Top bÃ i hÃ¡t
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   EXPORTS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

