const express = require("express");
const { applyScope } = require("../middleware/rbac");
const { askGenie } = require("../services/genieService");

const router = express.Router();

// POST /api/genie/ask
// Body: { question: "Which labs are free tomorrow at 2 PM?" }
// This is the single entry point every dashboard's chat box calls.
// The scope is derived server-side from the authenticated user —
// never trust a scope sent from the client.
router.post("/ask", async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "A 'question' string is required" });
  }

  const scope = applyScope(req.user);

  try {
    const result = await askGenie({ user: req.user, scope, question });
    res.json({
      question,
      role: req.user.role,
      scope,
      answer: result.answer,
      data: result.data,
      raw: result.raw || null
    });
  } catch (err) {
    res.status(502).json({ error: "Genie request failed", details: err.message });
  }
});

module.exports = router;
