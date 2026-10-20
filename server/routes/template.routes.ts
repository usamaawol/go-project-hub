import { Router } from "express";
import {
  listTemplates,
  getTemplateById,
  toggleTemplatePublish,
} from "../controllers/template.controller";
import { requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/templates", listTemplates);
router.get("/templates/:id", getTemplateById);
router.patch("/templates/:id/publish", requireAdmin, toggleTemplatePublish);

export default router;
