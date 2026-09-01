import React, { useEffect, useState } from "react";
import { api } from "../api";
import GenieChat from "../components/GenieChat";

export default function LabInchargeDashboard({ user }) {
  const [facilities, setFacilities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [usageForm, setUsageForm] = useState({ facility_id: "", booking_id: "", log_date: "", hours_actually_used: "", headcount: "" });
  const [issueForm, setIssueForm] = useState({ facility_id: "", issue: "", severity: "medium" });
  const [message, setMessage] = useState("");

  function refresh() {
    api.getFacilities().then((r) => setFacilities(r.facilities));
    api.getBookings().then((r) => setBookings(r.bookings));
    api.getMaintenance().then((r) => setTickets(r.tickets));
  }
  useEffect(refresh, []);

  async function submitUsage(e) {
    e.preventDefault();
    try {
      await api.logUsage(usageForm);
      setMessage("Usage logged");
      refresh();
    } catch (err) { setMessage(err.message); }
  }

  async function submitIssue(e) {
    e.preventDefault();
    try {
      await api.reportMaintenance(issueForm);
      setMessage("Maintenance issue reported");
      refresh();
    } catch (err) { setMessage(err.message); }
  }

  return (
    <div>
      <h1 className="page-title">Lab Incharge Dashboard</h1>
      <p className="page-sub">
        Managing: {facilities.map((f) => f.name).join(", ") || "your assigned facilities"}
      </p>

      <h2 className="section-title">Booking Calendar</h2>
      <table>
        <thead><tr><th>Facility</th><th>Purpose</th><th>Start</th><th>End</th><th>Status</th></tr></thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.booking_id}>
              <td>{facilities.find((f) => f.facility_id === b.facility_id)?.name || b.facility_id}</td>
              <td>{b.purpose}</td>
              <td>{new Date(b.start_time).toLocaleString()}</td>
              <td>{new Date(b.end_time).toLocaleString()}</td>
              <td><span className={`badge ${b.status}`}>{b.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="section-title">Log Actual Usage</h2>
      <form onSubmit={submitUsage} className="form-row">
        <select value={usageForm.facility_id} onChange={(e) => setUsageForm({ ...usageForm, facility_id: e.target.value })} required>
          <option value="">Facility</option>
          {facilities.map((f) => <option key={f.facility_id} value={f.facility_id}>{f.name}</option>)}
        </select>
        <input placeholder="Booking ID (optional)" value={usageForm.booking_id} onChange={(e) => setUsageForm({ ...usageForm, booking_id: e.target.value })} />
        <input type="date" value={usageForm.log_date} onChange={(e) => setUsageForm({ ...usageForm, log_date: e.target.value })} required />
        <input type="number" step="0.1" placeholder="Hours used" value={usageForm.hours_actually_used} onChange={(e) => setUsageForm({ ...usageForm, hours_actually_used: parseFloat(e.target.value) })} required />
        <input type="number" placeholder="Headcount" value={usageForm.headcount} onChange={(e) => setUsageForm({ ...usageForm, headcount: parseInt(e.target.value) })} required />
        <button className="btn-primary" type="submit">Log Usage</button>
      </form>

      <h2 className="section-title">Report Equipment Issue</h2>
      <form onSubmit={submitIssue} className="form-row">
        <select value={issueForm.facility_id} onChange={(e) => setIssueForm({ ...issueForm, facility_id: e.target.value })} required>
          <option value="">Facility</option>
          {facilities.map((f) => <option key={f.facility_id} value={f.facility_id}>{f.name}</option>)}
        </select>
        <input placeholder="Describe the issue" value={issueForm.issue} onChange={(e) => setIssueForm({ ...issueForm, issue: e.target.value })} required />
        <select value={issueForm.severity} onChange={(e) => setIssueForm({ ...issueForm, severity: e.target.value })}>
          <option value="low">Low</option><option value="medium">Medium</option>
          <option value="high">High</option><option value="critical">Critical</option>
        </select>
        <button className="btn-primary" type="submit">Report Issue</button>
      </form>
      {message && <p className="page-sub">{message}</p>}

      <h2 className="section-title">Maintenance Tickets on Your Labs</h2>
      <table>
        <thead><tr><th>Facility</th><th>Issue</th><th>Severity</th><th>Status</th></tr></thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.ticket_id}>
              <td>{facilities.find((f) => f.facility_id === t.facility_id)?.name || t.facility_id}</td>
              <td>{t.issue}</td>
              <td><span className={`badge ${t.severity}`}>{t.severity}</span></td>
              <td><span className={`badge ${t.status}`}>{t.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>

      <GenieChat
        suggestions={[
          "What is the utilisation rate of my lab this month?",
          "Any unresolved maintenance issues on my facilities?",
          "Which of my facilities are underutilised?"
        ]}
      />
    </div>
  );
}
