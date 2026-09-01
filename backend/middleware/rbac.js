// ============================================================
// Role-Based Access Control
// ------------------------------------------------------------
// requireRole(...roles)  -> blocks the route unless req.user.role
//                            is one of the allowed roles
// applyScope(req)        -> returns a scope object describing what
//                            data slice this user is allowed to see.
//                            Used by route handlers AND passed into
//                            the Genie service so Genie's answers
//                            respect the same boundaries as the API.
// ============================================================

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Role '${req.user.role}' is not permitted to access this resource`
      });
    }
    next();
  };
}

function applyScope(user) {
  switch (user.role) {
    case "admin":
    case "operations":
      return { type: "all" };

    case "faculty":
      return { type: "department", value: user.department, ownBookingsOnly: true };

    case "student":
      return { type: "availability_only", value: user.department };

    case "lab_incharge":
      return { type: "facility_list", value: user.assigned_facility_ids || [] };

    case "maintenance":
      return { type: "maintenance_only" };

    case "guest":
      return { type: "facility_list", value: user.assigned_facility_ids || [], availabilityOnly: true };

    default:
      return { type: "none" };
  }
}

// Filters an array of facility-linked records (bookings, usage_logs,
// maintenance_records) down to what the given scope permits.
function filterByScope(records, scope, facilityLookup) {
  if (scope.type === "all") return records;

  if (scope.type === "department") {
    return records.filter((r) => {
      const facility = facilityLookup[r.facility_id];
      return facility && facility.department === scope.value;
    });
  }

  if (scope.type === "facility_list") {
    return records.filter((r) => scope.value.includes(r.facility_id));
  }

  if (scope.type === "availability_only" || scope.type === "maintenance_only") {
    // These scopes are enforced at the route level by choosing which
    // fields/endpoints are exposed at all, not by filtering rows.
    return records;
  }

  return [];
}

module.exports = { requireRole, applyScope, filterByScope };
