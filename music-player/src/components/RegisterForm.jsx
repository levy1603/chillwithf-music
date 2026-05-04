// components/RegisterForm.js
import React, { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import {
  FaMusic,
  FaUser,
  FaEnvelope,
  FaLock,
  FaSpinner,
  FaArrowRight,
  FaEye,
  FaEyeSlash,
  FaHeadphones,
  FaCompactDisc,
  FaWaveSquare,
  FaCheckCircle,
} from "react-icons/fa";
import AuthLayout from "./AuthLayout";
import "../styles/components/Auth.css";

const RegisterForm = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [touched, setTouched] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const errors = useMemo(() => {
    const nextErrors = {};

    if (!form.username.trim()) {
      nextErrors.username = "Vui lòng nhập tên người dùng";
    } else if (form.username.trim().length < 2) {
      nextErrors.username = "Tên người dùng phải có ít nhất 2 ký tự";
    }

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

    if (!form.confirmPassword.trim()) {
      nextErrors.confirmPassword = "Vui lòng xác nhận mật khẩu";
    } else if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
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
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    setSubmitError("");

    if (!isFormValid) return;

    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      setRegisterSuccess(true);

      setTimeout(() => {
        navigate("/");
      }, 1600);
    } catch (err) {
      setSubmitError(err.message || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      mode="register"
      badgeIcon={FaHeadphones}
      badgeText="Tạo không gian nghe nhạc của riêng bạn"
      title="Bắt đầu hành trình âm nhạc mới"
      description="Tạo tài khoản để lưu bài hát yêu thích, xây dựng playlist cá nhân và khám phá thế giới âm thanh theo cảm xúc của riêng bạn."
      features={[
        { icon: FaCompactDisc, text: "Lưu bài hát yêu thích" },
        { icon: FaMusic, text: "Tạo playlist cá nhân" },
        { icon: FaWaveSquare, text: "Khám phá theo mood" },
      ]}
    >
      <div className="auth-card auth-card-animated auth-card-register">
        <div className="auth-card-glow" />

        {registerSuccess ? (
          <div className="auth-success-state">
            <div className="auth-success-icon">
              <FaCheckCircle />
            </div>
            <h2>Đăng ký thành công!</h2>
            <p>
              Tài khoản của bạn đã được tạo. Đang đưa bạn đến không gian âm nhạc...
            </p>
            <div className="auth-success-loader">
              <span />
            </div>
          </div>
        ) : (
          <>
            <div className="auth-header">
              <div className="auth-logo-wrap">
                <FaMusic className="auth-logo" />
              </div>
              <h2>Tạo tài khoản mới</h2>
              <p>Tham gia ngay để mở khóa trải nghiệm âm nhạc cá nhân hóa</p>
            </div>

            {submitError && <div className="auth-error">{submitError}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label>Tên người dùng</label>
                <div
                  className={`input-group ${
                    touched.username && errors.username ? "has-error" : ""
                  }`}
                >
                  <FaUser className="input-icon" />
                  <input
                    type="text"
                    name="username"
                    placeholder="Tên người dùng"
                    value={form.username}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                  />
                </div>
                {touched.username && errors.username && (
                  <span className="field-error">{errors.username}</span>
                )}
              </div>

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
                    placeholder="Tối thiểu 6 ký tự"
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

              <div className="auth-field">
                <label>Xác nhận mật khẩu</label>
                <div
                  className={`input-group has-action ${
                    touched.confirmPassword && errors.confirmPassword ? "has-error" : ""
                  }`}
                >
                  <FaLock className="input-icon" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Nhập lại mật khẩu"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={
                      showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"
                    }
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {touched.confirmPassword && errors.confirmPassword && (
                  <span className="field-error">{errors.confirmPassword}</span>
                )}
              </div>

              <button type="submit" className="auth-btn" disabled={loading || !isFormValid}>
                {loading ? (
                  <>
                    <FaSpinner className="spinner" />
                    <span>Đang tạo tài khoản...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng ký</span>
                    <FaArrowRight />
                  </>
                )}
              </button>
            </form>

            <div className="auth-footer auth-switch-transition">
              <p>
                Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
              </p>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
};

export default RegisterForm;