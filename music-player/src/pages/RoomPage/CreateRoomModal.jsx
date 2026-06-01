// pages/RoomPage/CreateRoomModal.jsx
import React, { useState } from "react";
import { FaTimes, FaLock, FaGlobe } from "react-icons/fa";
import { API_BASE_URL } from "../../config/api";

const CreateRoomModal = ({ onClose, onCreate }) => {
  const [form, setForm] = useState({
    name: "",
    type: "public",
    maxUsers: 10,
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Vui lòng nhập tên phòng");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Tạo phòng thất bại");

      onCreate(data.room);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box create-room-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2>🎵 Tạo phòng nhạc</h2>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="create-room-form">
          {error && <div className="form-error">{error}</div>}

          {/* Tên phòng */}
          <div className="form-group">
            <label>Tên phòng *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="VD: Chill Sunday ☀️"
              maxLength={50}
            />
          </div>

          {/* Loại phòng */}
          <div className="form-group">
            <label>Loại phòng</label>
            <div className="room-type-select">
              {[
                { value: "public", label: "Công khai", icon: <FaGlobe /> },
                { value: "private", label: "Riêng tư", icon: <FaLock /> },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`type-option ${
                    form.type === opt.value ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={opt.value}
                    checked={form.type === opt.value}
                    onChange={handleChange}
                  />
                  {opt.icon} {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Password nếu private */}
          {form.type === "private" && (
            <div className="form-group">
              <label>Mật khẩu phòng</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Nhập mật khẩu..."
              />
            </div>
          )}

          {/* Số người tối đa */}
          <div className="form-group">
            <label>Số người tối đa: <strong>{form.maxUsers}</strong></label>
            <input
              type="range"
              name="maxUsers"
              min={2}
              max={50}
              value={form.maxUsers}
              onChange={handleChange}
            />
            <div className="range-labels">
              <span>2</span>
              <span>50</span>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Đang tạo..." : "🚀 Tạo phòng"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomModal;
