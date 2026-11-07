import { Router } from "express";
import multer from "multer";
import {
  handleExtractText,
  handleCompressDocument,
  handleConvertDocument,
  handleGeneratePresentation,
  handleAiGuidance,
  handleAiDocumentDesign,
  handleAiDocumentEdit,
} from "../controllers/document.controller";
import { optionalAuth } from "../middleware/auth";

const router = Router();

// Configure Multer for in-memory processing up to 50MB (Fair Use Limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 Megabytes fair technical limit
  },
});

router.post("/documents/extract", optionalAuth, upload.single("file"), handleExtractText);
router.post("/documents/compress", optionalAuth, upload.single("file"), handleCompressDocument);
router.post("/documents/convert", optionalAuth, upload.single("file"), handleConvertDocument);
router.post("/documents/presentation", optionalAuth, handleGeneratePresentation);
router.post("/documents/guide", optionalAuth, handleAiGuidance);
router.post("/documents/ai-design", optionalAuth, handleAiDocumentDesign);
router.post("/documents/ai-edit", optionalAuth, handleAiDocumentEdit);

export default router;
