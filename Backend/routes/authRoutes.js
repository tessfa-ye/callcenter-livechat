const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // ⚠️ Check that both username and password exist
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1d"
    });

    res.json({ token, username: user.username, role: user.role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auth/status - Update agent status
router.put("/status", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token" });

  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  try {
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.status = req.body.status;
    await user.save();

    res.json({ message: "Status updated", status: user.status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/agents - Get list of agents with status (for messaging)
router.get("/agents", async (req, res) => {
  // Simple auth check
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token provided" });

  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  try {
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) return res.status(401).json({ message: "Invalid token" });
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
  // Fetch agents
  try {
    const agents = await User.find({ role: "agent" }).select("-password");

    // Add additional info for each agent
    const agentsWithStatus = agents.map(agent => ({
      _id: agent._id,
      username: agent.username,
      email: agent.email,
      extension: agent.extension,
      status: agent.status,
      isOnline: ["available", "busy", "away"].includes(agent.status),
      lastSeen: new Date(), // In a real system, you'd track actual last activity
      createdAt: agent.createdAt
    }));

    res.json(agentsWithStatus);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
