import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import progressRoutes from "./routes/progress.js";
import examRoutes from "./routes/exam.js";
import certificateRoutes from "./routes/certificate.js";
import adminRoutes from "./routes/admin.js";

const app = express();
const PORT = process.env.PORT || 8787;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/exam", examRoutes);
app.use("/api", certificateRoutes); // exposes /api/certificate and /api/verify/:id
app.use("/api/admin", adminRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Faculty Placement Champion API listening on http://localhost:${PORT}`);
});
