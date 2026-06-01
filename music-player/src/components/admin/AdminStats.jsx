// src/components/admin/AdminStats.js
import React, { useEffect, useState } from "react";
import {
  FaUsers, FaMusic, FaHeadphones, FaUserShield,
  FaChartLine, FaChartBar,
} from "react-icons/fa";
import {
  LineChart, Line,
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { API_BASE_URL } from "../../config/api";
import "../../styles/components/admin/AdminStats.css";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: <strong>{entry.value.toLocaleString()}</strong>
        </p>
      ))}
    </div>
  );
};

const CustomDayTick = ({ x, y, payload }) => {
  const parts = payload.value.split("\n");
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="middle" fill="#555" fontSize={13} fontWeight={600}>
        {parts[0]}
      </text>
      <text x={0} y={0} dy={28} textAnchor="middle" fill="#aaa" fontSize={11}>
        {parts[1]}
      </text>
    </g>
  );
};

const AdminStats = () => {
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [chartType, setChartType] = useState("bar");
  const [dataKey, setDataKey]     = useState("plays");
  const [timeRange, setTimeRange] = useState("weekly"); 

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const res   = await fetch(`${API_BASE_URL}/users/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setStats(data.data);
      } catch (err) {
        console.error("Lỗi lấy thống kê:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return (
    <div className="admin-loading">
      <div className="spinner" />
      <p>Đang tải thống kê...</p>
    </div>
  );

  if (!stats) return (
    <div className="admin-empty"><p>Không thể tải thống kê</p></div>
  );

  const statCards = [
    { icon: <FaUsers />,      label: "Tổng người dùng", value: stats.totalUsers,  color: "#3498db" },
    { icon: <FaMusic />,      label: "Tổng bài hát",    value: stats.totalSongs,  color: "#1db954" },
    { icon: <FaHeadphones />, label: "Tổng lượt nghe",  value: stats.totalPlays,  color: "#e67e22" },
    { icon: <FaUserShield />, label: "Số Admin",         value: stats.totalAdmins, color: "#9b59b6" },
  ];

  const dataOptions = [
    { key: "plays", label: "Lượt nghe",      color: "#e67e22" },
    { key: "songs", label: "Bài hát mới",    color: "#1db954" },
    { key: "users", label: "Người dùng mới", color: "#3498db" },
  ];

  const activeOption = dataOptions.find((d) => d.key === dataKey);
  const chartData = timeRange === "weekly"
    ? stats.dailyStats
    : stats.monthlyStats;

  const xAxisKey = timeRange === "weekly" ? "day" : "month";

  return (
    <div className="admin-stats">

      {/* ===== STAT CARDS ===== */}
      <div className="stats-grid">
        {statCards.map((card, i) => (
          <div key={i} className="stat-card" style={{ "--card-color": card.color }}>
            <div className="stat-icon">{card.icon}</div>
            <div className="stat-info">
              <h3>{card.value?.toLocaleString()}</h3>
              <p>{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ===== BIỂU ĐỒ ===== */}
      <div className="stats-section">
        <div className="chart-header">
          <h3>📊 Thống kê</h3>

          <div className="chart-controls">

            {/* Toggle Tuần / Tháng */}
            <div className="chart-time-toggle">
              <button
                className={`chart-time-btn ${timeRange === "weekly" ? "active" : ""}`}
                onClick={() => setTimeRange("weekly")}
              >
                Tuần này
              </button>
              <button
                className={`chart-time-btn ${timeRange === "monthly" ? "active" : ""}`}
                onClick={() => setTimeRange("monthly")}
              >
                12 tháng
              </button>
            </div>

            {/* Chọn dữ liệu */}
            <div className="chart-data-tabs">
              {dataOptions.map((opt) => (
                <button
                  key={opt.key}
                  className={`chart-data-btn ${dataKey === opt.key ? "active" : ""}`}
                  style={{ "--btn-color": opt.color }}
                  onClick={() => setDataKey(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Chọn loại biểu đồ */}
            <div className="chart-type-toggle">
              <button
                className={`chart-type-btn ${chartType === "bar" ? "active" : ""}`}
                onClick={() => setChartType("bar")}
                title="Biểu đồ cột"
              >
                <FaChartBar />
              </button>
              <button
                className={`chart-type-btn ${chartType === "line" ? "active" : ""}`}
                onClick={() => setChartType("line")}
                title="Biểu đồ đường"
              >
                <FaChartLine />
              </button>
            </div>

          </div>
        </div>

        {/* Chart */}
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={340}>
            {chartType === "bar" ? (
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 20, left: 0, bottom: timeRange === "weekly" ? 20 : 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey={xAxisKey}
                  tick={timeRange === "weekly"
                    ? <CustomDayTick />
                    : { fontSize: 12, fill: "#999" }
                  }
                  axisLine={false}
                  tickLine={false}
                  height={timeRange === "weekly" ? 50 : 30}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#999" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey={dataKey}
                  name={activeOption?.label}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={52}
                >
                  {/* Highlight ngày hôm nay */}
                  {timeRange === "weekly" && chartData?.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.isToday ? activeOption?.color : `${activeOption?.color}66`}
                    />
                  ))}
                  {timeRange === "monthly" && (
                    <Cell fill={activeOption?.color} />
                  )}
                </Bar>
              </BarChart>
            ) : (
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 20, left: 0, bottom: timeRange === "weekly" ? 20 : 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey={xAxisKey}
                  tick={timeRange === "weekly"
                    ? <CustomDayTick />
                    : { fontSize: 12, fill: "#999" }
                  }
                  axisLine={false}
                  tickLine={false}
                  height={timeRange === "weekly" ? 50 : 30}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#999" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  name={activeOption?.label}
                  stroke={activeOption?.color}
                  strokeWidth={3}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    const isToday = timeRange === "weekly" && payload.isToday;
                    return (
                      <circle
                        key={`dot-${props.index}`}
                        cx={cx}
                        cy={cy}
                        r={isToday ? 7 : 5}
                        fill={activeOption?.color}
                        stroke={isToday ? "#fff" : "none"}
                        strokeWidth={isToday ? 2 : 0}
                      />
                    );
                  }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Chú thích ngày hôm nay */}
        {timeRange === "weekly" && (
          <div className="chart-legend">
            <span className="chart-legend-today" style={{ background: activeOption?.color }} />
            <span>Hôm nay</span>
            <span className="chart-legend-other" style={{ background: `${activeOption?.color}66` }} />
            <span>Các ngày khác</span>
          </div>
        )}

      </div>

      {/* ===== BÀI HÁT MỚI NHẤT ===== */}
      <div className="stats-section">
        <h3>🎵 Bài hát mới nhất</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Tên bài hát</th>
              <th>Nghệ sĩ</th>
              <th>Upload bởi</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentSongs.map((song, i) => (
              <tr key={song._id}>
                <td>{i + 1}</td>
                <td style={{ fontWeight: 500, color: "#1a1d23" }}>{song.title}</td>
                <td>{song.artist}</td>
                <td>{song.uploadedBy?.username || "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== USER MỚI NHẤT ===== */}
      <div className="stats-section">
        <h3>👤 Người dùng mới nhất</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Tên</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentUsers.map((user, i) => (
              <tr key={user._id}>
                <td>{i + 1}</td>
                <td style={{ fontWeight: 500, color: "#1a1d23" }}>{user.username}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge ${user.role}`}>{user.role}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default AdminStats;
