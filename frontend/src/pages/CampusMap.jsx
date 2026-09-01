import React, { useEffect, useState } from "react";
import { api } from "../api";

const STATUS_ICON = {
  active: "🟢",
  occupied: "🔴",
  under_maintenance: "🟡",
  closed: "⚪"
};

export default function CampusMap() {
  const [facilities, setFacilities] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.getFacilities().then((r) => setFacilities(r.facilities));
  }, []);

  const buildings = [...new Set(facilities.map((f) => f.department || "General"))];

  return (
    <div>
      <h1 className="page-title">Campus Facility Map</h1>
      <p className="page-sub">🟢 Available &nbsp; 🔴 Occupied &nbsp; 🟡 Maintenance &nbsp; ⚪ Closed</p>

      {buildings.map((building) => (
        <div key={building}>
          <h2 className="section-title">{building} Block</h2>
          <div className="card-grid">
            {facilities.filter((f) => (f.department || "General") === building).map((f) => (
              <div
                className="card"
                key={f.facility_id}
                style={{ cursor: "pointer", borderLeft: `4px solid ${f.status === "active" ? "#1e7d55" : f.status === "under_maintenance" ? "#a0521d" : "#5b6472"}` }}
                onClick={() => setSelected(f)}
              >
                <h3>{STATUS_ICON[f.status] || "⚪"} {f.name}</h3>
                <p style={{ fontSize: "0.8rem", color: "#5b6472", margin: 0 }}>{f.type} · Capacity {f.capacity}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {selected && (
        <div className="genie-panel">
          <h3>{selected.name}</h3>
          <p style={{ fontSize: "0.88rem" }}>
            Type: {selected.type} &nbsp;|&nbsp; Department: {selected.department} &nbsp;|&nbsp; Capacity: {selected.capacity}
          </p>
          <span className={`badge ${selected.status}`}>{selected.status}</span>
        </div>
      )}
    </div>
  );
}
