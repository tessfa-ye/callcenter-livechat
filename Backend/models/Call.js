const mongoose = require("mongoose");

const callSchema = new mongoose.Schema({
    caller: { type: String, required: true },
    agent: { type: String, required: true }, // Agent username or ID
    duration: { type: String, default: "0:00" },
    status: {
        type: String,
        enum: ["completed", "in-progress", "missed", "voicemail"],
        default: "in-progress"
    },
    direction: { type: String, enum: ["inbound", "outbound"], default: "inbound" },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String }
});

module.exports = mongoose.model("Call", callSchema);
