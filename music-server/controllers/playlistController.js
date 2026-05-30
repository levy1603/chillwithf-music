const Playlist = require("../models/Playlist");
const Song = require("../models/Song");
const mongoose = require("mongoose");

const PLAYLIST_SONG_POPULATE = {
  path: "songs",
  select: "title artist coverImage duration audioFile",
  match: {
    status: "approved",
    isDeleted: { $ne: true },
  },
};

const getMyPlaylists = async (req, res, next) => {
  try {
    const playlists = await Playlist.find({ owner: req.user._id })
      .populate(PLAYLIST_SONG_POPULATE)
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: playlists.length,
      data: playlists,
    });
  } catch (error) {
    next(error);
  }
};

const getPublicPlaylists = async (req, res, next) => {
  try {
    const playlists = await Playlist.find({ isPublic: true })
      .populate("owner", "username avatar")
      .populate(PLAYLIST_SONG_POPULATE)
      .sort({ createdAt: -1 });

    const visiblePlaylists = playlists.filter((playlist) => playlist.owner);

    res.status(200).json({
      success: true,
      count: visiblePlaylists.length,
      data: visiblePlaylists,
    });
  } catch (error) {
    next(error);
  }
};

const getPlaylist = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate("owner", "username avatar")
      .populate({
        ...PLAYLIST_SONG_POPULATE,
        populate: { path: "uploadedBy", select: "username" },
      });

    if (!playlist || !playlist.owner) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay playlist",
      });
    }

    if (
      !playlist.isPublic &&
      (!req.user || playlist.owner._id.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: "Playlist nay o che do rieng tu",
      });
    }

    res.status(200).json({
      success: true,
      data: playlist,
    });
  } catch (error) {
    next(error);
  }
};

const createPlaylist = async (req, res, next) => {
  try {
    const { name, description, isPublic } = req.body;

    const playlist = await Playlist.create({
      name,
      description,
      isPublic,
      owner: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Tao playlist thanh cong",
      data: playlist,
    });
  } catch (error) {
    next(error);
  }
};

const updatePlaylist = async (req, res, next) => {
  try {
    let playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay playlist",
      });
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Ban khong co quyen chinh sua playlist nay",
      });
    }

    playlist = await Playlist.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Cap nhat playlist thanh cong",
      data: playlist,
    });
  } catch (error) {
    next(error);
  }
};

const deletePlaylist = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay playlist",
      });
    }

    if (
      playlist.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Ban khong co quyen xoa playlist nay",
      });
    }

    await Playlist.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Xoa playlist thanh cong",
    });
  } catch (error) {
    next(error);
  }
};

const addSongToPlaylist = async (req, res, next) => {
  try {
    const { songId } = req.body;

    if (!songId || !mongoose.Types.ObjectId.isValid(songId)) {
      return res.status(400).json({
        success: false,
        message: "songId khong hop le",
      });
    }

    const song = await Song.findOne({
      _id: songId,
      status: "approved",
      isDeleted: { $ne: true },
    }).select("_id");

    if (!song) {
      return res.status(400).json({
        success: false,
        message: "Bai hat khong ton tai hoac khong kha dung",
      });
    }

    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay playlist",
      });
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Ban khong co quyen chinh sua playlist nay",
      });
    }

    const alreadyInPlaylist = playlist.songs.some(
      (id) => id.toString() === songId.toString()
    );
    if (alreadyInPlaylist) {
      return res.status(400).json({
        success: false,
        message: "Bai hat da co trong playlist",
      });
    }

    playlist.songs.push(songId);
    await playlist.save();

    const updatedPlaylist = await Playlist.findById(req.params.id).populate(
      PLAYLIST_SONG_POPULATE
    );

    res.status(200).json({
      success: true,
      message: "Da them bai hat vao playlist",
      data: updatedPlaylist,
    });
  } catch (error) {
    next(error);
  }
};

const removeSongFromPlaylist = async (req, res, next) => {
  try {
    const { songId } = req.body;
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay playlist",
      });
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Ban khong co quyen chinh sua playlist nay",
      });
    }

    playlist.songs = playlist.songs.filter((song) => song.toString() !== songId);
    await playlist.save();

    const updatedPlaylist = await Playlist.findById(req.params.id).populate(
      PLAYLIST_SONG_POPULATE
    );

    res.status(200).json({
      success: true,
      message: "Da xoa bai hat khoi playlist",
      data: updatedPlaylist,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyPlaylists,
  getPublicPlaylists,
  getPlaylist,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
};
