// src/components/SleepTimerPanel.js
import React from "react";
import { FaClock, FaTimes, FaPlay, FaStop } from "react-icons/fa";
import "../styles/components/SleepTimerPanel.css";

const PRESETS = [5, 10, 15, 20, 30, 45, 60, 90];

const SleepTimerPanel = ({
  timerActive,
  timerMinutes,
  timeRemaining,
  formatRemaining,
  onSetMinutes,
  onStart,
  onStop,
  onClose,
}) => {
  return (
    <div className="sleep-timer-panel">

      {/* Header */}
      <div className="sleep-timer-header">
        <div className="sleep-timer-title">
          <FaClock />
          <span>Hẹn giờ tắt nhạc</span>
        </div>
        <button className="sleep-timer-close" onClick={onClose}>
          <FaTimes />
        </button>
      </div>

      {/* Countdown khi đang chạy */}
      {timerActive && (
        <div className="sleep-timer-countdown">
          <div className="countdown-circle">
            <span className="countdown-time">
              {formatRemaining(timeRemaining)}
            </span>
            <span className="countdown-label">còn lại</span>
          </div>
          <p className="countdown-desc">
            Nhạc sẽ tắt sau <strong>{formatRemaining(timeRemaining)}</strong>
          </p>
        </div>
      )}

      {/* Chọn thời gian khi chưa chạy */}
      {!timerActive && (
        <>
          {/* Presets */}
          <div className="sleep-timer-presets">
            {PRESETS.map((min) => (
              <button
                key={min}
                className={`preset-btn ${timerMinutes === min ? "active" : ""}`}
                onClick={() => onSetMinutes(min)}
              >
                {min < 60 ? `${min} phút` : `${min / 60} giờ`}
              </button>
            ))}
          </div>

          {/* Custom */}
          <div className="sleep-timer-custom">
            <label>Tùy chỉnh</label>
            <div className="custom-input-row">
              <button
                className="custom-adjust-btn"
                onClick={() => onSetMinutes(Math.max(1, timerMinutes - 5))}
              >
                −
              </button>
              <input
                type="number"
                min="1"
                max="180"
                value={timerMinutes}
                onChange={(e) => {
                  const val = Math.min(180, Math.max(1, Number(e.target.value)));
                  onSetMinutes(val);
                }}
              />
              <button
                className="custom-adjust-btn"
                onClick={() => onSetMinutes(Math.min(180, timerMinutes + 5))}
              >
                +
              </button>
              <span className="custom-unit">phút</span>
            </div>
          </div>
        </>
      )}

      {/* Divider */}
      <div className="timer-divider" />

      {/* Actions */}
      <div className="sleep-timer-actions">
        {timerActive ? (
          <>
            <button className="timer-action-btn cancel-btn" onClick={onStop}>
              <FaStop /> Hủy
            </button>
            <button
              className="timer-action-btn restart-btn"
              onClick={() => onStart(timerMinutes)}
            >
              <FaPlay /> Đặt lại
            </button>
          </>
        ) : (
          <button
            className="timer-action-btn start-btn"
            onClick={() => onStart(timerMinutes)}
          >
            <FaPlay /> Bắt đầu hẹn giờ
          </button>
        )}
      </div>

    </div>
  );
};

export default SleepTimerPanel;