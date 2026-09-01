import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function AuditTrail() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.getAuditLogs().then((r) => setLogs(r.logs));
  }, []);

  return (
    <div>
      <h1 className="page-title">Administration — Audit Trail</h1>
      <p className="page-sub">Every login, booking, facility change, and maintenance update, in order — so decisions are always traceable.</p>

      <table>
        <thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Details</th></tr></thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.audit_id}>
              <td>{new Date(l.timestamp).toLocaleString()}</td>
              <td>{l.user_id}</td>
              <td>{l.role}</td>
              <td><span className="badge active">{l.action.replace(/_/g, " ")}</span></td>
              <td>{l.details}</td>
            </tr>
          ))}
          {logs.length === 0 && <tr><td colSpan="5" className="empty-state">No activity logged yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
