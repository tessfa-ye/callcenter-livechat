const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcryptjs");

const AsteriskManager = require("asterisk-manager");
const User = require("./models/User");
const Message = require("./models/Message");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Connect DB
connectDB();

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/calls", require("./routes/callRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));

// Test endpoint
app.get("/", (req, res) => {
  res.send("Call Center Backend Running...");
});

// Create HTTP server & Socket.IO for real-time messaging
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// --- Asterisk AMI connection ---
const ami = new AsteriskManager(
  process.env.AMI_PORT,
  process.env.AMI_HOST,
  process.env.AMI_USER,
  process.env.AMI_PASS,
  true
);

ami.keepConnected();

ami.on("managerevent", (event) => {
  // Broadcast all Asterisk events to frontend
  io.emit("asterisk-event", event);
});

// --- Socket.IO messaging ---
io.on("connection", (socket) => {
  const { agentId } = socket.handshake.query;
  if (!agentId) return;

  console.log(`Agent ${agentId} connected`);
  socket.join(agentId);

  // Handle Status Updates
  socket.on("updateStatus", async ({ status }) => {
    try {
      // Update in DB
      await User.findOneAndUpdate({ username: agentId }, { status });

      // Broadcast to all clients
      io.emit("agent:status_update", { username: agentId, status });
    } catch (err) {
      console.error("Status update error:", err);
    }
  });

  // Load previous messages for this agent
  Message.find({ $or: [{ from: agentId }, { to: agentId }] })
    .sort({ timestamp: 1 })
    .then((msgs) => {
      socket.emit("loadMessages", msgs);
    });

  // Listen for new messages
  socket.on("sendMessage", async ({ to, message }) => {
    try {
      // Save to DB
      const newMsg = await Message.create({
        from: agentId,
        to,
        message,
        timestamp: new Date(),
      });

      // Send via Socket.IO
      io.to(to).emit("receiveMessage", newMsg);
      socket.emit("receiveMessage", newMsg); // Send back to sender for confirmation

      // Send via Asterisk (Optional/If configured)
      if (process.env.AMI_HOST) {
        ami.action({
          action: "MessageSend",
          to: `SIP/${to}`,
          from: agentId,
          message,
        }, (err, response) => {
          if (err) console.log("AMI Error:", err.message);
        });
      }
    } catch (err) {
      console.error("Message save error:", err);
    }
  });

  socket.on("disconnect", async () => {
    console.log(`Agent ${agentId} disconnected`);
    // Optional: Auto-set to offline on disconnect
    // await User.findOneAndUpdate({ username: agentId }, { status: "offline" });
    // io.emit("agent:status_update", { username: agentId, status: "offline" });
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
