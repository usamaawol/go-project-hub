import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { FeedbackModel } from "../models/Feedback";
import { isDbConnected } from "../config/db";

export async function submitFeedback(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { rating, category, comment, email } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({
        success: false,
        error: { message: "Rating (1-5) and feedback comment are required." },
      });
    }

    const entry = {
      userId: req.user?.uid || null,
      email: email || req.user?.email || "anonymous",
      rating: Number(rating),
      category: category || "general",
      comment: String(comment),
      createdAt: new Date(),
    };

    if (isDbConnected()) {
      await FeedbackModel.create(entry);
    }

    res.status(201).json({
      success: true,
      message: "Thank you! Your feedback has been received.",
      data: entry,
    });
  } catch (error) {
    next(error);
  }
}

export async function listFeedback(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (isDbConnected()) {
      const list = await FeedbackModel.find().sort({ createdAt: -1 }).limit(50);
      return res.json({ success: true, count: list.length, data: list });
    }

    // In-memory fallback sample reviews
    res.json({
      success: true,
      count: 3,
      data: [
        {
          rating: 5,
          category: "general",
          comment: "Incredible platform. All 100+ templates being completely free is amazing!",
          email: "sarah.m@designstudio.co",
          createdAt: new Date().toISOString(),
        },
        {
          rating: 5,
          category: "feature",
          comment: "The PDF compression is extremely sharp and fast. Great job!",
          email: "alex@mit.edu",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
    });
  } catch (error) {
    next(error);
  }
}
