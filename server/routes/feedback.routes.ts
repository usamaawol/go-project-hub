import { Router } from "express";
import { submitFeedback, listFeedback } from "../controllers/feedback.controller";
import { optionalAuth, requireAdmin } from "../middleware/auth";

const router = Router();

router.post("/feedback", optionalAuth, submitFeedback);
router.get("/feedback", requireAdmin, listFeedback);

export default router;
