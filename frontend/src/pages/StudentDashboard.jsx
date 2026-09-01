import React, { useEffect, useState } from "react";
import { api } from "../api";
import GenieChat from "../components/GenieChat";

export default function StudentDashboard({ user }) {
  const [facilities, setFacilities] = useState([]);
  const [form, setForm] = useState({ facility_id: "", purpose: "", start_time: "", end_time: "" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.getFacilities().then((r) => setFacilities(r.facilities));
  }, []);

  async function handleRequest(e) {
    e.preventDefault();
    try {
      const res = await api.createBooking(form);
      setMessage(res.message);
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <div>
      <h1 className="page-title">Student Dashboard</h1>
      <p className="page-sub">
        Check availability for {user.department} facilities and request access for approved activities.
      </p>

      <h2 className="section-title">Facilities in Your Department</h2>
      <table>
        <thead><tr><th>Name</th><th>Type</th><th>Capacity</th><th>Status</th></tr></thead>
        <tbody>
          {facilities.map((f) => (
            <tr key={f.facility_id}>
              <td>{f.name}</td><td>{f.type}</td><td>{f.capacity}</td>
              <td><span className={`badge ${f.status}`}>{f.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="section-title">Request Access</h2>
      <p className="page-sub">Requests route to your faculty or lab incharge for approval.</p>
      <form onSubmit={handleRequest} className="form-row">
        <select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: e.target.value })} required>
          <option value="">Select facility</option>
          {facilities.map((f) => (
            <option key={f.facility_id} value={f.facility_id}>{f.name}</option>
          ))}
        </select>
        <input placeholder="Reason (e.g. club event, project work)" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} required />
        <input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
        <input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
        <button className="btn-primary" type="submit">Request</button>
      </form>
      {message && <p className="page-sub">{message}</p>}

      <GenieChat suggestions={["Which labs are free tomorrow at 2 PM?", "Is Computer Lab 1 available on Friday?"]} />
    </div>
  );
}
