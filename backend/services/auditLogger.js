// ============================================================
// Audit Logger — records every important action so admins can
// reconstruct how a decision or change happened. Called from
// route handlers after a successful create/update/delete.
// ============================================================
const { v4: uuidv4 } = require("uuid");
const dataStore = require("./dataStore");

function logAction({ user_id, role, action, details }) {
  const logs = dataStore.getAuditLogs();
  logs.push({
    audit_id: `A${uuidv4().slice(0, 6).toUpperCase()}`,
    user_id,
    role,
    action,
    details: details || "",
    timestamp: new Date().toISOString()
  });
  dataStore.saveAuditLogs(logs);
}

module.exports = { logAction };
