// pages/ProfilePage.jsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUser, FaEdit, FaSave, FaTimes, FaCamera,
  FaArrowLeft, FaMusic, FaHeart, FaInfoCircle,
  FaIdBadge, FaSpinner, FaCheck,
} from "react-icons/fa";
import { useAuth }      from "../context/AuthContext";
import userAPI          from "../api/userAPI";
import getAvatarURL, { DEFAULT_AVATAR_URL } from "../utils/getAvatarURL";
import MySongsList      from "../components/MySongsList";
import "../styles/pages/ProfilePage.css";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const DEFAULT_AVATAR  = DEFAULT_AVATAR_URL;

const revokeAvatarPreview = (url) => {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
};

const ProfilePage = () => {
  const { user, updateUser } = useAuth(); 
  const navigate       = useNavigate();
  const avatarInputRef = useRef(null);

  const [isEditing,    setIsEditing]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saveSuccess,  setSaveSuccess]  = useState(false);
  const [error,        setError]        = useState("");
  const [avatarPreview,  setAvatarPreview]  = useState(null);
  const [avatarFile,     setAvatarFile]     = useState(null);
  const [avatarCacheKey, setAvatarCacheKey] = useState(() => Date.now());
  const [showMySongs,  setShowMySongs]  = useState(false);

  const [form, setForm] = useState({
    username: user?.username || "",
    nickname: user?.nickname || "",
    bio:      user?.bio      || "",
  });

  useEffect(() => {
    if (!user) return;
    setForm({
      username: user.username || "",
      nickname: user.nickname || "",
      bio:      user.bio      || "",
    });
  }, [user]);

  useEffect(() => {
    return () => revokeAvatarPreview(avatarPreview);
  }, [avatarPreview]);

  /* ═══════════════════════════════════════════
     MEMO
  ═══════════════════════════════════════════ */
  const favoriteCount = useMemo(
    () => user?.favoriteCount ?? user?.favorites?.length ?? 0,
    [user]
  );

  const uploadCount = useMemo(() => user?.uploadCount ?? 0, [user]);

  const joinedDate = useMemo(() => {
    if (!user?.createdAt) return "Không rõ";
    return new Date(user.createdAt).toLocaleDateString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  }, [user?.createdAt]);

  const currentAvatar = useMemo(() => {
    if (avatarPreview) return avatarPreview;

    const baseUrl = getAvatarURL(user?.avatar, 150);
    if (!baseUrl) return DEFAULT_AVATAR;
    if (baseUrl.startsWith("data:")) return baseUrl;

    const sep = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${sep}t=${avatarCacheKey}`;
  }, [avatarPreview, user?.avatar, avatarCacheKey]);

  /* ═══════════════════════════════════════════
     HANDLERS
  ═══════════════════════════════════════════ */
  const resetForm = useCallback(() => {
    setForm({
      username: user?.username || "",
      nickname: user?.nickname || "",
      bio:      user?.bio      || "",
    });
    setAvatarPreview((prev) => { revokeAvatarPreview(prev); return null; });
    setAvatarFile(null);
    setError("");
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }, [user]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  }, []);

  const handleAvatarChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file ảnh!"); return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError("Ảnh không được vượt quá 5MB!"); return;
    }

    setAvatarFile(file);
    setError("");

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview((prev) => { revokeAvatarPreview(prev); return previewUrl; });
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.username.trim()) {
      setError("Tên người dùng không được để trống!");
      return;
    }

    setSaving(true);
    setError("");

    try {
      let newAvatarUrl = null;

      if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);

        const avatarRes  = await userAPI.updateAvatar(formData);
        const avatarData = avatarRes.data?.data;

        newAvatarUrl = avatarData?.avatar
                    || avatarData?.user?.avatar
                    || null;

        console.log("✅ Cloudinary URL:", newAvatarUrl);
      }

      const profileRes  = await userAPI.updateProfile({
        username: form.username.trim(),
        nickname: form.nickname.trim(),
        bio:      form.bio.trim(),
      });
      const profileData = profileRes.data?.data || profileRes.data;

      updateUser({
        ...profileData,

        ...(newAvatarUrl ? { avatar: newAvatarUrl } : {}),
      });

      setAvatarFile(null);
      setAvatarPreview((prev) => { revokeAvatarPreview(prev); return null; });
      setAvatarCacheKey(Date.now());
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (err) {
      console.error("❌ Lỗi cập nhật:", err);
      setError(err.response?.data?.message || "Lỗi khi cập nhật thông tin!");
    } finally {
      setSaving(false);
    }
  }, [form, user, avatarFile, updateUser]);

  const handleCancel = useCallback(() => {
    resetForm();
    setIsEditing(false);
  }, [resetForm]);

  /* ═══════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════ */
  return (
    <div className="profile-page">
      <button className="profile-back-btn" onClick={() => navigate(-1)}>
        <FaArrowLeft /><span>Quay lại</span>
      </button>

      <div className="profile-container">
        {/* ── Cột trái ── */}
        <div className="profile-left">
          <div className="avatar-wrapper">
            <img
              src={currentAvatar}
              alt="avatar"
              className="profile-avatar"
              onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
            />

            {isEditing && (
              <button
                className="avatar-camera-btn"
                onClick={() => avatarInputRef.current?.click()}
                title="Thay đổi ảnh"
              >
                <FaCamera /><span>Đổi ảnh</span>
              </button>
            )}

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
            <div className="avatar-badge" />
          </div>

          <h2 className="profile-display-name">{user?.username}</h2>
          {user?.nickname && <p className="profile-nickname">@{user.nickname}</p>}

          <div className="profile-stats">
            <div
              className="profile-stat-card clickable"
              onClick={() => setShowMySongs(true)}
              title="Xem bài đã upload"
            >
              <FaMusic className="profile-stat-icon music" />
              <span className="profile-stat-number">{uploadCount}</span>
              <span className="profile-stat-label">Bài đã upload</span>
            </div>

            <div className="profile-stat-card">
              <FaHeart className="profile-stat-icon heart" />
              <span className="profile-stat-number">{favoriteCount}</span>
              <span className="profile-stat-label">Yêu thích</span>
            </div>
          </div>

          {!isEditing && (
            <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>
              <FaEdit /> Chỉnh sửa hồ sơ
            </button>
          )}
        </div>

        {/* ── Cột phải ── */}
        <div className="profile-right">
          <div className="profile-right-header">
            <h3>{isEditing ? "✏️ Chỉnh sửa hồ sơ" : "👤 Thông tin cá nhân"}</h3>
            {saveSuccess && (
              <div className="save-success-badge">
                <FaCheck /> Đã lưu!
              </div>
            )}
          </div>

          {error && (
            <div className="profile-error"><FaTimes /> {error}</div>
          )}

          <div className="profile-form">
            {/* Username */}
            <div className="form-group">
              <label><FaUser className="label-icon" />Tên người dùng</label>
              {isEditing ? (
                <input
                  type="text" name="username" value={form.username}
                  onChange={handleChange} className="profile-input"
                  placeholder="Nhập tên người dùng..." maxLength={30}
                />
              ) : (
                <div className="profile-value">
                  {user?.username || <span className="empty-value">Chưa cập nhật</span>}
                </div>
              )}
            </div>

            {/* Nickname */}
            <div className="form-group">
              <label><FaIdBadge className="label-icon" />Biệt danh</label>
              {isEditing ? (
                <div className="input-with-prefix">
                  <span className="input-prefix">@</span>
                  <input
                    type="text" name="nickname" value={form.nickname}
                    onChange={handleChange} className="profile-input has-prefix"
                    placeholder="Nhập biệt danh..." maxLength={30}
                  />
                </div>
              ) : (
                <div className="profile-value">
                  {user?.nickname
                    ? `@${user.nickname}`
                    : <span className="empty-value">Chưa cập nhật</span>}
                </div>
              )}
            </div>

            {/* Email */}
            <div className="form-group">
              <label><FaInfoCircle className="label-icon" />Email</label>
              <div className="profile-value readonly">
                {user?.email}
                <span className="readonly-badge">Không thể thay đổi</span>
              </div>
            </div>

            {/* Bio */}
            <div className="form-group">
              <label><FaInfoCircle className="label-icon" />Mô tả bản thân</label>
              {isEditing ? (
                <>
                  <textarea
                    name="bio" value={form.bio} onChange={handleChange}
                    className="profile-textarea"
                    placeholder="Viết gì đó về bản thân bạn..."
                    rows={4} maxLength={200}
                  />
                  <span className="char-count">{form.bio.length}/200</span>
                </>
              ) : (
                <div className="profile-value bio">
                  {user?.bio || (
                    <span className="empty-value">
                      Chưa có mô tả. Hãy cho mọi người biết về bạn!
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Ngày tham gia */}
            <div className="form-group">
              <label><FaInfoCircle className="label-icon" />Ngày tham gia</label>
              <div className="profile-value readonly">{joinedDate}</div>
            </div>
          </div>

          {isEditing && (
            <div className="profile-actions">
              <button className="cancel-btn" onClick={handleCancel} disabled={saving}>
                <FaTimes /> Hủy
              </button>
              <button className="save-btn" onClick={handleSave} disabled={saving}>
                {saving
                  ? <><FaSpinner className="spinning" /> Đang lưu...</>
                  : <><FaSave /> Lưu thay đổi</>
                }
              </button>
            </div>
          )}
        </div>
      </div>

      {showMySongs && <MySongsList onClose={() => setShowMySongs(false)} />}
    </div>
  );
};

export default ProfilePage;
