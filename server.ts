import express from "express";
import { createServer as createViteServer } from "vite";
import { initDb } from "./server/db/database.js";
import leadsRouter from "./server/routes/leads.js";
import onboardingRouter from "./server/routes/onboarding.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize SQLite Database
  initDb();

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/leads", leadsRouter);
  app.use("/api/onboarding", onboardingRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
