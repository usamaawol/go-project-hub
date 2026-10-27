import {
  synthesizeDocument,
  parsePlainTextToBlocks,
  renderExecutivePdf,
  renderExecutiveDocx,
} from "../../src/lib/document-synthesizer";
import { extractTextFromBuffer } from "./extractor.service";
import { getBytesFromBlobOrFile } from "../../src/lib/api-client";

export type SupportedFormat = "PDF" | "DOCX" | "DOC" | "TXT";

export interface ConversionResult {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  sizeBytes: number;
  wordCount: number;
  previewText?: string;
}

/**
 * Builds an executive, publication-grade Microsoft Word (.docx) document preserving all original content,
 * headings, tables, bullet points, and structure with executive typography.
 */
export async function buildDocxBuffer(text: string, title?: string): Promise<Buffer> {
  const blocks = parsePlainTextToBlocks(text);
  const data = await renderExecutiveDocx(blocks, title);
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  const bytes = await getBytesFromBlobOrFile(data as any);
  return Buffer.from(bytes);
}

/**
 * Builds an executive, publication-grade Adobe PDF document (.pdf) with standard typography, margins,
 * tables, running headers, and pagination preserving all original content with high fidelity.
 */
export async function buildPdfBuffer(text: string, title?: string): Promise<Buffer> {
  const blocks = parsePlainTextToBlocks(text);
  const pdfBytes = await renderExecutivePdf(blocks, title);
  return Buffer.from(pdfBytes);
}

/**
 * Universal document conversion engine handling bidirectional conversions across PDF, DOCX, DOC, and TXT.
 * Preserves 100% of original content, semantic hierarchy, tables, and lists with executive presentation.
 */
export async function convertDocumentBuffer(
  inputBuffer: Buffer,
  inputMimeOrExt: string,
  targetFormat: SupportedFormat,
  originalFilename: string,
): Promise<ConversionResult> {
  // Extract text layer first (for PDF, TXT, DOC, OCR)
  let text = "";
  try {
    const extraction = await extractTextFromBuffer(inputBuffer, inputMimeOrExt, originalFilename);
    text = extraction.text.trim();
  } catch (e) {
    console.warn("Server buffer text extraction warning:", e);
  }

  // Check if input is HTML
  let html: string | undefined = undefined;
  const sample = inputBuffer.subarray(0, Math.min(inputBuffer.length, 2048)).toString("utf-8");
  if (/<(!doctype|html|w:worddocument)/i.test(sample)) {
    html = inputBuffer.toString("utf-8");
  }

  const synthResult = await synthesizeDocument(
    {
      bytes: new Uint8Array(inputBuffer),
      filename: originalFilename,
      text,
      html,
    },
    targetFormat,
  );

  let buffer: Buffer;
  if (Buffer.isBuffer(synthResult.data)) {
    buffer = synthResult.data;
  } else if (ArrayBuffer.isView(synthResult.data)) {
    buffer = Buffer.from(
      synthResult.data.buffer,
      synthResult.data.byteOffset,
      synthResult.data.byteLength,
    );
  } else if (typeof (synthResult.data as any).arrayBuffer === "function") {
    const ab = await (synthResult.data as any).arrayBuffer();
    buffer = Buffer.from(ab);
  } else {
    const bytes = await getBytesFromBlobOrFile(synthResult.data as any);
    buffer = Buffer.from(bytes);
  }

  return {
    buffer,
    mimeType: synthResult.mimeType,
    filename: synthResult.filename,
    sizeBytes: buffer.length,
    wordCount: synthResult.wordCount,
    previewText: synthResult.previewText,
  };
}
