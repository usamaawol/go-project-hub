import { Router } from "express";
import {
  getDashboardMetrics,
  listRecentJobs,
  listAllFeedback,
  updateFeedbackStatus,
  listAllUsers,
  toggleUserPlan,
  toggleUserRoleHandler,
  purgeTemporaryFiles,
  getAdminSettingsHandler,
  updateAdminSettingsHandler,
  testGeminiConnectionHandler,
  testOpenAIConnectionHandler,
  listStaffHandler,
  createStaffHandler,
  deleteStaffHandler,
  listAuditLogsHandler,
  listImageProvidersHandler,
  updateImageProviderHandler,
  testImageProviderConnectionHandler,
  testGenerateImageHandler,
  getImageGenerationSettingsHandler,
  updateImageGenerationSettingsHandler,
  getImageGenerationLogsHandler,
  clearImageGenerationLogsHandler,
  listImageProviderAlertsHandler,
  dismissImageProviderAlertHandler,
  clearImageProviderAlertsHandler,
  resetImageProviderQuotaHandler,
  resetAllImageProviderQuotasHandler,
  listAdminPresentationsHandler,
  bootstrapAdminHandler,
  exportAuditLogsHandler,
} from "../controllers/admin.controller";
import { requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/admin/metrics", requireAdmin, getDashboardMetrics);
router.get("/admin/jobs", requireAdmin, listRecentJobs);
router.get("/admin/feedback", requireAdmin, listAllFeedback);
router.patch("/admin/feedback/:feedbackId/status", requireAdmin, updateFeedbackStatus);
router.get("/admin/users", requireAdmin, listAllUsers);
router.patch("/admin/users/:userId/plan", requireAdmin, toggleUserPlan);
router.patch("/admin/users/:userId/role", requireAdmin, toggleUserRoleHandler);
router.post("/admin/purge-temp", requireAdmin, purgeTemporaryFiles);

// Multi-Provider AI Image Generation Endpoints
router.get("/admin/providers", requireAdmin, listImageProvidersHandler);
router.patch("/admin/providers/:id", requireAdmin, updateImageProviderHandler);
router.post("/admin/providers/:id/test", requireAdmin, testImageProviderConnectionHandler);
router.post("/admin/providers/test-generate", requireAdmin, testGenerateImageHandler);
router.post("/admin/providers/:id/reset-quota", requireAdmin, resetImageProviderQuotaHandler);
router.post("/admin/providers/reset-all-quotas", requireAdmin, resetAllImageProviderQuotasHandler);
router.get("/admin/providers/alerts", requireAdmin, listImageProviderAlertsHandler);
router.post("/admin/providers/alerts/:alertId/dismiss", requireAdmin, dismissImageProviderAlertHandler);
router.delete("/admin/providers/alerts", requireAdmin, clearImageProviderAlertsHandler);

// Image Generation Limits & Quotas
router.get("/admin/image-generation/settings", requireAdmin, getImageGenerationSettingsHandler);
router.patch("/admin/image-generation/settings", requireAdmin, updateImageGenerationSettingsHandler);
router.get("/admin/image-generation/logs", requireAdmin, getImageGenerationLogsHandler);
router.delete("/admin/image-generation/logs", requireAdmin, clearImageGenerationLogsHandler);

// Presentations Directory & Inspection
router.get("/admin/presentations", requireAdmin, listAdminPresentationsHandler);

// System Settings & Connections
router.get("/admin/settings", requireAdmin, getAdminSettingsHandler);
router.patch("/admin/settings", requireAdmin, updateAdminSettingsHandler);
router.post("/admin/test-gemini", requireAdmin, testGeminiConnectionHandler);
router.post("/admin/test-openai", requireAdmin, testOpenAIConnectionHandler);

// Staff Directory & Audit Logs
router.get("/admin/staff", requireAdmin, listStaffHandler);
router.post("/admin/staff", requireAdmin, createStaffHandler);
router.delete("/admin/staff/:staffId", requireAdmin, deleteStaffHandler);
router.get("/admin/audit-logs", requireAdmin, listAuditLogsHandler);
router.get("/admin/export-logs", requireAdmin, exportAuditLogsHandler);

// Initial Admin Bootstrap
router.post("/admin/setup-admin", bootstrapAdminHandler);

export default router;
