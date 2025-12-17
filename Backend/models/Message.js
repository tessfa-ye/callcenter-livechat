const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
  edited: { type: Boolean, default: false },
  source: { type: String, default: "web" }
});

module.exports = mongoose.model("Message", messageSchema);
