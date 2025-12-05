const express = require("express");
const router = express.Router();
const Call = require("../models/Call");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/authMiddleware");

// Apply auth middleware
router.use(authMiddleware);

// GET /api/calls/stats - Get dashboard stats
router.get("/stats", async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            activeCalls,
            agentsOnline,
            callsToday,
            resolvedToday
        ] = await Promise.all([
            Call.countDocuments({ status: "in-progress" }),
            User.countDocuments({ role: "agent", status: { $in: ["available", "busy"] } }),
            Call.countDocuments({ timestamp: { $gte: today } }),
            Call.countDocuments({
                timestamp: { $gte: today },
                status: "completed"
            })
        ]);

        // Calculate queue length (mock for now, or use active calls without agent)
        const queueLength = Math.max(0, activeCalls - agentsOnline);

        // Calculate avg wait time (mock or from DB)
        const avgWaitTime = "2:45";

        res.json({
            activeCalls,
            agentsOnline,
            queueLength,
            avgWaitTime,
            callsToday,
            resolvedToday
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/calls/recent - Get recent calls
router.get("/recent", async (req, res) => {
    try {
        const recentCalls = await Call.find()
            .sort({ timestamp: -1 })
            .limit(10);
        res.json(recentCalls);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/calls - Create new call (webhook from Asterisk)
router.post("/", async (req, res) => {
    try {
        const call = await Call.create(req.body);
        res.status(201).json(call);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
