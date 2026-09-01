// ============================================================
// Analytics Service — LabPulse's decision-intelligence layer.
// Everything here mirrors the logic taught to the Genie Space
// (see database/genie_space_instructions.txt) so the dashboard
// and Genie's conversational answers are always consistent.
// ============================================================
const dataStore = require("./dataStore");

function hoursBetween(start, end) {
  return (new Date(end) - new Date(start)) / 3600000;
}

function buildFacilityLookup(facilities) {
  return Object.fromEntries(facilities.map((f) => [f.facility_id, f]));
}

// ---------- Utilisation % per facility ----------
function utilisationReport({ facilityIds } = {}) {
  const facilities = dataStore.getFacilities();
  const bookings = dataStore.getBookings().filter((b) => b.status === "confirmed");
  const usageLogs = dataStore.getUsageLogs();

  const scoped = facilityIds ? facilities.filter((f) => facilityIds.includes(f.facility_id)) : facilities;

  return scoped.map((f) => {
    const fBookings = bookings.filter((b) => b.facility_id === f.facility_id);
    const bookedHours = fBookings.reduce((sum, b) => sum + hoursBetween(b.start_time, b.end_time), 0);
    const fUsage = usageLogs.filter((u) => u.facility_id === f.facility_id);
    const usedHours = fUsage.reduce((sum, u) => sum + u.hours_actually_used, 0);
    const utilisation_pct = bookedHours > 0 ? Math.round((usedHours / bookedHours) * 100) : null;

    return {
      facility_id: f.facility_id,
      facility: f.name,
      department: f.department,
      status: f.status,
      booked_hours: Math.round(bookedHours * 10) / 10,
      used_hours: Math.round(usedHours * 10) / 10,
      utilisation_pct
    };
  });
}

// ---------- Phantom / ghost booking detection ----------
function phantomBookingReport({ facilityIds } = {}) {
  const facilities = dataStore.getFacilities();
  const facilityLookup = buildFacilityLookup(facilities);
  const bookings = dataStore.getBookings().filter((b) => b.status === "confirmed");
  const usageLogs = dataStore.getUsageLogs();

  const scoped = facilityIds
    ? bookings.filter((b) => facilityIds.includes(b.facility_id))
    : bookings;

  const rows = scoped.map((b) => {
    const matchingUsage = usageLogs.find((u) => u.booking_id === b.booking_id);
    const bookedHours = hoursBetween(b.start_time, b.end_time);
    const usedHours = matchingUsage ? matchingUsage.hours_actually_used : 0;
    const wastedHours = Math.max(bookedHours - usedHours, 0);
    let status;
    if (usedHours === 0) status = "unused";
    else if (usedHours < bookedHours * 0.5) status = "partially_used";
    else status = "fully_used";

    return {
      booking_id: b.booking_id,
      facility: facilityLookup[b.facility_id]?.name,
      facility_id: b.facility_id,
      requested_by: b.requested_by,
      purpose: b.purpose,
      booked_hours: Math.round(bookedHours * 10) / 10,
      used_hours: Math.round(usedHours * 10) / 10,
      wasted_hours: Math.round(wastedHours * 10) / 10,
      status
    };
  });

  const totalBookedHours = rows.reduce((sum, r) => sum + r.booked_hours, 0);
  const totalWastedHours = rows.reduce((sum, r) => sum + r.wasted_hours, 0);
  const unusedCount = rows.filter((r) => r.status === "unused").length;

  return {
    summary: {
      total_bookings_analysed: rows.length,
      unused_bookings: unusedCount,
      phantom_rate_pct: rows.length > 0 ? Math.round((unusedCount / rows.length) * 100) : 0,
      total_wasted_hours: Math.round(totalWastedHours * 10) / 10,
      total_booked_hours: Math.round(totalBookedHours * 10) / 10
    },
    bookings: rows.filter((r) => r.status !== "fully_used") // surface the interesting ones
  };
}

