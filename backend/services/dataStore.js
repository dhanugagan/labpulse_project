// ============================================================
// Lightweight JSON file data store standing in for the Delta
// tables that would live in Databricks Unity Catalog in
// production. Swap these read/write functions for real Delta
// / SQL Warehouse queries when connecting to Databricks.
// ============================================================
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

function load(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function save(fileName, data) {
  const filePath = path.join(DATA_DIR, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = {
  getUsers: () => load("users.json"),
  saveUsers: (data) => save("users.json", data),
  getFacilities: () => load("facilities.json"),
  saveFacilities: (data) => save("facilities.json", data),
  getBookings: () => load("bookings.json"),
  saveBookings: (data) => save("bookings.json", data),
  getUsageLogs: () => load("usageLogs.json"),
  saveUsageLogs: (data) => save("usageLogs.json", data),
  getMaintenance: () => load("maintenance.json"),
  saveMaintenance: (data) => save("maintenance.json", data),
  getNotifications: () => load("notifications.json"),
  saveNotifications: (data) => save("notifications.json", data),
  getAuditLogs: () => load("auditLogs.json"),
  saveAuditLogs: (data) => save("auditLogs.json", data),
  getDepartments: () => load("departments.json"),
  getEquipment: () => load("equipment.json")
};
