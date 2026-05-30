const Room = require("../models/Room");
const RoomMessage = require("../models/RoomMessage");
const bcrypt = require("bcryptjs");
const axios = require("axios");

const sanitizeRoom = (room) => {
  const obj = room.toObject ? room.toObject() : { ...room };
  delete obj.password;
  return obj;
};

const decodeXmlEntities = (value = "") =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const extractPlaylistId = (raw = "") => {
  const input = raw.toString().trim();
  if (!input) return null;

  if (/^PL|^UU|^FL|^OLAK5uy_/.test(input)) {
    return input;
  }

  try {
    const parsed = new URL(input);
    const list = parsed.searchParams.get("list");
    if (list) return list;
  } catch {
    return null;
  }

  return null;
};

const parsePlaylistFeed = (xmlText = "") => {
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entry = match[1] || "";
    const videoId = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
    const title = (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "";
    const author = (entry.match(/<name>([\s\S]*?)<\/name>/) || [])[1] || "YouTube";

    if (!videoId) continue;

    entries.push({
      songId: `yt-${videoId}`,
      title: decodeXmlEntities(title).trim() || `YouTube ${videoId}`,
      artist: decodeXmlEntities(author).trim() || "YouTube",
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      videoFile: `https://www.youtube.com/watch?v=${videoId}`,
      audioUrl: "",
      duration: 0,
    });
  }

  return entries;
};

const fetchPlaylistEntriesWithPaging = async (playlistId, maxItems = 50) => {
  const allEntries = [];
  let startIndex = 1;
  const pageSize = 50;

  while (allEntries.length < maxItems) {
    const feedUrl =
      `https://www.youtube.com/feeds/videos.xml` +
      `?playlist_id=${encodeURIComponent(playlistId)}` +
      `&max-results=${pageSize}` +
      `&start-index=${startIndex}`;

    const response = await axios.get(feedUrl, { timeout: 10000 });
    const pageEntries = parsePlaylistFeed(response.data);

    if (!pageEntries.length) break;

    allEntries.push(...pageEntries);

    // Trang cuối: số item trả về nhỏ hơn pageSize.
    if (pageEntries.length < pageSize) break;

    startIndex += pageSize;
  }

  // Loại duplicate phòng trường hợp feed lặp item.
  const uniqueEntries = Array.from(
    new Map(allEntries.map((item) => [item.songId, item])).values()
  );

  return uniqueEntries.slice(0, maxItems);
};

