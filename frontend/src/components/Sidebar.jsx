import React from "react";
import { NavLink } from "react-router-dom";

// Navigation items, gated by which roles can see them.
// Mirrors the master spec's nav list: Dashboard, Facilities,
// Bookings, Genie, Utilisation, Maintenance, Analytics,
// Notifications, Administration.
const NAV_ITEMS = [
  { to: "/", label: "🏠 Dashboard", roles: ["admin", "faculty", "student", "lab_incharge", "maintenance", "operations", "guest"] },
  { to: "/facilities", label: "🔍 Facilities", roles: ["admin", "faculty", "student", "lab_incharge", "operations", "guest"] },
  { to: "/map", label: "🗺️ Campus Map", roles: ["admin", "faculty", "student", "lab_incharge", "operations", "guest"] },
  { to: "/analytics", label: "📊 Analytics", roles: ["admin", "faculty", "lab_incharge", "operations"] },
  { to: "/notifications", label: "🔔 Notifications", roles: ["admin", "faculty", "student", "lab_incharge", "maintenance", "operations", "guest"] },
  { to: "/admin", label: "⚙️ Administration", roles: ["admin"] }
];

export default function Sidebar({ user, onLogout }) {
  return (
    <aside className="sidebar">
      <h2>LabPulse</h2>
      <span className="role-badge">{user.role.replace("_", " ")}</span>
      <nav>
        {NAV_ITEMS.filter((item) => item.roles.includes(user.role)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({ background: isActive ? "rgba(255,255,255,0.12)" : "transparent" })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.15)" }}>
        <p style={{ color: "#cadcfc", fontSize: "0.85rem", margin: "0 0 0.3rem" }}>{user.name}</p>
        {user.department && <p style={{ color: "#9fd8cb", fontSize: "0.75rem", margin: "0 0 0.8rem" }}>{user.department}</p>}
        <button className="logout-btn" onClick={onLogout}>⎋ Log out</button>
      </div>
    </aside>
  );
}
