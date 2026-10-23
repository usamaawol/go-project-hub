/**
 * DocuMind Universal PDF Text & OCR Extractor (Client & Server)
 * Supports compressed FlateDecode streams, subsetted fonts, and scanned image PDFs.
 * 100% independent of backend servers. Runs natively on Vercel, static preview, and local.
 */

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
  // Load PDF using pdfjs-dist legacy build (no worker required)
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const loadingTask = pdfjsLib.getDocument({
    data: bytes,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
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

  const cleanedText = fullText.trim();

  // If text was extracted, return immediately
  if (cleanedText.length > 5) {
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

  // Fallback: If document contains no selectable text (scanned image PDF), run OCR via canvas if in browser
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      onProgress?.("Scanned PDF detected. Running in-browser OCR...");
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      let ocrText = "";

      for (let pageNum = 1; pageNum <= Math.min(pageCount, 10); pageNum++) {
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
          pageCount,
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
