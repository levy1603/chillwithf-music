// components/AuthLayout.js
import React from "react";
import {
  FaMusic,
  FaCompactDisc,
  FaHeadphones,
  FaWaveSquare,
  FaHeart,
  FaPlay,
} from "react-icons/fa";
import "../styles/components/Auth.css";

const AuthLayout = ({
  badgeIcon,
  badgeText,
  title,
  description,
  features = [],
  children,
  mode = "login",
}) => {
  const BadgeIcon = badgeIcon || FaMusic;

  return (
    <div className={`auth-page auth-page-${mode}`}>
      <div className="auth-shell">
        <div className="auth-showcase">
          <div className="auth-showcase-bg-orb orb-1" />
          <div className="auth-showcase-bg-orb orb-2" />
          <div className="auth-showcase-bg-orb orb-3" />

          <div className="auth-showcase-badge">
            <BadgeIcon />
            <span>{badgeText}</span>
          </div>

          <div className="auth-showcase-content auth-fade-slide">
            <h1>{title}</h1>
            <p>{description}</p>

            <div className="auth-waveform">
              {Array.from({ length: 20 }).map((_, index) => (
                <span
                  key={index}
                  className="auth-wave-bar"
                  style={{ animationDelay: `${index * 0.08}s` }}
                />
              ))}
            </div>

            <div className="auth-showcase-features">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div className="auth-feature-card" key={index}>
                    <Icon />
                    <span>{feature.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="auth-player-mockup auth-fade-up">
            <div className="auth-player-topline" />

            <div className="auth-player-card">
              <div className="auth-player-cover">
                <div className="auth-player-vinyl">
                  <FaCompactDisc />
                </div>
              </div>

              <div className="auth-player-info">
                <span className="auth-player-song">Night Echoes</span>
                <span className="auth-player-artist">Luna Phase • Chillwave</span>

                <div className="auth-player-progress">
                  <span>1:24</span>
                  <div className="auth-player-progress-bar">
                    <div className="auth-player-progress-fill" />
                  </div>
                  <span>3:48</span>
                </div>
              </div>

              <div className="auth-player-controls">
                <button type="button"><FaHeart /></button>
                <button type="button" className="auth-player-play">
                  <FaPlay />
                </button>
                <button type="button"><FaWaveSquare /></button>
              </div>
            </div>

            <div className="auth-floating-cards">
              <div className="auth-floating-card">
                <FaHeadphones />
                <span>Playlist theo cảm xúc</span>
              </div>
              <div className="auth-floating-card">
                <FaHeart />
                <span>Lưu bài hát yêu thích</span>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-form-column">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;