const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/User");

// GET /api/messages/conversations/:agentId
router.get("/conversations/:agentId", async (req, res) => {
  const { agentId } = req.params;

  try {
    // Find all messages involving this agent
    const messages = await Message.find({
      $or: [{ from: agentId }, { to: agentId }]
    }).sort({ timestamp: -1 });

    // Group by conversation partner
    const conversationsMap = new Map();

    for (const msg of messages) {
      const partnerId = msg.from === agentId ? msg.to : msg.from;

      if (!conversationsMap.has(partnerId)) {
        // Get partner details (if user exists)
        // For efficiency, we might want to populate or cache this
        // But for now, we'll just use the ID as name fallback

        conversationsMap.set(partnerId, {
          id: partnerId,
          name: partnerId, // Will be updated if user found
          lastMessage: msg.message,
          timestamp: msg.timestamp,
          unread: 0 // TODO: Implement read status
        });
      }
    }

    const conversations = Array.from(conversationsMap.values());

    // Fetch user details for names
    const userIds = conversations.map(c => c.id);
    const users = await User.find({ username: { $in: userIds } });

    const userMap = {};
    users.forEach(u => userMap[u.username] = u.username);

    // Update names
    conversations.forEach(c => {
      if (userMap[c.id]) {
        c.name = userMap[c.id];
      }
    });

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/messages/:agentId/:partnerId
router.get("/:agentId/:partnerId", async (req, res) => {
  const { agentId, partnerId } = req.params;
  try {
    const messages = await Message.find({
      $or: [
        { from: agentId, to: partnerId },
        { from: partnerId, to: agentId }
      ]
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/messages/:agentId (Legacy/Fallback)
router.get("/:agentId", async (req, res) => {
  const { agentId } = req.params;
  try {
    const messages = await Message.find({
      $or: [{ from: agentId }, { to: agentId }]
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
