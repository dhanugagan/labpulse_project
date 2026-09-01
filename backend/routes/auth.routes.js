const express = require("express");
const jwt = require("jsonwebtoken");
const dataStore = require("../services/dataStore");
const { authenticate } = require("../middleware/auth");
const { logAction } = require("../services/auditLogger");

const router = express.Router();

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const users = dataStore.getUsers();
  const user = users.find((u) => u.email === email);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  if (!user.active) {
    return res.status(403).json({ error: "This account has been deactivated" });
  }
  if (user.access_expires_at && Date.now() > new Date(user.access_expires_at).getTime()) {
    return res.status(403).json({ error: "This guest account's access window has expired" });
  }

  const payload = {
    user_id: user.user_id,
    name: user.name,
    role: user.role,
    department: user.department,
    assigned_facility_ids: user.assigned_facility_ids || [],
    access_expires_at: user.access_expires_at || null
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h"
  });

  logAction({ user_id: user.user_id, role: user.role, action: "login", details: `${user.email} logged in` });

  res.json({ token, user: payload });
});

// GET /api/auth/me  (for the frontend to rehydrate session)
router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
