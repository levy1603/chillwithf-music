// config/cloudinary.js
const cloudinary            = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ── Audio ── */
const audioStorage = new CloudinaryStorage({
  cloudinary,
  params: () => ({
    folder:        "chillwithf/songs",
    resource_type: "video",
    public_id:     `song-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  }),
});

/* ── Cover ── */
const coverStorage = new CloudinaryStorage({
  cloudinary,
  params: () => ({
    folder:        "chillwithf/covers",
    resource_type: "image",
    public_id:     `cover-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    transformation: [
      { width: 800, height: 800, crop: "fill", quality: "auto" },
    ],
  }),
});

/* ── Video ── */
const videoStorage = new CloudinaryStorage({
  cloudinary,
  params: () => ({
    folder:        "chillwithf/videos",
    resource_type: "video",
    public_id:     `video-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  }),
});

/* ── Avatar ── ✅ THÊM MỚI */
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: () => ({
    folder:        "chillwithf/avatars",
    resource_type: "image",
    public_id:     `avatar-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    transformation: [
      // Giữ nguyên framing gốc để avatar sau khi lưu không bị đổi bố cục
      { width: 800, height: 800, crop: "limit", quality: "auto" },
    ],
  }),
});

/* ── Xóa file trên Cloudinary bằng URL ── */
const deleteFromCloudinary = async (url, type = "image") => {
  if (!url || url === "default-cover.jpg") return;
  if (!url.includes("cloudinary.com"))     return; // Bỏ qua URL không phải Cloudinary

  try {
    const parts       = url.split("/");
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return;

    const withVersion = parts.slice(uploadIndex + 1).join("/");
    const publicId    = withVersion
      .replace(/^v\d+\//, "")   // Bỏ version
      .replace(/\.[^/.]+$/, ""); // Bỏ extension

    await cloudinary.uploader.destroy(publicId, { resource_type: type });
    console.log(`🗑️  Đã xóa Cloudinary: ${publicId}`);
  } catch (e) {
    console.error("⚠️ Lỗi xóa Cloudinary:", e.message);
  }
};

/* ── Xóa toàn bộ file của 1 bài hát ── */
const deleteSongFromCloudinary = async (song) => {
  await Promise.allSettled([
    deleteFromCloudinary(song.audioFile,  "video"),
    deleteFromCloudinary(song.coverImage, "image"),
    deleteFromCloudinary(song.videoFile,  "video"),
  ]);
};

module.exports = {
  cloudinary,
  audioStorage,
  coverStorage,
  videoStorage,
  avatarStorage,           // ✅ Export thêm
  deleteFromCloudinary,
  deleteSongFromCloudinary,
};
