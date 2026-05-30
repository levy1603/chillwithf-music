import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { MusicProvider } from "./context/MusicContext";
import { NotificationProvider } from "./context/NotificationContext";

import Header from "./components/header/Header";
import Sidebar from "./components/Sidebar";
import MusicPlayer from "./components/MusicPlayer";

import Home from "./pages/Home";
import Favorites from "./pages/Favorites";
import Playlist from "./pages/Playlist";
import MyPlaylists from "./pages/MyPlaylists";
import Upload from "./pages/Upload";
import Login from "./pages/Login";
import Register from "./pages/Register";
import GoogleAuthCallback from "./pages/GoogleAuthCallback";
import SongDetail from "./pages/SongDetail";
import ProfilePage from "./pages/ProfilePage";
import SearchResults from "./pages/SearchResults";
import AdminPage from "./pages/admin/AdminPage";
import NotificationsPage from "./pages/NotificationsPage";
import RoomLobby from "./pages/RoomPage/RoomLobby";
import RoomDetail from "./pages/RoomPage/RoomDetail";
import usePageTitle from "./hooks/usePageTitle";
import "./App.css";

/* ═══════════════════════════════════════════
   SPLASH WRAPPER
   - Dùng useAuth để biết khi nào auth check xong
   - Kết hợp thời gian tối thiểu để splash không
     biến mất quá nhanh
═══════════════════════════════════════════ */
const SplashWrapper = ({ children }) => {
  const { loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [isHiding, setIsHiding] = useState(false);

  useEffect(() => {
    // Chờ auth check xong VÀ tối thiểu 2.5 giây
    if (!loading) {
      const timer = setTimeout(() => {
        // Bắt đầu fade out
        setIsHiding(true);

        const splash = document.getElementById("splash-screen");
        if (splash) {
          splash.classList.add("splash-hiding");

          // Xóa khỏi DOM sau khi transition kết thúc (0.6s)
          setTimeout(() => {
            setShowSplash(false);
            splash.remove();
          }, 600);
        } else {
          // Fallback nếu không tìm thấy element
          setTimeout(() => setShowSplash(false), 600);
        }
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [loading]);

  return <>{children}</>;
};

/* ═══════════════════════════════════════════
   ROUTE LOADING
═══════════════════════════════════════════ */
const RouteLoading = ({ message = "Đang tải..." }) => {
  return (
    <div className="route-loading">
      <div className="route-loading-card">
        <div className="route-loading-spinner" />
        <p>{message}</p>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   PRIVATE ROUTE
═══════════════════════════════════════════ */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <RouteLoading message="Đang kiểm tra đăng nhập..." />;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

/* ═══════════════════════════════════════════
   ADMIN ROUTE
═══════════════════════════════════════════ */
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <RouteLoading message="Đang kiểm tra quyền truy cập..." />;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== "admin") return <Navigate to="/" replace />;

  return children;
};

/* ═══════════════════════════════════════════
   MAIN LAYOUT
═══════════════════════════════════════════ */
const MainLayout = ({ children, showPlayer = true }) => {
  return (
    <>
      <Header />
      <div className="app-body">
        <Sidebar />
        <main className="main-content">{children}</main>
      </div>
      {showPlayer && <MusicPlayer />}
    </>
  );
};

/* ═══════════════════════════════════════════
   MUSIC APP ROUTES
═══════════════════════════════════════════ */
const MusicAppRoutes = () => {
  return (
    <MusicProvider>
      <Routes>
        {/* ── PUBLIC ── */}
        <Route
          path="/"
          element={
            <MainLayout>
              <Home />
            </MainLayout>
          }
        />
        <Route
          path="/song/:id"
          element={
            <MainLayout>
              <SongDetail />
            </MainLayout>
          }
        />
        <Route
          path="/search"
          element={
            <MainLayout>
              <SearchResults />
            </MainLayout>
          }
        />

        {/* ── PRIVATE ── */}
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <MainLayout>
                <ProfilePage />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/favorites"
          element={
            <PrivateRoute>
              <MainLayout>
                <Favorites />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/playlist"
          element={
            <PrivateRoute>
              <MainLayout>
                <Playlist />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/my-playlists"
          element={
            <PrivateRoute>
              <MainLayout>
                <MyPlaylists />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <PrivateRoute>
              <MainLayout>
                <Upload />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <PrivateRoute>
              <MainLayout>
                <NotificationsPage />
              </MainLayout>
            </PrivateRoute>
          }
        />

        {/* ── ADMIN ── */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route path="/rooms" element={<RoomLobby />} />
        <Route path="/rooms/:roomId" element={<RoomDetail />} />
        {/* ── 404 ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MusicProvider>
  );
};

/* ═══════════════════════════════════════════
   APP ROUTES
═══════════════════════════════════════════ */
function AppRoutes() {
  usePageTitle();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
      <Route path="/*" element={<MusicAppRoutes />} />
    </Routes>
  );
}

/* ═══════════════════════════════════════════
   APP
═══════════════════════════════════════════ */
function App() {
  return (
    <AuthProvider>
      <Router>
        <NotificationProvider>
          {/*
            SplashWrapper phải nằm trong AuthProvider
            để dùng được useAuth()
          */}
          <SplashWrapper>
            <div className="app">
              <AppRoutes />
            </div>
          </SplashWrapper>
        </NotificationProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
