import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { getAdminSettings } from "./adminSettings.service";

export interface ExtractionResult {
  text: string;
  wordCount: number;
  lineCount: number;
  charCount?: number;
  pageCount?: number;
  format: "pdf" | "docx" | "txt" | "image" | "unknown";
  isScannedOrEmpty?: boolean;
  warning?: string;
  ocrEngine?: "gemini-vision" | "tesseract" | "none";
  meta?: Record<string, unknown>;
}

/**
 * Extracts text from an image / screenshot using Google Gemini Vision (if configured)
 * or local Tesseract OCR engine as fallback.
 */
async function extractTextFromImageBuffer(
  buffer: Buffer,
  mimeType: string,
): Promise<{ text: string; engine: "gemini-vision" | "tesseract" }> {
  // 1. Try Gemini Vision if API key is configured
  let geminiKey = "";
  try {
    const adminSettings = getAdminSettings(false);
    geminiKey = adminSettings.geminiApiKey || process.env.GEMINI_API_KEY || "";
  } catch {
    geminiKey = process.env.GEMINI_API_KEY || "";
  }

  if (geminiKey && geminiKey.trim().length > 10) {
    try {
      const base64Data = buffer.toString("base64");
      const cleanMime = mimeType.includes("image") ? mimeType : "image/png";

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.trim()}`;
      const payload = {
        contents: [
          {
            parts: [
              {
                text: "You are an optical character recognition (OCR) engine. Extract ALL readable text visible in this image or screenshot verbatim, preserving words, numbers, punctuation, spelling, paragraphs, and line breaks exactly as they appear on the source. Do not add any conversational commentary, explanations, or markdown code fences. Output ONLY the extracted text.",
              },
              {
                inlineData: {
                  mimeType: cleanMime,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = (await res.json()) as any;
        const candidate = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate && candidate.trim().length > 0) {
          return { text: candidate.trim(), engine: "gemini-vision" };
        }
      } else {
        console.warn("Gemini Vision OCR returned status:", res.status);
      }
    } catch (gErr) {
      console.warn("Gemini Vision OCR network error, falling back to local Tesseract:", gErr);
    }
  }

  // 2. Local Tesseract OCR Fallback (Zero external API, 100% offline & private)
  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    const ret = await worker.recognize(buffer);
    await worker.terminate();
    const tesseractText = (ret?.data?.text || "").trim();
    return { text: tesseractText, engine: "tesseract" };
  } catch (tErr) {
    console.error("Tesseract OCR fallback failed:", tErr);
    throw new Error(
      "Could not extract text from this image. Please ensure the image contains clear, legible text or try uploading another screenshot.",
    );
  }
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<ExtractionResult> {
  const lowerName = filename.toLowerCase();

  if (!buffer || buffer.length === 0) {
    throw new Error("The uploaded file is empty (0 bytes). Please supply a valid document.");
  }

  // 1. Image / Screenshot OCR Extraction (PNG, JPG, JPEG, WEBP, BMP, TIFF)
  const isImage =
    mimeType.startsWith("image/") ||
    /\.(png|jpe?g|webp|bmp|tiff?|gif)$/i.test(lowerName);

  if (isImage) {
    try {
      const { text, engine } = await extractTextFromImageBuffer(buffer, mimeType);
      const words = text.split(/\s+/).filter(Boolean).length;
      const lines = text.split("\n").filter((l) => l.trim().length > 0).length;

      if (!text || text.length === 0) {
        return {
          text: "",
          wordCount: 0,
          lineCount: 0,
          charCount: 0,
          format: "image",
          isScannedOrEmpty: true,
          ocrEngine: engine,
          warning:
            "No readable text was detected in this image. Please ensure the screenshot or picture contains clear, high-contrast text.",
        };
      }

      return {
        text,
        wordCount: words,
        lineCount: lines,
        charCount: text.length,
        format: "image",
        ocrEngine: engine,
      };
    } catch (imgErr: unknown) {
      const msg = imgErr instanceof Error ? imgErr.message : "Image OCR processing failed.";
      throw new Error(msg);
    }
  }

  // 2. PDF Extraction
  if (mimeType.includes("pdf") || lowerName.endsWith(".pdf")) {
    try {
      const parser = new PDFParse(new Uint8Array(buffer));
      await parser.load();
      const parsed = await parser.getText();
      const text = (parsed.text || "").trim();

      if (text.length < 15) {
        return {
          text: "",
          wordCount: 0,
          lineCount: 0,
          charCount: 0,
          pageCount: parsed.total || 1,
          format: "pdf",
          isScannedOrEmpty: true,
          warning:
            "This PDF appears to be an image-only scan or contains no selectable text layer. You can convert the page to an image or screenshot to extract its text via OCR.",
        };
      }

      const words = text.split(/\s+/).filter(Boolean).length;
      const lines = text.split("\n").filter((l) => l.trim().length > 0).length;

      return {
        text,
        wordCount: words,
        lineCount: lines,
        charCount: text.length,
        pageCount: parsed.total || 1,
        format: "pdf",
        ocrEngine: "none",
      };
    } catch (err: unknown) {
      console.error("PDF parse error:", err);
      throw new Error(
        "Could not parse the PDF file. The file may be password-protected, corrupted, or formatted with unsupported encoding.",
      );
    }
  }

  // 3. DOCX Extraction
  if (
    mimeType.includes("wordprocessingml") ||
    lowerName.endsWith(".docx") ||
    lowerName.endsWith(".doc")
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = (result.value || "").trim();

      if (text.length < 15) {
        return {
          text: "",
          wordCount: 0,
          lineCount: 0,
          charCount: 0,
          format: "docx",
          isScannedOrEmpty: true,
          warning:
            "This Word document contains no readable text or is empty. Please verify the document content.",
        };
      }

      const words = text.split(/\s+/).filter(Boolean).length;
      const lines = text.split("\n").filter((l) => l.trim().length > 0).length;

      return {
        text,
        wordCount: words,
        lineCount: lines,
        charCount: text.length,
        format: "docx",
        ocrEngine: "none",
      };
    } catch (err) {
      console.error("Mammoth DOCX parse error:", err);
      throw new Error(
        "Could not read the Word document. The file may be damaged or saved in an incompatible legacy format.",
      );
    }
  }

  // 4. Plain Text / TXT / Markdown
  const text = buffer.toString("utf-8").trim();
  if (text.length === 0) {
    return {
      text: "",
      wordCount: 0,
      lineCount: 0,
      charCount: 0,
      format: "txt",
      isScannedOrEmpty: true,
      warning: "The text document is empty.",
      ocrEngine: "none",
    };
  }

  const words = text.split(/\s+/).filter(Boolean).length;
  const lines = text.split("\n").filter((l) => l.trim().length > 0).length;

  return {
    text,
    wordCount: words,
    lineCount: lines,
    charCount: text.length,
    format: "txt",
    ocrEngine: "none",
  };
}
