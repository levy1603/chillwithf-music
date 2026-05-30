// components/LoginForm.js
import React, { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import {
  FaMusic,
  FaEnvelope,
  FaLock,
  FaSpinner,
  FaArrowRight,
  FaEye,
  FaEyeSlash,
  FaGoogle,
  FaHeadphones,
  FaCompactDisc,
  FaWaveSquare,
} from "react-icons/fa";
import AuthLayout from "./AuthLayout";
import "../styles/components/Auth.css";

const GOOGLE_AUTH_URL =
  `${process.env.REACT_APP_API_URL || window.location.origin}/api/auth/google`;

const LoginForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const errors = useMemo(() => {
    const nextErrors = {};

    if (!form.email.trim()) {
      nextErrors.email = "Vui lòng nhập email";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      nextErrors.email = "Email không hợp lệ";
    }

    if (!form.password.trim()) {
      nextErrors.password = "Vui lòng nhập mật khẩu";
    } else if (form.password.length < 6) {
      nextErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }

    return nextErrors;
  }, [form]);

  const isFormValid = Object.keys(errors).length === 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setSubmitError("");
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      email: true,
      password: true,
    });
    setSubmitError("");

    if (!isFormValid) return;

    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setSubmitError(err.message || "Email hoặc mật khẩu không đúng");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setSubmitError("");
    setGoogleLoading(true);
    window.location.assign(GOOGLE_AUTH_URL);
  };

  return (
    <AuthLayout
      mode="login"
      badgeIcon={FaHeadphones}
      badgeText="Không gian âm nhạc dành cho bạn"
      title="Đăng nhập để tiếp tục hành trình nghe nhạc"
      description="Lưu bài hát yêu thích, theo dõi playlist cá nhân và khám phá những giai điệu mới theo phong cách riêng của bạn."
      features={[
        { icon: FaCompactDisc, text: "Kho nhạc cá nhân" },
        { icon: FaMusic, text: "Playlist theo mood" },
        { icon: FaWaveSquare, text: "Trải nghiệm nghe mượt mà" },
      ]}
    >
      <div className="auth-card auth-card-animated auth-card-login">
        <div className="auth-card-glow" />

        <div className="auth-header">
          <div className="auth-logo-wrap">
            <FaMusic className="auth-logo" />
          </div>
          <h2>Chào mừng trở lại</h2>
          <p>Đăng nhập để tiếp tục nghe nhạc theo cách của bạn</p>
        </div>

        {submitError && <div className="auth-error">{submitError}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Email</label>
            <div
              className={`input-group ${
                touched.email && errors.email ? "has-error" : ""
              }`}
            >
              <FaEnvelope className="input-icon" />
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                onBlur={handleBlur}
                required
              />
            </div>
            {touched.email && errors.email && (
              <span className="field-error">{errors.email}</span>
            )}
          </div>

          <div className="auth-field">
            <label>Mật khẩu</label>
            <div
              className={`input-group has-action ${
                touched.password && errors.password ? "has-error" : ""
              }`}
            >
              <FaLock className="input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Nhập mật khẩu"
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {touched.password && errors.password && (
              <span className="field-error">{errors.password}</span>
            )}
          </div>

          <div className="auth-divider">
            <span>Hoặc</span>
          </div>

          <button
            type="button"
            className="auth-btn auth-btn-google"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <>
                <FaSpinner className="spinner" />
                <span>Đang chuyển đến Gmail...</span>
              </>
            ) : (
              <>
                <FaGoogle />
                <span>Tiếp tục với Gmail</span>
              </>
            )}
          </button>

          <button type="submit" className="auth-btn" disabled={loading || !isFormValid}>
            {loading ? (
              <>
                <FaSpinner className="spinner" />
                <span>Đang đăng nhập...</span>
              </>
            ) : (
              <>
                <span>Đăng nhập</span>
                <FaArrowRight />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer auth-switch-transition">
          <p>
            Chưa có tài khoản? <Link to="/register">Tạo tài khoản mới</Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default LoginForm;
