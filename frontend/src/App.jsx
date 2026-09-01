import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Sidebar from "./components/Sidebar";
import GenieFloatingButton from "./components/GenieFloatingButton";
import AdminDashboard from "./pages/AdminDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import LabInchargeDashboard from "./pages/LabInchargeDashboard";
import MaintenanceDashboard from "./pages/MaintenanceDashboard";
import OperationsDashboard from "./pages/OperationsDashboard";
import FacilityDiscovery from "./pages/FacilityDiscovery";
import CampusMap from "./pages/CampusMap";
import Analytics from "./pages/Analytics";
import Notifications from "./pages/Notifications";
import AuditTrail from "./pages/AuditTrail";
import { api } from "./api";

const ROLE_DASHBOARDS = {
  admin: AdminDashboard,
  faculty: FacultyDashboard,
  student: StudentDashboard,
  lab_incharge: LabInchargeDashboard,
  maintenance: MaintenanceDashboard,
  operations: OperationsDashboard,
  guest: StudentDashboard
};

const ANALYTICS_ROLES = ["admin", "faculty", "lab_incharge", "operations"];

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("labpulse_token");
    if (!token) { setLoading(false); return; }
    api.me()
      .then((r) => setUser(r.user))
      .catch(() => localStorage.removeItem("labpulse_token"))
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    localStorage.removeItem("labpulse_token");
    setUser(null);
  }

  if (loading) return null;
  if (!user) return <Login onLogin={setUser} />;

  const Dashboard = ROLE_DASHBOARDS[user.role] || (() => <p>No dashboard configured for this role.</p>);

  return (
    <div className="app-shell">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/facilities" element={<FacilityDiscovery user={user} />} />
          <Route path="/map" element={<CampusMap />} />
          <Route
            path="/analytics"
            element={ANALYTICS_ROLES.includes(user.role) ? <Analytics user={user} /> : <Navigate to="/" replace />}
          />
          <Route path="/notifications" element={<Notifications />} />
          <Route
            path="/admin"
            element={user.role === "admin" ? <AuditTrail /> : <Navigate to="/" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <GenieFloatingButton />
    </div>
  );
}
