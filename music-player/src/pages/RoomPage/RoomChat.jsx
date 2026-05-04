// src/pages/RoomPage/RoomChat.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { FaPaperPlane } from "react-icons/fa";
import getAvatarURL from "../../utils/getAvatarURL";

const DEFAULT_AVATAR = "/images/default-avatar.png";

const RoomChat = ({ messages, currentUser, onSend }) => {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  /* ── Auto scroll xuống khi có tin mới ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    onSend?.(text);
    setInput("");
    inputRef.current?.focus();
  }, [input, onSend]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="rc-wrap">
      {/* Danh sách tin nhắn */}
      <div className="rc-messages">
        {messages.length === 0 && (
          <div className="rc-empty">
            <p>Chưa có tin nhắn nào</p>
            <p>Hãy bắt đầu cuộc trò chuyện! 💬</p>
          </div>
        )}

        {messages.map((msg) => {
          /* ── System message ── */
          if (msg.type === "system") {
            return (
              <div key={msg._id} className="rc-msg--system">
                {msg.content}
              </div>
            );
          }

          const isMe =
            (msg.user?._id || msg.user) === currentUser?._id;

          return (
            <div
              key={msg._id}
              className={`rc-msg ${isMe ? "rc-msg--me" : "rc-msg--other"}`}
            >
              {/* Avatar (chỉ hiển thị với tin của người khác) */}
              {!isMe && (
                <img
                  src={getAvatarURL(msg.avatar || msg.user?.avatar, 32)}
                  alt={msg.username || msg.user?.username}
                  className="rc-avatar"
                  onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
                />
              )}

              <div className="rc-bubble-wrap">
                {/* Username */}
                {!isMe && (
                  <span className="rc-username">
                    {msg.username || msg.user?.username}
                  </span>
                )}

                {/* Bubble */}
                <div className="rc-bubble">
                  <p>{msg.content}</p>
                </div>

                {/* Timestamp */}
                <span className="rc-time">
                  {new Date(msg.createdAt).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="rc-input-wrap">
        <input
          ref={inputRef}
          type="text"
          className="rc-input"
          placeholder="Nhập tin nhắn... (Enter để gửi)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={500}
        />
        <button
          className={`rc-send-btn ${!input.trim() ? "rc-send-btn--disabled" : ""}`}
          onClick={handleSend}
          disabled={!input.trim()}
        >
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
};

export default RoomChat;