// ---------- Root cause analysis for one facility ----------
function rootCauseAnalysis(facilityId) {
  const facilities = dataStore.getFacilities();
  const facility = facilities.find((f) => f.facility_id === facilityId);
  if (!facility) return { error: "Facility not found" };

  const util = utilisationReport({ facilityIds: [facilityId] })[0];
  const maintenance = dataStore.getMaintenance().filter((m) => m.facility_id === facilityId);
  const openTickets = maintenance.filter((m) => m.status !== "resolved");
  const phantom = phantomBookingReport({ facilityIds: [facilityId] });
  const bookings = dataStore.getBookings().filter((b) => b.facility_id === facilityId);
  const cancelledCount = bookings.filter((b) => b.status === "cancelled").length;
  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;

  const causes = [];

  if (openTickets.length > 0) {
    causes.push({
      cause: "Maintenance problem",
      evidence: `${openTickets.length} unresolved issue(s): ${openTickets.map((t) => t.issue).join("; ")}`,
      recommended_action: "Prioritise resolving the open maintenance ticket(s) before reallocating this facility."
    });
  }

  if (phantom.summary.unused_bookings > 0 && phantom.summary.total_bookings_analysed > 0) {
    const rate = phantom.summary.phantom_rate_pct;
    if (rate >= 30) {
      causes.push({
        cause: "Scheduling problem (high bookings, low attendance)",
        evidence: `${phantom.summary.unused_bookings} of ${phantom.summary.total_bookings_analysed} confirmed bookings had zero recorded usage (${rate}% phantom rate).`,
        recommended_action: "Review recurring reservations and confirm real demand before re-approving them."
      });
    }
  }

  if (confirmedCount <= 2 && util.utilisation_pct !== null) {
    causes.push({
      cause: "Low demand",
      evidence: `Only ${confirmedCount} confirmed booking(s) found for this facility in the dataset.`,
      recommended_action: "Consider promoting this facility's availability or reassigning it to a higher-demand department."
    });
  }

  if (cancelledCount > 0) {
    causes.push({
      cause: "Repeated cancellations",
      evidence: `${cancelledCount} booking(s) for this facility were cancelled.`,
      recommended_action: "Investigate whether cancellations cluster around a specific time slot or requester."
    });
  }

  if (facility.capacity >= 60 && confirmedCount > 0) {
    const avgHeadcount =
      dataStore.getUsageLogs().filter((u) => u.facility_id === facilityId).reduce((s, u) => s + u.headcount, 0) /
      Math.max(dataStore.getUsageLogs().filter((u) => u.facility_id === facilityId).length, 1);
    if (avgHeadcount > 0 && avgHeadcount < facility.capacity * 0.4) {
      causes.push({
        cause: "Capacity mismatch",
        evidence: `Average attendance (${Math.round(avgHeadcount)}) is well below the facility's capacity (${facility.capacity}).`,
        recommended_action: "Consider a smaller venue for typical bookings and reserve this facility for larger events."
      });
    }
  }

  if (causes.length === 0) {
    causes.push({
      cause: "No significant issue detected",
      evidence: "Utilisation, maintenance, and booking patterns all look healthy for this facility.",
      recommended_action: "No action needed."
    });
  }

  return {
    facility: facility.name,
    facility_id: facilityId,
    utilisation_pct: util.utilisation_pct,
    causes
  };
}

// ---------- Facility Health Score ----------
function healthScores({ facilityIds } = {}) {
  const facilities = dataStore.getFacilities();
  const maintenance = dataStore.getMaintenance();
  const scoped = facilityIds ? facilities.filter((f) => facilityIds.includes(f.facility_id)) : facilities;
  const utilByFacility = Object.fromEntries(utilisationReport({ facilityIds }).map((u) => [u.facility_id, u]));
  const phantomByFacility = Object.fromEntries(
    scoped.map((f) => [f.facility_id, phantomBookingReport({ facilityIds: [f.facility_id] }).summary])
  );

  return scoped.map((f) => {
    const util = utilByFacility[f.facility_id];
    const phantom = phantomByFacility[f.facility_id];
    const openTickets = maintenance.filter((m) => m.facility_id === f.facility_id && m.status !== "resolved").length;

    const utilisationScore = util.utilisation_pct !== null ? Math.min(util.utilisation_pct, 100) : 50;
    const maintenanceFactor = Math.max(0, 100 - openTickets * 30);
    const phantomFactor = Math.max(0, 100 - phantom.phantom_rate_pct);

    let score = Math.round(0.5 * utilisationScore + 0.3 * phantomFactor + 0.2 * maintenanceFactor);
    score = Math.max(0, Math.min(100, score));

    let tier;
    if (score >= 70) tier = "healthy";
    else if (score >= 40) tier = "attention_required";
    else tier = "critical";

    return {
      facility_id: f.facility_id,
      facility: f.name,
      health_score: score,
      tier,
      utilisation_pct: util.utilisation_pct,
      open_maintenance_tickets: openTickets,
      phantom_booking_rate_pct: phantom.phantom_rate_pct
    };
  });
}

