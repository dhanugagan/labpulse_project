const express = require("express");
const { v4: uuidv4 } = require("uuid");
const dataStore = require("../services/dataStore");
const { applyScope } = require("../middleware/rbac");
const { logAction } = require("../services/auditLogger");
const { notify } = require("../services/notificationService");

const router = express.Router();

// GET /api/bookings - scoped to the requester
router.get("/", (req, res) => {
  const scope = applyScope(req.user);
  const facilities = dataStore.getFacilities();
  const facilityLookup = Object.fromEntries(facilities.map((f) => [f.facility_id, f]));
  let bookings = dataStore.getBookings();

  if (scope.type === "department") {
    bookings = bookings.filter((b) => facilityLookup[b.facility_id]?.department === scope.value);
    if (scope.ownBookingsOnly) {
      bookings = bookings.filter((b) => b.requested_by === req.user.user_id);
    }
  } else if (scope.type === "facility_list") {
    bookings = bookings.filter((b) => (scope.value || []).includes(b.facility_id));
  } else if (scope.type === "availability_only") {
    // Students only see confirmed bookings for time-slot checking, no requester identity
    bookings = bookings
      .filter((b) => facilityLookup[b.facility_id]?.department === req.user.department)
      .map((b) => ({ facility_id: b.facility_id, start_time: b.start_time, end_time: b.end_time, status: b.status }));
  }

  res.json({ scope, bookings });
});

// POST /api/bookings - create a booking or an approval request depending on role
router.post("/", (req, res) => {
  const { facility_id, purpose, start_time, end_time } = req.body;
  const { role, user_id, department } = req.user;
  const facilities = dataStore.getFacilities();
  const facility = facilities.find((f) => f.facility_id === facility_id);

  if (!facility) return res.status(404).json({ error: "Facility not found" });
  if (facility.status !== "active") {
    return res.status(409).json({ error: "Facility is currently unavailable (under maintenance)" });
  }

  const bookings = dataStore.getBookings();

  // Faculty & lab_incharge can book directly; students trigger an approval request
  if (role === "faculty" || role === "lab_incharge" || role === "admin") {
    const newBooking = {
      booking_id: `B${uuidv4().slice(0, 6).toUpperCase()}`,
      facility_id,
      requested_by: user_id,
      approved_by: user_id,
      purpose,
      start_time,
      end_time,
      status: "confirmed"
    };
    bookings.push(newBooking);
    dataStore.saveBookings(bookings);
    logAction({ user_id, role, action: "booking_created", details: `${newBooking.booking_id} on ${facility_id}` });
    notify({
      user_id,
      type: "booking_confirmed",
      message: `Your booking for ${facility.name} on ${start_time} is confirmed.`,
      related_facility_id: facility_id
    });
    return res.status(201).json({ message: "Booking confirmed", booking: newBooking });
  }

  if (role === "student") {
    // In a full build this writes to an approval_requests table and
    // notifies the relevant faculty/lab_incharge. Represented here as
    // a pending booking for demo simplicity.
    const pendingBooking = {
      booking_id: `B${uuidv4().slice(0, 6).toUpperCase()}`,
      facility_id,
      requested_by: user_id,
      approved_by: null,
      purpose,
      start_time,
      end_time,
      status: "pending"
    };
    bookings.push(pendingBooking);
    dataStore.saveBookings(bookings);
    logAction({ user_id, role, action: "booking_requested", details: `${pendingBooking.booking_id} on ${facility_id} (pending)` });
    return res.status(202).json({
      message: "Request submitted for faculty/lab incharge approval",
      booking: pendingBooking
    });
  }

  return res.status(403).json({ error: "Your role cannot create bookings" });
});

// PATCH /api/bookings/:id/approve - faculty or lab_incharge approves a student request
router.patch("/:id/approve", (req, res) => {
  const { role, user_id } = req.user;
  if (!["faculty", "lab_incharge", "admin"].includes(role)) {
    return res.status(403).json({ error: "Not permitted to approve bookings" });
  }
  const bookings = dataStore.getBookings();
  const booking = bookings.find((b) => b.booking_id === req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  booking.status = "confirmed";
  booking.approved_by = user_id;
  dataStore.saveBookings(bookings);
  res.json({ message: "Booking approved", booking });
});

// PATCH /api/bookings/:id/reject - faculty or lab_incharge rejects a student request
router.patch("/:id/reject", (req, res) => {
  const { role } = req.user;
  if (!["faculty", "lab_incharge", "admin"].includes(role)) {
    return res.status(403).json({ error: "Not permitted to reject bookings" });
  }
  const bookings = dataStore.getBookings();
  const booking = bookings.find((b) => b.booking_id === req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  booking.status = "rejected";
  dataStore.saveBookings(bookings);
  res.json({ message: "Booking rejected", booking });
});

// PUT /api/bookings/:id - full update, owner or admin only
router.put("/:id", (req, res) => {
  const { role, user_id } = req.user;
  const bookings = dataStore.getBookings();
  const booking = bookings.find((b) => b.booking_id === req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  if (role !== "admin" && booking.requested_by !== user_id) {
    return res.status(403).json({ error: "You can only edit your own bookings" });
  }

  ["purpose", "start_time", "end_time"].forEach((field) => {
    if (req.body[field] !== undefined) booking[field] = req.body[field];
  });
  dataStore.saveBookings(bookings);
  res.json({ message: "Booking updated", booking });
});

// DELETE /api/bookings/:id - cancel a booking (owner or admin)
router.delete("/:id", (req, res) => {
  const { role, user_id } = req.user;
  const bookings = dataStore.getBookings();
  const idx = bookings.findIndex((b) => b.booking_id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Booking not found" });

  if (role !== "admin" && bookings[idx].requested_by !== user_id) {
    return res.status(403).json({ error: "You can only cancel your own bookings" });
  }

  bookings[idx].status = "cancelled";
  dataStore.saveBookings(bookings);
  logAction({ user_id, role, action: "booking_cancelled", details: bookings[idx].booking_id });
  notify({
    user_id: bookings[idx].requested_by,
    type: "booking_cancelled",
    message: `Booking ${bookings[idx].booking_id} was cancelled.`,
    related_facility_id: bookings[idx].facility_id
  });
  res.json({ message: "Booking cancelled", booking: bookings[idx] });
});

module.exports = router;
