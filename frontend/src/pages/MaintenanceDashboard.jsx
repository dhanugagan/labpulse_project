import React, { useEffect, useState } from "react";
import { api } from "../api";
import GenieChat from "../components/GenieChat";

export default function MaintenanceDashboard() {
  const [tickets, setTickets] = useState([]);
  const [facilities, setFacilities] = useState([]);

  function refresh() {
    api.getMaintenance().then((r) => setTickets(r.tickets));
    api.getFacilities().then((r) => setFacilities(r.facilities));
  }
  useEffect(refresh, []);

  async function updateStatus(id, status) {
    await api.updateMaintenance(id, { status });
    refresh();
  }

  const open = tickets.filter((t) => t.status === "open").length;
  const inProgress = tickets.filter((t) => t.status === "in_progress").length;

  return (
    <div>
      <h1 className="page-title">Maintenance Queue</h1>
      <p className="page-sub">All reported equipment and facility issues across campus.</p>

      <div className="card-grid">
        <div className="card"><div className="stat">{open}</div><div className="stat-label">Open tickets</div></div>
        <div className="card"><div className="stat">{inProgress}</div><div className="stat-label">In progress</div></div>
        <div className="card"><div className="stat">{tickets.filter((t) => t.status === "resolved").length}</div><div className="stat-label">Resolved</div></div>
      </div>

      <h2 className="section-title">Ticket Queue</h2>
      <table>
        <thead><tr><th>Facility</th><th>Issue</th><th>Severity</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.ticket_id}>
              <td>{facilities.find((f) => f.facility_id === t.facility_id)?.name || t.facility_id}</td>
              <td>{t.issue}</td>
              <td><span className={`badge ${t.severity}`}>{t.severity}</span></td>
              <td><span className={`badge ${t.status}`}>{t.status}</span></td>
              <td>
                {t.status !== "resolved" && (
                  <>
                    {t.status === "open" && (
                      <button className="btn-primary" onClick={() => updateStatus(t.ticket_id, "in_progress")}>
                        Start
                      </button>
                    )}{" "}
                    <button className="btn-primary" onClick={() => updateStatus(t.ticket_id, "resolved")}>
                      Resolve
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <GenieChat suggestions={["Which facilities are down right now?", "Show all high severity open issues"]} />
    </div>
  );
}
