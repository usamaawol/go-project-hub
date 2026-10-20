import { Router } from "express";
import { getDashboardMetrics, listRecentJobs } from "../controllers/admin.controller";
import { requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/admin/metrics", requireAdmin, getDashboardMetrics);
router.get("/admin/jobs", requireAdmin, listRecentJobs);

export default router;
