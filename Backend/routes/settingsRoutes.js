const express = require("express");
const router = express.Router();
const Settings = require("../models/Settings");
const { authMiddleware, adminOnly } = require("../middleware/authMiddleware");

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/settings - Get all settings (available to all authenticated users)
router.get("/", async (req, res) => {
    try {
        const settings = await Settings.find({});

        // Convert to object format for frontend
        const settingsObj = {};
        settings.forEach(setting => {
            settingsObj[setting.category] = setting.settings;
        });

        // Provide defaults if no settings exist
        const defaultSettings = {
            general: {
                systemName: "Call Center Pro",
                timezone: "UTC",
                language: "English",
                autoLogout: 30,
                sessionTimeout: 60,
            },
            agents: {
                maxAgents: 50,
                defaultStatus: "available",
                allowStatusChange: true,
                forceBreakTime: false,
                maxBreakDuration: 15,
                autoAssignCalls: true,
            },
            calls: {
                recordCalls: true,
                maxCallDuration: 3600,
                callTimeout: 30,
                enableTransfer: true,
                enableConference: true,
                enableHold: true,
            },
            notifications: {
                emailNotifications: true,
                smsNotifications: false,
                pushNotifications: true,
                soundAlerts: true,
                newAgentAlert: true,
                systemDownAlert: true,
            },
            security: {
                passwordMinLength: 8,
                requireSpecialChars: true,
                sessionSecurity: "high",
                twoFactorAuth: false,
                ipWhitelist: [],
                loginAttempts: 3,
            },
            asterisk: {
                host: "172.20.47.25",
                amiPort: 5038,
                sipPort: 5060,
                enableSIP: true,
                enableWebRTC: true,
                codecPreference: "ulaw",
            }
        };

        // Merge defaults with saved settings
        const finalSettings = { ...defaultSettings, ...settingsObj };

        res.json(finalSettings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/settings/:category - Update settings (admin only)
router.put("/:category", adminOnly, async (req, res) => {
    try {
        const { category } = req.params;
        const { settings } = req.body;
        const username = req.user.username;

        // Validate category
        const validCategories = ["general", "agents", "calls", "notifications", "security", "asterisk"];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ message: "Invalid settings category" });
        }

        // Update or create settings
        const updatedSettings = await Settings.findOneAndUpdate(
            { category },
            {
                category,
                settings,
                updatedBy: username,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );

        // Broadcast settings change to all connected clients
        const io = req.app.get('io');
        if (io) {
            io.emit("settings:updated", {
                category,
                settings,
                updatedBy: username,
                updatedAt: new Date()
            });
        }

        res.json({
            message: "Settings updated successfully",
            category,
            settings: updatedSettings.settings
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/settings/:category - Get specific category settings
router.get("/:category", async (req, res) => {
    try {
        const { category } = req.params;
        const setting = await Settings.findOne({ category });

        if (!setting) {
            return res.status(404).json({ message: "Settings not found" });
        }

        res.json(setting.settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;