// ---------- Demand Intelligence ----------
function demandIntelligence() {
  const facilities = dataStore.getFacilities();
  const facilityLookup = buildFacilityLookup(facilities);
  const bookings = dataStore.getBookings().filter((b) => b.status === "confirmed");

  const countByFacility = {};
  const hourCounts = {};
  const deptCounts = {};

  bookings.forEach((b) => {
    countByFacility[b.facility_id] = (countByFacility[b.facility_id] || 0) + 1;
    const hour = new Date(b.start_time).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    const dept = facilityLookup[b.facility_id]?.department;
    if (dept) deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });

  const ranked = Object.entries(countByFacility)
    .map(([facility_id, count]) => ({ facility_id, facility: facilityLookup[facility_id]?.name, bookings: count }))
    .sort((a, b) => b.bookings - a.bookings);

  const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];

  return {
    most_requested: ranked.slice(0, 3),
    least_requested: ranked.slice(-3).reverse(),
    peak_hour: peakHour ? `${peakHour[0]}:00 - ${parseInt(peakHour[0]) + 1}:00` : "Not enough data",
    department_demand: Object.entries(deptCounts)
      .map(([department, count]) => ({ department, bookings: count }))
      .sort((a, b) => b.bookings - a.bookings)
  };
}

// ---------- Simple Predictive Utilisation (baseline forecast) ----------
// Note: this is a lightweight heuristic (recent average +/- trend),
// not a trained ML model — clearly labelled as a stretch-goal
// baseline for the demo, with a real forecasting model documented
// as a v3 roadmap item in INNOVATIONS_AND_CRUD.txt.
function forecastNextPeriod() {
  const util = utilisationReport();
  return util.map((u) => {
    const base = u.utilisation_pct ?? 50;
    // naive heuristic: facilities under maintenance trend down, healthy ones trend flat/up slightly
    const adjustment = u.status === "under_maintenance" ? -15 : 2;
    const forecast_pct = Math.max(0, Math.min(100, base + adjustment));
    return { facility_id: u.facility_id, facility: u.facility, current_pct: u.utilisation_pct, forecast_next_period_pct: forecast_pct };
  });
}

// ---------- Executive Insight (auto-generated summary) ----------
function executiveInsight() {
  const phantom = phantomBookingReport();
  const util = utilisationReport();
  const worst = [...util].filter((u) => u.utilisation_pct !== null).sort((a, b) => a.utilisation_pct - b.utilisation_pct)[0];
  const worstPhantom = worst ? phantomBookingReport({ facilityIds: [worst.facility_id] }) : null;

  const overallPct = phantom.summary.total_booked_hours > 0
    ? Math.round((phantom.summary.total_wasted_hours / phantom.summary.total_booked_hours) * 100)
    : 0;

  return {
    headline: `Across ${util.length} facilities, ${overallPct}% of booked hours were unused, representing approximately ${phantom.summary.total_wasted_hours} hours of potentially recoverable capacity.`,
    detail: worst
      ? `The largest contributor was ${worst.facility}, at ${worst.utilisation_pct}% utilisation, with ${worstPhantom.summary.unused_bookings} unused reservation(s) out of ${worstPhantom.summary.total_bookings_analysed}.`
      : "Not enough data to identify a single largest contributor yet.",
    recommendation: worst
      ? `Review recurring reservations for ${worst.facility} and prioritise resolving any open maintenance tickets affecting it.`
      : "Continue monitoring as more booking and usage data accumulates."
  };
}

module.exports = {
  utilisationReport,
  phantomBookingReport,
  rootCauseAnalysis,
  healthScores,
  demandIntelligence,
  forecastNextPeriod,
  executiveInsight
};
