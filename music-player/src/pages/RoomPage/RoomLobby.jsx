import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FaPlus,
  FaUsers,
  FaMusic,
  FaLock,
  FaGlobe,
  FaSearch,
  FaTimes,
} from "react-icons/fa";
import { MdMeetingRoom } from "react-icons/md";
import { FiHome } from "react-icons/fi";
import CreateRoomModal from "./CreateRoomModal";
import "./RoomPage.css";

const normalizeRoomType = (rawType) => {
  const value = (rawType || "").toString().trim().toLowerCase();

  if (
    value === "private" ||
    value === "rieng tu" ||
    value === "riêng tư" ||
    value.includes("private") ||
    value.includes("rieng") ||
    value.includes("riêng")
  ) {
    return "private";
  }

  if (
    value === "public" ||
    value === "cong khai" ||
    value === "công khai" ||
    value.includes("public") ||
    value.includes("cong") ||
    value.includes("công")
  ) {
    return "public";
  }

  return "public";
};

const RoomLobby = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("all"); // all | public | private
  const [searchTerm, setSearchTerm] = useState("");
  const loggedOrphanRoomIdsRef = useRef(new Set());

  const hasValidHost = (room) => {
    const hostId = room?.host?._id ?? room?.host;
    return !!hostId;
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/rooms");
      const data = await res.json();
      const fetchedRooms = data.rooms || [];
      const roomsWithoutHost = fetchedRooms.filter((room) => !hasValidHost(room));
      const activeRooms = fetchedRooms.filter(hasValidHost);

      setRooms(activeRooms);

      if (roomsWithoutHost.length > 0) {
        roomsWithoutHost.forEach((room) => {
          const roomId = room?._id;
          if (!roomId || loggedOrphanRoomIdsRef.current.has(roomId)) return;
          loggedOrphanRoomIdsRef.current.add(roomId);
          console.warn("Bo qua phong khong co host:", roomId);
        });
      }
    } catch (err) {
      console.error("Loi tai phong:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = (room) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    navigate(`/rooms/${room._id}`);
  };

  const handleCreateRoom = (newRoom) => {
    setRooms((prev) => [newRoom, ...prev]);
    setShowCreate(false);
    navigate(`/rooms/${newRoom._id}`);
  };

  const filteredRooms = rooms.filter((r) => {
    if (!hasValidHost(r)) return false;

    const roomType = normalizeRoomType(r.type);
    const matchesFilter = filter === "all" || roomType === filter;

    if (!matchesFilter) return false;
    if (!searchTerm.trim()) return true;

    const keyword = searchTerm.toLowerCase().trim();
    const roomName = (r.name || "").toLowerCase();
    const hostName = (r.host?.username || "").toLowerCase();
    const songTitle = (r.currentSong?.title || "").toLowerCase();
    const songArtist = (r.currentSong?.artist || "").toLowerCase();

    return (
      roomName.includes(keyword) ||
      hostName.includes(keyword) ||
      songTitle.includes(keyword) ||
      songArtist.includes(keyword)
    );
  });

  return (
    <div className="room-lobby-page">
      <div className="room-lobby">
        <div className="lobby-controls">
          <div className="lobby-header">
            <div className="lobby-title">
              <MdMeetingRoom className="lobby-title-icon" />
              <div>
                <h1>Phong nhac</h1>
                <p>Nghe nhac cung ban be theo thoi gian thuc</p>
              </div>
            </div>

            <div className="lobby-header-actions">
              <Link to="/" className="lobby-home-btn">
                <FiHome />
                <span>Trang chu</span>
              </Link>

              {isAuthenticated && (
                <button className="create-room-btn" onClick={() => setShowCreate(true)}>
                  <FaPlus /> Tao phong
                </button>
              )}
            </div>
          </div>

          <div className="lobby-filters">
            {[
              { key: "all", label: "Tat ca" },
              { key: "public", label: "Cong khai", icon: <FaGlobe /> },
              { key: "private", label: "Rieng tu", icon: <FaLock /> },
            ].map((f) => (
              <button
                key={f.key}
                className={`filter-tab ${filter === f.key ? "active" : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.icon} {f.label}
              </button>
            ))}

            <button className="refresh-btn" onClick={fetchRooms}>
              Lam moi
            </button>
          </div>

          <div className="lobby-search-wrap">
            <FaSearch className="lobby-search-icon" />
            <input
              type="text"
              className="lobby-search-input"
              placeholder="Tim theo ten phong, host, bai hat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="lobby-search-clear"
                onClick={() => setSearchTerm("")}
                aria-label="Xoa tim kiem"
              >
                <FaTimes />
              </button>
            )}
          </div>

          {!loading && (
            <p className="lobby-result-count">
              Hien thi <strong>{filteredRooms.length}</strong> phong
            </p>
          )}
        </div>

        <div className="lobby-list-area">
          {loading ? (
            <div className="lobby-loading">
              <div className="loading-spinner" />
              <p>Dang tai phong...</p>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="lobby-empty">
              <MdMeetingRoom size={60} />
              <p>Chua co phong nao. Hay tao phong dau tien!</p>
            </div>
          ) : (
            <div className="room-grid">
              {filteredRooms.map((room) => (
                <RoomCard key={room._id} room={room} onJoin={() => handleJoinRoom(room)} />
              ))}
            </div>
          )}
        </div>

        {showCreate && (
          <CreateRoomModal
            onClose={() => setShowCreate(false)}
            onCreate={handleCreateRoom}
          />
        )}
      </div>
    </div>
  );
};

const RoomCard = ({ room, onJoin }) => {
  const roomType = normalizeRoomType(room.type);
  const parsedCurrentUsers = Number(room.currentUsers);
  const currentUsers = Number.isFinite(parsedCurrentUsers)
    ? parsedCurrentUsers
    : Array.isArray(room.onlineUsers)
      ? room.onlineUsers.length
    : Array.isArray(room.users)
      ? room.users.length
      : 0;
  const maxUsers = Number.isFinite(room.maxUsers) ? room.maxUsers : 10;
  const isFull = currentUsers >= maxUsers;

  return (
    <div className={`room-card ${isFull ? "room-full" : ""}`}>
      <div className="room-card-thumb">
        {room.currentSong?.thumbnail ? (
          <img src={room.currentSong.thumbnail} alt={room.currentSong.title} />
        ) : (
          <div className="room-thumb-placeholder">
            <FaMusic />
          </div>
        )}

        <span className={`room-type-badge ${roomType}`}>
          {roomType === "public" ? <FaGlobe /> : <FaLock />}
          {roomType === "public" ? "Cong khai" : "Rieng tu"}
        </span>

        <div className="room-members-badge">
          <FaUsers />
          <strong>{currentUsers}/{maxUsers}</strong>
          <span>nguoi</span>
        </div>
      </div>

      <div className="room-card-body">
        <h3 className="room-name">{room.name}</h3>

        <div className="room-members-inline">
          <FaUsers />
          <span>
            Hien co <strong>{currentUsers}</strong> nguoi trong phong
          </span>
        </div>

        <div className="room-now-playing">
          <FaMusic className="np-icon" />
          <span>
            {room.currentSong
              ? `${room.currentSong.title} - ${room.currentSong.artist}`
              : "Chua phat nhac"}
          </span>
        </div>

        <div className="room-host">
          Host: <strong>{room.host?.username}</strong>
        </div>

        <div className="room-card-footer">
          <span className="room-users">
            <FaUsers />
            {currentUsers}/{maxUsers}
          </span>

          <button
            className={`join-btn ${isFull ? "disabled" : ""}`}
            onClick={onJoin}
            disabled={isFull}
          >
            {isFull ? "Day phong" : "Vao phong"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomLobby;
