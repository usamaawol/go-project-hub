import { Router } from "express";
import {
  getDashboardMetrics,
  listRecentJobs,
  listAllFeedback,
  updateFeedbackStatus,
  listAllUsers,
  toggleUserPlan,
  purgeTemporaryFiles,
} from "../controllers/admin.controller";
import { requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/admin/metrics", requireAdmin, getDashboardMetrics);
router.get("/admin/jobs", requireAdmin, listRecentJobs);
router.get("/admin/feedback", requireAdmin, listAllFeedback);
router.patch("/admin/feedback/:feedbackId/status", requireAdmin, updateFeedbackStatus);
router.get("/admin/users", requireAdmin, listAllUsers);
router.patch("/admin/users/:userId/plan", requireAdmin, toggleUserPlan);
router.post("/admin/purge-temp", requireAdmin, purgeTemporaryFiles);

export default router;
