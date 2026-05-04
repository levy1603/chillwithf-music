// src/pages/RoomPage/RoomUsers.jsx
import React from "react";
import { FaCrown, FaUserSlash, FaExchangeAlt } from "react-icons/fa";
import getAvatarURL from "../../utils/getAvatarURL";

const DEFAULT_AVATAR = "/images/default-avatar.png";

const RoomUsers = ({
  users,
  hostId,
  currentUserId,
  isHost,
  onKick,
  onTransferHost,
}) => {
  const safeUsers = Array.isArray(users)
    ? users.filter((u) => u && u._id && u.username)
    : [];

  return (
    <div className="ru-wrap">
      <div className="ru-header">
        <span>{safeUsers.length} người trong phòng</span>
      </div>

      <div className="ru-list">
        {safeUsers.map((u) => {
          const userId = u._id?.toString?.() || u._id;
          const isCurrentUser =
            userId === (currentUserId?.toString?.() || currentUserId);
          const isRoomHost = userId === (hostId?.toString?.() || hostId);

          return (
            <div
              key={userId}
              className={`ru-item ${isCurrentUser ? "ru-item--me" : ""}`}
            >
              <div className="ru-avatar-wrap">
                <img
                  src={getAvatarURL(u.avatar, 40)}
                  alt={u.username}
                  className="ru-avatar"
                  onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
                />
                <span className="ru-online-dot" />
              </div>

              <div className="ru-info">
                <span className="ru-username">
                  {u.username}
                  {isCurrentUser && <span className="ru-you-badge"> (bạn)</span>}
                </span>

                {isRoomHost && (
                  <span className="ru-host-label">
                    <FaCrown style={{ color: "gold", marginRight: 4 }} />
                    Host
                  </span>
                )}
              </div>

              {isHost && !isCurrentUser && (
                <div className="ru-actions">
                  {!isRoomHost && (
                    <button
                      className="ru-action-btn ru-action-btn--transfer"
                      title="Chuyển quyền host"
                      onClick={() => onTransferHost?.(userId)}
                    >
                      <FaExchangeAlt />
                    </button>
                  )}

                  <button
                    className="ru-action-btn ru-action-btn--kick"
                    title="Kick khỏi phòng"
                    onClick={() => {
                      if (window.confirm(`Kick ${u.username} khỏi phòng?`)) {
                        onKick?.(userId);
                      }
                    }}
                  >
                    <FaUserSlash />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoomUsers;
