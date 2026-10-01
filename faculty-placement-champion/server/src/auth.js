import jwt from "jsonwebtoken";
import { db } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
if (JWT_SECRET === "dev-secret-change-me" && process.env.NODE_ENV === "production") {
  throw new Error("Set a real JWT_SECRET before running in production.");
}

export function signToken(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "30d" });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) return res.status(401).json({ error: "Missing bearer token" });
  try {
    const payload = jwt.verify(match[1], JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

export function roleForEmail(email) {
  return ADMIN_EMAILS.has(String(email).trim().toLowerCase()) ? "admin" : "faculty";
}

export function requireAdmin(req, res, next) {
  const row = db.prepare("SELECT role FROM users WHERE id = ?").get(req.userId);
  if (!row || row.role !== "admin") return res.status(403).json({ error: "Admin access required" });
  next();
}
