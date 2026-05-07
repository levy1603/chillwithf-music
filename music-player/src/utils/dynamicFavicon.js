// src/utils/dynamicFavicon.js

export const setFaviconWithStatus = (coverUrl, isPlaying) => {
  const canvas  = document.createElement("canvas");
  canvas.width  = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");

  const img    = new Image();
  img.crossOrigin = "anonymous";

  img.onload = () => {
    ctx.clearRect(0, 0, 32, 32);
    ctx.save();
    ctx.beginPath();
    ctx.arc(16, 16, 15, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, 0, 0, 32, 32);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(16, 16, 15, 0, Math.PI * 2);
    ctx.strokeStyle = isPlaying ? "#1db954" : "#999999";
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(25, 25, 6, 0, Math.PI * 2);
    ctx.fillStyle = isPlaying ? "#1db954" : "#999999";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    if (isPlaying) {
      ctx.fillRect(22, 22, 2.5, 6);
      ctx.fillRect(26, 22, 2.5, 6);
    } else {
      ctx.beginPath();
      ctx.moveTo(23, 22);
      ctx.lineTo(23, 28);
      ctx.lineTo(29, 25);
      ctx.closePath();
      ctx.fill();
    }

    updateFavicon(canvas.toDataURL("image/png"));
  };

  img.onerror = () => resetFavicon();
  img.src     = coverUrl;
};

const updateFavicon = (dataUrl) => {
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link      = document.createElement("link");
    link.rel  = "icon";
    link.type = "image/png";
    document.head.appendChild(link);
  }
  link.href = dataUrl;
};

export const resetFavicon = () => {
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link     = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = "/logo.gif";
};

export const setPageTitle = (songTitle, artistName, isPlaying) => {
  if (!songTitle) {
    document.title = "ChillWithF 🎵";
    return;
  }
  const icon     = isPlaying ? "▶" : "⏸";
  document.title = `${icon} ${songTitle} — ${artistName} | ChillWithF`;
};