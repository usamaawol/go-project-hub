import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export interface ExtractionResult {
  text: string;
  wordCount: number;
  lineCount: number;
  pageCount?: number;
  format: "pdf" | "docx" | "txt" | "unknown";
  isScannedOrEmpty?: boolean;
  warning?: string;
  meta?: Record<string, unknown>;
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

  // 1. PDF Extraction
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
          pageCount: parsed.total || 1,
          format: "pdf",
          isScannedOrEmpty: true,
          warning:
            "This PDF appears to be an image-only scan or contains no selectable text layer. Please use a text-based document or paste your outline directly.",
        };
      }

      const words = text.split(/\s+/).filter(Boolean).length;
      const lines = text.split("\n").filter((l) => l.trim().length > 0).length;

      return {
        text,
        wordCount: words,
        lineCount: lines,
        pageCount: parsed.total || 1,
        format: "pdf",
      };
    } catch (err: unknown) {
      console.error("PDF parse error:", err);
      throw new Error(
        "Could not parse the PDF file. The file may be password-protected, corrupted, or formatted with unsupported encoding.",
      );
    }
  }

  // 2. DOCX Extraction
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
        format: "docx",
      };
    } catch (err) {
      console.error("Mammoth DOCX parse error:", err);
      throw new Error(
        "Could not read the Word document. The file may be damaged or saved in an incompatible legacy format.",
      );
    }
  }

  // 3. Plain Text / TXT / Markdown
  const text = buffer.toString("utf-8").trim();
  if (text.length === 0) {
    return {
      text: "",
      wordCount: 0,
      lineCount: 0,
      format: "txt",
      isScannedOrEmpty: true,
      warning: "The text document is empty.",
    };
  }

  const words = text.split(/\s+/).filter(Boolean).length;
  const lines = text.split("\n").filter((l) => l.trim().length > 0).length;

  return {
    text,
    wordCount: words,
    lineCount: lines,
    format: "txt",
  };
}
