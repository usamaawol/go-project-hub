import { extractDocumentText, getBytesFromBlobOrFile } from "./api-client";
import {
  synthesizeDocument,
  parsePlainTextToBlocks,
  renderExecutivePdf,
  renderExecutiveDocx,
  type SynthesizerExportOptions,
} from "./document-synthesizer";

export type ConversionTarget = "PDF" | "DOCX" | "DOC" | "TXT";

export interface ClientConversionResult {
  blob: Blob;
  filename: string;
  targetFormat: ConversionTarget;
  sizeBytes: number;
  wordCount: number;
  previewText?: string;
}

/**
 * Base64 string to Uint8Array helper
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates an executive Microsoft Word (.docx/.doc) file preserving all original content,
 * headings, tables, bullet points, and structure with publication-grade layout.
 */
export async function generateClientDocx(
  text: string,
  title?: string,
  options?: SynthesizerExportOptions,
): Promise<Blob> {
  const blocks = parsePlainTextToBlocks(text);
  return await renderExecutiveDocx(blocks, title, { removeDividers: true, ...options });
}

/**
 * Generates an executive Adobe PDF (.pdf) file in the browser using `pdf-lib`,
 * preserving all original content, headings, tables, bullet points, and structure with publication-grade layout.
 */
export async function generateClientPdf(
  text: string,
  title?: string,
  options?: SynthesizerExportOptions,
): Promise<Blob> {
  const blocks = parsePlainTextToBlocks(text);
  const pdfBytes = await renderExecutivePdf(blocks, title, { removeDividers: true, ...options });
  return new Blob([pdfBytes as any], { type: "application/pdf" });
}

/**
 * Converts any document (PDF, DOCX, DOC, TXT) to any target format (PDF, DOCX, DOC, TXT).
 * Uses high-fidelity semantic block synthesis to render publication-grade PDFs and DOCX files.
 */
export async function convertDocument(
  file: File,
  targetFormat: ConversionTarget,
): Promise<ClientConversionResult> {
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const extensionMap: Record<ConversionTarget, string> = {
    PDF: "pdf",
    DOCX: "docx",
    DOC: "doc",
    TXT: "txt",
  };
  const targetExtension = extensionMap[targetFormat];
  const outputFilename = `${baseName}.${targetExtension}`;

  // 1. Try server-side conversion pipeline if in browser
  if (typeof window !== "undefined") {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("targetFormat", targetFormat);

      const res = await fetch("/api/documents/convert", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.base64) {
          const bytes = base64ToUint8Array(json.data.base64);
          const blob = new Blob([bytes as any], { type: json.data.mimeType });
          return {
            blob,
            filename: json.data.filename || outputFilename,
            targetFormat,
            sizeBytes: blob.size,
            wordCount: json.data.wordCount || 0,
            previewText: json.data.previewText,
          };
        }
      }
    } catch (err) {
      console.warn("Backend conversion endpoint unavailable, using client synthesis:", err);
    }
  }

  // 2. High-fidelity client synthesis engine
  const bytes = await getBytesFromBlobOrFile(file);
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  // Extract text for fallback or preview
  let text = "";
  try {
    const extraction = await extractDocumentText(file);
    text = extraction.text.trim();
  } catch (e) {
    console.warn("Extraction check error:", e);
  }

  if (!text && (ext === "pdf" || file.type.includes("pdf"))) {
    try {
      const { extractTextFromPdfBytes } = await import("./pdf-extractor");
      const pdfRes = await extractTextFromPdfBytes(bytes);
      text = pdfRes.text.trim();
    } catch (e) {
      console.warn("Direct PDF extraction error:", e);
    }
  }

  if (!text && (ext === "doc" || ext === "docx" || ext === "rtf" || file.type.includes("word") || file.type.includes("msword"))) {
    try {
      const { extractTextFromWordOrDoc } = await import("./doc-extractor");
      const docRes = await extractTextFromWordOrDoc(bytes, file.name);
      text = docRes.text.trim();
    } catch (e) {
      console.warn("Direct Word/DOC extraction error:", e);
    }
  }

  const synthResult = await synthesizeDocument(
    {
      bytes,
      filename: file.name,
      text,
    },
    targetFormat,
    { removeDividers: true },
  );

  let resultBlob: Blob;
  if (ArrayBuffer.isView(synthResult.data)) {
    resultBlob = new Blob([synthResult.data as any], { type: synthResult.mimeType });
  } else if (synthResult.data instanceof Blob) {
    resultBlob = synthResult.data;
  } else {
    resultBlob = new Blob([synthResult.data as any], { type: synthResult.mimeType });
  }

  return {
    blob: resultBlob,
    filename: synthResult.filename,
    targetFormat,
    sizeBytes: resultBlob.size,
    wordCount: synthResult.wordCount,
    previewText: synthResult.previewText,
  };
}
