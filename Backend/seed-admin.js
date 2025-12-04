require("dotenv").config();
const connectDB = require("./config/db");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

// Connect to DB
connectDB().then(async () => {
  try {
    const hash = await bcrypt.hash("admin123", 10);
    await User.create({
      username: "admin",
      password: hash,
      role: "admin"
    });
    console.log("Admin user created successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Error creating admin user:", err);
    process.exit(1);
  }
});
