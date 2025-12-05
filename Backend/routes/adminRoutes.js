const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { authMiddleware, adminOnly } = require("../middleware/authMiddleware");
const { createAsteriskExtension } = require("../services/asteriskService");

// Apply auth and admin middleware to all routes
router.use(authMiddleware);
router.use(adminOnly);

// GET /api/admin/agents - List all agents
router.get("/agents", async (req, res) => {
    try {
        const agents = await User.find({ role: "agent" }).select("-password");
        res.json(agents);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/admin/agents/:id - Get single agent
router.get("/agents/:id", async (req, res) => {
    try {
        const agent = await User.findById(req.params.id).select("-password");
        if (!agent || agent.role !== "agent") {
            return res.status(404).json({ message: "Agent not found" });
        }
        res.json(agent);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/admin/agents - Create new agent
router.post("/agents", async (req, res) => {
    const { username, password, email, extension } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
    }

    try {
        // Check if username exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "Username already exists" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create agent in DB
        const agent = await User.create({
            username,
            password: hashedPassword,
            email: email || "",
            extension: extension || "",
            role: "agent",
            status: "offline"
        });

        // Create extension in Asterisk (Async)
        createAsteriskExtension(username, password, extension)
            .then(() => console.log(`Asterisk extension ${extension} created`))
            .catch(err => console.error("Failed to create Asterisk extension:", err));

        res.status(201).json({
            _id: agent._id,
            username: agent.username,
            email: agent.email,
            extension: agent.extension,
            role: agent.role,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/admin/agents/:id - Update agent
router.put("/agents/:id", async (req, res) => {
    const { username, password, email, extension, status } = req.body;

    try {
        const agent = await User.findById(req.params.id);
        if (!agent || agent.role !== "agent") {
            return res.status(404).json({ message: "Agent not found" });
        }

        // Update fields
        if (username) agent.username = username;
        if (email !== undefined) agent.email = email;
        if (extension !== undefined) agent.extension = extension;
        if (status) agent.status = status;

        // Update password if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            agent.password = await bcrypt.hash(password, salt);
        }

        await agent.save();

        res.json({
            _id: agent._id,
            username: agent.username,
            email: agent.email,
            extension: agent.extension,
            status: agent.status,
            role: agent.role,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/admin/agents/:id - Delete agent
router.delete("/agents/:id", async (req, res) => {
    try {
        const agent = await User.findById(req.params.id);
        if (!agent || agent.role !== "agent") {
            return res.status(404).json({ message: "Agent not found" });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "Agent deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/admin/stats - Get system stats
router.get("/stats", async (req, res) => {
    try {
        const totalAgents = await User.countDocuments({ role: "agent" });
        const onlineAgents = await User.countDocuments({ role: "agent", status: "available" });

        res.json({
            totalAgents,
            onlineAgents,
            offlineAgents: totalAgents - onlineAgents,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/admin/agents/:id/reset-password - Reset agent password
router.put("/agents/:id/reset-password", async (req, res) => {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    try {
        const agent = await User.findById(req.params.id);
        if (!agent || agent.role !== "agent") {
            return res.status(404).json({ message: "Agent not found" });
        }

        const salt = await bcrypt.genSalt(10);
        agent.password = await bcrypt.hash(newPassword, salt);
        await agent.save();

        res.json({ message: "Password reset successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/admin/agents/online - Get online agents
router.get("/agents-online", async (req, res) => {
    try {
        const onlineAgents = await User.find({
            role: "agent",
            status: { $in: ["available", "busy"] }
        }).select("-password");
        res.json(onlineAgents);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
