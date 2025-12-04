const Message = require("./models/Message");

// Messaging endpoint
app.post("/api/message", async (req, res) => {
  const { from, to, body } = req.body;

  try {
    // Save message in MongoDB
    const msg = await Message.create({ from, to, body });

    // Send message via AMI to SIP
    ami.action(
      {
        action: "MessageSend",
        to: `SIP/${to}`,
        from,
        message: body,
      },
      (err, response) => {
        if (err) console.log("AMI Error:", err);
      }
    );

    // Emit via Socket.IO for real-time update
    io.emit("new-message", msg);

    res.status(201).json(msg);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Message send failed" });
  }
});

// Get messages for agent
app.get("/api/message/:user", async (req, res) => {
  const user = req.params.user;
  try {
    const messages = await Message.find({
      $or: [{ from: user }, { to: user }],
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});
