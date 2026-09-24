import jwt from "jsonwebtoken";
import type { CookieOptions } from "express";

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET is not set");
}

const SESSION_TTL = "7d";

export const SESSION_COOKIE_NAME = "elevate_session";

export const SESSION_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export function signSession(userId: string): string {
  return jwt.sign({ userId }, SESSION_SECRET!, { expiresIn: SESSION_TTL });
}

export function verifySession(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, SESSION_SECRET!) as { userId: string };
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}
