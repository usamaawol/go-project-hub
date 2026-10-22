import { Router } from "express";
import {
  getDashboardMetrics,
  listRecentJobs,
  listAllFeedback,
  updateFeedbackStatus,
  listAllUsers,
  toggleUserPlan,
  purgeTemporaryFiles,
  getAdminSettingsHandler,
  updateAdminSettingsHandler,
  testGeminiConnectionHandler,
  testOpenAIConnectionHandler,
  listStaffHandler,
  createStaffHandler,
  deleteStaffHandler,
  listAuditLogsHandler,
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

// AI Engine & System Settings
router.get("/admin/settings", requireAdmin, getAdminSettingsHandler);
router.patch("/admin/settings", requireAdmin, updateAdminSettingsHandler);
router.post("/admin/test-gemini", requireAdmin, testGeminiConnectionHandler);
router.post("/admin/test-openai", requireAdmin, testOpenAIConnectionHandler);

// Staff Directory & Audit Logs
router.get("/admin/staff", requireAdmin, listStaffHandler);
router.post("/admin/staff", requireAdmin, createStaffHandler);
router.delete("/admin/staff/:staffId", requireAdmin, deleteStaffHandler);
router.get("/admin/audit-logs", requireAdmin, listAuditLogsHandler);

export default router;
