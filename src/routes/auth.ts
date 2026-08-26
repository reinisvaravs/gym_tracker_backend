import bcrypt from "bcrypt";
import express from "express";
import jwt from "jsonwebtoken";

import { registerUser, getUserByEmail } from "../database/users.js";

const router = express.Router();

function normalizeEmail(email: string) {
  const [local, domain] = email.trim().toLowerCase().split("@");
  const gmailDomains = ["gmail.com", "googlemail.com"];

  if (gmailDomains.includes(domain)) {
    const cleanLocal = local.replace(/\./g, "").replace(/\+.*$/, "");
    return `${cleanLocal}@gmail.com`;
  }

  return `${local}@${domain}`;
}

router.post("/register", async (req, res) => {
  // Get body
  const { fullName, email, password } = req.body;

  // Validate
  if (!fullName || !email || !password) {
    return res
      .status(400)
      .json({ message: "Full name, email, and password are required" });
  }

  // Normalize email (lowercase, trim whitespace, all gmail related stuff like dots and plus signs)
  const normalizedEmail = normalizeEmail(email);

  // Less strict email cleaning for display purposes (lowercase, trim whitespace)
  const cleanedEmail = email.trim().toLowerCase();

  // Clean name (trim whitespace)
  const cleanedFullName = fullName.trim();

  // Check if user already exists
  const existingUser = await getUserByEmail(normalizedEmail);
  if (existingUser) {
    return res.status(409).json({ message: "User already exists" });
  }

  // Hash password
  const passwordHash = bcrypt.hashSync(password, 10);

  let userRow;

  // Attempt to insert user into database
  try {
    userRow = await registerUser(
      cleanedFullName,
      cleanedEmail,
      normalizedEmail,
      passwordHash,
    );
  } catch (error) {
    console.error("⚠️ [AUTH] Error registering user:", error);
    return res.status(500).json({ message: "Internal server error" });
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  // Generate a JWT token for the new user
  const token = jwt.sign(
    {
      userId: userRow.id,
    },
    jwtSecret,
    { expiresIn: "1h" },
  );

  // Return token securely as a cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 3600000, // 1 hour
  });

  // Return success response
  res.status(201).json({ message: "User registered successfully" });
});

router.post("/login", async (req, res) => {
  // Get body
  const { email, password } = req.body;

  // Validate
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  // Normalize email
  const normalizedEmail = normalizeEmail(email);

  // Fetch user from database
  const user = await getUserByEmail(normalizedEmail);

  // Validate
  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Compare password
  const passwordMatch = bcrypt.compareSync(password, user.password_hash);
  if (!passwordMatch) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  // Generate JWT
  const token = jwt.sign(
    {
      userId: user.id,
    },
    jwtSecret,
    { expiresIn: "1h" },
  );

  // Return token securely as a cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 3600000, // 1 hour
  });

  // Return success response
  res.status(200).json({ message: "Login successful" });
});

export default router;
