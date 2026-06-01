// server.js
const express = require("express");
const cors    = require("cors");
const path    = require("path");
const fs      = require("fs");
const dotenv  = require("dotenv");
const http    = require("http");
const { Server } = require("socket.io");

dotenv.config();

if (!process.env.MONGO_URI) {
  console.error("❌ Missing MONGO_URI environment variable");
  process.exit(1);
}

const connectDB = require("./config/db");
const { enforceReadOnlyMode } = require("./middleware/readOnlyMode");

const normalizeOrigin = (value = "") => value.trim().replace(/\/+$/, "");

const parseAllowedOrigins = () => {
  const raw = process.env.CLIENT_URL || "http://localhost:3000";
  const fromEnv = raw
    .split(",")
    .map((item) => normalizeOrigin(item))
    .filter(Boolean);

  const localDefaults = ["http://localhost:3000", "http://localhost:5000"];
  const merged = new Set([...fromEnv, ...localDefaults.map(normalizeOrigin)]);
  return [...merged];
};

const createCorsOriginChecker = (allowedOrigins) => {
  return (origin, callback) => {
    const normalizedOrigin = normalizeOrigin(origin || "");
    if (!normalizedOrigin || allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  };
};

const getVideoContentType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".ogg": "video/ogg",
    ".ogv": "video/ogg",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
  };
  return map[ext] || "application/octet-stream";
};

const startServer = async () => {
  try {
    await connectDB();
    const { startCleanupJob } = require("./jobs/trashCleanup");
    startCleanupJob();
    const allowedOrigins = parseAllowedOrigins();
    const corsOriginChecker = createCorsOriginChecker(allowedOrigins);

    const app = express();
    const httpServer = http.createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: corsOriginChecker,
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    const socketAuthMiddleware = require("./socket/socketMiddleware");
    io.use(socketAuthMiddleware);

    const roomHandler = require("./socket/roomHandler");
    roomHandler(io);

    app.use(cors({
      origin: corsOriginChecker,
      credentials: true,
    }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(enforceReadOnlyMode);

    const uploadRoot = path.join(__dirname, "uploads");
    const dirs = [
      path.join(uploadRoot, "songs"),
      path.join(uploadRoot, "covers"),
      path.join(uploadRoot, "videos"),
      path.join(uploadRoot, "avatars"),
    ];
    dirs.forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    // ===== STATIC FILES =====
    app.use("/uploads", express.static(uploadRoot));

    // ===== STREAMING VIDEO =====
    app.get("/uploads/videos/:filename", (req, res) => {
      const filePath = path.join(
        __dirname, "uploads/videos", req.params.filename
      );

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Video không tồn tại" });
      }

      const stat     = fs.statSync(filePath);
      const fileSize = stat.size;
      const range    = req.headers.range;
      const contentType = getVideoContentType(filePath);

      if (range) {
        const parts      = range.replace(/bytes=/, "").split("-");
        const start      = parseInt(parts[0], 10);
        const end        = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize  = end - start + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });

        res.writeHead(206, {
          "Content-Range":  `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges":  "bytes",
          "Content-Length": chunkSize,
          "Content-Type":   contentType,
        });
        fileStream.pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Length": fileSize,
          "Content-Type":   contentType,
        });
        fs.createReadStream(filePath).pipe(res);
      }
    });

    // ===== ROUTES =====
    app.use("/api/auth",          require("./routes/authRoutes"));
    app.use("/api/songs",         require("./routes/songRoutes"));
    app.use("/api/playlists",     require("./routes/playlistRoutes"));
    app.use("/api/users",         require("./routes/userRoutes"));
    app.use("/api/admin",         require("./routes/adminRoutes"));
    app.use("/api/notifications", require("./routes/notificationRoutes"));
    app.use("/api/trash",         require("./routes/trashRoutes"));
    app.use("/api/rooms",         require("./routes/roomRoutes")); 
    app.get("/", (req, res) => {
      res.json({
        message: "🎵 MusicVN API đang hoạt động!",
        endpoints: {
          auth:          "/api/auth",
          songs:         "/api/songs",
          playlists:     "/api/playlists",
          users:         "/api/users",
          admin:         "/api/admin",
          notifications: "/api/notifications",
          trash:         "/api/trash",
          rooms:         "/api/rooms",
        },
      });
    });

    const errorHandler = require("./middleware/errorHandler");
    app.use(errorHandler);
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📡 API: http://localhost:${PORT}/api`);
      console.log(`🔌 Socket.io: http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("❌ Server error:", error);
    process.exit(1);
  }
};

startServer();
