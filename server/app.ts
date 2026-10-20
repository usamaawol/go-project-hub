import express, { type Express } from "express";
import cors from "cors";
import { ENV } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";

import healthRoutes from "./routes/health.routes";
import documentRoutes from "./routes/document.routes";
import templateRoutes from "./routes/template.routes";
import feedbackRoutes from "./routes/feedback.routes";
import adminRoutes from "./routes/admin.routes";
import presentationRoutes from "./routes/presentation.routes";

export function createApp(): Express {
  const app = express();

  // Configure Cross-Origin Resource Sharing (CORS)
  app.use(
    cors({
      origin: ENV.CORS_ORIGIN === "*" ? true : ENV.CORS_ORIGIN,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Key"],
    }),
  );

  // Body parsers with 50MB Fair Use Limit
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Mount API Routers
  app.use("/api", healthRoutes);
  app.use("/api", documentRoutes);
  app.use("/api", templateRoutes);
  app.use("/api", feedbackRoutes);
  app.use("/api", adminRoutes);
  app.use("/api", presentationRoutes);

  // 404 handler for unmatched API routes
  app.use("/api", (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        message: `Endpoint ${req.method} ${req.originalUrl} not found.`,
        statusCode: 404,
      },
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
