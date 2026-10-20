import { Router } from "express";
import { isDbConnected } from "../config/db";

const router = Router();

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "DocuMind API",
    version: "2.0.0",
    freeAccessPolicy: {
      status: "enforced",
      watermarks: "none",
      paywalls: "none",
      freeTemplatesCount: 110,
    },
    database: isDbConnected() ? "connected" : "in-memory-fallback",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

export default router;
