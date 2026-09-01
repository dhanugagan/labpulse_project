const express = require("express");
const analytics = require("../services/analyticsService");
const dataStore = require("../services/dataStore");
const { applyScope } = require("../middleware/rbac");

const router = express.Router();

// Students and guests get no analytics access — availability only, per RBAC model
function blockAnalyticsRoles(req, res, next) {
  if (["student", "guest"].includes(req.user.role)) {
    return res.status(403).json({ error: "Analytics are not available for this role" });
  }
  next();
}
router.use(blockAnalyticsRoles);

function scopedFacilityIds(req) {
  const scope = applyScope(req.user);
  if (scope.type === "all") return null; // no restriction
  if (scope.type === "facility_list") return scope.value || [];
  if (scope.type === "department") {
    const facilities = dataStore.getFacilities().filter((f) => f.department === scope.value);
    return facilities.map((f) => f.facility_id);
  }
  return []; // maintenance_only etc. handled per-route below
}

// GET /api/analytics/utilisation
router.get("/utilisation", (req, res) => {
  const facilityIds = scopedFacilityIds(req);
  res.json({ report: analytics.utilisationReport(facilityIds ? { facilityIds } : {}) });
});

// GET /api/analytics/phantom-bookings
router.get("/phantom-bookings", (req, res) => {
  if (req.user.role === "maintenance") {
    return res.status(403).json({ error: "Phantom booking analytics are outside the maintenance role's scope" });
  }
  const facilityIds = scopedFacilityIds(req);
  res.json(analytics.phantomBookingReport(facilityIds ? { facilityIds } : {}));
});

// GET /api/analytics/root-cause/:facilityId
router.get("/root-cause/:facilityId", (req, res) => {
  const facilityIds = scopedFacilityIds(req);
  if (facilityIds && !facilityIds.includes(req.params.facilityId)) {
    return res.status(403).json({ error: "This facility is outside your scope" });
  }
  res.json(analytics.rootCauseAnalysis(req.params.facilityId));
});

// GET /api/analytics/health-scores
router.get("/health-scores", (req, res) => {
  const facilityIds = scopedFacilityIds(req);
  res.json({ scores: analytics.healthScores(facilityIds ? { facilityIds } : {}) });
});

// GET /api/analytics/demand
router.get("/demand", (req, res) => {
  if (!["admin", "operations"].includes(req.user.role)) {
    return res.status(403).json({ error: "Demand intelligence is limited to operations and admin roles" });
  }
  res.json(analytics.demandIntelligence());
});

// GET /api/analytics/forecast
router.get("/forecast", (req, res) => {
  if (!["admin", "operations"].includes(req.user.role)) {
    return res.status(403).json({ error: "Forecasting is limited to operations and admin roles" });
  }
  res.json({ forecast: analytics.forecastNextPeriod() });
});

// GET /api/analytics/executive-insight
router.get("/executive-insight", (req, res) => {
  if (!["admin", "operations"].includes(req.user.role)) {
    return res.status(403).json({ error: "Executive insights are limited to operations and admin roles" });
  }
  res.json(analytics.executiveInsight());
});

// GET /api/analytics/export/:report  -> CSV export (utilisation, phantom-bookings, health-scores)
router.get("/export/:report", (req, res) => {
  if (!["admin", "operations"].includes(req.user.role)) {
    return res.status(403).json({ error: "Report export is limited to operations and admin roles" });
  }
  const facilityIds = scopedFacilityIds(req);
  let rows = [];
  if (req.params.report === "utilisation") rows = analytics.utilisationReport(facilityIds ? { facilityIds } : {});
  else if (req.params.report === "phantom-bookings") rows = analytics.phantomBookingReport(facilityIds ? { facilityIds } : {}).bookings;
  else if (req.params.report === "health-scores") rows = analytics.healthScores(facilityIds ? { facilityIds } : {});
  else return res.status(400).json({ error: "Unknown report type" });

  if (rows.length === 0) return res.status(200).send("");

  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.report}.csv"`);
  res.send(csv);
});

module.exports = router;
