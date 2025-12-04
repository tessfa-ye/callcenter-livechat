const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcryptjs");

const AsteriskManager = require("asterisk-manager");
const User = require("./models/User");
const Message = require("./models/message");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Connect DB
connectDB();

// Routes
app.use("/api/auth", require("./routes/authRoutes"));

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

  // Load previous messages for this agent
  Message.find({ $or: [{ from: agentId }, { to: agentId }] })
    .sort({ timestamp: 1 })
    .then((msgs) => {
      socket.emit("loadMessages", msgs);
    });

  // Listen for new messages
  socket.on("sendMessage", async ({ to, message }) => {
    try {
      const newMsg = await Message.create({
        from: agentId,
        to,
        message,
        timestamp: new Date(),
      });

      // Send via Socket.IO
      io.to(to).emit("receiveMessage", newMsg);
      socket.emit("receiveMessage", newMsg);

      // Send via Asterisk
      ami.action(
        {
          action: "MessageSend",
          to: `SIP/${to}`,
          from: agentId,
          message,
        },
        (err, response) => {
          if (err) console.log("AMI Error:", err.message);
          else console.log("AMI MessageSend:", response);
        }
      );
    } catch (err) {
      console.error(err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Agent ${agentId} disconnected`);
  });
});

// --- Messaging REST API ---
app.get("/api/messages/:agentId", async (req, res) => {
  try {
    const agentId = req.params.agentId;
    const messages = await Message.find({
      $or: [{ from: agentId }, { to: agentId }],
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/message", async (req, res) => {
  const { from, to, message } = req.body;
  try {
    const newMsg = await Message.create({ from, to, message });
    
    // Send via Asterisk
    ami.action(
      {
        action: "MessageSend",
        to: `SIP/${to}`,
        from,
        message,
      },
      (err, response) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: "sent", response, savedMessage: newMsg });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
