const { getSettingsValue } = require("../services/adminSettingService");

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const isPathAllowedDuringReadOnly = (path) => {
  const allowlist = [
    "/api/admin/settings",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/google",
    "/api/auth/google/callback",
  ];
  return allowlist.some((allowed) => path.startsWith(allowed));
};

const enforceReadOnlyMode = async (req, res, next) => {
  try {
    if (!MUTATING_METHODS.has(req.method)) {
      return next();
    }

    const path = (req.originalUrl || req.url || "").split("?")[0];
    if (isPathAllowedDuringReadOnly(path)) {
      return next();
    }

    const settings = await getSettingsValue({ createIfMissing: true, useCache: true });
    if (!settings?.maintenance?.readOnlyMode) {
      return next();
    }

    return res.status(503).json({
      success: false,
      message:
        settings?.maintenance?.maintenanceMessage ||
        "He thong dang o che do chi doc. Vui long thu lai sau.",
      code: "READ_ONLY_MODE",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { enforceReadOnlyMode };
