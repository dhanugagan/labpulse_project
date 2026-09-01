const express = require("express");
const { v4: uuidv4 } = require("uuid");
const dataStore = require("../services/dataStore");
const { applyScope } = require("../middleware/rbac");

const router = express.Router();

// GET /api/usage - scoped usage logs (not visible to students or maintenance)
router.get("/", (req, res) => {
  const { role } = req.user;
  if (role === "student" || role === "guest") {
    return res.status(403).json({ error: "Usage analytics are not available for this role" });
  }
  const scope = applyScope(req.user);
  const facilities = dataStore.getFacilities();
  const facilityLookup = Object.fromEntries(facilities.map((f) => [f.facility_id, f]));
  let logs = dataStore.getUsageLogs();

  if (scope.type === "department") {
    logs = logs.filter((l) => facilityLookup[l.facility_id]?.department === scope.value);
  } else if (scope.type === "facility_list") {
    logs = logs.filter((l) => (scope.value || []).includes(l.facility_id));
  } else if (scope.type === "maintenance_only") {
    return res.status(403).json({ error: "Usage analytics are outside the maintenance role's scope" });
  }

  res.json({ scope, logs });
});

// POST /api/usage - lab_incharge manually logs actual usage (when no IoT feed exists)
router.post("/", (req, res) => {
  const { role, user_id, assigned_facility_ids } = req.user;
  const { facility_id, booking_id, log_date, hours_actually_used, headcount } = req.body;

  if (!["lab_incharge", "admin"].includes(role)) {
    return res.status(403).json({ error: "Only lab incharges can log usage" });
  }
  if (role === "lab_incharge" && !(assigned_facility_ids || []).includes(facility_id)) {
    return res.status(403).json({ error: "This facility is outside your assigned scope" });
  }

  const logs = dataStore.getUsageLogs();
  const newLog = {
    log_id: `L${uuidv4().slice(0, 6).toUpperCase()}`,
    facility_id,
    booking_id,
    log_date,
    hours_actually_used,
    headcount,
    logged_by: user_id,
    source: "manual"
  };
  logs.push(newLog);
  dataStore.saveUsageLogs(logs);
  res.status(201).json({ message: "Usage logged", log: newLog });
});

// PUT /api/usage/:id - correct a usage entry (lab_incharge on their facility, or admin)
router.put("/:id", (req, res) => {
  const { role, assigned_facility_ids } = req.user;
  const logs = dataStore.getUsageLogs();
  const log = logs.find((l) => l.log_id === req.params.id);
  if (!log) return res.status(404).json({ error: "Usage log not found" });

  if (role === "lab_incharge" && !(assigned_facility_ids || []).includes(log.facility_id)) {
    return res.status(403).json({ error: "This facility is outside your assigned scope" });
  }
  if (!["lab_incharge", "admin"].includes(role)) {
    return res.status(403).json({ error: "Not permitted to edit usage logs" });
  }

  ["hours_actually_used", "headcount", "log_date"].forEach((field) => {
    if (req.body[field] !== undefined) log[field] = req.body[field];
  });
  dataStore.saveUsageLogs(logs);
  res.json({ message: "Usage log updated", log });
});

// DELETE /api/usage/:id - remove an incorrect entry (lab_incharge on their facility, or admin)
router.delete("/:id", (req, res) => {
  const { role, assigned_facility_ids } = req.user;
  const logs = dataStore.getUsageLogs();
  const idx = logs.findIndex((l) => l.log_id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Usage log not found" });

  if (role === "lab_incharge" && !(assigned_facility_ids || []).includes(logs[idx].facility_id)) {
    return res.status(403).json({ error: "This facility is outside your assigned scope" });
  }
  if (!["lab_incharge", "admin"].includes(role)) {
    return res.status(403).json({ error: "Not permitted to delete usage logs" });
  }

  logs.splice(idx, 1);
  dataStore.saveUsageLogs(logs);
  res.json({ message: "Usage log deleted" });
});

module.exports = router;
