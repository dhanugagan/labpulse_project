const express = require("express");
const { v4: uuidv4 } = require("uuid");
const dataStore = require("../services/dataStore");
const { applyScope, requireRole } = require("../middleware/rbac");

const router = express.Router();

// CREATE - admin only, adds a new facility to the institutional inventory
router.post("/", requireRole("admin"), (req, res) => {
  const { name, type, capacity, department } = req.body;
  if (!name || !type) return res.status(400).json({ error: "name and type are required" });

  const facilities = dataStore.getFacilities();
  const newFacility = {
    facility_id: `F${uuidv4().slice(0, 6).toUpperCase()}`,
    name,
    type,
    capacity: capacity || null,
    department: department || null,
    status: "active"
  };
  facilities.push(newFacility);
  dataStore.saveFacilities(facilities);
  res.status(201).json({ message: "Facility created", facility: newFacility });
});

// GET /api/facilities - scoped list of facilities visible to this user
router.get("/", (req, res) => {
  const scope = applyScope(req.user);
  const facilities = dataStore.getFacilities();

  let visible = facilities;
  if (scope.type === "department" || scope.type === "availability_only") {
    visible = facilities.filter((f) => f.department === (scope.value || req.user.department));
  } else if (scope.type === "facility_list") {
    visible = facilities.filter((f) => (scope.value || []).includes(f.facility_id));
  }

  res.json({ scope, facilities: visible });
});

// READ ONE
router.get("/:id", (req, res) => {
  const facilities = dataStore.getFacilities();
  const facility = facilities.find((f) => f.facility_id === req.params.id);
  if (!facility) return res.status(404).json({ error: "Facility not found" });
  res.json({ facility });
});

// UPDATE (full edit) - admin only
router.put("/:id", requireRole("admin"), (req, res) => {
  const facilities = dataStore.getFacilities();
  const facility = facilities.find((f) => f.facility_id === req.params.id);
  if (!facility) return res.status(404).json({ error: "Facility not found" });

  ["name", "type", "capacity", "department", "status"].forEach((field) => {
    if (req.body[field] !== undefined) facility[field] = req.body[field];
  });
  dataStore.saveFacilities(facilities);
  res.json({ message: "Facility updated", facility });
});

// DELETE - admin only
router.delete("/:id", requireRole("admin"), (req, res) => {
  const facilities = dataStore.getFacilities();
  const idx = facilities.findIndex((f) => f.facility_id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Facility not found" });
  facilities.splice(idx, 1);
  dataStore.saveFacilities(facilities);
  res.json({ message: "Facility deleted" });
});

// PATCH /api/facilities/:id/status - lab_incharge or maintenance can flag status
router.patch("/:id/status", (req, res) => {
  const { status } = req.body;
  const { role, assigned_facility_ids } = req.user;
  const facilityId = req.params.id;

  if (!["admin", "lab_incharge", "maintenance"].includes(role)) {
    return res.status(403).json({ error: "Not permitted to change facility status" });
  }
  if (role === "lab_incharge" && !(assigned_facility_ids || []).includes(facilityId)) {
    return res.status(403).json({ error: "This facility is outside your assigned scope" });
  }

  const facilities = dataStore.getFacilities();
  const facility = facilities.find((f) => f.facility_id === facilityId);
  if (!facility) return res.status(404).json({ error: "Facility not found" });

  facility.status = status;
  dataStore.saveFacilities(facilities);
  res.json({ message: "Facility status updated", facility });
});

module.exports = router;
