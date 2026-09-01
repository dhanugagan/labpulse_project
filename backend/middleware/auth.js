const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }
  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded carries: user_id, role, department, assigned_facility_ids
    req.user = decoded;

    // Enforce guest / time-boxed access expiry at the request layer
    if (decoded.access_expires_at) {
      const expiry = new Date(decoded.access_expires_at);
      if (Date.now() > expiry.getTime()) {
        return res.status(403).json({ error: "Access window has expired for this account" });
      }
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { authenticate };
