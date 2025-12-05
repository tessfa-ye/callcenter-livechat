const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, default: "" },
  extension: { type: String, default: "" },
  status: { type: String, enum: ["available", "busy", "away", "offline"], default: "offline" },
  role: { type: String, enum: ["admin", "agent"], default: "agent" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", UserSchema);
