const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const User = require("./models/User"); // make sure path is correct
const connectDB = require("./config/db");

dotenv.config();
connectDB();

async function createAgents() {
  try {
    const hash1 = await bcrypt.hash("agent123", 10);
    const hash2 = await bcrypt.hash("agent123", 10);

    await User.create([
      { username: "1001", password: hash1, role: "agent" },
      { username: "1002", password: hash2, role: "agent" }
    ]);

    console.log("Agents created successfully!");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createAgents();
