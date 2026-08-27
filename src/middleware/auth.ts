import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token: unknown = req.cookies?.token;

  if (typeof token !== "string") {
    return res.status(401).json({ message: "No token provided" });
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (
      err ||
      !decoded ||
      typeof decoded === "string" ||
      typeof decoded.userId !== "number"
    ) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.userId = decoded.userId;
    next();
  });
}

export default authMiddleware;
