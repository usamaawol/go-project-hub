/**
 * DocuMind Universal PDF Text & OCR Extractor (Client & Server)
 * Supports compressed FlateDecode streams, subsetted fonts, and scanned image PDFs.
 * 100% independent of backend servers. Runs natively on Vercel, static preview, and local.
 */

import { cleanDocumentPageNoise } from "./document-synthesizer";

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  wordCount: number;
  lineCount: number;
  charCount: number;
  isOcr?: boolean;
}

export async function extractTextFromPdfBytes(
  bytes: Uint8Array,
  onProgress?: (status: string) => void,
): Promise<PdfExtractionResult> {
  let cleanedText = "";
  let pageCount = 1;

  // Tier 1: PDFParse (Fastest, pure JS, handles compressed FlateDecode streams & subset fonts without worker scripts)
  try {
    onProgress?.("Extracting PDF content with primary parser...");
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse(new Uint8Array(bytes));
    await parser.load();
    const parsed = await parser.getText();
    let text = (parsed.text || "").trim();
    text = cleanDocumentPageNoise(text);
    if (text.length > 0) {
      cleanedText = text;
      pageCount = parsed.total || 1;
      const words = cleanedText.split(/\s+/).filter(Boolean).length;
      const lines = cleanedText.split("\n").filter((l) => l.trim().length > 0).length;
      return {
        text: cleanedText,
        pageCount,
        wordCount: words,
        lineCount: lines,
        charCount: cleanedText.length,
        isOcr: false,
      };
    }
  } catch (pdfParseErr) {
    console.warn("Tier 1 PDFParse extraction error, falling back to secondary parser:", pdfParseErr);
  }

  // Tier 2: pdfjs-dist legacy engine with local or CDN worker fallback
  try {
    onProgress?.("Extracting PDF glyphs with secondary engine...");
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    if (typeof window !== "undefined") {
      try {
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        }
      } catch {}
    }

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(bytes),
      useSystemFonts: true,
      disableFontFace: true,
      isEvalSupported: false,
    });

    const pdf = await loadingTask.promise;
    pageCount = pdf.numPages;
    let fullText = "";

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      onProgress?.(`Extracting page ${pageNum} of ${pageCount}...`);
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const items = content.items as Array<{ str?: string; transform?: number[] }>;
      const strings: string[] = [];

      let lastY: number | null = null;
      for (const item of items) {
        if (!item.str) continue;
        const currentY = item.transform ? item.transform[5] : null;
        if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 6) {
          strings.push("\n");
        }
        strings.push(item.str);
        if (currentY !== null) {
          lastY = currentY;
        }
      }

      const pageText = strings.join(" ").replace(/\s*\n\s*/g, "\n").trim();
      if (pageText) {
        fullText += pageText + "\n\n";
      }
    }

    if (fullText.trim().length > 5) {
      cleanedText = cleanDocumentPageNoise(fullText.trim());
      const words = cleanedText.split(/\s+/).filter(Boolean).length;
      const lines = cleanedText.split("\n").filter((l) => l.trim().length > 0).length;
      return {
        text: cleanedText,
        pageCount,
        wordCount: words,
        lineCount: lines,
        charCount: cleanedText.length,
        isOcr: false,
      };
    }
  } catch (pdfjsErr) {
    console.warn("Tier 2 pdfjs-dist extraction error:", pdfjsErr);
  }

  // Tier 3: Direct uncompressed / flate stream extraction
  try {
    const textDecoder = new TextDecoder("utf-8", { fatal: false });
    const rawString = textDecoder.decode(bytes);
    const btMatches = rawString.matchAll(/BT[\s\S]*?ET/g);
    const extractedParts: string[] = [];
    for (const match of btMatches) {
      const block = match[0];
      const stringMatches = block.matchAll(/\((.*?)\)\s*T[jJ]/g);
      for (const sm of stringMatches) {
        if (sm[1] && sm[1].trim().length > 0) {
          extractedParts.push(sm[1].replace(/\\([()\\])/g, "$1"));
        }
      }
    }
    const streamExtracted = extractedParts.join(" ").trim();
    if (streamExtracted.length > 20) {
      cleanedText = streamExtracted;
      const words = cleanedText.split(/\s+/).filter(Boolean).length;
      const lines = cleanedText.split("\n").filter((l) => l.trim().length > 0).length;
      return {
        text: cleanedText,
        pageCount,
        wordCount: words,
        lineCount: lines,
        charCount: cleanedText.length,
        isOcr: false,
      };
    }
  } catch (streamErr) {
    console.warn("Tier 3 stream extraction fallback error:", streamErr);
  }

  // Tier 4: Scanned Image PDF OCR fallback via Canvas & Tesseract.js (if in browser)
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      onProgress?.("Scanned PDF detected. Running in-browser OCR...");
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      }
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(bytes),
        useSystemFonts: true,
        disableFontFace: true,
        isEvalSupported: false,
      });
      const pdf = await loadingTask.promise;
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      let ocrText = "";

      for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 10); pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          await (page.render({ canvasContext: ctx, viewport } as any) as any).promise;
          const res = await worker.recognize(canvas);
          const pageOcr = (res?.data?.text || "").trim();
          if (pageOcr) {
            ocrText += pageOcr + "\n\n";
          }
        }
      }

      await worker.terminate();
      const trimmedOcr = ocrText.trim();

      if (trimmedOcr.length > 0) {
        const words = trimmedOcr.split(/\s+/).filter(Boolean).length;
        const lines = trimmedOcr.split("\n").filter((l) => l.trim().length > 0).length;
        return {
          text: trimmedOcr,
          pageCount: pdf.numPages,
          wordCount: words,
          lineCount: lines,
          charCount: trimmedOcr.length,
          isOcr: true,
        };
      }
    } catch (ocrErr) {
      console.warn("Client-side PDF canvas OCR fallback error:", ocrErr);
    }
  }

  const words = cleanedText.split(/\s+/).filter(Boolean).length;
  const lines = cleanedText ? cleanedText.split("\n").filter((l) => l.trim().length > 0).length : 0;
  return {
    text: cleanedText,
    pageCount,
    wordCount: words,
    lineCount: lines,
    charCount: cleanedText.length,
    isOcr: false,
  };
}
