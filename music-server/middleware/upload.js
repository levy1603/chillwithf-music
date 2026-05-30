// middleware/upload.js
const multer = require("multer");
const {
  audioStorage,
  coverStorage,
  videoStorage,
  avatarStorage, 
} = require("../config/cloudinary");

/* ── File Filter ── */
const ALLOWED_TYPES = {
  audio:  ["audio/mpeg", "audio/wav", "audio/flac", "audio/mp3", "audio/ogg"],
  cover:  ["image/jpeg", "image/png", "image/webp"],
  video:  ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo"],
  avatar: ["image/jpeg", "image/png", "image/webp"],
};

const FILE_ERRORS = {
  audio:  "Chỉ chấp nhận file nhạc (MP3, WAV, FLAC, OGG)",
  cover:  "Chỉ chấp nhận file ảnh (JPG, PNG, WEBP)",
  video:  "Chỉ chấp nhận file video (MP4, WEBM, OGG, MOV, AVI)",
  avatar: "Chỉ chấp nhận file ảnh (JPG, PNG, WEBP)",
};

const fileFilter = (req, file, cb) => {
  const allowed = ALLOWED_TYPES[file.fieldname];
  if (!allowed) return cb(new Error("Field không hợp lệ"), false);

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(FILE_ERRORS[file.fieldname]), false);
  }
};


const avatarFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận file ảnh (JPG, PNG, WEBP)"), false);
  }
};

/* ── Upload song files ── */
const uploadSongFiles = multer({
  storage: {
    _handleFile(req, file, cb) {
      if      (file.fieldname === "audio") audioStorage._handleFile(req, file, cb);
      else if (file.fieldname === "cover") coverStorage._handleFile(req, file, cb);
      else if (file.fieldname === "video") videoStorage._handleFile(req, file, cb);
      else cb(new Error("Field không hợp lệ"));
    },
    _removeFile(req, file, cb) {
      if (file.fieldname === "audio") {
        audioStorage._removeFile(req, file, cb);
      } else if (file.fieldname === "video") {
        videoStorage._removeFile(req, file, cb);
      } else {
        coverStorage._removeFile(req, file, cb);
      }
    },
  },
  fileFilter,
  limits: { fileSize: 200 * 1024 * 1024 },
});

/* ── Upload avatar ── */
const uploadAvatar = multer({
  storage:    avatarStorage,
  fileFilter: avatarFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = { uploadSongFiles, uploadAvatar };
