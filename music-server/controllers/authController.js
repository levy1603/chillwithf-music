// controllers/authController.js
const User = require("../models/User");
const Song = require("../models/Song");
const axios = require("axios");
const crypto = require("crypto");

const getClientAppUrl = () =>
  process.env.CLIENT_URL || "http://localhost:3000";

const getGoogleCallbackUrl = () =>
  process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback";

const getClientGoogleCallbackUrl = () =>
  process.env.GOOGLE_CLIENT_CALLBACK_URL || `${getClientAppUrl()}/auth/google/callback`;

const redirectGoogleError = (res, message) => {
  const redirectUrl =
    `${getClientGoogleCallbackUrl()}?error=${encodeURIComponent(message)}`;
  return res.redirect(redirectUrl);
};

const normalizeEmail = (value = "") => value.toString().trim().toLowerCase();

const makeUsernameSeed = (value = "") => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 18);

  if (normalized.length >= 3) return normalized;
  return `user${normalized}`.slice(0, 18);
};

const generateUniqueUsername = async (seedValue) => {
  const base = makeUsernameSeed(seedValue);

  let counter = 0;
  while (counter < 1000) {
    const suffix = counter === 0 ? "" : `${counter}`;
    const candidate = `${base}${suffix}`.slice(0, 30);
    const existed = await User.findOne({ username: candidate }).select("_id");
    if (!existed) return candidate;
    counter += 1;
  }

  return `user${Date.now().toString().slice(-8)}`;
};

const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email hoac ten nguoi dung da ton tai",
      });
    }

    const user = await User.create({
      username,
      email: normalizedEmail,
      password,
    });
    const token = user.getSignedToken();

    res.status(201).json({
      success: true,
      message: "Dang ky thanh cong",
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        nickname: user.nickname,
        bio: user.bio,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email hoac ten nguoi dung da ton tai",
      });
    }
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui long nhap email va mat khau",
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email hoac mat khau khong dung",
      });
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "Tai khoan nay chua dat mat khau. Hay dang nhap bang Google hoac dat mat khau moi.",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Email hoac mat khau khong dung",
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: "Tai khoan cua ban da bi khoa",
      });
    }

    const token = user.getSignedToken();
    const uploadCount = await Song.countDocuments({ uploadedBy: user._id });
    const favoriteCount = user.favorites?.length || 0;

    res.status(200).json({
      success: true,
      message: "Dang nhap thanh cong",
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        nickname: user.nickname,
        bio: user.bio,
        role: user.role,
        favorites: user.favorites,
        uploadCount,
        favoriteCount,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("favorites");

    const uploadCount = await Song.countDocuments({ uploadedBy: req.user._id });
    const favoriteCount = user.favorites?.length || 0;

    res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        uploadCount,
        favoriteCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    if (!user?.password) {
      return res.status(400).json({
        success: false,
        message: "Tai khoan nay chua co mat khau hien tai de thay doi.",
      });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Mat khau hien tai khong dung",
      });
    }

    user.password = newPassword;
    await user.save();

    const token = user.getSignedToken();
    res.status(200).json({
      success: true,
      message: "Doi mat khau thanh cong",
      data: { token },
    });
  } catch (error) {
    next(error);
  }
};

const googleLogin = async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Google OAuth chua duoc cau hinh tren server",
      });
    }

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: getGoogleCallbackUrl(),
      response_type: "code",
      scope: "openid email profile",
      prompt: "select_account",
      access_type: "offline",
    });

    return res.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Khong the bat dau dang nhap Google",
    });
  }
};

const googleCallback = async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return redirectGoogleError(res, "Ban da huy dang nhap bang Google");
  }

  if (!code) {
    return redirectGoogleError(res, "Khong nhan duoc ma xac thuc tu Google");
  }

  try {
    const tokenBody = new URLSearchParams({
      code: String(code),
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: getGoogleCallbackUrl(),
      grant_type: "authorization_code",
    });

    const tokenRes = await axios.post(
      "https://oauth2.googleapis.com/token",
      tokenBody.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const accessToken = tokenRes?.data?.access_token;
    if (!accessToken) {
      return redirectGoogleError(res, "Khong lay duoc access token tu Google");
    }

    const profileRes = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const profile = profileRes?.data || {};
    const email = profile?.email?.toLowerCase?.();
    const googleId = profile?.id;
    const avatar = profile?.picture || "";
    const name = profile?.name || "";
    const isEmailVerified = profile?.verified_email !== false;

    if (!email || !isEmailVerified) {
      return redirectGoogleError(res, "Email Google khong hop le hoac chua xac minh");
    }

    let user = await User.findOne({ email });

    if (user?.isBanned) {
      return redirectGoogleError(res, "Tai khoan cua ban da bi khoa");
    }

    if (!user) {
      const username = await generateUniqueUsername(name || email.split("@")[0]);
      const randomPassword = crypto.randomBytes(24).toString("hex");

      user = await User.create({
        username,
        email,
        password: randomPassword,
        googleId: googleId || null,
        avatar,
      });
    } else {
      let shouldSave = false;

      if (!user.googleId && googleId) {
        user.googleId = googleId;
        shouldSave = true;
      }

      if (!user.avatar && avatar) {
        user.avatar = avatar;
        shouldSave = true;
      }

      if (shouldSave) {
        await user.save();
      }
    }

    const token = user.getSignedToken();
    const redirectUrl =
      `${getClientGoogleCallbackUrl()}?token=${encodeURIComponent(token)}`;

    return res.redirect(redirectUrl);
  } catch (err) {
    return redirectGoogleError(res, "Dang nhap Google that bai, vui long thu lai");
  }
};

module.exports = {
  register,
  login,
  getMe,
  changePassword,
  googleLogin,
  googleCallback,
};
