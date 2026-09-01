// ============================================================
// Genie Integration Layer
// ------------------------------------------------------------
// This is the core innovation of LabPulse: every question sent
// to Genie is wrapped with the requesting user's ROLE and SCOPE,
// so the same Genie Space enforces different visibility for a
// student vs a lab_incharge vs an admin, without needing five
// separate Genie Spaces.
//
// In production this calls the real Databricks Genie Conversation
// API:
//   POST /api/2.0/genie/spaces/{space_id}/conversations
//   POST /api/2.0/genie/spaces/{space_id}/conversations/{id}/messages
//
// For local development / demo without a Databricks workspace
// connected, USE_MOCK_GENIE=true returns a rule-based simulated
// answer computed from the same JSON data store, so the full
// request -> scope -> answer flow can be demoed end-to-end.
// ============================================================

const dataStore = require("./dataStore");

const USE_MOCK_GENIE = process.env.USE_MOCK_GENIE !== "false"; // default true

function buildScopedContext(user, scope) {
  return {
    role: user.role,
    user_id: user.user_id,
    scope_description:
      scope.type === "all"
        ? "no restriction"
        : scope.type === "department"
        ? `department = ${scope.value}`
        : scope.type === "facility_list"
        ? `facility_id in [${(scope.value || []).join(", ")}]`
        : scope.type === "availability_only"
        ? "availability questions only, no analytics"
        : scope.type === "maintenance_only"
        ? "maintenance_records only, no booking/usage detail"
        : "no access"
  };
}

async function askGenie({ user, scope, question }) {
  const context = buildScopedContext(user, scope);

  if (USE_MOCK_GENIE) {
    return mockGenieAnswer({ user, scope, question, context });
  }

  // ---- Real Databricks Genie Conversation API call ----
  const host = process.env.DATABRICKS_HOST;
  const token = process.env.DATABRICKS_TOKEN;
  const spaceId = process.env.GENIE_SPACE_ID;

  const scopedQuestion =
    `[role=${context.role}; scope=${context.scope_description}]\n${question}`;

  const resp = await fetch(`${host}/api/2.0/genie/spaces/${spaceId}/conversations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ content: scopedQuestion })
  });

  if (!resp.ok) {
    throw new Error(`Genie API error: ${resp.status} ${await resp.text()}`);
  }
  const data = await resp.json();
  return { context, raw: data };
}

// ------------------------------------------------------------
// Mock Genie: applies the same reconciliation logic Genie's
// Space instructions describe, computed locally, so the demo
// works without a live Databricks connection.
// ------------------------------------------------------------
function mockGenieAnswer({ user, scope, question, context }) {
  const facilities = dataStore.getFacilities();
  const bookings = dataStore.getBookings();
  const usageLogs = dataStore.getUsageLogs();
  const maintenance = dataStore.getMaintenance();
  const facilityLookup = Object.fromEntries(facilities.map((f) => [f.facility_id, f]));

  const q = question.toLowerCase();

  // Scope enforcement first
  if (scope.type === "none") {
    return { context, answer: "Your role does not have access to this data.", data: [] };
  }

  const inScope = (facilityId) => {
    if (scope.type === "all") return true;
    if (scope.type === "department")
      return facilityLookup[facilityId]?.department === scope.value;
    if (scope.type === "facility_list") return (scope.value || []).includes(facilityId);
    if (scope.type === "availability_only") return true; // availability is fine to check broadly
    if (scope.type === "maintenance_only") return true;
    return false;
  };

  // ---- Ghost bookings: confirmed but zero actual usage (new anomaly-detection feature) ----
  if (q.includes("ghost") || q.includes("never used") || q.includes("no show")) {
    if (scope.type === "availability_only") {
      return { context, answer: "Ghost booking detection is not available for the student role.", data: [] };
    }
    const results = bookings
      .filter((b) => b.status === "confirmed" && inScope(b.facility_id))
      .map((b) => {
        const matchingUsage = usageLogs.find((u) => u.booking_id === b.booking_id);
        const hoursUsed = matchingUsage ? matchingUsage.hours_actually_used : null;
        return { booking_id: b.booking_id, facility: facilityLookup[b.facility_id]?.name, purpose: b.purpose, hours_used: hoursUsed };
      })
      .filter((r) => r.hours_used === 0 || r.hours_used === null);

    return {
      context,
      answer: results.length
        ? `${results.length} ghost booking(s) found — confirmed reservations with zero recorded usage.`
        : "No ghost bookings found in your scope.",
      data: results
    };
  }

  // ---- Underutilised facilities ----
  if (q.includes("underutil") || q.includes("idle")) {
    if (scope.type === "availability_only") {
      return { context, answer: "Utilisation analytics are not available for the student role.", data: [] };
    }
    const results = facilities
      .filter((f) => inScope(f.facility_id))
      .map((f) => {
        const fBookings = bookings.filter((b) => b.facility_id === f.facility_id);
        const bookedHours = fBookings.reduce(
          (sum, b) => sum + (new Date(b.end_time) - new Date(b.start_time)) / 3600000,
          0
        );
        const fUsage = usageLogs.filter((u) => u.facility_id === f.facility_id);
        const usedHours = fUsage.reduce((sum, u) => sum + u.hours_actually_used, 0);
        const utilisation = bookedHours > 0 ? Math.round((usedHours / bookedHours) * 100) : null;
        return { facility: f.name, facility_id: f.facility_id, utilisation_pct: utilisation };
      })
      .filter((r) => r.utilisation_pct !== null && r.utilisation_pct < 20)
      .sort((a, b) => a.utilisation_pct - b.utilisation_pct);

    return {
      context,
      answer: results.length
        ? `${results.length} facility(ies) in your scope are underutilised (below 20%).`
        : "No underutilised facilities found in your scope.",
      data: results
    };
  }

  // ---- Maintenance / root cause ----
  if (q.includes("maintenance") || q.includes("issue") || q.includes("broken") || q.includes("fault")) {
    if (scope.type === "availability_only") {
      return { context, answer: "Maintenance details are not available for the student role.", data: [] };
    }
    const results = maintenance.filter(
      (m) => inScope(m.facility_id) && (scope.type !== "maintenance_only" || true)
    );
    const enriched = results.map((m) => ({
      facility: facilityLookup[m.facility_id]?.name,
      issue: m.issue,
      severity: m.severity,
      status: m.status,
      reported_date: m.reported_date
    }));
    return {
      context,
      answer: enriched.length
        ? `${enriched.length} maintenance record(s) found in your scope.`
        : "No maintenance issues found in your scope.",
      data: enriched
    };
  }

  // ---- Availability / free slot ----
  if (q.includes("free") || q.includes("available")) {
    const results = facilities
      .filter((f) => inScope(f.facility_id) && f.status === "active")
      .map((f) => {
        const activeBookings = bookings.filter(
          (b) => b.facility_id === f.facility_id && b.status === "confirmed"
        );
        return { facility: f.name, facility_id: f.facility_id, upcoming_bookings: activeBookings.length };
      });
    return {
      context,
      answer: `${results.length} facility(ies) checked for availability in your scope.`,
      data: results
    };
  }

  // ---- Default: utilisation summary ----
  if (scope.type === "availability_only") {
    return { context, answer: "Only availability questions are supported for the student role.", data: [] };
  }
  const summary = facilities.filter((f) => inScope(f.facility_id)).map((f) => ({
    facility: f.name,
    facility_id: f.facility_id,
    status: f.status
  }));
  return {
    context,
    answer: "Here is a summary of facilities within your scope.",
    data: summary
  };
}

module.exports = { askGenie };
