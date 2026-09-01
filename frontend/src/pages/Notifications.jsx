import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);

  function refresh() {
    api.getNotifications().then((r) => setNotifications(r.notifications));
  }
  useEffect(refresh, []);

  async function markRead(id) {
    await api.markNotificationRead(id);
    refresh();
  }
  async function remove(id) {
    await api.deleteNotification(id);
    refresh();
  }

  return (
    <div>
      <h1 className="page-title">Notifications</h1>
      <p className="page-sub">Booking confirmations, maintenance alerts, and facility updates relevant to you.</p>

      {notifications.length === 0 && <p className="empty-state">No notifications yet.</p>}

      {notifications.map((n) => (
        <div key={n.notification_id} className="card" style={{ marginBottom: "0.6rem", opacity: n.read ? 0.6 : 1 }}>
          <span className={`badge ${n.type.includes("alert") ? "high" : "active"}`}>{n.type.replace("_", " ")}</span>
          <p style={{ margin: "0.5rem 0" }}>{n.message}</p>
          <p style={{ fontSize: "0.75rem", color: "#5b6472", margin: "0 0 0.5rem" }}>
            {new Date(n.created_at).toLocaleString()}
          </p>
          <div>
            {!n.read && <button className="btn-primary" onClick={() => markRead(n.notification_id)}>Mark read</button>}{" "}
            <button className="btn-primary" style={{ background: "#5b6472" }} onClick={() => remove(n.notification_id)}>Dismiss</button>
          </div>
        </div>
      ))}
    </div>
  );
}