const extractInitialDataJson = (html = "") => {
  const markers = [
    "var ytInitialData = ",
    "window['ytInitialData'] = ",
    "window[\"ytInitialData\"] = ",
  ];

  let jsonStart = -1;
  for (const marker of markers) {
    const start = html.indexOf(marker);
    if (start === -1) continue;
    jsonStart = html.indexOf("{", start + marker.length);
    if (jsonStart !== -1) break;
  }

  if (jsonStart === -1) return null;

  let i = jsonStart;
  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (; i < html.length; i += 1) {
    const ch = html[i];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (ch === "\\") {
        isEscaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;

    if (depth === 0) {
      return html.slice(jsonStart, i + 1);
    }
  }

  return null;
};

const collectPlaylistVideoRenderers = (node, bag) => {
  if (!node || typeof node !== "object") return;

  if (Array.isArray(node)) {
    node.forEach((item) => collectPlaylistVideoRenderers(item, bag));
    return;
  }

  if (node.playlistVideoRenderer && typeof node.playlistVideoRenderer === "object") {
    bag.push(node.playlistVideoRenderer);
  }

  Object.keys(node).forEach((key) => {
    collectPlaylistVideoRenderers(node[key], bag);
  });
};

const getTextFromRuns = (data) => {
  if (!data) return "";
  if (typeof data.simpleText === "string") return data.simpleText;
  if (Array.isArray(data.runs)) {
    return data.runs.map((run) => run?.text || "").join("").trim();
  }
  return "";
};

const fetchPlaylistEntriesFromHtml = async (playlistId, maxItems = 50) => {
  const playlistUrl = `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}&hl=en`;
  const response = await axios.get(playlistUrl, {
    timeout: 10000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });

  const jsonText = extractInitialDataJson(response.data || "");
  if (!jsonText) return [];

  let initialData;
  try {
    initialData = JSON.parse(jsonText);
  } catch {
    return [];
  }

  const renderers = [];
  collectPlaylistVideoRenderers(initialData, renderers);

  const videos = renderers
    .map((renderer) => {
      const videoId = renderer?.videoId;
      if (!videoId) return null;

      const title = getTextFromRuns(renderer.title) || `YouTube ${videoId}`;
      const byline = getTextFromRuns(renderer.shortBylineText) || "YouTube";

      return {
        songId: `yt-${videoId}`,
        title,
        artist: byline,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        videoFile: `https://www.youtube.com/watch?v=${videoId}`,
        audioUrl: "",
        duration: 0,
      };
    })
    .filter(Boolean);

  const uniqueVideos = Array.from(
    new Map(videos.map((item) => [item.songId, item])).values()
  );

  return uniqueVideos.slice(0, maxItems);
};

const getRooms = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;

    const filter = { isActive: true };
    if (type && ["public", "private"].includes(type)) {
      filter.type = type;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [rooms, total] = await Promise.all([
      Room.find(filter)
        .populate("host", "username avatar")
        .select("-password -queue")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Room.countDocuments(filter),
    ]);

    const roomsWithUserCount = rooms.map((room) => ({
      ...room,
      currentUsers: Array.isArray(room.onlineUsers) ? room.onlineUsers.length : 0,
    }));

    res.json({
      success: true,
      rooms: roomsWithUserCount,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (err) {
    console.error("[getRooms]", err);
    res.status(500).json({ success: false, message: "Loi server" });
  }
};

const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate("host", "username avatar")
      .populate("onlineUsers", "username avatar")
      .select("-password");

    if (!room) {
      return res.status(404).json({ success: false, message: "Phong khong ton tai" });
    }

    if (!room.isActive) {
      return res.status(404).json({ success: false, message: "Phong da bi dong" });
    }

    res.json({ success: true, room: sanitizeRoom(room) });
  } catch (err) {
    console.error("[getRoomById]", err);
    res.status(500).json({ success: false, message: "Loi server" });
  }
};

const createRoom = async (req, res) => {
  try {
    const { name, type, maxUsers, password } = req.body;
    const userId = req.user._id;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Ten phong la bat buoc" });
    }

    let hashedPassword = null;
    if (type === "private") {
      if (!password || !password.trim()) {
        return res.status(400).json({
          success: false,
          message: "Phong rieng tu can co mat khau",
        });
      }
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const room = await Room.create({
      name: name.trim(),
      type: type || "public",
      maxUsers: Math.min(Math.max(parseInt(maxUsers, 10) || 10, 2), 50),
      password: hashedPassword,
      host: userId,
      onlineUsers: [userId],
    });

    await room.populate("host", "username avatar");

    res.status(201).json({
      success: true,
      room: sanitizeRoom(room),
    });
  } catch (err) {
    console.error("[createRoom]", err);
    res.status(500).json({ success: false, message: "Loi server" });
  }
};

const verifyRoomPassword = async (req, res) => {
  try {
    const { password } = req.body;

    const room = await Room.findById(req.params.id).select("+password");

    if (!room) {
      return res.status(404).json({ success: false, message: "Phong khong ton tai" });
    }

    if (room.type !== "private") {
      return res.json({ success: true });
    }

    const isMatch = await bcrypt.compare(password, room.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Mat khau khong dung" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[verifyRoomPassword]", err);
    res.status(500).json({ success: false, message: "Loi server" });
  }
};

const closeRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).select("host");

    if (!room) {
      return res.status(404).json({ success: false, message: "Phong khong ton tai" });
    }

    if (room.host.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Chi host moi co quyen dong phong" });
    }

    await Promise.all([
      RoomMessage.deleteMany({ room: room._id }),
      Room.findByIdAndDelete(room._id),
    ]);

    res.json({ success: true, message: "Da xoa phong" });
  } catch (err) {
    console.error("[closeRoom]", err);
    res.status(500).json({ success: false, message: "Loi server" });
  }
};

const getRoomMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const messages = await RoomMessage.find({ room: req.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    res.json({
      success: true,
      messages: messages.reverse(),
    });
  } catch (err) {
    console.error("[getRoomMessages]", err);
    res.status(500).json({ success: false, message: "Loi server" });
  }
};

const getYoutubePlaylistVideos = async (req, res) => {
  try {
    const playlistId = extractPlaylistId(req.query.url || req.query.playlistId);

    if (!playlistId) {
      return res.status(400).json({
        success: false,
        message: "Playlist URL khong hop le",
      });
    }

    const [videosFromHtml, videosFromFeed] = await Promise.allSettled([
      fetchPlaylistEntriesFromHtml(playlistId, 50),
      fetchPlaylistEntriesWithPaging(playlistId, 50),
    ]);

    const htmlList = videosFromHtml.status === "fulfilled" ? videosFromHtml.value : [];
    const feedList = videosFromFeed.status === "fulfilled" ? videosFromFeed.value : [];
    const videos = htmlList.length >= feedList.length ? htmlList : feedList;

    if (videos.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay video trong playlist",
      });
    }

    return res.json({
      success: true,
      playlistId,
      count: videos.length,
      videos,
    });
  } catch (err) {
    console.error("[getYoutubePlaylistVideos]", err?.message || err);
    return res.status(500).json({
      success: false,
      message: "Khong the lay danh sach playlist YouTube",
    });
  }
};

module.exports = {
  getRooms,
  getRoomById,
  createRoom,
  verifyRoomPassword,
  closeRoom,
  getRoomMessages,
  getYoutubePlaylistVideos,
};
