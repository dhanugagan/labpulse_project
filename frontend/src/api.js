const BASE_URL = "/api";

function getToken() {
  return localStorage.getItem("labpulse_token");
}

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  me: () => request("/auth/me"),
  getFacilities: () => request("/facilities"),
  updateFacilityStatus: (id, status) =>
    request(`/facilities/${id}/status`, { method: "PATCH", body: { status } }),
  getBookings: () => request("/bookings"),
  createBooking: (payload) => request("/bookings", { method: "POST", body: payload }),
  approveBooking: (id) => request(`/bookings/${id}/approve`, { method: "PATCH" }),
  getUsage: () => request("/usage"),
  logUsage: (payload) => request("/usage", { method: "POST", body: payload }),
  getMaintenance: () => request("/maintenance"),
  reportMaintenance: (payload) => request("/maintenance", { method: "POST", body: payload }),
  updateMaintenance: (id, payload) =>
    request(`/maintenance/${id}`, { method: "PATCH", body: payload }),
  askGenie: (question) => request("/genie/ask", { method: "POST", body: { question } }),
  // Full CRUD user management (admin only)
  getUsers: () => request("/users"),
  createUser: (payload) => request("/users", { method: "POST", body: payload }),
  updateUser: (id, payload) => request(`/users/${id}`, { method: "PATCH", body: payload }),
  deleteUser: (id) => request(`/users/${id}`, { method: "DELETE" }),
  // Full CRUD facilities (admin only for create/update/delete)
  createFacility: (payload) => request("/facilities", { method: "POST", body: payload }),
  updateFacility: (id, payload) => request(`/facilities/${id}`, { method: "PUT", body: payload }),
  deleteFacility: (id) => request(`/facilities/${id}`, { method: "DELETE" }),
  // Booking edit/cancel
  updateBooking: (id, payload) => request(`/bookings/${id}`, { method: "PUT", body: payload }),
  cancelBooking: (id) => request(`/bookings/${id}`, { method: "DELETE" }),
  rejectBooking: (id) => request(`/bookings/${id}/reject`, { method: "PATCH" }),
  // Analytics engine
  getUtilisation: () => request("/analytics/utilisation"),
  getPhantomBookings: () => request("/analytics/phantom-bookings"),
  getRootCause: (facilityId) => request(`/analytics/root-cause/${facilityId}`),
  getHealthScores: () => request("/analytics/health-scores"),
  getDemand: () => request("/analytics/demand"),
  getForecast: () => request("/analytics/forecast"),
  getExecutiveInsight: () => request("/analytics/executive-insight"),
  exportReportUrl: (report) => `${BASE_URL}/analytics/export/${report}`,
  downloadReport: async (report) => {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/analytics/export/${report}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  },
  // Notifications
  getNotifications: () => request("/notifications"),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: "PATCH" }),
  deleteNotification: (id) => request(`/notifications/${id}`, { method: "DELETE" }),
  // Audit trail
  getAuditLogs: () => request("/audit")
};

export { getToken };
