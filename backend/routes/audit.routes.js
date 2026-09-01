const express = require("express");
const dataStore = require("../services/dataStore");
const { requireRole } = require("../middleware/rbac");

const router = express.Router();

// GET /api/audit - admin only, full audit trail
router.get("/", requireRole("admin"), (req, res) => {
  const logs = dataStore.getAuditLogs().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json({ logs });
});

module.exports = router;
