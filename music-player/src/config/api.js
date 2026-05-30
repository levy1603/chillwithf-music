const API_ORIGIN =
  process.env.REACT_APP_API_URL || window.location.origin;

const API_BASE_URL = `${API_ORIGIN}/api`;

const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

export { API_ORIGIN, API_BASE_URL, SOCKET_URL };
