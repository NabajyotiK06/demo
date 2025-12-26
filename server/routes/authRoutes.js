import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// SIGNUP
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role, adminSecretKey } = req.body;

    // Check for admin secret key if role is admin
    if (role === 'admin') {
      if (adminSecretKey !== process.env.ADMIN_SECRET_KEY) {
        return res.status(403).json({ message: "Invalid admin secret key" });
      }
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role
    });

    res.json({ message: "Signup successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error during signup", error: err.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Check for admin secret key if role is admin
    if (user.role === 'admin') {
      const { adminSecretKey } = req.body;
      if (adminSecretKey !== process.env.ADMIN_SECRET_KEY) {
        return res.status(403).json({ message: "Invalid admin secret key" });
      }
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      role: user.role,
      name: user.name
    });
  } catch (err) {
    res.status(500).json({ message: "Server error during login", error: err.message });
  }
});

export default router;
