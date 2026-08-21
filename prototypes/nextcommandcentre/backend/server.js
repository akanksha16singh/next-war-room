require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

require("./database/db"); // creates tables on first run

const healthRoutes = require("./routes/health");
const newsRoutes = require("./routes/news");
const dashboardRoutes = require("./routes/dashboard");
const signalsRoutes = require("./routes/signals");
const decisionsRoutes = require("./routes/decisions");
const sourcesRoutes = require("./routes/sources");
const digestRoutes = require("./routes/digest");
const cronRoutes = require("./routes/cron");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const { startScheduler } = require("./jobs/scheduler");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: "200kb" }));

// CORS only matters for split-origin local development (frontend on :3000,
// backend on :3001). In production the backend serves the frontend from the
// same origin, so this is a no-op there.
if (process.env.CORS_ORIGIN) {
  app.use(cors({ origin: process.env.CORS_ORIGIN }));
}

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });
app.use("/api", apiLimiter);

app.use("/api", healthRoutes);
app.use("/api", newsRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", signalsRoutes);
app.use("/api", decisionsRoutes);
app.use("/api", sourcesRoutes);
app.use("/api", digestRoutes);
app.use("/api", cronRoutes);

app.use("/api", notFoundHandler);

// The backend serves the approved front-end prototype directly, so the
// whole app deploys as one service (frontend/index.html + support.js).
app.use(express.static(path.join(__dirname, "..", "frontend")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`NEXT Command Centre backend listening on port ${PORT}`);
    startScheduler();
  });
}

module.exports = app;
