const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
        enum: ["general", "agents", "calls", "notifications", "security", "asterisk"]
    },
    settings: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    updatedBy: {
        type: String,
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure only one document per category
settingsSchema.index({ category: 1 }, { unique: true });

module.exports = mongoose.model("Settings", settingsSchema);