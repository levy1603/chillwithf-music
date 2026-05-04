// src/utils/getAvatarURL.js
const API_BASE_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000")
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

const DEFAULT_AVATAR_SVG = encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'>" +
    "<circle cx='64' cy='64' r='64' fill='#e5e7eb'/>" +
    "<circle cx='64' cy='47' r='22' fill='#9ca3af'/>" +
    "<path d='M26 108c6-18 22-28 38-28s32 10 38 28' fill='#9ca3af'/>" +
  "</svg>",
);

export const DEFAULT_AVATAR_URL = `data:image/svg+xml;charset=UTF-8,${DEFAULT_AVATAR_SVG}`;

const getAvatarFallback = (_size, _seed) => {
  return DEFAULT_AVATAR_URL;
};

const getAvatarURL = (avatar, size = 40, seed) => {
  if (typeof avatar !== "string" || !avatar.trim()) {
    return getAvatarFallback(size, seed);
  }

  const normalizedAvatar = avatar.trim();

  if (
    normalizedAvatar.startsWith("http://") ||
    normalizedAvatar.startsWith("https://") ||
    normalizedAvatar.startsWith("data:") ||
    normalizedAvatar.startsWith("blob:")
  ) {
    return normalizedAvatar;
  }

  if (normalizedAvatar.startsWith("/")) {
    return `${API_BASE_URL}${normalizedAvatar}`;
  }

  return `${API_BASE_URL}/${normalizedAvatar}`;
};

export default getAvatarURL;
