import React, { useEffect, useState } from "react";
import { api } from "../api";
import GenieChat from "../components/GenieChat";

const ROLES = ["admin", "faculty", "student", "lab_incharge", "maintenance", "operations", "guest"];

export default function AdminDashboard() {
  const [facilities, setFacilities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [users, setUsers] = useState([]);

  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "student", department: "" });
  const [facilityForm, setFacilityForm] = useState({ name: "", type: "lab", capacity: "", department: "" });
  const [message, setMessage] = useState("");

  function refresh() {
    api.getFacilities().then((r) => setFacilities(r.facilities));
    api.getBookings().then((r) => setBookings(r.bookings));
    api.getMaintenance().then((r) => setMaintenance(r.tickets));
    api.getUsers().then((r) => setUsers(r.users));
  }
  useEffect(refresh, []);

  const openTickets = maintenance.filter((t) => t.status !== "resolved").length;

  // ---- User CRUD ----
  async function createUser(e) {
    e.preventDefault();
    try {
      await api.createUser(userForm);
      setMessage("User created");
      setUserForm({ name: "", email: "", password: "", role: "student", department: "" });
      refresh();
    } catch (err) { setMessage(err.message); }
  }
  async function toggleActive(u) {
    await api.updateUser(u.user_id, { active: !u.active });
    refresh();
  }
  async function deleteUser(u) {
    if (!confirm(`Deactivate ${u.name}?`)) return;
    await api.deleteUser(u.user_id);
    refresh();
  }

  // ---- Facility CRUD ----
  async function createFacility(e) {
    e.preventDefault();
    try {
      await api.createFacility(facilityForm);
      setMessage("Facility created");
      setFacilityForm({ name: "", type: "lab", capacity: "", department: "" });
      refresh();
    } catch (err) { setMessage(err.message); }
  }
  async function deleteFacility(f) {
    if (!confirm(`Delete ${f.name}? This cannot be undone.`)) return;
    await api.deleteFacility(f.facility_id);
    refresh();
  }

  return (
    <div>
      <h1 className="page-title">Admin Overview</h1>
      <p className="page-sub">Full institution-wide visibility and management across facilities, users, bookings, and maintenance.</p>

      <div className="card-grid">
        <div className="card"><div className="stat">{facilities.length}</div><div className="stat-label">Total facilities</div></div>
        <div className="card"><div className="stat">{bookings.filter((b) => b.status === "confirmed").length}</div><div className="stat-label">Confirmed bookings</div></div>
        <div className="card"><div className="stat">{openTickets}</div><div className="stat-label">Open maintenance tickets</div></div>
        <div className="card"><div className="stat">{users.filter((u) => u.active).length}</div><div className="stat-label">Active users</div></div>
      </div>

      {message && <p className="page-sub">{message}</p>}

      {/* ---------------- USER MANAGEMENT (full CRUD) ---------------- */}
      <h2 className="section-title">User Management</h2>
      <form onSubmit={createUser} className="form-row">
        <input placeholder="Full name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />
        <input placeholder="Email" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
        <input placeholder="Password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required />
        <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <input placeholder="Department (optional)" value={userForm.department} onChange={(e) => setUserForm({ ...userForm, department: e.target.value })} />
        <button className="btn-primary" type="submit">Add User</button>
      </form>
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.user_id}>
              <td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.department || "—"}</td>
              <td><span className={`badge ${u.active ? "active" : "open"}`}>{u.active ? "active" : "inactive"}</span></td>
              <td>
                <button className="btn-primary" onClick={() => toggleActive(u)}>{u.active ? "Deactivate" : "Reactivate"}</button>{" "}
                <button className="btn-primary" onClick={() => deleteUser(u)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ---------------- FACILITY MANAGEMENT (full CRUD) ---------------- */}
      <h2 className="section-title">Facility Management</h2>
      <form onSubmit={createFacility} className="form-row">
        <input placeholder="Facility name" value={facilityForm.name} onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })} required />
        <select value={facilityForm.type} onChange={(e) => setFacilityForm({ ...facilityForm, type: e.target.value })}>
          <option value="lab">Lab</option><option value="hall">Hall</option><option value="equipment">Equipment</option>
        </select>
        <input placeholder="Capacity" type="number" value={facilityForm.capacity} onChange={(e) => setFacilityForm({ ...facilityForm, capacity: parseInt(e.target.value) })} />
        <input placeholder="Department" value={facilityForm.department} onChange={(e) => setFacilityForm({ ...facilityForm, department: e.target.value })} />
        <button className="btn-primary" type="submit">Add Facility</button>
      </form>
      <table>
        <thead><tr><th>Name</th><th>Type</th><th>Department</th><th>Capacity</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {facilities.map((f) => (
            <tr key={f.facility_id}>
              <td>{f.name}</td><td>{f.type}</td><td>{f.department}</td><td>{f.capacity}</td>
              <td><span className={`badge ${f.status}`}>{f.status}</span></td>
              <td><button className="btn-primary" onClick={() => deleteFacility(f)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <GenieChat
        suggestions={[
          "Which facilities were most underutilised last month?",
          "Show all open maintenance issues",
          "Which bookings are ghost bookings with zero usage?",
          "Which labs are free tomorrow at 2 PM?"
        ]}
      />
    </div>
  );
}
