const express = require("express");
const dataStore = require("../services/dataStore");

const router = express.Router();

// GET /api/notifications - notifications addressed to this user or their role
router.get("/", (req, res) => {
  const { user_id, role } = req.user;
  const all = dataStore.getNotifications();
  const mine = all.filter((n) => n.user_id === user_id || n.role_target === role);
  res.json({ notifications: mine.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) });
});

// PATCH /api/notifications/:id/read - mark as read
router.patch("/:id/read", (req, res) => {
  const all = dataStore.getNotifications();
  const n = all.find((x) => x.notification_id === req.params.id);
  if (!n) return res.status(404).json({ error: "Notification not found" });
  if (n.user_id && n.user_id !== req.user.user_id) {
    return res.status(403).json({ error: "Not your notification" });
  }
  n.read = true;
  dataStore.saveNotifications(all);
  res.json({ message: "Marked as read", notification: n });
});

// DELETE /api/notifications/:id
router.delete("/:id", (req, res) => {
  const all = dataStore.getNotifications();
  const idx = all.findIndex((x) => x.notification_id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Notification not found" });
  if (all[idx].user_id && all[idx].user_id !== req.user.user_id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Not your notification" });
  }
  all.splice(idx, 1);
  dataStore.saveNotifications(all);
  res.json({ message: "Notification deleted" });
});

module.exports = router;
