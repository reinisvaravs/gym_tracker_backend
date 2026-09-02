import { env, isProd } from "../../env.ts";
import bcrypt from "bcrypt";
import express from "express";
import jwt, { type SignOptions } from "jsonwebtoken";

import { registerUser, getUserByEmail } from "../database/users.ts";

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
  const fullName: unknown = req.body?.fullName;
  const email: unknown = req.body?.email;
  const password: unknown = req.body?.password;

  // Validate
  if (
    typeof fullName !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !fullName.trim() ||
    !email.includes("@") ||
    password.length < 8
  ) {
    return res.status(400).json({
      message:
        "Full name, a valid email, and a password of at least 8 characters are required",
    });
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
  const passwordHash = bcrypt.hashSync(password, env.BCRYPT_ROUNDS);

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

  const jwtSecret = env.JWT_SECRET;

  // Generate a JWT token for the new user
  const token = jwt.sign(
    {
      userId: userRow.id,
    },
    jwtSecret,
    { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] },
  );

  // Return token securely as a cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd(),
    // Frontend and backend live on different onrender.com subdomains, which the
    // browser treats as cross-site; "strict" cookies are never sent there.
    sameSite: isProd() ? "none" : "strict",
    maxAge: 3600000, // 1 hour
  });

  // Return success response and user
  res.status(201).json({
    message: "User registered successfully",
    user: { id: userRow.id, fullName: userRow.full_name, email: userRow.email },
  });
});

router.post("/login", async (req, res) => {
  // Get body
  const email: unknown = req.body?.email;
  const password: unknown = req.body?.password;

  // Validate
  if (typeof email !== "string" || typeof password !== "string") {
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

  const jwtSecret = env.JWT_SECRET;

  // Generate JWT
  const token = jwt.sign(
    {
      userId: user.id,
    },
    jwtSecret,
    { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] },
  );

  // Return token securely as a cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd(),
    // Frontend and backend live on different onrender.com subdomains, which the
    // browser treats as cross-site; "strict" cookies are never sent there.
    sameSite: isProd() ? "none" : "strict",
    maxAge: 3600000, // 1 hour
  });

  // Return success response
  res.status(200).json({ message: "Login successful" });
});

export default router;
