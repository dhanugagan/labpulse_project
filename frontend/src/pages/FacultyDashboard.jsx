import React, { useEffect, useState } from "react";
import { api } from "../api";
import GenieChat from "../components/GenieChat";

export default function FacultyDashboard({ user }) {
  const [facilities, setFacilities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState({ facility_id: "", purpose: "", start_time: "", end_time: "" });
  const [message, setMessage] = useState("");

  function refresh() {
    api.getFacilities().then((r) => setFacilities(r.facilities));
    api.getBookings().then((r) => setBookings(r.bookings));
  }
  useEffect(refresh, []);

  async function handleBook(e) {
    e.preventDefault();
    try {
      const res = await api.createBooking(form);
      setMessage(res.message);
      refresh();
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <div>
      <h1 className="page-title">Faculty Dashboard</h1>
      <p className="page-sub">Book facilities in your department ({user.department}) and track your reservations.</p>

      <h2 className="section-title">Book a Facility</h2>
      <form onSubmit={handleBook} className="form-row">
        <select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: e.target.value })} required>
          <option value="">Select facility</option>
          {facilities.map((f) => (
            <option key={f.facility_id} value={f.facility_id}>{f.name}</option>
          ))}
        </select>
        <input placeholder="Purpose" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} required />
        <input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
        <input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
        <button className="btn-primary" type="submit">Book</button>
      </form>
      {message && <p className="page-sub">{message}</p>}

      <h2 className="section-title">Your Bookings</h2>
      <table>
        <thead><tr><th>Facility</th><th>Purpose</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.booking_id}>
              <td>{facilities.find((f) => f.facility_id === b.facility_id)?.name || b.facility_id}</td>
              <td>{b.purpose}</td>
              <td>{new Date(b.start_time).toLocaleString()}</td>
              <td>{new Date(b.end_time).toLocaleString()}</td>
              <td><span className={`badge ${b.status}`}>{b.status}</span></td>
              <td>
                {b.status !== "cancelled" && (
                  <button className="btn-primary" onClick={async () => { await api.cancelBooking(b.booking_id); refresh(); }}>
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <GenieChat
        suggestions={[
          "Which labs are free tomorrow at 2 PM?",
          "Show my bookings this week",
          "What is the utilisation rate of my department's labs?",
          "Which bookings in my department are ghost bookings?"
        ]}
      />
    </div>
  );
}
