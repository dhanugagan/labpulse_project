// ============================================================
// Notification Service — generates in-app alerts for both
// faculty-facing events (booking confirmed/cancelled, facility
// affected by maintenance) and operations-facing events
// (underutilisation, demand spikes, repeated phantom bookings).
// ============================================================
const { v4: uuidv4 } = require("uuid");
const dataStore = require("./dataStore");

function notify({ user_id = null, role_target = null, type, message, related_facility_id = null }) {
  const notifications = dataStore.getNotifications();
  notifications.push({
    notification_id: `N${uuidv4().slice(0, 6).toUpperCase()}`,
    user_id,
    role_target,
    type,
    message,
    related_facility_id,
    read: false,
    created_at: new Date().toISOString()
  });
  dataStore.saveNotifications(notifications);
}

module.exports = { notify };
