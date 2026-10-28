import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { extractTextFromBuffer } from "../services/extractor.service";
import { compressPdfBuffer } from "../services/compressor.service";
import { convertDocumentBuffer, type SupportedFormat } from "../services/converter.service";
import { generatePresentationBuffer } from "../services/presentation.service";
import { analyzeDocumentAndGuide } from "../services/ai.service";
import { createDocumentJob } from "../services/documentJobService";

export async function handleExtractText(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const file = req.file;
    const bodyText = req.body.text;

    let buffer: Buffer;
    let filename = "document.txt";
    let mimeType = "text/plain";

    if (file) {
      buffer = file.buffer;
      filename = file.originalname;
      mimeType = file.mimetype;
    } else if (bodyText) {
      buffer = Buffer.from(bodyText, "utf-8");
      filename = "pasted_text.txt";
    } else {
      return res.status(400).json({
        success: false,
        error: { message: "No document file or text payload provided." },
      });
    }

    const startTime = Date.now();
    const result = await extractTextFromBuffer(buffer, mimeType, filename);
    const duration = Date.now() - startTime;

    // Log anonymized job metadata in Firestore with zero user-account association
    const jobId = "job_" + Math.random().toString(36).substring(2, 10);
    try {
      await createDocumentJob({
        jobId,
        userId: null,
        toolType: "extract",
        originalFilename: filename,
        fileSize: buffer.length,
        mimeType,
        status: "completed",
        metrics: {
          processingTimeMs: duration,
          extractedWordCount: result.wordCount,
        },
      });
    } catch (e) {
      console.warn("Could not save job log to Firestore:", e);
    }

    res.json({
      success: true,
      data: {
        jobId,
        filename,
        format: result.format,
        wordCount: result.wordCount,
        lineCount: result.lineCount,
        pageCount: result.pageCount,
        text: result.text,
        isScannedOrEmpty: result.isScannedOrEmpty,
        warning: result.warning,
        processingTimeMs: duration,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function handleCompressDocument(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: { message: "Please upload a PDF file to compress." },
      });
    }

    const profile = (req.body.profile || "balanced") as "balanced" | "aggressive" | "archival";
    const startTime = Date.now();
    const result = await compressPdfBuffer(file.buffer, profile);
    const duration = Date.now() - startTime;

    const jobId = "job_" + Math.random().toString(36).substring(2, 10);
    try {
      await createDocumentJob({
        jobId,
        userId: null,
        toolType: "compress",
        originalFilename: file.originalname,
        fileSize: file.buffer.length,
        mimeType: file.mimetype,
        status: "completed",
        metrics: {
          processingTimeMs: duration,
          reductionPercent: result.reductionPercent,
          outputSizeBytes: result.compressedSize,
        },
      });
    } catch (e) {
      console.warn("Could not save job log to Firestore:", e);
    }

    // If query ?download=true, send file directly as attachment
    if (req.query.download === "true") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="compressed_${file.originalname}"`,
      );
      return res.send(result.compressedBuffer);
    }

    res.json({
      success: true,
      data: {
        jobId,
        filename: file.originalname,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        reductionPercent: result.reductionPercent,
        reductionRatio: result.reductionRatio,
        pagesCount: result.pagesCount,
        processingTimeMs: duration,
        downloadUrl: `/api/documents/compress/download?jobId=${jobId}`,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGeneratePresentation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { title, category, themeKind, slides, primaryColor, accentColor, bgColor } = req.body;

    if (!title || !Array.isArray(slides)) {
      return res.status(400).json({
        success: false,
        error: { message: "Title and slides array are required." },
      });
    }

    const startTime = Date.now();
    const pptxBuffer = await generatePresentationBuffer({
      title,
      category,
      themeKind,
      slides,
      primaryColor,
      accentColor,
      bgColor,
    });
    const duration = Date.now() - startTime;

    const jobId = "job_" + Math.random().toString(36).substring(2, 10);
    try {
      await createDocumentJob({
        jobId,
        userId: null,
        toolType: "presentation",
        originalFilename: `${title.replace(/\s+/g, "_")}.pptx`,
        fileSize: pptxBuffer.length,
        mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        status: "completed",
        metrics: {
          processingTimeMs: duration,
          slideCount: slides.length + 1,
          outputSizeBytes: pptxBuffer.length,
        },
      });
    } catch (e) {
      console.warn("Could not save job log to Firestore:", e);
    }

    // Direct download header
    const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, "_");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.pptx"`);
    res.send(pptxBuffer);
  } catch (error) {
    next(error);
  }
}

export async function handleAiGuidance(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { text, goal } = req.body;
    if (!text) {
      return res.status(400).json({
        success: false,
        error: { message: "Text content is required for AI guidance." },
      });
    }

    const guidance = await analyzeDocumentAndGuide(text, goal);
    res.json({
      success: true,
      data: guidance,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleConvertDocument(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: { message: "Please upload a document to convert." },
      });
    }

    const targetFormat = ((req.body.targetFormat || req.query.targetFormat || "DOCX") as string).toUpperCase() as SupportedFormat;
    if (!["PDF", "DOCX", "DOC", "TXT"].includes(targetFormat)) {
      return res.status(400).json({
        success: false,
        error: { message: "Unsupported target format. Must be PDF, DOCX, DOC, or TXT." },
      });
    }

    const startTime = Date.now();
    const result = await convertDocumentBuffer(
      file.buffer,
      file.mimetype || file.originalname,
      targetFormat,
      file.originalname,
    );
    const duration = Date.now() - startTime;

    const jobId = "job_" + Math.random().toString(36).substring(2, 10);
    try {
      await createDocumentJob({
        jobId,
        userId: null,
        toolType: "convert",
        originalFilename: file.originalname,
        fileSize: file.buffer.length,
        mimeType: file.mimetype,
        status: "completed",
        metrics: {
          processingTimeMs: duration,
          outputSizeBytes: result.sizeBytes,
          extractedWordCount: result.wordCount,
        },
      });
    } catch (e) {
      console.warn("Could not save convert job log to Firestore:", e);
    }

    // Direct download attachment
    if (req.query.download === "true") {
      res.setHeader("Content-Type", result.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      return res.send(result.buffer);
    }

    // Return JSON with base64 data for client download / preview
    return res.json({
      success: true,
      data: {
        jobId,
        filename: result.filename,
        targetFormat,
        mimeType: result.mimeType,
        sizeBytes: result.sizeBytes,
        wordCount: result.wordCount,
        previewText: result.previewText,
        processingTimeMs: duration,
        base64: result.buffer.toString("base64"),
      },
    });
  } catch (error) {
    next(error);
  }
}
