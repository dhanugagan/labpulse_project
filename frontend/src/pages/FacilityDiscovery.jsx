import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export default function FacilityDiscovery({ user }) {
  const [facilities, setFacilities] = useState([]);
  const [filters, setFilters] = useState({ type: "", department: "", minCapacity: "", search: "" });
  const [selected, setSelected] = useState(null);
  const [bookForm, setBookForm] = useState({ purpose: "", start_time: "", end_time: "" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.getFacilities().then((r) => setFacilities(r.facilities));
  }, []);

  const departments = useMemo(() => [...new Set(facilities.map((f) => f.department).filter(Boolean))], [facilities]);

  const filtered = facilities.filter((f) => {
    if (filters.type && f.type !== filters.type) return false;
    if (filters.department && f.department !== filters.department) return false;
    if (filters.minCapacity && f.capacity < parseInt(filters.minCapacity)) return false;
    if (filters.search && !f.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  async function handleBook(e) {
    e.preventDefault();
    try {
      const res = await api.createBooking({ facility_id: selected.facility_id, ...bookForm });
      setMessage(res.message);
      setSelected(null);
      setBookForm({ purpose: "", start_time: "", end_time: "" });
    } catch (err) {
      setMessage(err.message);
    }
  }

  const canBookDirectly = ["faculty", "lab_incharge", "admin"].includes(user.role);

  return (
    <div>
      <h1 className="page-title">Facility Discovery</h1>
      <p className="page-sub">Search and filter facilities by type, department, capacity, and equipment.</p>

      <div className="form-row">
        <input placeholder="Search by name..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
          <option value="">All types</option>
          <option value="lab">Lab</option><option value="hall">Hall</option><option value="equipment">Equipment</option>
        </select>
        <select value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })}>
          <option value="">All departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <input placeholder="Min capacity" type="number" value={filters.minCapacity} onChange={(e) => setFilters({ ...filters, minCapacity: e.target.value })} />
      </div>

      {message && <p className="page-sub">{message}</p>}

      <div className="card-grid">
        {filtered.map((f) => (
          <div className="card" key={f.facility_id}>
            <h3>{f.name}</h3>
            <p style={{ fontSize: "0.82rem", color: "#5b6472", margin: "0 0 0.5rem" }}>
              {f.type} · {f.department} · Capacity {f.capacity}
            </p>
            <span className={`badge ${f.status}`}>{f.status}</span>
            <div style={{ marginTop: "0.8rem" }}>
              <button className="btn-primary" onClick={() => setSelected(f)} disabled={f.status !== "active"}>
                {canBookDirectly ? "Book" : "Request Access"}
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="empty-state">No facilities match your filters.</p>}
      </div>

      {selected && (
        <div className="genie-panel" style={{ marginTop: "1rem" }}>
          <h3>Book: {selected.name}</h3>
          <p style={{ fontSize: "0.85rem", color: "#5b6472" }}>
            Facility available ✓ &nbsp; No conflicting checks are enforced server-side on submit.
          </p>
          <form onSubmit={handleBook} className="form-row">
            <input placeholder="Purpose" value={bookForm.purpose} onChange={(e) => setBookForm({ ...bookForm, purpose: e.target.value })} required />
            <input type="datetime-local" value={bookForm.start_time} onChange={(e) => setBookForm({ ...bookForm, start_time: e.target.value })} required />
            <input type="datetime-local" value={bookForm.end_time} onChange={(e) => setBookForm({ ...bookForm, end_time: e.target.value })} required />
            <button className="btn-primary" type="submit">Confirm</button>
            <button type="button" className="btn-primary" style={{ background: "#5b6472" }} onClick={() => setSelected(null)}>Cancel</button>
          </form>
        </div>
      )}
    </div>
  );
}
