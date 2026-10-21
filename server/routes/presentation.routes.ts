import { Router, type Request, type Response } from "express";
import fs from "fs";
import {
  createPresentationSession,
  getPresentationSession,
  deletePresentationSession,
  type CreatePresentationSessionInput,
} from "../services/presentationSession.service";

const router = Router();

/**
 * POST /api/presentations/generate
 * Generates a real PowerPoint presentation and starts a 10-minute temporary preview session
 */
router.post("/presentations/generate", async (req: Request, res: Response) => {
  try {
    const { title, content, purpose, density, theme, typography, slideCount } = req.body;

    if (!theme || !theme.name) {
      return res.status(400).json({
        success: false,
        error: { message: "A valid presentation theme is required." },
      });
    }

    const input: CreatePresentationSessionInput = {
      title: (title || "").slice(0, 150),
      content: (content || "").slice(0, 50000), // Max 50k chars for ephemeral safety
      purpose: purpose || "Business & Strategy",
      density: density || "balanced",
      theme,
      typography: {
        fontFamily: typography?.fontFamily || "Inter",
        fontSizePreset: typography?.fontSizePreset || "standard",
      },
      slideCount: Number(slideCount) || 8,
    };

    const session = await createPresentationSession(input);

    return res.status(201).json({
      success: true,
      data: {
        sessionId: session.id,
        title: session.title,
        slideCount: session.slideCount,
        expiresAt: session.expiresAt,
        secondsRemaining: Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000)),
        theme: {
          name: session.theme.name,
          category: session.theme.category,
        },
        slides: session.slides,
        downloadUrl: `/api/presentations/${session.id}/download`,
      },
    });
  } catch (error) {
    console.error("Presentation generation error:", error);
    return res.status(500).json({
      success: false,
      error: {
        message: "Failed to generate presentation. Please check your parameters and try again.",
      },
    });
  }
});

/**
 * GET /api/presentations/:id/preview
 * Fetches structured presentation metadata and slide data for in-browser rendering
 * Returns 410 Gone if expired (>10 minutes)
 */
router.get("/presentations/:id/preview", (req: Request, res: Response) => {
  const sessionId = req.params["id"];
  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: { message: "Session ID is required." },
    });
  }

  const session = getPresentationSession(sessionId);
  if (!session) {
    return res.status(410).json({
      success: false,
      error: {
        message:
          "This temporary presentation has expired after 10 minutes. In accordance with DocuMind's privacy policy, all files and previews were deleted.",
        code: "SESSION_EXPIRED",
      },
    });
  }

  const secondsRemaining = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));

  // Exclude physical server file path from public response for security
  const { filePath, ...safeSession } = session;

  return res.json({
    success: true,
    data: {
      ...safeSession,
      secondsRemaining,
    },
  });
});

/**
 * GET /api/presentations/:id/download
 * Downloads the actual generated .pptx PowerPoint file
 * Returns 410 Gone if expired
 */
router.get("/presentations/:id/download", (req: Request, res: Response) => {
  const sessionId = req.params["id"];
  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: { message: "Session ID is required." },
    });
  }

  const session = getPresentationSession(sessionId);
  if (!session) {
    return res.status(410).json({
      success: false,
      error: {
        message:
          "This download link has expired. DocuMind automatically deletes temporary presentations after 10 minutes.",
        code: "SESSION_EXPIRED",
      },
    });
  }

  if (!fs.existsSync(session.filePath)) {
    return res.status(404).json({
      success: false,
      error: { message: "Temporary presentation file not found on disk." },
    });
  }

  const safeFilename = `${session.title.replace(/[^a-zA-Z0-9_-]/g, "_") || "presentation"}.pptx`;

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");

  const stream = fs.createReadStream(session.filePath);
  return stream.pipe(res);
});

/**
 * DELETE /api/presentations/:id
 * Explicit manual session cleanup
 */
router.delete("/presentations/:id", (req: Request, res: Response) => {
  const sessionId = req.params["id"];
  if (sessionId) {
    deletePresentationSession(sessionId);
  }
  return res.json({ success: true, message: "Temporary session deleted." });
});

export default router;
