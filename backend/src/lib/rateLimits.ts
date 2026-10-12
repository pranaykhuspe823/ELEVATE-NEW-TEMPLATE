import crypto from "crypto";
import type { Request } from "express";
import rateLimit from "express-rate-limit";
import { SESSION_COOKIE_NAME } from "./session";

const message = { error: "Too many requests. Wait a few minutes and try again." };

const ipKey = (req: Request) => req.ip || "unknown";

// A whole campus often sits behind one NAT IP, so signed-in traffic is
// counted per session instead of per IP. The token is hashed so the raw
// session never sits in the limiter's memory store.
function sessionOrIpKey(req: Request): string {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof token === "string" && token) {
    return "s:" + crypto.createHash("sha256").update(token).digest("hex");
  }
  return "ip:" + ipKey(req);
}

/** Everything under /api. Generous: test pages poll and send a proctoring
 * frame every few seconds. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 1500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: sessionOrIpKey,
  message,
});

/** Password logins: counted per (IP, email) so one account can't be
 * brute-forced, without locking out a classroom sharing an IP. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    return `${ipKey(req)}|${email}`;
  },
  skipSuccessfulRequests: true,
  message: { error: "Too many failed sign-in attempts. Try again in 15 minutes." },
});

/** Public, unauthenticated forms: registration, activation, demo requests. */
export const publicFormLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey,
  message,
});

/** POSTs that trigger LLM / ML / sandbox work -- each costs Groq credit or
 * minutes of CPU. Per signed-in session. */
export const expensiveLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 150,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: sessionOrIpKey,
  skip: (req) => req.method !== "POST" || req.path.endsWith("/proctor-check"),
  message: { error: "You've hit the hourly limit for AI features. Try again later." },
});
