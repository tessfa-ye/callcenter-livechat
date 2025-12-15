const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Call = require("../models/Call");
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
            .then(() => { /* Extension created successfully */ })
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
        // Use the same query pattern as agents-online for consistency
        const allAgents = await User.find({ role: "agent" }).select("status").lean();
        const totalAgents = allAgents.length;
        const onlineAgents = allAgents.filter(agent =>
            ["available", "busy", "away"].includes(agent.status)
        ).length;



        const activeCalls = await Call.countDocuments({ status: "in-progress" });

        res.json({
            totalAgents,
            onlineAgents,
            offlineAgents: totalAgents - onlineAgents,
            activeCalls,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/admin/system-status - Get real-time system health
router.get("/system-status", async (req, res) => {
    try {
        const mongoose = require("mongoose");
        const AsteriskManager = require("asterisk-manager");

        // Check database connection
        const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";

        // Check Asterisk AMI connection
        let asteriskStatus = "disconnected";
        let asteriskInfo = null;

        if (process.env.AMI_HOST) {
            try {
                // Create a temporary AMI connection to test
                const testAmi = new AsteriskManager(
                    process.env.AMI_PORT,
                    process.env.AMI_HOST,
                    process.env.AMI_USER,
                    process.env.AMI_PASS,
                    false // Don't keep connected
                );

                // Test connection with a simple command
                await new Promise((resolve, reject) => {
                    testAmi.action({ action: "CoreStatus" }, (err, response) => {
                        if (err) {
                            reject(err);
                        } else {
                            asteriskStatus = "connected";
                            asteriskInfo = {
                                version: response.asteriskversion || "Unknown",
                                uptime: response.systemuptime || "Unknown",
                                calls: response.currentcalls || 0
                            };
                            resolve();
                        }
                    });

                    // Timeout after 3 seconds
                    setTimeout(() => reject(new Error("Timeout")), 3000);
                });

                testAmi.disconnect();
            } catch (err) {
                console.error("Asterisk health check failed:", err.message);
                asteriskStatus = "error";
            }
        }

        // Server uptime
        const uptime = process.uptime();
        const uptimeFormatted = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;

        // Memory usage
        const memUsage = process.memoryUsage();
        const memoryUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
        const memoryTotal = Math.round(memUsage.heapTotal / 1024 / 1024);

        res.json({
            server: {
                status: "online",
                uptime: uptimeFormatted,
                memory: `${memoryUsed}MB / ${memoryTotal}MB`,
                nodeVersion: process.version
            },
            database: {
                status: dbStatus,
                type: "MongoDB",
                host: mongoose.connection.host || "Unknown"
            },
            asterisk: {
                status: asteriskStatus,
                host: process.env.AMI_HOST || "Not configured",
                info: asteriskInfo
            },
            websocket: {
                status: "active", // If this endpoint responds, Socket.IO is working
                connections: req.app.get('io')?.engine?.clientsCount || 0
            }
        });
    } catch (err) {
        res.status(500).json({
            message: err.message,
            server: { status: "error" },
            database: { status: "error" },
            asterisk: { status: "error" },
            websocket: { status: "error" }
        });
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

// GET /api/admin/agents/online - Get online agents with detailed status
router.get("/agents-online", async (req, res) => {
    try {
        // Use the same query as the stats endpoint to ensure consistency
        const onlineAgents = await User.find({
            role: "agent",
            status: { $in: ["available", "busy", "away"] }
        }).select("-password").lean(); // Use lean() for better performance

        // Add additional info for each agent
        const agentsWithDetails = onlineAgents.map(agent => ({
            ...agent,
            lastSeen: new Date(), // In real system, track actual last activity
            loginTime: agent.createdAt, // Mock - should track actual login time
            isActive: ["available", "busy"].includes(agent.status)
        }));



        res.json(agentsWithDetails);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/admin/recent-activity - Get recent system activity
router.get("/recent-activity", async (req, res) => {
    try {
        const Message = require("../models/Message");
        const Call = require("../models/Call");

        // Get recent messages (last 10)
        const recentMessages = await Message.find()
            .sort({ timestamp: -1 })
            .limit(5)
            .lean();

        // Get recent calls (last 10)
        const recentCalls = await Call.find()
            .sort({ timestamp: -1 })
            .limit(5)
            .lean();

        // Get recent agent status changes (simulate from user updates)
        const recentAgentUpdates = await User.find({ role: "agent" })
            .sort({ createdAt: -1 })
            .limit(5)
            .select("username status createdAt")
            .lean();

        // Combine and format activities
        const activities = [];

        recentMessages.forEach(msg => {
            activities.push({
                type: "message",
                description: `Message from ${msg.from} to ${msg.to}`,
                timestamp: msg.timestamp,
                icon: "message"
            });
        });

        recentCalls.forEach(call => {
            activities.push({
                type: "call",
                description: `${call.direction} call: ${call.caller} → ${call.agent} (${call.status})`,
                timestamp: call.timestamp,
                icon: "phone"
            });
        });

        recentAgentUpdates.forEach(agent => {
            activities.push({
                type: "agent",
                description: `Agent ${agent.username} status: ${agent.status}`,
                timestamp: agent.createdAt,
                icon: "user"
            });
        });

        // Sort by timestamp and limit
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json(activities.slice(0, 10));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/admin/performance-metrics - Get system performance data
router.get("/performance-metrics", async (req, res) => {
    try {
        const Message = require("../models/Message");
        const Call = require("../models/Call");

        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Messages today
        const messagesToday = await Message.countDocuments({
            timestamp: { $gte: today, $lt: tomorrow }
        });

        // Calls today
        const callsToday = await Call.countDocuments({
            timestamp: { $gte: today, $lt: tomorrow }
        });

        // Average call duration (mock calculation)
        const completedCalls = await Call.find({
            status: "completed",
            timestamp: { $gte: today, $lt: tomorrow }
        });

        let avgDuration = "0:00";
        if (completedCalls.length > 0) {
            // This is a simplified calculation - in real system you'd parse duration strings
            avgDuration = "2:45"; // Mock average
        }

        // System load (simplified)
        const memUsage = process.memoryUsage();
        const cpuUsage = Math.round(Math.random() * 30 + 10); // Mock CPU usage

        res.json({
            messagesToday,
            callsToday,
            avgCallDuration: avgDuration,
            systemLoad: {
                cpu: `${cpuUsage}%`,
                memory: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
                uptime: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/admin/test-db - Test database queries directly
router.get("/test-db", async (req, res) => {
    try {
        // Test the exact same queries used by both endpoints
        const allAgents = await User.find({ role: "agent" }).select("username status").lean();
        const onlineAgentsQuery = await User.find({
            role: "agent",
            status: { $in: ["available", "busy", "away"] }
        }).select("username status").lean();

        const onlineCount1 = allAgents.filter(agent =>
            ["available", "busy", "away"].includes(agent.status)
        ).length;

        const onlineCount2 = onlineAgentsQuery.length;

        res.json({
            method1_allAgents: {
                total: allAgents.length,
                online: onlineCount1,
                agents: allAgents
            },
            method2_directQuery: {
                online: onlineCount2,
                agents: onlineAgentsQuery
            },
            match: onlineCount1 === onlineCount2,
            timestamp: new Date()
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/admin/sync-agent-status - Manually sync agent statuses
router.post("/sync-agent-status", async (req, res) => {
    try {
        // Get all agents
        const agents = await User.find({ role: "agent" });
        let syncedCount = 0;

        // Get connected agents from server memory (if available)
        const connectedAgents = req.app.get('connectedAgents') || new Map();

        for (const agent of agents) {
            const isConnected = connectedAgents.has(agent.username);
            const shouldBeOnline = isConnected;
            const isCurrentlyOnline = ["available", "busy", "away"].includes(agent.status);

            // If agent is connected but marked offline, set to available
            if (shouldBeOnline && !isCurrentlyOnline) {
                await User.findByIdAndUpdate(agent._id, { status: "available" });
                syncedCount++;
            }
            // If agent is not connected but marked online, set to offline
            else if (!shouldBeOnline && isCurrentlyOnline) {
                await User.findByIdAndUpdate(agent._id, { status: "offline" });
                syncedCount++;
            }
        }

        res.json({
            message: `Synced ${syncedCount} agent statuses`,
            syncedCount
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
