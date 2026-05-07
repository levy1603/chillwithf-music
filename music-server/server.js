// server.js
const express = require("express");
const cors    = require("cors");
const path    = require("path");
const fs      = require("fs");
const dotenv  = require("dotenv");
const http    = require("http");
const { Server } = require("socket.io");

const result = dotenv.config();
if (result.error)           process.exit(1);
if (!process.env.MONGO_URI) process.exit(1);

const connectDB = require("./config/db");

const startServer = async () => {
  try {
    await connectDB();
    const { startCleanupJob } = require("./jobs/trashCleanup");
    startCleanupJob();

    const app = express();
    const httpServer = http.createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
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
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      credentials: true,
    }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    const dirs = [
      "uploads/songs",
      "uploads/covers",
      "uploads/videos",
      "uploads/avatars",
    ];
    dirs.forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    // ===== STATIC FILES =====
    app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
          "Content-Type":   "video/mp4",
        });
        fileStream.pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Length": fileSize,
          "Content-Type":   "video/mp4",
        });
        fs.createReadStream(filePath).pipe(res);
      }
    });

    // ===== ROUTES =====
    app.use("/api/auth",          require("./routes/authRoutes"));
    app.use("/api/songs",         require("./routes/songRoutes"));
    app.use("/api/playlists",     require("./routes/playlistRoutes"));
    app.use("/api/users",         require("./routes/userRoutes"));
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