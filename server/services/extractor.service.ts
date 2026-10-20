import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export interface ExtractionResult {
  text: string;
  wordCount: number;
  lineCount: number;
  pageCount?: number;
  format: "pdf" | "docx" | "txt" | "unknown";
  meta?: Record<string, unknown>;
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<ExtractionResult> {
  const lowerName = filename.toLowerCase();

  // 1. PDF Extraction
  if (mimeType.includes("pdf") || lowerName.endsWith(".pdf")) {
    try {
      const parser = new PDFParse(new Uint8Array(buffer));
      await parser.load();
      const parsed = await parser.getText();
      const text = parsed.text || "";
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const lines = text.split("\n").length;

      return {
        text,
        wordCount: words,
        lineCount: lines,
        pageCount: parsed.total || 1,
        format: "pdf",
      };
    } catch (err) {
      console.error("PDF parse error, using fallback extraction:", err);
      // Fallback text extractor from binary
      const fallbackText = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
      return {
        text: fallbackText.slice(0, 5000),
        wordCount: fallbackText.split(/\s+/).length,
        lineCount: fallbackText.split("\n").length,
        pageCount: 1,
        format: "pdf",
      };
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
      const text = result.value || "";
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const lines = text.split("\n").length;

      return {
        text,
        wordCount: words,
        lineCount: lines,
        format: "docx",
      };
    } catch (err) {
      console.error("Mammoth DOCX parse error:", err);
    }
  }

  // 3. Plain Text / TXT / Markdown
  const text = buffer.toString("utf-8");
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lines = text.split("\n").length;

  return {
    text,
    wordCount: words,
    lineCount: lines,
    format: "txt",
  };
}
