// server/socket/roomHandler.js
const Room = require("../models/Room");
const RoomMessage = require("../models/RoomMessage");

/* ============================================================
   roomStates: Map lưu trạng thái realtime của từng phòng
   Key: roomId (string)
   Value: { playerState, syncTimestamp }
   
   Lý do dùng Map thay vì DB:
   - Cần cập nhật liên tục (seek, progress)
   - Không cần persist sau khi server restart
   - DB sẽ được sync khi có sự kiện quan trọng
============================================================ */
const roomStates = new Map();

/* ============================================================
   Helpers
============================================================ */

// Lấy danh sách socket đang trong 1 room
const getOnlineUsersInRoom = async (io, roomId) => {
  const sockets = await io.in(roomId).fetchSockets();
  const users = sockets.map((s) => s.user).filter(Boolean);

  // Loại bỏ duplicate (cùng user mở 2 tab)
  const uniqueUsers = Array.from(
    new Map(users.map((u) => [u._id.toString(), u])).values()
  );

  return uniqueUsers;
};

// Lấy state hiện tại của phòng (có tính đến thời gian trôi qua)
const getCurrentPlayerTime = (roomId) => {
  const state = roomStates.get(roomId);
  if (!state || !state.isPlaying) {
    return state?.currentTime || 0;
  }

  // Tính thời gian thực tế đã trôi qua kể từ lần sync cuối
  const elapsed = (Date.now() - state.syncTimestamp) / 1000;
  const currentTime = state.currentTime + elapsed;

  // Không vượt quá duration
  const maxTime = state.duration || Infinity;
  return Math.min(currentTime, maxTime);
};

