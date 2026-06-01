// src/components/admin/AdminSettings.js
import React, { useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaCheckCircle,
  FaCog,
  FaDownload,
  FaExclamationTriangle,
  FaSave,
  FaShieldAlt,
  FaSlidersH,
} from "react-icons/fa";
import { API_BASE_URL } from "../../config/api";
import "../../styles/components/admin/AdminSettings.css";

const STORAGE_KEY = "admin_settings_v1";

const DEFAULT_SETTINGS = {
  general: {
    siteName: "MusicVN",
    supportEmail: "support@musicvn.local",
    defaultLanguage: "vi",
  },
  moderation: {
    autoApproveUploads: false,
    requireManualPlaylistReview: false,
    maxUploadsPerUserPerDay: 8,
    autoHideReportedSongs: true,
  },
  security: {
    forceStrongPassword: true,
    require2FAForAdmins: false,
    sessionTimeoutMinutes: 120,
    maxFailedLoginAttempts: 5,
  },
  notifications: {
    notifyNewUpload: true,
    notifyReport: true,
    notifyDailySummary: false,
    summaryHour: 8,
  },
  maintenance: {
    readOnlyMode: false,
    maintenanceBannerEnabled: false,
    maintenanceMessage:
      "Hệ thống đang bảo trì. Một số tính năng có thể bị giới hạn.",
  },
};

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const loadSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return deepClone(DEFAULT_SETTINGS);
    const parsed = JSON.parse(raw);
    return {
      general: { ...DEFAULT_SETTINGS.general, ...(parsed.general || {}) },
      moderation: { ...DEFAULT_SETTINGS.moderation, ...(parsed.moderation || {}) },
      security: { ...DEFAULT_SETTINGS.security, ...(parsed.security || {}) },
      notifications: {
        ...DEFAULT_SETTINGS.notifications,
        ...(parsed.notifications || {}),
      },
      maintenance: { ...DEFAULT_SETTINGS.maintenance, ...(parsed.maintenance || {}) },
    };
  } catch {
    return deepClone(DEFAULT_SETTINGS);
  }
};

const clamp = (value, min, max) => {
  const number = Number(value);
  if (Number.isNaN(number)) return min;
  return Math.min(max, Math.max(min, number));
};

const normalizeSettings = (raw = {}) => ({
  general: { ...DEFAULT_SETTINGS.general, ...(raw.general || {}) },
  moderation: { ...DEFAULT_SETTINGS.moderation, ...(raw.moderation || {}) },
  security: { ...DEFAULT_SETTINGS.security, ...(raw.security || {}) },
  notifications: {
    ...DEFAULT_SETTINGS.notifications,
    ...(raw.notifications || {}),
  },
  maintenance: { ...DEFAULT_SETTINGS.maintenance, ...(raw.maintenance || {}) },
});

