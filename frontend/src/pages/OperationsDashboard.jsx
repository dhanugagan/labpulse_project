import React, { useEffect, useState } from "react";
import { api } from "../api";
import GenieChat from "../components/GenieChat";

export default function OperationsDashboard() {
  const [facilities, setFacilities] = useState([]);
  const [usage, setUsage] = useState([]);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    api.getFacilities().then((r) => setFacilities(r.facilities));
    api.getUsage().then((r) => setUsage(r.logs));
    api.getBookings().then((r) => setBookings(r.bookings));
  }, []);

  function utilisationFor(facilityId) {
    const fBookings = bookings.filter((b) => b.facility_id === facilityId);
    const bookedHours = fBookings.reduce(
      (sum, b) => sum + (new Date(b.end_time) - new Date(b.start_time)) / 3600000, 0
    );
    const fUsage = usage.filter((u) => u.facility_id === facilityId);
    const usedHours = fUsage.reduce((sum, u) => sum + u.hours_actually_used, 0);
    return bookedHours > 0 ? Math.round((usedHours / bookedHours) * 100) : null;
  }

  return (
    <div>
      <h1 className="page-title">Operations Analytics</h1>
      <p className="page-sub">Cross-department utilisation trends and reallocation insights.</p>

      <h2 className="section-title">Utilisation by Facility</h2>
      <table>
        <thead><tr><th>Facility</th><th>Department</th><th>Utilisation %</th><th>Status</th></tr></thead>
        <tbody>
          {facilities.map((f) => {
            const u = utilisationFor(f.facility_id);
            return (
              <tr key={f.facility_id}>
                <td>{f.name}</td><td>{f.department}</td>
                <td>{u === null ? "—" : `${u}%`}</td>
                <td><span className={`badge ${f.status}`}>{f.status}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <GenieChat
        suggestions={[
          "Which facilities were most underutilised last month?",
          "Show maintenance history for underused facilities",
          "Compare utilisation across departments"
        ]}
      />
    </div>
  );
}
