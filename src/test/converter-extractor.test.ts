import { describe, it, expect } from "vitest";
import { convertDocumentBuffer } from "../../server/services/converter.service";
import { extractTextFromBuffer } from "../../server/services/extractor.service";
import { PDFDocument } from "pdf-lib";

describe("DocuMind File Converter & OCR Text Extractor Verification", () => {
  const sampleDocumentContent = `1.0 Executive Architecture & Implementation
DocuMind is an intelligent document productivity platform for research teams, students, and educators.

2.0 Strategic Pillars
- Zero watermarks on generated files
- Deterministic vector conversion pipelines
- Preserves full textual hierarchy and paragraphs

3.0 Implementation Milestones
Phase 1: Bi-directional document conversion between PDF, DOCX, and TXT formats.
Phase 2: Vision-based OCR extracting text verbatim from screenshots and photos.
All original topics, main ideas, and structure are preserved with zero data loss.`;

  // ----------------------------------------------------
  // Test Suite 1: Conversion Pipeline Verification
  // ----------------------------------------------------
  describe("Bidirectional Document Conversion (PDF <-> DOCX <-> TXT)", () => {
    it("converts TXT -> DOCX preserving all topics and content", async () => {
      const inputBuffer = Buffer.from(sampleDocumentContent, "utf-8");
      const result = await convertDocumentBuffer(inputBuffer, "text/plain", "DOCX", "project_plan.txt");

      expect(result.buffer).toBeDefined();
      expect(result.sizeBytes).toBeGreaterThan(1000);
      expect(result.mimeType).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      expect(result.filename).toBe("project_plan_converted.docx");

      // Verify that the generated DOCX can be extracted back with full content preserved
      const reExtracted = await extractTextFromBuffer(result.buffer, result.mimeType, result.filename);
      expect(reExtracted.text).toContain("Executive Architecture & Implementation");
      expect(reExtracted.text).toContain("Strategic Pillars");
      expect(reExtracted.text).toContain("Zero watermarks on generated files");
      expect(reExtracted.text).toContain("Implementation Milestones");
    });

    it("converts TXT -> PDF preserving all topics and structure", async () => {
      const inputBuffer = Buffer.from(sampleDocumentContent, "utf-8");
      const result = await convertDocumentBuffer(inputBuffer, "text/plain", "PDF", "project_plan.txt");

      expect(result.buffer).toBeDefined();
      expect(result.sizeBytes).toBeGreaterThan(500);
      expect(result.mimeType).toBe("application/pdf");
      expect(result.filename).toBe("project_plan_converted.pdf");

      // Verify that the generated PDF has valid PDF magic header (%PDF-)
      const header = result.buffer.subarray(0, 5).toString("utf-8");
      expect(header).toBe("%PDF-");

      // Verify that the generated PDF can be re-extracted
      const reExtracted = await extractTextFromBuffer(result.buffer, result.mimeType, result.filename);
      expect(reExtracted.text).toContain("Executive Architecture & Implementation");
      expect(reExtracted.text).toContain("Strategic Pillars");
      expect(reExtracted.text).toContain("Implementation Milestones");
    });

    it("converts PDF -> DOCX preserving all content", async () => {
      // Create valid PDF in memory
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]);
      page.drawText("Quarterly Research Review\nKey topic: Machine Learning Acceleration.\nDeliverable: Vector PPTX and DOCX.", {
        x: 54,
        y: 720,
        size: 12,
      });
      const pdfBytes = await pdfDoc.save();
      const pdfBuffer = Buffer.from(pdfBytes);

      const result = await convertDocumentBuffer(pdfBuffer, "application/pdf", "DOCX", "quarterly_review.pdf");

      expect(result.filename).toBe("quarterly_review_converted.docx");
      expect(result.mimeType).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );

      // Verify re-extraction from the converted DOCX
      const reExtracted = await extractTextFromBuffer(result.buffer, result.mimeType, result.filename);
      expect(reExtracted.text).toContain("Quarterly Research Review");
      expect(reExtracted.text).toContain("Machine Learning Acceleration");
    });

    it("converts PDF -> TXT preserving all text and topics", async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]);
      page.drawText("Strategic Overview: Academic Freedom and Digital Literacy.", {
        x: 54,
        y: 720,
        size: 12,
      });
      const pdfBytes = await pdfDoc.save();
      const pdfBuffer = Buffer.from(pdfBytes);

      const result = await convertDocumentBuffer(pdfBuffer, "application/pdf", "TXT", "overview.pdf");

      expect(result.filename).toBe("overview_converted.txt");
      expect(result.mimeType).toBe("text/plain; charset=utf-8");
      const text = result.buffer.toString("utf-8");
      expect(text).toContain("Strategic Overview: Academic Freedom and Digital Literacy.");
    });

    it("converts DOCX -> PDF preserving all text and structure", async () => {
      // Generate a real DOCX first
      const docxResult = await convertDocumentBuffer(
        Buffer.from(sampleDocumentContent, "utf-8"),
        "text/plain",
        "DOCX",
        "contract.txt",
      );

      // Now convert that DOCX into PDF
      const pdfResult = await convertDocumentBuffer(
        docxResult.buffer,
        docxResult.mimeType,
        "PDF",
        docxResult.filename,
      );

      expect(pdfResult.filename).toBe("contract_converted_converted.pdf");
      expect(pdfResult.mimeType).toBe("application/pdf");
      expect(pdfResult.buffer.subarray(0, 5).toString("utf-8")).toBe("%PDF-");

      const reExtracted = await extractTextFromBuffer(pdfResult.buffer, pdfResult.mimeType, pdfResult.filename);
      expect(reExtracted.text).toContain("Executive Architecture & Implementation");
    });

    it("converts DOCX -> TXT preserving exact paragraphs", async () => {
      const docxResult = await convertDocumentBuffer(
        Buffer.from(sampleDocumentContent, "utf-8"),
        "text/plain",
        "DOCX",
        "notes.txt",
      );

      const txtResult = await convertDocumentBuffer(
        docxResult.buffer,
        docxResult.mimeType,
        "TXT",
        docxResult.filename,
      );

      expect(txtResult.filename).toBe("notes_converted_converted.txt");
      const text = txtResult.buffer.toString("utf-8");
      expect(text).toContain("Executive Architecture & Implementation");
      expect(text).toContain("Strategic Pillars");
    });
  });

  // ----------------------------------------------------
  // Test Suite 2: Text & Screenshot OCR Extraction
  // ----------------------------------------------------
  describe("Text Extractor with Document and Screenshot OCR", () => {
    it("extracts text accurately from plain text documents", async () => {
      const buffer = Buffer.from("DocuMind OCR System\nExtracts clean text without formatting loss.", "utf-8");
      const res = await extractTextFromBuffer(buffer, "text/plain", "doc.txt");

      expect(res.format).toBe("txt");
      expect(res.wordCount).toBe(9);
      expect(res.text).toContain("DocuMind OCR System");
    });

    it("extracts text accurately from PDF documents", async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]);
      page.drawText("Physics Lecture Notes: Quantum Mechanics & Wavefunctions.", {
        x: 54,
        y: 720,
        size: 14,
      });
      const pdfBytes = await pdfDoc.save();

      const res = await extractTextFromBuffer(Buffer.from(pdfBytes), "application/pdf", "physics.pdf");
      expect(res.format).toBe("pdf");
      expect(res.text).toContain("Physics Lecture Notes");
      expect(res.wordCount).toBeGreaterThan(5);
    });

    it("recognizes image files and routes them through the OCR engine", async () => {
      // 1x1 minimal transparent PNG buffer
      const pngBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
      const pngBuffer = Buffer.from(pngBase64, "base64");

      const res = await extractTextFromBuffer(pngBuffer, "image/png", "screenshot.png");
      expect(res.format).toBe("image");
      expect(res.ocrEngine).toBeDefined(); // gemini-vision or tesseract
    });
  });
});
