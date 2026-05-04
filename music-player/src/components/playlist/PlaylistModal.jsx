// components/playlist/PlaylistModal.js
import React, { useState, useEffect, useCallback } from "react";
import { FaTimes } from "react-icons/fa";
import "../../styles/components/playlist/PlaylistModal.css";

const DEFAULT_FORM_DATA = {
  name: "",
  description: "",
  isPublic: true,
};

const PlaylistModal = ({ playlist, onSave, onClose, saving = false }) => {
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (playlist) {
      setFormData({
        name: playlist.name || "",
        description: playlist.description || "",
        isPublic: playlist.isPublic ?? true,
      });
    } else {
      setFormData(DEFAULT_FORM_DATA);
    }

    setErrors({});
  }, [playlist]);

  const validate = useCallback(() => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Vui lòng nhập tên playlist";
    } else if (formData.name.trim().length > 50) {
      newErrors.name = "Tên tối đa 50 ký tự";
    }

    if (formData.description.length > 200) {
      newErrors.description = "Mô tả tối đa 200 ký tự";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (saving) return;
    if (!validate()) return;

    await onSave({
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim(),
    });
  };

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{playlist ? "Chỉnh sửa Playlist" : "Tạo Playlist mới"}</h3>
          <button
            type="button"
            className="btn-close"
            onClick={handleClose}
            disabled={saving}
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>
              Tên Playlist <span className="required">*</span>
            </label>
            <input
              type="text"
              placeholder="Nhập tên playlist..."
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              maxLength={50}
              disabled={saving}
            />
            {errors.name && <span className="error">{errors.name}</span>}
            <span className="char-count">{formData.name.length}/50</span>
          </div>

          <div className="form-group">
            <label>Mô tả</label>
            <textarea
              placeholder="Nhập mô tả (tuỳ chọn)..."
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              maxLength={200}
              rows={3}
              disabled={saving}
            />
            {errors.description && (
              <span className="error">{errors.description}</span>
            )}
            <span className="char-count">{formData.description.length}/200</span>
          </div>

          <div className="form-group form-toggle">
            <label>Chế độ</label>
            <div className="toggle-switch">
              <span className={!formData.isPublic ? "active" : ""}>
                🔒 Riêng tư
              </span>

              <label className="switch">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => handleChange("isPublic", e.target.checked)}
                  disabled={saving}
                />
                <span className="slider" />
              </label>

              <span className={formData.isPublic ? "active" : ""}>
                🌐 Công khai
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={handleClose}
              disabled={saving}
            >
              Hủy
            </button>

            <button type="submit" className="btn-save" disabled={saving}>
              {saving
                ? playlist
                  ? "Đang lưu..."
                  : "Đang tạo..."
                : playlist
                ? "Lưu thay đổi"
                : "Tạo mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlaylistModal;