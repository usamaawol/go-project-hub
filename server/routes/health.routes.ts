import { Router } from "express";
import { isFirestoreConnected } from "../config/firebase";

const router = Router();

router.get("/health", async (req, res) => {
  const connected = await isFirestoreConnected();
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
    database: connected ? "connected" : "in-memory-fallback",
    databaseType: connected ? "Cloud Firestore" : "Stateless Memory Shield",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

export default router;
