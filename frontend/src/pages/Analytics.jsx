import React, { useEffect, useState } from "react";
import { api } from "../api";
import GenieChat from "../components/GenieChat";

function Bar({ pct, color }) {
  const safe = pct === null || pct === undefined ? 0 : pct;
  return (
    <div style={{ background: "#e1e6ec", borderRadius: 6, height: 10, width: "100%" }}>
      <div style={{ background: color, width: `${safe}%`, height: "100%", borderRadius: 6 }} />
    </div>
  );
}

function tierColor(tier) {
  if (tier === "healthy") return "#1e7d55";
  if (tier === "attention_required") return "#a0521d";
  return "#b02a2a";
}

export default function Analytics({ user }) {
  const [utilisation, setUtilisation] = useState([]);
  const [phantom, setPhantom] = useState(null);
  const [health, setHealth] = useState([]);
  const [demand, setDemand] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [insight, setInsight] = useState(null);
  const [rootCause, setRootCause] = useState(null);
  const isOpsOrAdmin = ["admin", "operations"].includes(user.role);

  useEffect(() => {
    api.getUtilisation().then((r) => setUtilisation(r.report));
    api.getPhantomBookings().then(setPhantom);
    api.getHealthScores().then((r) => setHealth(r.scores));
    if (isOpsOrAdmin) {
      api.getDemand().then(setDemand);
      api.getForecast().then((r) => setForecast(r.forecast));
      api.getExecutiveInsight().then(setInsight);
    }
  }, []);

  async function viewRootCause(facilityId) {
    const r = await api.getRootCause(facilityId);
    setRootCause(r);
  }

  return (
    <div>
      <h1 className="page-title">Analytics & Utilisation Intelligence</h1>
      <p className="page-sub">Booking is an intention. Actual usage is the truth.</p>

      {insight && (
        <div className="card" style={{ marginBottom: "1.5rem", background: "#21295c", color: "#fff" }}>
          <h3 style={{ color: "#9fd8cb" }}>📊 Executive Insight</h3>
          <p style={{ margin: "0 0 0.5rem" }}>{insight.headline}</p>
          <p style={{ margin: "0 0 0.5rem", color: "#cadcfc" }}>{insight.detail}</p>
          <p style={{ margin: 0, fontStyle: "italic", color: "#9fd8cb" }}>{insight.recommendation}</p>
        </div>
      )}

      {phantom && (
        <div className="card-grid">
          <div className="card"><div className="stat">{phantom.summary.phantom_rate_pct}%</div><div className="stat-label">Phantom booking rate</div></div>
          <div className="card"><div className="stat">{phantom.summary.total_wasted_hours}</div><div className="stat-label">Wasted booked hours</div></div>
          <div className="card"><div className="stat">{phantom.summary.unused_bookings}</div><div className="stat-label">Unused bookings</div></div>
          <div className="card"><div className="stat">{utilisation.filter((u) => u.utilisation_pct !== null && u.utilisation_pct < 20).length}</div><div className="stat-label">Underutilised facilities</div></div>
        </div>
      )}

      <h2 className="section-title">Facility Utilisation %</h2>
      {isOpsOrAdmin && (
        <button className="btn-primary" style={{ marginBottom: "0.8rem" }} onClick={() => api.downloadReport("utilisation")}>
          ⬇ Export CSV
        </button>
      )}
      <table>
        <thead><tr><th>Facility</th><th>Department</th><th>Booked Hrs</th><th>Used Hrs</th><th style={{ width: 160 }}>Utilisation</th><th></th></tr></thead>
        <tbody>
          {utilisation.map((u) => (
            <tr key={u.facility_id}>
              <td>{u.facility}</td><td>{u.department}</td><td>{u.booked_hours}</td><td>{u.used_hours}</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Bar pct={u.utilisation_pct} color={u.utilisation_pct < 30 ? "#b02a2a" : u.utilisation_pct < 60 ? "#a0521d" : "#1e7d55"} />
                  <span style={{ fontSize: "0.8rem" }}>{u.utilisation_pct ?? "—"}%</span>
                </div>
              </td>
              <td><button className="btn-primary" onClick={() => viewRootCause(u.facility_id)}>Why?</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {rootCause && (
        <div className="genie-panel" style={{ marginTop: "1rem" }}>
          <h3>🔎 Root Cause: {rootCause.facility}</h3>
          {rootCause.causes?.map((c, i) => (
            <div key={i} style={{ marginBottom: "0.8rem", paddingBottom: "0.8rem", borderBottom: i < rootCause.causes.length - 1 ? "1px solid #e1e6ec" : "none" }}>
              <strong style={{ color: "#21295c" }}>{c.cause}</strong>
              <p style={{ margin: "0.2rem 0", fontSize: "0.88rem", color: "#5b6472" }}>{c.evidence}</p>
              <p style={{ margin: 0, fontSize: "0.88rem", fontStyle: "italic", color: "#1c7293" }}>→ {c.recommended_action}</p>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title">Facility Health Scores</h2>
      {isOpsOrAdmin && (
        <button className="btn-primary" style={{ marginBottom: "0.8rem" }} onClick={() => api.downloadReport("health-scores")}>
          ⬇ Export CSV
        </button>
      )}
      <div className="card-grid">
        {health.map((h) => (
          <div className="card" key={h.facility_id}>
            <h3>{h.facility}</h3>
            <div className="stat" style={{ color: tierColor(h.tier) }}>{h.health_score}/100</div>
            <div className="stat-label">{h.tier.replace("_", " ")}</div>
            <p style={{ fontSize: "0.78rem", color: "#5b6472", marginTop: "0.4rem" }}>
              Utilisation: {h.utilisation_pct ?? "—"}% · Open tickets: {h.open_maintenance_tickets} · Phantom rate: {h.phantom_booking_rate_pct}%
            </p>
          </div>
        ))}
      </div>

      {isOpsOrAdmin && demand && (
        <>
          <h2 className="section-title">Demand Intelligence</h2>
          <div className="card-grid">
            <div className="card">
              <h3>Most Requested</h3>
              {demand.most_requested.map((d) => <p key={d.facility_id} style={{ margin: "0.2rem 0", fontSize: "0.85rem" }}>{d.facility} — {d.bookings} bookings</p>)}
            </div>
            <div className="card">
              <h3>Peak Hour</h3>
              <div className="stat">{demand.peak_hour}</div>
            </div>
            <div className="card">
              <h3>Department Demand</h3>
              {demand.department_demand.map((d) => <p key={d.department} style={{ margin: "0.2rem 0", fontSize: "0.85rem" }}>{d.department} — {d.bookings}</p>)}
            </div>
          </div>
        </>
      )}

      {isOpsOrAdmin && forecast.length > 0 && (
        <>
          <h2 className="section-title">Next Period Forecast (baseline heuristic)</h2>
          <table>
            <thead><tr><th>Facility</th><th>Current %</th><th>Forecast Next Period %</th></tr></thead>
            <tbody>
              {forecast.map((f) => (
                <tr key={f.facility_id}>
                  <td>{f.facility}</td><td>{f.current_pct ?? "—"}%</td><td>{f.forecast_next_period_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <GenieChat
        suggestions={[
          "Which facilities were most underutilised last month?",
          "Show phantom bookings from last month",
          "Which maintenance issues are affecting utilisation?",
          "Which department uses labs the most?"
        ]}
      />
    </div>
  );
}
