// ============================================================
// User Management — full CRUD, admin-only.
// This is what lets an admin actually onboard a real college:
// create accounts, assign roles/scopes, deactivate leavers,
// reassign a lab incharge to a different lab, etc.
// ============================================================
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const dataStore = require("../services/dataStore");
const { requireRole } = require("../middleware/rbac");

const router = express.Router();

// All routes below require admin
router.use(requireRole("admin"));

// CREATE
router.post("/", (req, res) => {
  const { name, email, password, role, department, assigned_facility_ids, access_expires_at } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "name, email, password, and role are required" });
  }

  const users = dataStore.getUsers();
  if (users.some((u) => u.email === email)) {
    return res.status(409).json({ error: "A user with this email already exists" });
  }

  const newUser = {
    user_id: `U${uuidv4().slice(0, 6).toUpperCase()}`,
    name,
    email,
    password, // demo only — hash with bcrypt before real deployment
    role,
    department: department || null,
    assigned_facility_ids: assigned_facility_ids || [],
    active: true,
    access_expires_at: access_expires_at || null
  };
  users.push(newUser);
  dataStore.saveUsers(users);

  const { password: _pw, ...safeUser } = newUser;
  res.status(201).json({ message: "User created", user: safeUser });
});

// READ ALL
router.get("/", (req, res) => {
  const users = dataStore.getUsers().map(({ password, ...safe }) => safe);
  res.json({ users });
});

// READ ONE
router.get("/:id", (req, res) => {
  const users = dataStore.getUsers();
  const user = users.find((u) => u.user_id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const { password, ...safe } = user;
  res.json({ user: safe });
});

// UPDATE (role, department, scope, active status)
router.patch("/:id", (req, res) => {
  const users = dataStore.getUsers();
  const user = users.find((u) => u.user_id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const editable = ["name", "role", "department", "assigned_facility_ids", "active", "access_expires_at", "password"];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) user[field] = req.body[field];
  });

  dataStore.saveUsers(users);
  const { password, ...safe } = user;
  res.json({ message: "User updated", user: safe });
});

// DELETE (soft-delete by default; hard delete with ?hard=true)
router.delete("/:id", (req, res) => {
  const users = dataStore.getUsers();
  const idx = users.findIndex((u) => u.user_id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "User not found" });

  if (req.query.hard === "true") {
    users.splice(idx, 1);
    dataStore.saveUsers(users);
    return res.json({ message: "User permanently deleted" });
  }

  users[idx].active = false;
  dataStore.saveUsers(users);
  res.json({ message: "User deactivated", user: users[idx] });
});

module.exports = router;
