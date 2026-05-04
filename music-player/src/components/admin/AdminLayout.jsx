// src/components/admin/AdminLayout.js
import React, { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader  from "./AdminHeader";
import "../../styles/components/admin/AdminLayout.css";

const AdminLayout = ({
  children,
  activeTab,
  setActiveTab,
  onNavigateToSong, 
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="admin-layout">

      {/* ── SIDEBAR ── */}
      <AdminSidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* ── MAIN ── */}
      <div className={`admin-main ${collapsed ? "collapsed" : ""}`}>

        {/* Header - truyền callback xuống */}
        <AdminHeader
          activeTab={activeTab}
          onNavigateToSong={onNavigateToSong} 
        />

        {/* Content */}
        <div className="admin-body">
          {children}
        </div>

      </div>
    </div>
  );
};

export default AdminLayout;