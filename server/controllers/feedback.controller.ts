import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { createFeedback, listFeedback as getFeedbackList } from "../services/feedbackService";

export async function submitFeedback(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { rating, category, comment, email } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({
        success: false,
        error: { message: "Rating (1-5) and feedback comment are required." },
      });
    }

    const entry = await createFeedback({
      userId: req.user?.uid || null,
      email: email || req.user?.email || "anonymous",
      rating: Number(rating),
      category: category || "general",
      comment: String(comment),
    });

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
    const list = await getFeedbackList(50);
    return res.json({ success: true, count: list.length, data: list });
  } catch (error) {
    next(error);
  }
}
