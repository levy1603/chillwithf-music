// src/utils/lrcParser.js
export const parseLRC = (lrcText) => {
  if (!lrcText) return [];
  const lines = lrcText.split("\n");
  const timeTagRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;
  const result = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const text = trimmed.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, "").trim();
    if (!text) return;

    let match;
    timeTagRegex.lastIndex = 0;
    const matches = [];

    while ((match = timeTagRegex.exec(trimmed)) !== null) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const ms =
        match[3].length === 2
          ? parseInt(match[3]) * 10
          : parseInt(match[3]);
      matches.push(minutes * 60 + seconds + ms / 1000);
    }
    matches.forEach((time) => result.push({ time, text }));
  });

  return result.sort((a, b) => a.time - b.time);
};

export const generateLRC = (lines) => {
  return lines
    .filter((l) => l.text.trim())
    .sort((a, b) => a.time - b.time)
    .map((line) => {
      const minutes = Math.floor(line.time / 60);
      const seconds = Math.floor(line.time % 60);
      const ms = Math.round((line.time % 1) * 100);
      const tag = `[${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(ms).padStart(2, "0")}]`;
      return `${tag}${line.text}`;
    })
    .join("\n");
};

export const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return "00:00.00";
  const m  = Math.floor(seconds / 60);
  const s  = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 100);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
};

export const formatLRCTime = formatTime;

export const getCurrentLineIndex = (lines, currentTime) => {
  if (!lines || lines.length === 0) return -1;
  let index = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= currentTime) index = i;
    else break;
  }

  if (index <= 0) return index;

  // If many lines share the same timestamp, keep the first one.
  // This prevents jumping straight to the last duplicated line.
  const activeTime = lines[index].time;
  while (index > 0 && lines[index - 1].time === activeTime) {
    index -= 1;
  }

  return index;
};
