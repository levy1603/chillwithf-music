// components/admin/AdminUsers.js
import React, { useEffect, useMemo, useState } from "react";
import {
  FaSearch,
  FaTrash,
  FaUserShield,
  FaUser,
  FaBan,
  FaUnlock,
} from "react-icons/fa";
import ConfirmModal from "../common/ConfirmModal";
import ToastMessage from "../common/ToastMessage";
import getAvatarURL from "../../utils/getAvatarURL";
import "../../styles/components/admin/AdminUsers.css";

const INITIAL_TOAST = {
  open: false,
  type: "info",
  message: "",
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [toast, setToast] = useState(INITIAL_TOAST);

  const showToast = (type, message) => {
    setToast({ open: true, type, message });
  };

  const closeToast = () => {
    setToast(INITIAL_TOAST);
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setUsers(data.data);
      } else {
        showToast("error", data.message || "Khong the tai danh sach nguoi dung.");
      }
    } catch (error) {
      console.error("Loi lay users:", error);
      showToast("error", "Khong the tai danh sach nguoi dung.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filtered = useMemo(
    () =>
      users.filter(
        (user) =>
          user.username.toLowerCase().includes(search.toLowerCase()) ||
          user.email.toLowerCase().includes(search.toLowerCase())
      ),
    [users, search]
  );

  const openDeleteConfirm = (user) => {
    setConfirmState({
      type: "delete",
      userId: user._id,
      title: "Xoa nguoi dung",
      message: `Ban co chac muon xoa tai khoan "${user.username}"?`,
      confirmText: "Xoa tai khoan",
      confirmVariant: "danger",
    });
  };

  const openRoleConfirm = (user) => {
    const nextRole = user.role === "admin" ? "user" : "admin";

    setConfirmState({
      type: "role",
      userId: user._id,
      currentRole: user.role,
      nextRole,
      title: nextRole === "admin" ? "Cap quyen admin" : "Thu hoi quyen admin",
      message:
        nextRole === "admin"
          ? `Cap quyen admin cho "${user.username}"?`
          : `Thu hoi quyen admin cua "${user.username}"?`,
      confirmText: nextRole === "admin" ? "Cap quyen" : "Thu hoi",
      confirmVariant: "primary",
    });
  };

  const openBanConfirm = (user) => {
    setConfirmState({
      type: "ban",
      userId: user._id,
      isBanned: user.isBanned,
      title: user.isBanned ? "Mo khoa tai khoan" : "Khoa tai khoan",
      message: user.isBanned
        ? `Mo khoa tai khoan "${user.username}"?`
        : `Khoa tai khoan "${user.username}"?`,
      confirmText: user.isBanned ? "Mo khoa" : "Khoa tai khoan",
      confirmVariant: user.isBanned ? "primary" : "danger",
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmState) return;

    const token = localStorage.getItem("token");
    const { type, userId, nextRole, currentRole, isBanned } = confirmState;

    setActionLoading(userId);

    try {
      if (type === "delete") {
        const res = await fetch(`/api/users/${userId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.message || "Khong the xoa nguoi dung.");
        }

        setUsers((prev) => prev.filter((user) => user._id !== userId));
        showToast("success", data.message || "Da xoa nguoi dung.");
      }

      if (type === "role") {
        const res = await fetch(`/api/users/${userId}/role`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: nextRole }),
        });
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.message || "Khong the cap nhat quyen.");
        }

        setUsers((prev) =>
          prev.map((user) =>
            user._id === userId ? { ...user, role: nextRole } : user
          )
        );
        showToast(
          "success",
          nextRole === "admin"
            ? "Da cap quyen admin."
            : currentRole === "admin"
            ? "Da thu hoi quyen admin."
            : "Da cap nhat quyen."
        );
      }

      if (type === "ban") {
        const res = await fetch(`/api/users/${userId}/ban`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.message || "Khong the cap nhat trang thai tai khoan.");
        }

        setUsers((prev) =>
          prev.map((user) =>
            user._id === userId ? { ...user, isBanned: !isBanned } : user
          )
        );
        showToast(
          "success",
          isBanned ? "Da mo khoa tai khoan." : "Da khoa tai khoan."
        );
      }

      setConfirmState(null);
    } catch (error) {
      console.error("Loi xu ly user:", error);
      showToast("error", error.message || "Co loi xay ra.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner" />
        <p>Dang tai...</p>
      </div>
    );
  }

  return (
    <>
      <div className="admin-users">
        <div className="admin-search">
          <FaSearch />
          <input
            type="text"
            placeholder="Tim ten, email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <span>{filtered.length} nguoi dung</span>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nguoi dung</th>
              <th>Email</th>
              <th>Role</th>
              <th>Bai hat</th>
              <th>Trang thai</th>
              <th>Hanh dong</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user, index) => {
              const isBusy = actionLoading === user._id;
              const avatarSeed = user._id || user.email || user.username;
              const avatarURL = getAvatarURL(user.avatar, 32, avatarSeed);
              const fallbackAvatarURL = getAvatarURL(null, 32, avatarSeed);

              return (
                <tr key={user._id} className={user.isBanned ? "banned-row" : ""}>
                  <td>{index + 1}</td>
                  <td>
                    <div className="user-cell">
                      <img
                        src={avatarURL}
                        alt={user.username}
                        onError={(event) => {
                          event.currentTarget.src = fallbackAvatarURL;
                        }}
                      />
                      <span>{user.username}</span>
                    </div>
                  </td>

                  <td>{user.email}</td>

                  <td>
                    <span className={`role-badge ${user.role}`}>
                      {user.role === "admin" ? <FaUserShield /> : <FaUser />}
                      {user.role}
                    </span>
                  </td>

                  <td>{user.uploadCount || 0}</td>

                  <td>
                    <span
                      className={`status-badge ${
                        user.isBanned ? "banned" : "active"
                      }`}
                    >
                      {user.isBanned ? "Da khoa" : "Hoat dong"}
                    </span>
                  </td>

                  <td>
                    <div className="action-btns">
                      <button
                        className={`btn-action ${
                          user.isBanned ? "btn-unban" : "btn-ban"
                        }`}
                        onClick={() => openBanConfirm(user)}
                        title={user.isBanned ? "Mo khoa" : "Khoa tai khoan"}
                        disabled={user.role === "admin" || isBusy}
                      >
                        {user.isBanned ? <FaUnlock /> : <FaBan />}
                      </button>

                      <button
                        className={`btn-action ${
                          user.role === "admin" ? "btn-demote" : "btn-promote"
                        }`}
                        onClick={() => openRoleConfirm(user)}
                        title={user.role === "admin" ? "Thu hoi admin" : "Cap admin"}
                        disabled={isBusy}
                      >
                        <FaUserShield />
                      </button>

                      <button
                        className="btn-action btn-delete"
                        onClick={() => openDeleteConfirm(user)}
                        title="Xoa tai khoan"
                        disabled={user.role === "admin" || isBusy}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={Boolean(confirmState)}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmText={confirmState?.confirmText}
        cancelText="Huy"
        confirmVariant={confirmState?.confirmVariant}
        loading={actionLoading === confirmState?.userId}
        onConfirm={handleConfirmAction}
        onClose={() => {
          if (!actionLoading) setConfirmState(null);
        }}
      />

      <ToastMessage
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={closeToast}
      />
    </>
  );
};

export default AdminUsers;
