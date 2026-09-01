const express = require("express");
const { v4: uuidv4 } = require("uuid");
const dataStore = require("../services/dataStore");
const { applyScope } = require("../middleware/rbac");
const { logAction } = require("../services/auditLogger");
const { notify } = require("../services/notificationService");

const router = express.Router();

// GET /api/maintenance - scoped ticket queue
router.get("/", (req, res) => {
  const { role } = req.user;
  if (role === "student" || role === "guest") {
    return res.status(403).json({ error: "Maintenance records are not available for this role" });
  }
  const scope = applyScope(req.user);
  let tickets = dataStore.getMaintenance();

  if (scope.type === "facility_list") {
    tickets = tickets.filter((t) => (scope.value || []).includes(t.facility_id));
  } else if (scope.type === "department") {
    const facilities = dataStore.getFacilities();
    const facilityLookup = Object.fromEntries(facilities.map((f) => [f.facility_id, f]));
    tickets = tickets.filter((t) => facilityLookup[t.facility_id]?.department === scope.value);
  }
  // maintenance role and operations/admin see full ticket queue (type "all" / "maintenance_only")

  res.json({ scope, tickets });
});

// POST /api/maintenance - lab_incharge (or faculty) reports a new issue
router.post("/", (req, res) => {
  const { role, user_id, assigned_facility_ids } = req.user;
  const { facility_id, issue, severity } = req.body;

  if (!["lab_incharge", "faculty", "admin"].includes(role)) {
    return res.status(403).json({ error: "This role cannot report maintenance issues" });
  }
  if (role === "lab_incharge" && !(assigned_facility_ids || []).includes(facility_id)) {
    return res.status(403).json({ error: "This facility is outside your assigned scope" });
  }

  const tickets = dataStore.getMaintenance();
  const newTicket = {
    ticket_id: `T${uuidv4().slice(0, 6).toUpperCase()}`,
    facility_id,
    reported_by: user_id,
    assigned_to: null,
    issue,
    severity: severity || "medium",
    reported_date: new Date().toISOString().slice(0, 10),
    resolved_date: null,
    status: "open"
  };
  tickets.push(newTicket);
  dataStore.saveMaintenance(tickets);
  logAction({ user_id, role, action: "maintenance_reported", details: `${newTicket.ticket_id} on ${facility_id}` });

  // Auto-flag facility as under_maintenance if severity is high/critical
  if (["high", "critical"].includes(newTicket.severity)) {
    const facilities = dataStore.getFacilities();
    const facility = facilities.find((f) => f.facility_id === facility_id);
    if (facility) {
      facility.status = "under_maintenance";
      dataStore.saveFacilities(facilities);
      notify({
        role_target: "operations",
        type: "maintenance_alert",
        message: `${facility.name} flagged under maintenance: ${issue}`,
        related_facility_id: facility_id
      });
    }
  }

  res.status(201).json({ message: "Maintenance ticket created", ticket: newTicket });
});

// PATCH /api/maintenance/:id - maintenance team updates ticket status
router.patch("/:id", (req, res) => {
  const { role } = req.user;
  const { status, resolved_date } = req.body;

  if (!["maintenance", "admin"].includes(role)) {
    return res.status(403).json({ error: "Only the maintenance team can update tickets" });
  }

  const tickets = dataStore.getMaintenance();
  const ticket = tickets.find((t) => t.ticket_id === req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  ticket.status = status;
  if (status === "resolved") {
    ticket.resolved_date = resolved_date || new Date().toISOString().slice(0, 10);
    // Reactivate the facility once resolved
    const facilities = dataStore.getFacilities();
    const facility = facilities.find((f) => f.facility_id === ticket.facility_id);
    if (facility) {
      facility.status = "active";
      dataStore.saveFacilities(facilities);
      notify({
        role_target: "faculty",
        type: "facility_available",
        message: `${facility.name} is available again — maintenance resolved.`,
        related_facility_id: facility.facility_id
      });
    }
  }
  dataStore.saveMaintenance(tickets);
  logAction({ user_id: req.user.user_id, role: req.user.role, action: "maintenance_updated", details: `${ticket.ticket_id} -> ${status}` });
  res.json({ message: "Ticket updated", ticket });
});

// DELETE /api/maintenance/:id - admin only, removes a mistaken/duplicate ticket
router.delete("/:id", (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admin can delete maintenance tickets" });
  }
  const tickets = dataStore.getMaintenance();
  const idx = tickets.findIndex((t) => t.ticket_id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Ticket not found" });
  tickets.splice(idx, 1);
  dataStore.saveMaintenance(tickets);
  res.json({ message: "Ticket deleted" });
});

module.exports = router;
