// src/pages/Favorites.js
import React, { useEffect, useState, useCallback } from "react";
import SongList from "../components/SongList";
import userAPI from "../api/userAPI";
import "../styles/pages/Favorites.css";

const Favorites = () => {
  const [favoriteSongs, setFavoriteSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFavorites = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await userAPI.getFavorites();
      setFavoriteSongs(response.data || []);
    } catch (err) {
      console.error("Lỗi tải bài hát yêu thích:", err);
      setError(err.message || "Không thể tải danh sách bài hát yêu thích");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  if (loading) {
    return (
      <div className="page-content">
        <div className="favorites-loading">
          <div className="favorites-spinner" />
          <p>Đang tải bài hát yêu thích...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="favorites-error">
          <p>{error}</p>
          <button type="button" onClick={fetchFavorites}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (favoriteSongs.length === 0) {
    return (
      <div className="page-content">
        <div className="favorites-empty">
          <div className="favorites-empty-icon">❤️</div>
          <h3>Chưa có bài hát yêu thích</h3>
          <p>Hãy thêm những bài hát bạn thích để nghe lại dễ dàng hơn.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <SongList
        songs={favoriteSongs}
        title="❤️ Bài Hát Yêu Thích"
        source="favorites"
        queue={favoriteSongs}
      />
    </div>
  );
};

export default Favorites;