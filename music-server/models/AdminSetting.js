const mongoose = require("mongoose");

const adminSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "global",
      unique: true,
      index: true,
    },
    general: {
      siteName: { type: String, default: "MusicVN", trim: true },
      supportEmail: { type: String, default: "support@musicvn.local", trim: true },
      defaultLanguage: {
        type: String,
        enum: ["vi", "en"],
        default: "vi",
      },
    },
    moderation: {
      autoApproveUploads: { type: Boolean, default: false },
      requireManualPlaylistReview: { type: Boolean, default: false },
      maxUploadsPerUserPerDay: { type: Number, default: 8, min: 1, max: 50 },
      autoHideReportedSongs: { type: Boolean, default: true },
    },
    security: {
      forceStrongPassword: { type: Boolean, default: true },
      require2FAForAdmins: { type: Boolean, default: false },
      sessionTimeoutMinutes: { type: Number, default: 120, min: 10, max: 1440 },
      maxFailedLoginAttempts: { type: Number, default: 5, min: 3, max: 20 },
    },
    notifications: {
      notifyNewUpload: { type: Boolean, default: true },
      notifyReport: { type: Boolean, default: true },
      notifyDailySummary: { type: Boolean, default: false },
      summaryHour: { type: Number, default: 8, min: 0, max: 23 },
    },
    maintenance: {
      readOnlyMode: { type: Boolean, default: false },
      maintenanceBannerEnabled: { type: Boolean, default: false },
      maintenanceMessage: {
        type: String,
        default: "System is under maintenance. Some features may be limited.",
        trim: true,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminSetting", adminSettingSchema);
