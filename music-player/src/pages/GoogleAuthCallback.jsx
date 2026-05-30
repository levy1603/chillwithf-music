import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FaCheckCircle, FaExclamationTriangle, FaSpinner } from "react-icons/fa";
import authAPI from "../api/authAPI";
import "../styles/components/Auth.css";

const GoogleAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Dang xu ly dang nhap bang Google...");

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      const token = searchParams.get("token");
      const error = searchParams.get("error");

      if (error) {
        if (!mounted) return;
        setStatus("error");
        setMessage(error);
        return;
      }

      if (!token) {
        if (!mounted) return;
        setStatus("error");
        setMessage("Khong nhan duoc token dang nhap tu Google.");
        return;
      }

      localStorage.setItem("token", token);

      try {
        const meRes = await authAPI.getMe();
        const userData = meRes?.data || meRes;
        localStorage.setItem("user", JSON.stringify(userData));

        if (!mounted) return;
        setStatus("success");
        setMessage("Dang nhap Google thanh cong. Dang chuyen ve trang chu...");

        setTimeout(() => {
          window.location.replace("/");
        }, 600);
      } catch (e) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        if (!mounted) return;
        setStatus("error");
        setMessage("Dang nhap Google that bai. Vui long thu lai.");
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [searchParams]);

  return (
    <div className="auth-page auth-page-login">
      <div className="auth-callback-wrap">
        <div className="auth-callback-card">
          {status === "loading" && (
            <div className="auth-callback-icon is-loading">
              <FaSpinner className="spinner" />
            </div>
          )}
          {status === "success" && (
            <div className="auth-callback-icon is-success">
              <FaCheckCircle />
            </div>
          )}
          {status === "error" && (
            <div className="auth-callback-icon is-error">
              <FaExclamationTriangle />
            </div>
          )}

          <h2>Xac thuc Google</h2>
          <p>{message}</p>

          {status === "error" && (
            <div className="auth-callback-actions">
              <Link to="/login">Quay lai dang nhap</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;