// Ghi log socket events trong dev mode
const logEvent = (event, data = {}) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Socket] ${event}`, JSON.stringify(data, null, 2));
  }
};

/* ============================================================
   Main Handler
============================================================ */
const roomHandler = (io) => {
  io.on("connection", (socket) => {
    const user = socket.user;
    const hasPlayableSource = (song) =>
      !!(song?.audioUrl || song?.youtubeUrl || song?.videoFile);
    logEvent("connect", { userId: user._id, username: user.username });

    /* ----------------------------------------------------------
       room:join - Vào phòng
    ---------------------------------------------------------- */
    socket.on("room:join", async ({ roomId, password }) => {
      try {
        // 1. Tìm phòng
        const room = await Room.findById(roomId)
          .populate("host", "username avatar _id")
          .select("+password");

        if (!room || !room.isActive) {
          return socket.emit("room:error", {
            code: "ROOM_NOT_FOUND",
            message: "Phòng không tồn tại hoặc đã bị đóng",
          });
        }

        // 2. Kiểm tra phòng đầy chưa
        const currentCount = (await io.in(roomId).fetchSockets()).length;
        if (currentCount >= room.maxUsers) {
          return socket.emit("room:error", {
            code: "ROOM_FULL",
            message: "Phòng đã đầy",
          });
        }

        // 3. Kiểm tra password nếu là phòng private
        if (room.type === "private") {
          const isHost =
            room.host._id.toString() === user._id.toString();

          if (!isHost) {
            if (!password) {
              return socket.emit("room:error", {
                code: "PASSWORD_REQUIRED",
                message: "Phòng này yêu cầu mật khẩu",
              });
            }

            const bcrypt = require("bcryptjs");
            const isMatch = await bcrypt.compare(password, room.password);
            if (!isMatch) {
              return socket.emit("room:error", {
                code: "WRONG_PASSWORD",
                message: "Mật khẩu không đúng",
              });
            }
          }
        }

        // 4. Join socket room
        socket.join(roomId);
        socket.currentRoomId = roomId;

        // 5. Cập nhật onlineUsers trong DB
        await Room.findByIdAndUpdate(roomId, {
          $addToSet: { onlineUsers: user._id },
        });

        // 6. Khởi tạo state nếu chưa có
        if (!roomStates.has(roomId)) {
          roomStates.set(roomId, {
            isPlaying: room.playerState?.isPlaying || false,
            currentTime: room.playerState?.currentTime || 0,
            volume: room.playerState?.volume || 80,
            duration: room.currentSong?.duration || 0,
            syncTimestamp: Date.now(),
          });
        }

        // 7. Lấy lịch sử chat (50 tin gần nhất)
        const messages = await RoomMessage.find({ room: roomId })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean()
          .then((msgs) => msgs.reverse());

        // 8. Lấy danh sách user online
        const onlineUsers = await getOnlineUsersInRoom(io, roomId);

        // 9. Tính currentTime chính xác
        const state = roomStates.get(roomId);
        const accurateCurrentTime = getCurrentPlayerTime(roomId);

        // 10. Gửi dữ liệu khởi tạo cho user vừa join
        socket.emit("room:init", {
          room: {
            _id: room._id,
            name: room.name,
            type: room.type,
            maxUsers: room.maxUsers,
            host: room.host,
            isActive: room.isActive,
            queue: room.queue || [],
            currentSong: room.currentSong,
          },
          users: onlineUsers,
          messages,
          playerState: {
            isPlaying: state.isPlaying,
            currentTime: accurateCurrentTime,
            volume: state.volume,
          },
        });

        // 11. Thông báo cho những người trong phòng
        socket.to(roomId).emit("room:user-joined", {
          user,
          message: `${user.username} đã vào phòng`,
        });

        // 12. Gửi system message
        const systemMsg = await RoomMessage.create({
          room: roomId,
          user: user._id,
          username: user.username,
          content: `${user.username} đã vào phòng 👋`,
          type: "system",
        });

        io.to(roomId).emit("room:new-message", systemMsg);

        logEvent("room:join", { roomId, userId: user._id });
      } catch (err) {
        console.error("[room:join]", err);
        socket.emit("room:error", {
          code: "SERVER_ERROR",
          message: "Lỗi server khi vào phòng",
        });
      }
    });

    /* ----------------------------------------------------------
       room:leave - Rời phòng thủ công
    ---------------------------------------------------------- */
    socket.on("room:leave", async ({ roomId }) => {
      await handleLeaveRoom(socket, io, roomId, user);
    });

    /* ----------------------------------------------------------
       room:play-pause - Phát/Dừng nhạc (chỉ host)
    ---------------------------------------------------------- */
    socket.on("room:play-pause", async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId).select("host");
        if (!room) return;

        // Chỉ host mới được điều khiển
        if (room.host.toString() !== user._id.toString()) {
          return socket.emit("room:error", {
            code: "NOT_HOST",
            message: "Chỉ host mới có quyền điều khiển nhạc",
          });
        }

        const state = roomStates.get(roomId);
        if (!state) return;

        // Toggle play/pause
        const currentTime = getCurrentPlayerTime(roomId);
        state.isPlaying = !state.isPlaying;
        state.currentTime = currentTime;
        state.syncTimestamp = Date.now();

        // Sync DB (không await để không block)
        Room.findByIdAndUpdate(roomId, {
          "playerState.isPlaying": state.isPlaying,
          "playerState.currentTime": currentTime,
          "playerState.updatedAt": new Date(),
        }).catch(console.error);

        // Broadcast cho tất cả trong phòng
        io.to(roomId).emit("room:player-sync", {
          isPlaying: state.isPlaying,
          currentTime,
          volume: state.volume,
          timestamp: Date.now(),
        });

        logEvent("room:play-pause", {
          roomId,
          isPlaying: state.isPlaying,
          currentTime,
        });
      } catch (err) {
        console.error("[room:play-pause]", err);
      }
    });

    /* ----------------------------------------------------------
       room:seek - Tua nhạc (chỉ host)
    ---------------------------------------------------------- */
    socket.on("room:seek", async ({ roomId, time }) => {
      try {
        const room = await Room.findById(roomId).select("host");
        if (!room) return;

        if (room.host.toString() !== user._id.toString()) {
          return socket.emit("room:error", {
            code: "NOT_HOST",
            message: "Chỉ host mới có quyền tua nhạc",
          });
        }

        const state = roomStates.get(roomId);
        if (!state) return;

        state.currentTime = Math.max(0, time);
        state.syncTimestamp = Date.now();

        io.to(roomId).emit("room:player-sync", {
          isPlaying: state.isPlaying,
          currentTime: state.currentTime,
          volume: state.volume,
          timestamp: Date.now(),
        });

        logEvent("room:seek", { roomId, time });
      } catch (err) {
        console.error("[room:seek]", err);
      }
    });

    /* ----------------------------------------------------------
       room:volume-change - Thay đổi âm lượng (chỉ host)
    ---------------------------------------------------------- */
    socket.on("room:volume-change", async ({ roomId, volume }) => {
      try {
        const room = await Room.findById(roomId).select("host");
        if (!room) return;

        if (room.host.toString() !== user._id.toString()) return;

        const state = roomStates.get(roomId);
        if (!state) return;

        state.volume = Math.min(Math.max(volume, 0), 100);

        io.to(roomId).emit("room:player-sync", {
          isPlaying: state.isPlaying,
          currentTime: getCurrentPlayerTime(roomId),
          volume: state.volume,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error("[room:volume-change]", err);
      }
    });

    /* ----------------------------------------------------------
       room:change-song - Đổi bài hát (chỉ host)
    ---------------------------------------------------------- */
    socket.on("room:change-song", async ({ roomId, song }) => {
      try {
        const room = await Room.findById(roomId).select("host");
        if (!room) return;

        if (room.host.toString() !== user._id.toString()) {
          return socket.emit("room:error", {
            code: "NOT_HOST",
            message: "Chỉ host mới có quyền đổi bài",
          });
        }

        // Validate song object
        if (!song || !hasPlayableSource(song)) {
          return socket.emit("room:error", {
            code: "INVALID_SONG",
            message: "Thông tin bài hát không hợp lệ",
          });
        }

        const newSong = {
          songId: song._id || song.songId || null,
          title: song.title,
          artist: song.artist,
          thumbnail: song.thumbnail,
          duration: song.duration || 0,
          audioUrl: song.audioUrl || "",
          youtubeUrl: song.youtubeUrl || "",
          videoFile: song.videoFile || song.youtubeUrl || "",
        };

        // Reset state
        const state = roomStates.get(roomId) || {};
        state.isPlaying = true;
        state.currentTime = 0;
        state.syncTimestamp = Date.now();
        state.duration = newSong.duration;
        roomStates.set(roomId, state);

        // Cập nhật DB
        await Room.findByIdAndUpdate(roomId, {
          currentSong: newSong,
          "playerState.isPlaying": true,
          "playerState.currentTime": 0,
          "playerState.updatedAt": new Date(),
        });

        // Broadcast
        io.to(roomId).emit("room:song-changed", {
          song: newSong,
          playerState: {
            isPlaying: true,
            currentTime: 0,
            volume: state.volume,
            timestamp: Date.now(),
          },
        });

        logEvent("room:change-song", { roomId, song: newSong.title });
      } catch (err) {
        console.error("[room:change-song]", err);
      }
    });

    /* ----------------------------------------------------------
       room:next-song - Chuyển bài tiếp theo trong queue (chỉ host)
    ---------------------------------------------------------- */
    socket.on("room:next-song", async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId).select("host queue currentSong");
        if (!room) return;

        if (room.host.toString() !== user._id.toString()) return;

        if (!room.queue || room.queue.length === 0) {
          return socket.emit("room:error", {
            code: "QUEUE_EMPTY",
            message: "Hàng chờ trống",
          });
        }

        // Lấy bài tiếp theo từ queue
        const nextSong = room.queue[0];
        const newQueue = room.queue.slice(1);

        // Reset state
        const state = roomStates.get(roomId) || {};
        state.isPlaying = true;
        state.currentTime = 0;
        state.syncTimestamp = Date.now();
        state.duration = nextSong.duration || 0;
        roomStates.set(roomId, state);

        // Cập nhật DB
        await Room.findByIdAndUpdate(roomId, {
          currentSong: nextSong,
          queue: newQueue,
          "playerState.isPlaying": true,
          "playerState.currentTime": 0,
          "playerState.updatedAt": new Date(),
        });

        // Broadcast
        io.to(roomId).emit("room:song-changed", {
          song: nextSong,
          playerState: {
            isPlaying: true,
            currentTime: 0,
            volume: state.volume,
            timestamp: Date.now(),
          },
        });

        io.to(roomId).emit("room:queue-updated", newQueue);

        logEvent("room:next-song", { roomId, nextSong: nextSong.title });
      } catch (err) {
        console.error("[room:next-song]", err);
      }
    });

    /* ----------------------------------------------------------
       room:add-queue - Thêm bài vào hàng chờ (tất cả user)
    ---------------------------------------------------------- */
    socket.on("room:add-queue", async ({ roomId, song }) => {
      try {
        if (!song || !hasPlayableSource(song)) {
          return socket.emit("room:error", {
            code: "INVALID_SONG",
            message: "Thông tin bài hát không hợp lệ",
          });
        }

        const queueItem = {
          songId: song._id || song.songId || null,
          title: song.title,
          artist: song.artist,
          thumbnail: song.thumbnail,
          duration: song.duration || 0,
          audioUrl: song.audioUrl || "",
          youtubeUrl: song.youtubeUrl || "",
          videoFile: song.videoFile || song.youtubeUrl || "",
          addedBy: user._id,
          addedByName: user.username,
        };

        // Thêm vào queue trong DB
        const updatedRoom = await Room.findByIdAndUpdate(
          roomId,
          { $push: { queue: queueItem } },
          { new: true }
        ).select("queue");

        if (!updatedRoom) return;

        // Broadcast queue mới cho cả phòng
        io.to(roomId).emit("room:queue-updated", updatedRoom.queue);

        logEvent("room:add-queue", {
          roomId,
          song: queueItem.title,
          addedBy: user.username,
        });
      } catch (err) {
        console.error("[room:add-queue]", err);
      }
    });

    /* ----------------------------------------------------------
       room:remove-queue - Xóa bài khỏi hàng chờ (host hoặc người thêm)
    ---------------------------------------------------------- */
    socket.on("room:remove-queue", async ({ roomId, index }) => {
      try {
        const room = await Room.findById(roomId).select("host queue");
        if (!room) return;

        const isHost = room.host.toString() === user._id.toString();
        const item = room.queue[index];

        if (!item) return;

        // Chỉ host hoặc người thêm bài mới được xóa
        const isAdder = item.addedBy?.toString() === user._id.toString();
        if (!isHost && !isAdder) {
          return socket.emit("room:error", {
            code: "NO_PERMISSION",
            message: "Bạn không có quyền xóa bài này",
          });
        }

        // Xóa item tại index
        room.queue.splice(index, 1);
        await Room.findByIdAndUpdate(roomId, { queue: room.queue });

        io.to(roomId).emit("room:queue-updated", room.queue);
      } catch (err) {
        console.error("[room:remove-queue]", err);
      }
    });

    /* ----------------------------------------------------------
       room:send-message - Gửi tin nhắn chat
    ---------------------------------------------------------- */
    socket.on("room:send-message", async ({ roomId, content }) => {
      try {
        // Validate
        if (!content || !content.trim()) return;
        if (content.length > 500) {
          return socket.emit("room:error", {
            code: "MSG_TOO_LONG",
            message: "Tin nhắn quá dài (tối đa 500 ký tự)",
          });
        }

        // Kiểm tra user có trong phòng không
        const rooms = await socket.rooms;
        if (!rooms.has(roomId)) {
          return socket.emit("room:error", {
            code: "NOT_IN_ROOM",
            message: "Bạn không ở trong phòng này",
          });
        }

        // Lưu vào DB
        const message = await RoomMessage.create({
          room: roomId,
          user: user._id,
          username: user.username,
          avatar: user.avatar,
          content: content.trim(),
          type: "text",
        });

        // Broadcast cho tất cả trong phòng
        io.to(roomId).emit("room:new-message", {
          _id: message._id,
          user: {
            _id: user._id,
            username: user.username,
            avatar: user.avatar,
          },
          content: message.content,
          type: "text",
          createdAt: message.createdAt,
        });

        logEvent("room:send-message", {
          roomId,
          userId: user._id,
          content: content.substring(0, 30),
        });
      } catch (err) {
        console.error("[room:send-message]", err);
      }
    });

    /* ----------------------------------------------------------
       room:kick-user - Kick người dùng (chỉ host)
    ---------------------------------------------------------- */
    socket.on("room:kick-user", async ({ roomId, userId }) => {
      try {
        const room = await Room.findById(roomId).select("host");
        if (!room) return;

        if (room.host.toString() !== user._id.toString()) {
          return socket.emit("room:error", {
            code: "NOT_HOST",
            message: "Chỉ host mới có quyền kick",
          });
        }

        if (userId === user._id.toString()) {
          return socket.emit("room:error", {
            code: "CANNOT_KICK_SELF",
            message: "Không thể kick chính mình",
          });
        }

        // Tìm socket của user bị kick
        const allSockets = await io.in(roomId).fetchSockets();
        const targetSockets = allSockets.filter(
          (s) => s.user._id.toString() === userId.toString()
        );

        // Kick tất cả socket của user đó
        for (const targetSocket of targetSockets) {
          targetSocket.emit("room:kicked", {
            message: "Bạn đã bị kick khỏi phòng",
          });
          targetSocket.leave(roomId);
        }

        // Cập nhật DB
        await Room.findByIdAndUpdate(roomId, {
          $pull: { onlineUsers: userId },
        });

        // Thông báo cho phòng
        const onlineUsers = await getOnlineUsersInRoom(io, roomId);
        io.to(roomId).emit("room:user-left", {
          userId,
          users: onlineUsers,
          message: `Một người dùng đã bị kick`,
        });

        logEvent("room:kick-user", { roomId, kickedUserId: userId });
      } catch (err) {
        console.error("[room:kick-user]", err);
      }
    });

    /* ----------------------------------------------------------
       room:transfer-host - Chuyển quyền host (chỉ host hiện tại)
    ---------------------------------------------------------- */
    socket.on("room:transfer-host", async ({ roomId, newHostId }) => {
      try {
        const room = await Room.findById(roomId).select("host");
        if (!room) return;

        if (room.host.toString() !== user._id.toString()) {
          return socket.emit("room:error", {
            code: "NOT_HOST",
            message: "Chỉ host mới có quyền chuyển giao",
          });
        }

        // Cập nhật host mới
        await Room.findByIdAndUpdate(roomId, { host: newHostId });

        io.to(roomId).emit("room:host-changed", {
          newHostId,
          message: "Host đã được chuyển giao",
        });

        logEvent("room:transfer-host", { roomId, newHostId });
      } catch (err) {
        console.error("[room:transfer-host]", err);
      }
    });

    /* ----------------------------------------------------------
       room:request-sync - Client yêu cầu đồng bộ state
       (dùng khi reconnect hoặc tab focus lại)
    ---------------------------------------------------------- */
    /* ----------------------------------------------------------
       room:close - Dong phong (chi host)
    ---------------------------------------------------------- */
    socket.on("room:close", async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId).select("host");
        if (!room) return;

        if (room.host.toString() !== user._id.toString()) {
          return socket.emit("room:error", {
            code: "NOT_HOST",
            message: "Chi host moi co quyen dong phong",
          });
        }

        io.to(roomId).emit("room:closed", {
          roomId,
          message: "Phong da bi dong boi host",
        });

        const socketsInRoom = await io.in(roomId).fetchSockets();
        for (const s of socketsInRoom) {
          s.leave(roomId);
          if (s.currentRoomId === roomId) {
            s.currentRoomId = null;
          }
        }

        await Promise.all([
          RoomMessage.deleteMany({ room: roomId }),
          Room.findByIdAndDelete(roomId),
        ]);
        roomStates.delete(roomId);

        logEvent("room:close", { roomId, by: user._id });
      } catch (err) {
        console.error("[room:close]", err);
      }
    });
    socket.on("room:request-sync", ({ roomId }) => {
      try {
        const state = roomStates.get(roomId);
        if (!state) return;

        const currentTime = getCurrentPlayerTime(roomId);

        socket.emit("room:player-sync", {
          isPlaying: state.isPlaying,
          currentTime,
          volume: state.volume,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error("[room:request-sync]", err);
      }
    });

    /* ----------------------------------------------------------
       disconnect - Mất kết nối
    ---------------------------------------------------------- */
    socket.on("disconnect", async () => {
      const roomId = socket.currentRoomId;
      if (roomId) {
        await handleLeaveRoom(socket, io, roomId, user);
      }
      logEvent("disconnect", { userId: user._id });
    });
  });
};

/* ============================================================
   handleLeaveRoom - Xử lý khi user rời phòng
   (dùng chung cho room:leave và disconnect)
============================================================ */
const handleLeaveRoom = async (socket, io, roomId, user) => {
  try {
    socket.leave(roomId);
    socket.currentRoomId = null;

    // Đợi một chút để socket đã thực sự rời room
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Cập nhật DB
    await Room.findByIdAndUpdate(roomId, {
      $pull: { onlineUsers: user._id },
    });

    // Lấy danh sách user còn lại
    const onlineUsers = await getOnlineUsersInRoom(io, roomId);

    // Kiểm tra phòng có còn người không
    if (onlineUsers.length === 0) {
      // Phòng trống: xóa state khỏi memory
      roomStates.delete(roomId);

      // Xóa luôn phòng nếu muốn (optional)
      // await Room.findByIdAndUpdate(roomId, { isActive: false });
      logEvent("room:empty", { roomId });
    } else {
      // Kiểm tra host có còn trong phòng không
      const room = await Room.findById(roomId).select("host");

      if (room) {
        const hostStillOnline = onlineUsers.some(
          (u) => u._id.toString() === room.host.toString()
        );

        // Host rời phòng → tự động chuyển host cho người tiếp theo
        if (!hostStillOnline) {
          const newHost = onlineUsers[0];
          await Room.findByIdAndUpdate(roomId, { host: newHost._id });

          io.to(roomId).emit("room:host-changed", {
            newHostId: newHost._id,
            newHostName: newHost.username,
            message: `${newHost.username} đã trở thành host mới`,
          });
        }
      }

      // Thông báo user đã rời
      io.to(roomId).emit("room:user-left", {
        userId: user._id,
        users: onlineUsers,
        message: `${user.username} đã rời phòng`,
      });

      // System message
      const systemMsg = await RoomMessage.create({
        room: roomId,
        user: user._id,
        username: user.username,
        content: `${user.username} đã rời phòng 👋`,
        type: "system",
      });

      io.to(roomId).emit("room:new-message", systemMsg);
    }

    logEvent("room:leave", { roomId, userId: user._id });
  } catch (err) {
    console.error("[handleLeaveRoom]", err);
  }
};

module.exports = roomHandler;
