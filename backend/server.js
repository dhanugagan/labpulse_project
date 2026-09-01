require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { authenticate } = require("./middleware/auth");
const authRoutes = require("./routes/auth.routes");
const facilitiesRoutes = require("./routes/facilities.routes");
const bookingsRoutes = require("./routes/bookings.routes");
const usageRoutes = require("./routes/usage.routes");
const maintenanceRoutes = require("./routes/maintenance.routes");
const genieRoutes = require("./routes/genie.routes");
const usersRoutes = require("./routes/users.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const notificationsRoutes = require("./routes/notifications.routes");
const auditRoutes = require("./routes/audit.routes");

const app = express();
app.use(cors());
app.use(express.json());

// Auth routes: /login is public, /me enforces its own auth check internally
app.use("/api/auth", authRoutes);

// Everything below requires a valid JWT (role + scope embedded)
app.use("/api/facilities", authenticate, facilitiesRoutes);
app.use("/api/bookings", authenticate, bookingsRoutes);
app.use("/api/usage", authenticate, usageRoutes);
app.use("/api/maintenance", authenticate, maintenanceRoutes);
app.use("/api/genie", authenticate, genieRoutes);
app.use("/api/users", authenticate, usersRoutes);
app.use("/api/analytics", authenticate, analyticsRoutes);
app.use("/api/notifications", authenticate, notificationsRoutes);
app.use("/api/audit", authenticate, auditRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "LabPulse API" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`LabPulse API running on http://localhost:${PORT}`);
});
