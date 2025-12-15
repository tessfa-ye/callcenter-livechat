const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/User");

// POST /api/messages - Save a new message
router.post("/", async (req, res) => {
  try {
    const { from, to, message, source } = req.body;
    const newMsg = await Message.create({
      from,
      to,
      message,
      timestamp: new Date(),
      source: source || "web"
    });
    res.status(201).json(newMsg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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
          partner: partnerId,
          name: partnerId, // Will be updated if user found
          lastMessage: msg.message,
          timestamp: msg.timestamp,
          unread: 0 // Will be calculated below
        });
      }
    }

    const conversations = Array.from(conversationsMap.values());

    // Fetch user details for names
    const userIds = conversations.map(c => c.id);
    const users = await User.find({ username: { $in: userIds } });

    const userMap = {};
    users.forEach(u => userMap[u.username] = u.username);

    // Update names and calculate unread counts
    for (const c of conversations) {
      if (userMap[c.id]) {
        c.name = userMap[c.id];
      }

      // Calculate unread messages (messages from partner to current user that are not read)
      const unreadCount = await Message.countDocuments({
        from: c.id,
        to: agentId,
        read: { $ne: true } // Messages that are not marked as read
      });

      c.unread = unreadCount;
    }

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

// PUT /api/messages/:id - Edit a message
router.put("/:id", async (req, res) => {
  try {
    const { message } = req.body;
    const updated = await Message.findByIdAndUpdate(
      req.params.id,
      { message, edited: true },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: "Message not found" });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/messages/:id - Delete a message
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Message.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Message not found" });
    }
    res.json({ message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/messages/mark-read/:agentId/:partnerId - Mark messages as read
router.put("/mark-read/:agentId/:partnerId", async (req, res) => {
  try {
    const { agentId, partnerId } = req.params;

    // Mark all messages from partnerId to agentId as read
    const result = await Message.updateMany(
      {
        from: partnerId,
        to: agentId,
        read: { $ne: true }
      },
      {
        read: true,
        readAt: new Date()
      }
    );

    res.json({
      message: "Messages marked as read",
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
