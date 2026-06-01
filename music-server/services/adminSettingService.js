const AdminSetting = require("../models/AdminSetting");

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

const CACHE_TTL_MS = 5000;
let cache = {
  value: null,
  expiresAt: 0,
};

const mergeWithDefault = (value = {}) => ({
  general: { ...DEFAULT_SETTINGS.general, ...(value.general || {}) },
  moderation: { ...DEFAULT_SETTINGS.moderation, ...(value.moderation || {}) },
  security: { ...DEFAULT_SETTINGS.security, ...(value.security || {}) },
  notifications: { ...DEFAULT_SETTINGS.notifications, ...(value.notifications || {}) },
  maintenance: { ...DEFAULT_SETTINGS.maintenance, ...(value.maintenance || {}) },
});

const invalidateSettingsCache = () => {
  cache = { value: null, expiresAt: 0 };
};

const getSettingsDocument = async ({ createIfMissing = true } = {}) => {
  let doc = await AdminSetting.findOne({ key: "global" });
  if (!doc && createIfMissing) {
    doc = await AdminSetting.create({ key: "global", ...DEFAULT_SETTINGS });
    invalidateSettingsCache();
  }
  return doc;
};

const getSettingsValue = async ({ createIfMissing = true, useCache = true } = {}) => {
  if (useCache && cache.value && cache.expiresAt > Date.now()) {
    return cache.value;
  }

  const doc = await getSettingsDocument({ createIfMissing });
  const merged = mergeWithDefault(doc ? doc.toObject() : {});

  cache = {
    value: merged,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return merged;
};

module.exports = {
  DEFAULT_SETTINGS,
  mergeWithDefault,
  invalidateSettingsCache,
  getSettingsDocument,
  getSettingsValue,
};
