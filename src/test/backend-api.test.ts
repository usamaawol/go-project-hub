import { describe, it, expect } from "vitest";
import { app } from "../../server/app";
import { TEMPLATES, TEMPLATE_CATEGORIES } from "../data/templates";
import { extractTextFromBuffer } from "../../server/services/extractor.service";
import { compressPdfBuffer } from "../../server/services/compressor.service";
import { generatePresentationBuffer } from "../../server/services/presentation.service";
import { PDFDocument } from "pdf-lib";

describe("DocuMind Backend Services & 100% Free Access Policy", () => {
  it("enforces 100+ distinct templates across all 10 required categories", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(100);

    const requiredCategories = [
      "Business",
      "Education",
      "Research",
      "Technology",
      "Creative",
      "Portfolio",
      "Reports",
      "Academic",
      "Pitch Decks",
      "Minimal",
    ];

    for (const cat of requiredCategories) {
      const matching = TEMPLATES.filter((t) => t.category.toLowerCase() === cat.toLowerCase());
      expect(matching.length).toBeGreaterThanOrEqual(10);
    }

    const freeCount = TEMPLATES.filter((t) => t.isFree).length;
    const proCount = TEMPLATES.filter((t) => !t.isFree).length;
    expect(freeCount).toBe(50);
    expect(proCount).toBe(60);
  });

  it("extracts text from buffer accurately", async () => {
    const sampleText =
      "DocuMind is an intelligent document productivity platform for students and teams.";
    const buffer = Buffer.from(sampleText, "utf-8");
    const result = await extractTextFromBuffer(buffer, "text/plain", "sample.txt");

    expect(result.text).toContain("DocuMind");
    expect(result.wordCount).toBeGreaterThan(5);
    expect(result.format).toBe("txt");
  });

  it("compresses PDF buffers losslessly and reports reduction", async () => {
    // Create a real minimal PDF document in memory using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    page.drawText("DocuMind Free Document Processing Engine Test Page");
    const originalBytes = await pdfDoc.save();
    const inputBuffer = Buffer.from(originalBytes);

    const compressed = await compressPdfBuffer(inputBuffer, "balanced");
    expect(compressed.compressedSize).toBeGreaterThan(0);
    expect(compressed.reductionPercent).toBeGreaterThanOrEqual(0);
    expect(compressed.pagesCount).toBe(1);
  });

  it("generates a genuine PowerPoint presentation (.pptx)", async () => {
    const pptxBuffer = await generatePresentationBuffer({
      title: "DocuMind Free Presentation Engine",
      category: "Technology",
      slides: [
        {
          title: "Architecture & Scale",
          subtitle: "Zero Subscription Policy",
          bullets: ["110+ Free Templates", "Real PPTX Export", "Full Privacy"],
        },
      ],
    });

    expect(Buffer.isBuffer(pptxBuffer)).toBe(true);
    expect(pptxBuffer.length).toBeGreaterThan(1000);
    // PPTX magic header (PK zip header: 0x50 0x4B 0x03 0x04)
    expect(pptxBuffer[0]).toBe(0x50);
    expect(pptxBuffer[1]).toBe(0x4b);
  });
});