const AdminSettings = () => {
  const [persistedSettings, setPersistedSettings] = useState(loadSettings);
  const [settings, setSettings] = useState(persistedSettings);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(persistedSettings),
    [settings, persistedSettings]
  );

  const setField = (section, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
    setSaveMessage("");
  };

  useEffect(() => {
    let cancelled = false;

    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/admin/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error("Không thể tải cài đặt từ backend");
        }

        const data = await res.json();
        const normalized = normalizeSettings(data?.data || {});

        if (!cancelled) {
          setSettings(normalized);
          setPersistedSettings(normalized);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
          setSaveMessage("Đã tải cài đặt từ backend.");
        }
      } catch (error) {
        if (!cancelled) {
          setSaveMessage(
            "API cài đặt backend chưa khả dụng. Đang dùng dữ liệu local tạm thời."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveSettings = async (sourceSettings = settings, successMessage) => {
    setIsSaving(true);

    const normalized = {
      ...sourceSettings,
      moderation: {
        ...sourceSettings.moderation,
        maxUploadsPerUserPerDay: clamp(
          sourceSettings.moderation.maxUploadsPerUserPerDay,
          1,
          50
        ),
      },
      security: {
        ...sourceSettings.security,
        sessionTimeoutMinutes: clamp(
          sourceSettings.security.sessionTimeoutMinutes,
          10,
          1440
        ),
        maxFailedLoginAttempts: clamp(
          sourceSettings.security.maxFailedLoginAttempts,
          3,
          20
        ),
      },
      notifications: {
        ...sourceSettings.notifications,
        summaryHour: clamp(sourceSettings.notifications.summaryHour, 0, 23),
      },
    };

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(normalized),
      });

      if (!res.ok) {
        throw new Error("Không thể lưu cài đặt lên backend");
      }

      const data = await res.json();
      const fromBackend = normalizeSettings(data?.data || normalized);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(fromBackend));
      setPersistedSettings(fromBackend);
      setSettings(fromBackend);
      setLastSavedAt(new Date());
      setSaveMessage(successMessage || "Đã lưu cài đặt lên backend.");
    } catch (error) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      setPersistedSettings(normalized);
      setSettings(normalized);
      setLastSavedAt(new Date());
      setSaveMessage(
        "API cài đặt backend chưa khả dụng. Đã lưu tạm vào local."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefault = async () => {
    const defaults = deepClone(DEFAULT_SETTINGS);
    setSettings(defaults);
    await saveSettings(defaults, "Đã đặt lại mặc định và lưu.");
  };

  const exportSettings = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "admin-settings.json";
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-settings">
      {isLoading && (
        <div className="admin-settings-loading">
          <div className="spinner" />
          <p>Đang tải cài đặt...</p>
        </div>
      )}

      <div className="admin-settings-head">
        <div>
          <h2>
            <FaCog /> Cài đặt hệ thống
          </h2>
          <p>
            Quản lý cấu hình cốt lõi cho kiểm duyệt, bảo mật, thông báo và chế
            độ bảo trì.
          </p>
        </div>
        <div className={`admin-settings-state ${hasUnsavedChanges ? "dirty" : "clean"}`}>
          {hasUnsavedChanges ? (
            <>
              <FaExclamationTriangle />
              <span>Có thay đổi chưa lưu</span>
            </>
          ) : (
            <>
              <FaCheckCircle />
              <span>Tất cả thay đổi đã lưu</span>
            </>
          )}
        </div>
      </div>

      <div className="admin-settings-grid">
        <section className="settings-card">
          <h3>
            <FaSlidersH /> Cài đặt chung
          </h3>
          <label>
            Tên hệ thống
            <input
              type="text"
              value={settings.general.siteName}
              onChange={(event) => setField("general", "siteName", event.target.value)}
            />
          </label>
          <label>
            Email hỗ trợ
            <input
              type="email"
              value={settings.general.supportEmail}
              onChange={(event) =>
                setField("general", "supportEmail", event.target.value)
              }
            />
          </label>
          <label>
            Ngôn ngữ mặc định
            <select
              value={settings.general.defaultLanguage}
              onChange={(event) =>
                setField("general", "defaultLanguage", event.target.value)
              }
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">Tiếng Anh</option>
            </select>
          </label>
        </section>

        <section className="settings-card">
          <h3>
            <FaSlidersH /> Kiểm duyệt nội dung
          </h3>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={settings.moderation.autoApproveUploads}
              onChange={(event) =>
                setField("moderation", "autoApproveUploads", event.target.checked)
              }
            />
            Tự động duyệt bài tải lên
          </label>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={settings.moderation.requireManualPlaylistReview}
              onChange={(event) =>
                setField(
                  "moderation",
                  "requireManualPlaylistReview",
                  event.target.checked
                )
              }
            />
            Yêu cầu duyệt thủ công playlist công khai
          </label>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={settings.moderation.autoHideReportedSongs}
              onChange={(event) =>
                setField("moderation", "autoHideReportedSongs", event.target.checked)
              }
            />
            Tự ẩn bài hát bị báo cáo nhiều
          </label>
          <label>
            Số lượt upload tối đa mỗi user/ngày
            <input
              type="number"
              min="1"
              max="50"
              value={settings.moderation.maxUploadsPerUserPerDay}
              onChange={(event) =>
                setField("moderation", "maxUploadsPerUserPerDay", event.target.value)
              }
            />
          </label>
        </section>

        <section className="settings-card">
          <h3>
            <FaShieldAlt /> Bảo mật
          </h3>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={settings.security.forceStrongPassword}
              onChange={(event) =>
                setField("security", "forceStrongPassword", event.target.checked)
              }
            />
            Bắt buộc chính sách mật khẩu mạnh
          </label>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={settings.security.require2FAForAdmins}
              onChange={(event) =>
                setField("security", "require2FAForAdmins", event.target.checked)
              }
            />
            Yêu cầu 2FA cho tài khoản admin
          </label>
          <label>
            Thời gian hết phiên (phút)
            <input
              type="number"
              min="10"
              max="1440"
              value={settings.security.sessionTimeoutMinutes}
              onChange={(event) =>
                setField("security", "sessionTimeoutMinutes", event.target.value)
              }
            />
          </label>
          <label>
            Số lần đăng nhập sai tối đa
            <input
              type="number"
              min="3"
              max="20"
              value={settings.security.maxFailedLoginAttempts}
              onChange={(event) =>
                setField("security", "maxFailedLoginAttempts", event.target.value)
              }
            />
          </label>
        </section>

        <section className="settings-card">
          <h3>
            <FaBell /> Thông báo
          </h3>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={settings.notifications.notifyNewUpload}
              onChange={(event) =>
                setField("notifications", "notifyNewUpload", event.target.checked)
              }
            />
            Báo khi có bài upload mới
          </label>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={settings.notifications.notifyReport}
              onChange={(event) =>
                setField("notifications", "notifyReport", event.target.checked)
              }
            />
            Báo khi có người dùng report nội dung
          </label>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={settings.notifications.notifyDailySummary}
              onChange={(event) =>
                setField("notifications", "notifyDailySummary", event.target.checked)
              }
            />
            Email tổng hợp hằng ngày
          </label>
          <label>
            Giờ gửi tổng hợp (0-23)
            <input
              type="number"
              min="0"
              max="23"
              value={settings.notifications.summaryHour}
              onChange={(event) =>
                setField("notifications", "summaryHour", event.target.value)
              }
              disabled={!settings.notifications.notifyDailySummary}
            />
          </label>
        </section>

        <section className="settings-card full-width">
          <h3>
            <FaExclamationTriangle /> Bảo trì
          </h3>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={settings.maintenance.readOnlyMode}
              onChange={(event) =>
                setField("maintenance", "readOnlyMode", event.target.checked)
              }
            />
            Bật chế độ chỉ đọc (chặn thao tác ghi)
          </label>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={settings.maintenance.maintenanceBannerEnabled}
              onChange={(event) =>
                setField(
                  "maintenance",
                  "maintenanceBannerEnabled",
                  event.target.checked
                )
              }
            />
            Hiển thị banner bảo trì toàn hệ thống
          </label>
          <label>
            Nội dung banner
            <textarea
              rows="3"
              value={settings.maintenance.maintenanceMessage}
              onChange={(event) =>
                setField("maintenance", "maintenanceMessage", event.target.value)
              }
            />
          </label>
        </section>
      </div>

      <div className="admin-settings-actions">
        <button
          className="btn-primary"
          onClick={() => saveSettings()}
          disabled={isLoading || isSaving}
        >
          <FaSave /> {isSaving ? "Đang lưu..." : "Lưu cài đặt"}
        </button>
        <button
          className="btn-neutral"
          onClick={resetToDefault}
          disabled={isLoading || isSaving}
        >
          Đặt lại mặc định
        </button>
        <button
          className="btn-neutral"
          onClick={exportSettings}
          disabled={isLoading || isSaving}
        >
          <FaDownload /> Xuất JSON
        </button>
      </div>

      <div className="admin-settings-foot">
        <span>
          {lastSavedAt
            ? `Lần lưu gần nhất: ${lastSavedAt.toLocaleTimeString("vi-VN")}`
            : "Chưa có thay đổi nào được lưu trong phiên này."}
        </span>
        {saveMessage && <span className="save-message">{saveMessage}</span>}
      </div>
    </div>
  );
};

export default AdminSettings;
