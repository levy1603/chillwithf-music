const AdminSetting = require("../models/AdminSetting");
const {
  DEFAULT_SETTINGS,
  mergeWithDefault,
  invalidateSettingsCache,
  getSettingsDocument,
  getSettingsValue,
} = require("../services/adminSettingService");

const clamp = (value, min, max, fallback) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
};

const sanitizeSettings = (input = {}) => {
  const generalInput = input.general || {};
  const moderationInput = input.moderation || {};
  const securityInput = input.security || {};
  const notificationsInput = input.notifications || {};
  const maintenanceInput = input.maintenance || {};

  return {
    general: {
      siteName:
        (generalInput.siteName || DEFAULT_SETTINGS.general.siteName).toString().trim() ||
        DEFAULT_SETTINGS.general.siteName,
      supportEmail:
        (generalInput.supportEmail || DEFAULT_SETTINGS.general.supportEmail).toString().trim() ||
        DEFAULT_SETTINGS.general.supportEmail,
      defaultLanguage:
        generalInput.defaultLanguage === "en"
          ? "en"
          : DEFAULT_SETTINGS.general.defaultLanguage,
    },
    moderation: {
      autoApproveUploads: Boolean(moderationInput.autoApproveUploads),
      requireManualPlaylistReview: Boolean(moderationInput.requireManualPlaylistReview),
      maxUploadsPerUserPerDay: clamp(
        moderationInput.maxUploadsPerUserPerDay,
        1,
        50,
        DEFAULT_SETTINGS.moderation.maxUploadsPerUserPerDay
      ),
      autoHideReportedSongs:
        moderationInput.autoHideReportedSongs === undefined
          ? DEFAULT_SETTINGS.moderation.autoHideReportedSongs
          : Boolean(moderationInput.autoHideReportedSongs),
    },
    security: {
      forceStrongPassword:
        securityInput.forceStrongPassword === undefined
          ? DEFAULT_SETTINGS.security.forceStrongPassword
          : Boolean(securityInput.forceStrongPassword),
      require2FAForAdmins: Boolean(securityInput.require2FAForAdmins),
      sessionTimeoutMinutes: clamp(
        securityInput.sessionTimeoutMinutes,
        10,
        1440,
        DEFAULT_SETTINGS.security.sessionTimeoutMinutes
      ),
      maxFailedLoginAttempts: clamp(
        securityInput.maxFailedLoginAttempts,
        3,
        20,
        DEFAULT_SETTINGS.security.maxFailedLoginAttempts
      ),
    },
    notifications: {
      notifyNewUpload:
        notificationsInput.notifyNewUpload === undefined
          ? DEFAULT_SETTINGS.notifications.notifyNewUpload
          : Boolean(notificationsInput.notifyNewUpload),
      notifyReport:
        notificationsInput.notifyReport === undefined
          ? DEFAULT_SETTINGS.notifications.notifyReport
          : Boolean(notificationsInput.notifyReport),
      notifyDailySummary: Boolean(notificationsInput.notifyDailySummary),
      summaryHour: clamp(
        notificationsInput.summaryHour,
        0,
        23,
        DEFAULT_SETTINGS.notifications.summaryHour
      ),
    },
    maintenance: {
      readOnlyMode: Boolean(maintenanceInput.readOnlyMode),
      maintenanceBannerEnabled: Boolean(maintenanceInput.maintenanceBannerEnabled),
      maintenanceMessage:
        (
          maintenanceInput.maintenanceMessage ||
          DEFAULT_SETTINGS.maintenance.maintenanceMessage
        )
          .toString()
          .trim() || DEFAULT_SETTINGS.maintenance.maintenanceMessage,
    },
  };
};

const getAdminSettings = async (req, res, next) => {
  try {
    const settingsDoc = await getSettingsDocument({ createIfMissing: true });
    return res.status(200).json({
      success: true,
      data: settingsDoc,
    });
  } catch (error) {
    return next(error);
  }
};

const updateAdminSettings = async (req, res, next) => {
  try {
    const payload = sanitizeSettings(req.body || {});

    const settings = await AdminSetting.findOneAndUpdate(
      { key: "global" },
      { $set: payload },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    invalidateSettingsCache();

    return res.status(200).json({
      success: true,
      message: "Cap nhat cai dat he thong thanh cong",
      data: settings,
    });
  } catch (error) {
    return next(error);
  }
};

const getPublicSystemState = async (req, res, next) => {
  try {
    const settings = await getSettingsValue({ createIfMissing: true, useCache: true });
    return res.status(200).json({
      success: true,
      data: {
        general: {
          siteName: settings.general.siteName,
          defaultLanguage: settings.general.defaultLanguage,
        },
        maintenance: mergeWithDefault(settings).maintenance,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAdminSettings,
  updateAdminSettings,
  getPublicSystemState,
};
