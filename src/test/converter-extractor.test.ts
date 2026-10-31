import { describe, it, expect } from "vitest";
import { convertDocumentBuffer } from "../../server/services/converter.service";
import { extractTextFromBuffer } from "../../server/services/extractor.service";
import {
  parsePlainTextToBlocks,
  renderExecutivePdf,
  renderExecutiveDocx,
  cleanDocumentPageNoise,
} from "../lib/document-synthesizer";
import { convertBlocksToA4Html } from "../routes/converter";
import { PDFDocument } from "pdf-lib";
import fs from "fs";

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
      expect(result.filename).toBe("project_plan.docx");

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
      expect(result.filename).toBe("project_plan.pdf");

      // Verify that the generated PDF has valid PDF magic header (%PDF-)
      const header = result.buffer.subarray(0, 5).toString("utf-8");
      expect(header).toBe("%PDF-");

      // Verify that the generated PDF has standard ISO A4 dimensions (595.28 x 841.89 pt)
      const uint8 = new Uint8Array(result.buffer.buffer, result.buffer.byteOffset, result.buffer.byteLength);
      const pdfDocLoaded = await PDFDocument.load(uint8);
      const p1 = pdfDocLoaded.getPage(0);
      expect(p1.getWidth()).toBeCloseTo(595.28, 1);
      expect(p1.getHeight()).toBeCloseTo(841.89, 1);

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

      expect(result.filename).toBe("quarterly_review.docx");
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

      expect(result.filename).toBe("overview.txt");
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

      expect(pdfResult.filename).toBe("contract.pdf");
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

      expect(txtResult.filename).toBe("notes.txt");
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

    it("converts compressed PDF with FlateDecode streams client-side without errors", async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]);
      page.drawText("Internet Programming II Nextjs Assignment: Building Modern Web Applications", {
        x: 50,
        y: 700,
        size: 12,
      });
      const pdfBytes = await pdfDoc.save();
      const file = new File([pdfBytes], "optimized_Internet_Programming_II_Nextjs_Assignment.pdf", {
        type: "application/pdf",
      });

      const { convertDocument } = await import("../lib/document-converter");
      const result = await convertDocument(file, "TXT");

      expect(result.filename).toBe("optimized_Internet_Programming_II_Nextjs_Assignment.txt");
      expect(result.previewText).toContain("Internet Programming II Nextjs Assignment");
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it("converts complex user PDF documents such as Sof Omar Tech Academy Glossary into TXT and DOCX preserving all terms", async () => {
      const filePath = "/home/usama/Downloads/Telegram Desktop/Sof Omar Tech Academy - Tech Terminologies Glossary (1).pdf";
      if (!fs.existsSync(filePath)) {
        return; // Skip if file not on runner filesystem
      }
      const buffer = fs.readFileSync(filePath);
      const file = new File([buffer], "Sof Omar Tech Academy - Tech Terminologies Glossary (1).pdf", {
        type: "application/pdf",
      });

      const { convertDocument } = await import("../lib/document-converter");
      const txtResult = await convertDocument(file, "TXT");

      expect(txtResult.wordCount).toBeGreaterThan(1500);
      expect(txtResult.previewText).toContain("TECH TERMINOLOGIES");
      expect(txtResult.previewText).toContain("Sof Omar Tech Academy");
      expect(txtResult.previewText).toContain("Abdulfetah Jemal");

      const docxResult = await convertDocument(file, "DOCX");
      expect(docxResult.wordCount).toBeGreaterThan(1500);
      expect(docxResult.filename).toBe("Sof Omar Tech Academy - Tech Terminologies Glossary (1).docx");
    });

    it("converts MASTER_PROJECT_PROMPT___EAGLE_TE.doc into PDF, DOCX, and TXT with zero data loss", async () => {
      const filePath = "/home/usama/Downloads/MASTER_PROJECT_PROMPT___EAGLE_TE.doc";
      if (!fs.existsSync(filePath)) {
        return;
      }
      const buffer = fs.readFileSync(filePath);

      // 1. Server-side conversion test
      const serverPdf = await convertDocumentBuffer(
        buffer,
        "application/msword",
        "PDF",
        "MASTER_PROJECT_PROMPT___EAGLE_TE.doc",
      );
      expect(serverPdf.filename).toBe("MASTER_PROJECT_PROMPT___EAGLE_TE.pdf");
      expect(serverPdf.sizeBytes).toBeGreaterThan(1000);
      expect(serverPdf.wordCount).toBeGreaterThan(3000);
      expect(serverPdf.previewText).toContain("MASTER PROJECT PROMPT — EAGLE TECHNOLOGY");
      expect(serverPdf.previewText).toContain("Flutter Android Application");

      // 2. Client-side conversion test (as run in browser and on Vercel)
      const file = new File([buffer], "MASTER_PROJECT_PROMPT___EAGLE_TE.doc", {
        type: "application/msword",
      });
      const { convertDocument } = await import("../lib/document-converter");

      const clientPdf = await convertDocument(file, "PDF");
      expect(clientPdf.filename).toBe("MASTER_PROJECT_PROMPT___EAGLE_TE.pdf");
      expect(clientPdf.sizeBytes).toBeGreaterThan(1000);
      expect(clientPdf.wordCount).toBeGreaterThan(3000);
      expect(clientPdf.previewText).toContain("MASTER PROJECT PROMPT — EAGLE TECHNOLOGY");

      const clientDocx = await convertDocument(file, "DOCX");
      expect(clientDocx.filename).toBe("MASTER_PROJECT_PROMPT___EAGLE_TE.docx");
      expect(clientDocx.wordCount).toBeGreaterThan(3000);

      const clientTxt = await convertDocument(file, "TXT");
      expect(clientTxt.filename).toBe("MASTER_PROJECT_PROMPT___EAGLE_TE.txt");
      expect(clientTxt.wordCount).toBeGreaterThan(3000);
    });

    it("extracts text and converts RTF documents accurately", async () => {
      const rtfContent = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Courier;}}\\f0\\fs24 Eagle Technology Project Milestone\\par 1. Rebuild Flutter frontend\\par 2. Integrate Firebase Auth and Firestore.}`;
      const buffer = Buffer.from(rtfContent, "latin1");

      const res = await extractTextFromBuffer(buffer, "application/rtf", "milestones.doc");
      expect(res.text).toContain("Eagle Technology Project Milestone");
      expect(res.text).toContain("1. Rebuild Flutter frontend");
      expect(res.text).toContain("2. Integrate Firebase Auth and Firestore.");

      const pdfRes = await convertDocumentBuffer(buffer, "application/rtf", "PDF", "milestones.doc");
      expect(pdfRes.filename).toBe("milestones.pdf");
      expect(pdfRes.previewText).toContain("Eagle Technology Project Milestone");
    });

    it("converts Eagle_Technology_Company_Book_Editable.docx into an executive publication-grade PDF without 72-page bloat", async () => {
      const filePath = "/home/usama/Downloads/Eagle_Technology_Company_Book_Editable.docx";
      if (!fs.existsSync(filePath)) {
        return;
      }
      const buffer = fs.readFileSync(filePath);
      const file = new File([buffer], "Eagle_Technology_Company_Book_Editable.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const { convertDocument } = await import("../lib/document-converter");
      const clientPdf = await convertDocument(file, "PDF");

      expect(clientPdf.filename).toBe("Eagle_Technology_Company_Book_Editable.pdf");
      expect(clientPdf.wordCount).toBeGreaterThan(12000);
      expect(clientPdf.previewText).toContain("Eagle Technology");

      // Verify PDF page count is compact and clean (under 45 pages, NOT 72 bloated pages)
      const { getBytesFromBlobOrFile } = await import("../lib/api-client");
      const pdfBytes = await getBytesFromBlobOrFile(clientPdf.blob);
      const loadedPdf = await PDFDocument.load(pdfBytes);
      const pageCount = loadedPdf.getPageCount();
      expect(pageCount).toBeLessThanOrEqual(45);
      expect(pageCount).toBeGreaterThanOrEqual(25);
    });

    it("cleans OCR noise, UI debris, timestamps, and formats paragraphs with 100% precision", async () => {
      const { cleanOcrArtifacts, mergeSentenceWraps, cleanAndFormatOcrText } = await import(
        "../lib/ocr-cleaner"
      );

      const rawTelegramScreenshotOcr = `~ E-DC [East Developers Community]
1,187 subscribers
A
*_ Pinned message
] | Photo
J One team. One adventure. A stronger Rotaract community.
) See youin Baile! [W]¢ © 47 1032 AM
1 (OD Leave a comment >
]
E-DC [East Developers Community]
1 Forwarded from () HU Huawei ICT Academy
[ HUAWEI COMPETITION - HARAMAYA UNIVERSITY! #
Are you passionate about technology, creativity, and innovation?
1 Students from all departments of Haramaya University are invited
) to participate in the Huawei Competition by preparing innovative
designs, creative project ideas, and technology-based solutions
related to their respective fields of study.
I This is a great opportunity to showcase your talents, share your
: ideas, collaborate with other students, and contribute to
technological Innovation.
1 [EB REGISTER HERE:
) https://docs.google.com/forms/d/1iRx581_K5iB6cdbpO-
oHgzfpyDkgOXGhOVqlinvITKY/edit
1 ® REGISTRATION DEADLINE: SATURDAY AT 6:00 PM SHARP!
§ Don't miss this opportunity to represent your department and
) turn your ideas into innovation. Register now before the deadline!
#HuaweCompetition #HaramayaUniversity #Innovation
1 #Technology #StudentCompetition
Google Docs
Contact Information
J Huawei Competition Registration Form -
] Haramaya University
Are vou interested in participating in the Huaw.`;

      // 1. Verify cleanOcrArtifacts removes UI buttons, metadata, stray glyphs, and joins URLs
      const cleaned = cleanOcrArtifacts(rawTelegramScreenshotOcr);
      expect(cleaned).not.toContain("subscribers");
      expect(cleaned).not.toContain("Pinned message");
      expect(cleaned).not.toContain("Photo");
      expect(cleaned).not.toContain("Leave a comment");
      expect(cleaned).not.toContain("1032 AM");
      expect(cleaned).not.toContain("[W]¢");
      expect(cleaned).not.toContain("1 [EB");
      expect(cleaned).not.toContain("1 ®");
      expect(cleaned).not.toContain("§ Don't");
      expect(cleaned).toContain("Don't miss this opportunity");
      expect(cleaned).toContain("See you in Baile!");
      expect(cleaned).toContain(
        "https://docs.google.com/forms/d/1iRx581_K5iB6cdbpO-oHgzfpyDkgOXGhOVqlinvITKY/edit",
      );

      // 2. Verify cleanAndFormatOcrText produces natural flowing paragraphs
      const formatted = cleanAndFormatOcrText(rawTelegramScreenshotOcr);
      expect(formatted).toContain("HUAWEI COMPETITION - HARAMAYA UNIVERSITY!");
      expect(formatted).toContain("REGISTER HERE:\nhttps://docs.google.com/forms/");
      expect(formatted).toContain(
        "#HuaweCompetition #HaramayaUniversity #Innovation #Technology #StudentCompetition",
      );
      // Paragraphs should be smooth sentences, not 4-word jagged lines
      expect(formatted).toContain(
        "Students from all departments of Haramaya University are invited to participate in the Huawei Competition",
      );
      expect(formatted).toContain(
        "This is a great opportunity to showcase your talents, share your ideas",
      );
    });
  });

  // ----------------------------------------------------
  // Test Suite 4: Executive A4 Document Synthesizer & Noise Filtering
  // ----------------------------------------------------
  describe("Executive A4 Document Synthesizer & Noise Filtering", () => {
    it("strips out raw page artifacts and classifies major headings accurately", () => {
      const noisyDocument = `
• EXECUTIVE PLATFORM SUMMARY
DocuMind converts complex documents into executive-ready outputs.

Page 4

• SCREENSHOTS AND VISUAL RECONSTRUCTION
We extract diagrams and layout hierarchies with high fidelity.

Page 5 of 12

A. Home
Overview of the primary landing screen.

B. Explore
Discovery dashboard for curated templates.

--- Page 6 ---

1.1 Architecture & Pipeline
Backend pipeline verified against cloud storage and runtime models.
`;

      const blocks = parsePlainTextToBlocks(noisyDocument);

      // Verify page number artifacts (Page 4, Page 5 of 12, --- Page 6 ---) are removed
      const hasPageNoise = blocks.some(
        (b) =>
          b.text &&
          /^(?:Page\s+\d+|---\s*Page\s+\d+)/i.test(b.text.trim()),
      );
      expect(hasPageNoise).toBe(false);

      // Verify headings are classified properly
      const heading1s = blocks.filter((b) => b.type === "heading1" || b.type === "title");
      expect(heading1s.map((h) => h.text)).toContain("EXECUTIVE PLATFORM SUMMARY");
      expect(heading1s.map((h) => h.text)).toContain("SCREENSHOTS AND VISUAL RECONSTRUCTION");

      const heading2s = blocks.filter((b) => b.type === "heading2");
      expect(heading2s.map((h) => h.text)).toContain("A. Home");
      expect(heading2s.map((h) => h.text)).toContain("B. Explore");
      expect(heading2s.map((h) => h.text)).toContain("1.1 Architecture & Pipeline");
    });

    it("renders executive PDF strictly on ISO A4 page geometry with clean styling", async () => {
      const blocks = parsePlainTextToBlocks(`
• ARCHITECTURE SPECIFICATION
DocuMind Executive Engine.

A. Cloud Firestore
Scalable metadata and real-time preferences.

B. In-Memory Clean Processing
Zero permanent storage of sensitive documents.
`);

      const pdfBytes = await renderExecutivePdf("DocuMind_Architecture.pdf", blocks);
      expect(pdfBytes).toBeDefined();
      expect(pdfBytes.length).toBeGreaterThan(1000);

      const loadedPdf = await PDFDocument.load(pdfBytes);
      expect(loadedPdf.getPageCount()).toBeGreaterThanOrEqual(1);

      // ISO A4 dimensions: 595.28 x 841.89 points
      const firstPage = loadedPdf.getPage(0);
      expect(firstPage.getWidth()).toBeCloseTo(595.28, 1);
      expect(firstPage.getHeight()).toBeCloseTo(841.89, 1);
    });
  });

  describe("Editable A4 File Converter & Horizontal Line Removal", () => {
    it("converts blocks to A4 HTML filtering out all horizontal divider lines", async () => {
      const { convertBlocksToA4Html } = await import("../routes/converter");
      const blocks = [
        { type: "title" as const, text: "Executive Report" },
        { type: "divider" as const },
        { type: "heading1" as const, text: "Introduction" },
        { type: "divider" as const },
        { type: "paragraph" as const, text: "This is authentic paragraph text without horizontal lines." },
      ];

      const html = convertBlocksToA4Html(blocks);
      expect(html).toContain("Executive Report");
      expect(html).toContain("Introduction");
      expect(html).toContain("authentic paragraph text");
      expect(html).not.toContain("<hr");
      expect(html).not.toContain("border-b");
    });

    it("generates client PDF and DOCX respecting custom line spacing, font size, and zero dividers", async () => {
      const { generateClientPdf, generateClientDocx } = await import("../lib/document-converter");
      const sampleText = "Custom Title\n\nSection Heading\n\nParagraph text with user adjustments.";

      const pdfBlob = await generateClientPdf(sampleText, "custom_doc", {
        lineSpacing: 1.8,
        fontSize: 16,
        removeDividers: true,
      });
      expect(pdfBlob).toBeDefined();
      expect(pdfBlob.size).toBeGreaterThan(500);

      const docxBlob = await generateClientDocx(sampleText, "custom_doc", {
        lineSpacing: 1.8,
        fontSize: 16,
        removeDividers: true,
      });
      expect(docxBlob).toBeDefined();
      const docxSize = (docxBlob as any).size ?? (docxBlob as any).byteLength ?? (docxBlob as any).length;
      expect(docxSize).toBeGreaterThan(500);
    });

    it("faithfully preserves user-edited text colors and styles WITHOUT generating strikethrough lines", async () => {
      const { parseInlineHtmlToRuns, parseHtmlToBlocks } = await import("../lib/document-synthesizer");
      const { generateClientDocx, generateClientPdf } = await import("../lib/document-converter");

      const editedHtml = `
        <h2 style="color: rgb(5, 150, 105);">ASSIGNMENT SUBMISSION</h2>
        <p><span style="color: rgb(37, 99, 235);"><strong>Student Name</strong> Solomon Zewdu Student ID 3086/17 Section A</span></p>
      `;

      // 1. Verify inline run parser does NOT create false strikethroughs for <span ...>
      const paragraphRuns = parseInlineHtmlToRuns('<span style="color: rgb(37, 99, 235);"><strong>Student Name</strong> Solomon Zewdu</span>');
      expect(paragraphRuns.length).toBe(2);

      // Run 1: Student Name
      expect(paragraphRuns[0]!.text).toBe("Student Name");
      expect(paragraphRuns[0]!.bold).toBe(true);
      expect(paragraphRuns[0]!.strike).toBe(false); // CRITICAL: NO strikethrough!
      expect(paragraphRuns[0]!.color).toBe("2563EB"); // Royal blue preserved!

      // Run 2: Solomon Zewdu
      expect(paragraphRuns[1]!.text).toContain("Solomon Zewdu");
      expect(paragraphRuns[1]!.bold).toBe(false);
      expect(paragraphRuns[1]!.strike).toBe(false); // CRITICAL: NO strikethrough!
      expect(paragraphRuns[1]!.color).toBe("2563EB");

      // 2. Verify HTML block parser
      const blocks = parseHtmlToBlocks(editedHtml);
      expect(blocks.length).toBe(2);
      expect(blocks[0]!.type).toBe("heading2");
      expect(blocks[0]!.runs?.[0]?.color).toBe("059669"); // Emerald green preserved!
      expect(blocks[1]!.type).toBe("paragraph");
      expect(blocks[1]!.runs?.[0]?.color).toBe("2563EB");
      expect(blocks[1]!.runs?.[0]?.strike).toBe(false);

      // 3. Export to DOCX and PDF to verify end-to-end binary generation
      const docxBlob = await generateClientDocx(editedHtml, "edited_assignment");
      expect(docxBlob).toBeDefined();
      const docxSize = (docxBlob as any).size ?? (docxBlob as any).byteLength;
      expect(docxSize).toBeGreaterThan(500);

      const pdfBlob = await generateClientPdf(editedHtml, "edited_assignment");
      expect(pdfBlob).toBeDefined();
      expect(pdfBlob.size).toBeGreaterThan(500);
    });

    it("faithfully preserves live user edits, additions, alignments, and custom styling when downloading", async () => {
      const { parseHtmlToBlocks, convertHtmlToPlainText } = await import("../lib/document-synthesizer");
      const { generateClientDocx, generateClientPdf } = await import("../lib/document-converter");

      // Complex contentEditable HTML produced after live user editing:
      // Includes text alignment, nested divs, manual additions, line breaks, bold/italic/colors
      const userEditedHtml = `
        <h2 style="text-align: center; color: #1E3A8A;">Project Proposal: AI-Powered Research Assistant</h2>
        <p style="text-align: justify;">DocuMind delivers <strong>state-of-the-art document conversion</strong> with <em>100% fidelity</em>.</p>
        <div>
          <div>Key user edit: User added this line directly in the A4 document editor.</div>
          <div>Another bullet: <span style="color: #059669; font-weight: bold;">Verified 100% Accurate</span></div>
        </div>
        <p style="text-align: right;"><span style="color: #DC2626;">Confidential Document</span> - Do Not Distribute</p>
      `;

      // 1. Verify structured block parsing
      const blocks = parseHtmlToBlocks(userEditedHtml);
      expect(blocks.length).toBeGreaterThanOrEqual(4);

      // Verify Heading
      const hBlock = blocks.find((b) => b.type === "heading2");
      expect(hBlock).toBeDefined();
      expect(hBlock!.text).toContain("Project Proposal");
      expect(hBlock!.alignment).toBe("center");
      expect(hBlock!.runs?.[0]?.color).toBe("1E3A8A");

      // Verify User Added Lines
      const userAddedBlock = blocks.find((b) => b.text?.includes("Key user edit"));
      expect(userAddedBlock).toBeDefined();
      expect(userAddedBlock!.text).toContain("User added this line directly in the A4 document editor");

      // Verify Green Highlighted Run
      const greenRun = blocks.flatMap((b) => b.runs || []).find((r) => r.color === "059669");
      expect(greenRun).toBeDefined();
      expect(greenRun!.text).toContain("Verified 100% Accurate");
      expect(greenRun!.bold).toBe(true);

      // Verify Right Alignment
      const rightBlock = blocks.find((b) => b.alignment === "right");
      expect(rightBlock).toBeDefined();
      expect(rightBlock!.text).toContain("Confidential Document");

      // 2. Verify Plain Text Generation Preserves Edits
      const plainText = convertHtmlToPlainText(userEditedHtml);
      expect(plainText).toContain("Project Proposal: AI-Powered Research Assistant");
      expect(plainText).toContain("Key user edit: User added this line directly in the A4 document editor");
      expect(plainText).toContain("Verified 100% Accurate");
      expect(plainText).toContain("Confidential Document");

      // 3. Verify PDF Export with custom font size, spacing, and font family
      const pdfBlob = await generateClientPdf(userEditedHtml, "proposal", {
        fontSize: 16,
        lineSpacing: 1.8,
        fontFamily: "times",
        removeDividers: true,
      });
      expect(pdfBlob).toBeDefined();
      expect(pdfBlob.size).toBeGreaterThan(1000);

      // 4. Verify DOCX Export with custom font size, spacing, and font family
      const docxBlob = await generateClientDocx(userEditedHtml, "proposal", {
        fontSize: 16,
        lineSpacing: 1.8,
        fontFamily: "times",
        removeDividers: true,
      });
      expect(docxBlob).toBeDefined();
      const docxSize = (docxBlob as any).size ?? (docxBlob as any).byteLength;
      expect(docxSize).toBeGreaterThan(1000);
    });
  });

  // ----------------------------------------------------
  // Test Suite 6: Intelligent Document Beautification & Executive Structural Reconstruction
  // ----------------------------------------------------
  describe("Intelligent Document Beautification & Executive Structural Reconstruction", () => {
    const rawMessyDoc = `INTERNET
PROGRAMMING II
FULL-STACK WEB DEVELOPMENT
A detailed study of Next.js for frontend and backend development
ASSIGNMENT SUBMISSION
Student Name Solomon Zewdu Student ID 3086/17 Section A Submission Date October 22, 2026 Submitted To Mr. Firomsa K. Selected technology: Next.js Next.js is a React-based web framework that supports user interfaces and server-side application features in one project. Prepared for academic purposes • Internet Programming II
INTERNET PROGRAMMING II NEXT.JS FULL-STACK FRAMEWORK Solomon Zewdu • 3086/17 • Section A Page 2
Contents This assignment introduces Next.js, explains how it supports frontend and backend development, and evaluates its main features, benefits, limitations, and appropriate use cases.
Section Topic 1 Introduction 2 What Is Next.js? 3 How Next.js Supports Frontend and Backend 4 Major Features 5 Advantages 6 Drawbacks and Limitations 7 Example Project Structure 8 When Should Developers Choose Next.js? 9 Conclusion 10 References
Learning objective To understand one modern framework that can be used to create both the visible part of a website (frontend) and server-side functionality (backend), while recognizing the trade-offs involved.
INTERNET PROGRAMMING II NEXT.JS FULL-STACK FRAMEWORK Solomon Zewdu • 3086/17 • Section A Page 3
Introduction Web applications commonly have two major parts: the frontend, which users see and interact with, and the backend, which processes requests, applies business rules, and communicates with data sources. Full-stack frameworks can bring many of these tasks into one organized project. What Is Next.js? Next.js is an open-source web development framework built on top of React. React is primarily used to create user interfaces; Next.js adds conventions and capabilities for routing, rendering, server-side code, and production deployment.
Key terms Term Meaning Frontend The part of an application users see and interact with, such as pages, menus, forms, and buttons. Backend Server-side logic that handles requests, checks permissions, validates data, and communicates with databases or services. React A JavaScript library for building interfaces from reusable components. Rendering The process of preparing interface content for display. It can happen in the browser or on the server. API A defined way for parts of software to communicate, such as a browser sending data to a server.
INTERNET PROGRAMMING II NEXT.JS FULL-STACK FRAMEWORK Solomon Zewdu • 3086/17 • Section A Page 4
How Next.js Supports Frontend and Backend Next.js allows developers to keep interface code and many server-side features in one project.
Frontend development
Pages and layouts: Developers create routes and shared page structures.
React components: Reusable components help keep buttons and forms consistent.
Backend development
Route Handlers: Server-side files can respond to HTTP methods.
Database access: The server-side application can use a database driver or an ORM.
Authentication and authorization: Next.js can be integrated with authentication libraries or identity optimized_Internet_Programming_II_Nextjs_Assignmen
providers. The application must still check permissions on protected operations.
Important distinction Next.js can provide both frontend and backend capabilities, but it is not itself a database. A real application may still need PostgreSQL, MySQL, MongoDB, or another data store, plus hosting and security configuration.
Major Features of Next.js
4.1 File-based routing
The folder and file structure can define application routes.
4.2 Server-side rendering
A page can be rendered on the server for a request.
INTERNET PROGRAMMING II NEXT.JS FULL-STACK FRAMEWORK Solomon Zewdu • 3086/17 • Section A Page 6
Advantages of Next.js
One project for many tasks: Developers can build the interface and server endpoints in one codebase.
Flexible rendering: The framework supports different rendering approaches.
Drawbacks and Limitations
Learning curve: Developers must learn React and Next.js concepts.
Summary: strengths and trade-offs Area Strength Trade-off Development Frontend and server features can share one project. The codebase still needs clear boundaries and organization. Performance Static output and server rendering can improve delivery. Poor data fetching or caching decisions can reduce performance. Learning Strong documentation and ecosystem. Several rendering concepts require practice. Security Server-side code can keep secrets out of the browser. Developers must implement and verify authorization and validation.
Example Project Structure
my-next-app/
nnn app/
n nnn layout.tsx # Shared page layout
n nnn page.tsx # Main landing page
nnn components/
nnn Header.tsx # Navigation header
nnn package.json # Project scripts and dependencies
nnn tsconfig.json # TypeScript configuration
When Should Developers Choose Next.js? Next.js is a strong option when a project needs a modern user interface, multiple pages, and some backend functionality.
Good practices when using Next.js
Keep secret keys and privileged database operations on the server; never expose them in browser-delivered optimized_Internet_Programming_II_Nextjs_Assignmen
code. Validate all data received from users on the server, even if the form also validates it in the browser. Check authorization on every protected operation.
Conclusion Next.js is a modern full-stack web framework built on React. Final point: Next.js provides the framework for the application, but a successful system still depends on sound programming practices, secure data handling, appropriate database design, testing, and maintenance.
References The following official documentation pages provide further information about Next.js.
Next.js Documentation https://nextjs.org/docs
React Documentation https://react.dev/learn
TypeScript Documentation https://www.typescriptlang.org/docs/
INTERNET PROGRAMMING II NEXT.JS FULL-STACK FRAMEWORK Solomon Zewdu • 3086/17 • Section A Page 10`;

    it("cleans document page noise, running footers, and heals severed sentences verbatim", () => {
      const cleaned = cleanDocumentPageNoise(rawMessyDoc);

      // Verify running headers and footers are eradicated
      expect(cleaned).not.toContain("optimized_Internet_Programming_II_Nextjs_Assignmen");
      expect(cleaned).not.toContain("INTERNET PROGRAMMING II NEXT.JS FULL-STACK FRAMEWORK");
      expect(cleaned).not.toContain("Section A Page 2");
      expect(cleaned).not.toContain("Section A Page 3");
      expect(cleaned).not.toContain("Section A Page 10");

      // Verify severed sentences were healed seamlessly
      expect(cleaned).toContain("identity providers.");
      expect(cleaned).toContain("browser-delivered code.");
    });

    it("parses academic metadata card, structured tables, code trees, and callouts into executive blocks", () => {
      const blocks = parsePlainTextToBlocks(rawMessyDoc);

      // 1. Identity Card
      const idBlock = blocks.find((b) => b.type === "identityCard");
      expect(idBlock).toBeDefined();
      expect(idBlock!.identityData?.studentName).toBe("Solomon Zewdu");
      expect(idBlock!.identityData?.studentId).toBe("3086/17");
      expect(idBlock!.identityData?.section).toBe("A");
      expect(idBlock!.identityData?.submittedTo).toBe("Mr. Firomsa K.");
      expect(idBlock!.identityData?.technology).toBe("Next.js");

      // 2. Table of Contents Table
      const tables = blocks.filter((b) => b.type === "table");
      expect(tables.length).toBeGreaterThanOrEqual(3);
      const tocTable = tables.find((t) => t.table?.headers?.[0] === "Section" && t.table?.headers?.[1] === "Topic");
      expect(tocTable).toBeDefined();
      expect(tocTable!.table!.rows.length).toBe(10);
      expect(tocTable!.table!.rows[0]).toEqual(["1", "Introduction"]);
      expect(tocTable!.table!.rows[9]).toEqual(["10", "References"]);

      // 3. Key Terms Table
      const ktTable = tables.find((t) => t.table?.headers?.[0] === "Term" && t.table?.headers?.[1] === "Meaning");
      expect(ktTable).toBeDefined();
      expect(ktTable!.table!.rows.some((r) => r[0] === "Frontend")).toBe(true);
      expect(ktTable!.table!.rows.some((r) => r[0] === "Backend")).toBe(true);

      // 4. Summary Table
      const sumTable = tables.find((t) => t.table?.headers?.includes("Trade-off"));
      expect(sumTable).toBeDefined();
      expect(sumTable!.table!.headers).toEqual(["Area", "Strength", "Trade-off"]);
      expect(sumTable!.table!.rows.some((r) => r[0] === "Development")).toBe(true);
      expect(sumTable!.table!.rows.some((r) => r[0] === "Security")).toBe(true);

      // 5. Code Block (Directory Tree)
      const codeBlock = blocks.find((b) => b.type === "code");
      expect(codeBlock).toBeDefined();
      expect(codeBlock!.text).toContain("my-next-app/");
      expect(codeBlock!.text).toContain("├── app/");
      expect(codeBlock!.text).toContain("└── tsconfig.json");
      expect(codeBlock!.text).not.toContain("nnn");

      // 6. Callout Boxes
      const callouts = blocks.filter((b) => b.type === "callout");
      expect(callouts.length).toBeGreaterThanOrEqual(2);
      const objectiveCallout = callouts.find((c) => c.calloutTitle === "Learning Objective");
      expect(objectiveCallout).toBeDefined();
      expect(objectiveCallout!.text).toContain("To understand one modern framework");

      const distinctionCallout = callouts.find((c) => c.calloutTitle === "Important Distinction");
      expect(distinctionCallout).toBeDefined();
      expect(distinctionCallout!.text).toContain("Next.js can provide both frontend and backend capabilities");

      // 7. Headings breakout
      const headings = blocks.filter((b) => b.type === "heading1" || b.type === "heading2" || b.type === "heading3");
      const headingTitles = headings.map((h) => h.text);
      expect(headingTitles).toContain("Introduction");
      expect(headingTitles).toContain("What Is Next.js?");
      expect(headingTitles).toContain("Advantages of Next.js");
      expect(headingTitles).toContain("Drawbacks and Limitations");
      expect(headingTitles).toContain("Conclusion");
      expect(headingTitles).toContain("References");
    });

    it("renders executive HTML, PDF, and DOCX without divider lines or rendering glitches", async () => {
      const blocks = parsePlainTextToBlocks(rawMessyDoc);

      // 1. A4 HTML Rendering
      const html = convertBlocksToA4Html(blocks);
      expect(html).toContain("class=\"identity-card\"");
      expect(html).toContain("Solomon Zewdu");
      expect(html).toContain("3086/17");
      expect(html).toContain("class=\"callout-card\"");
      expect(html).toContain("Learning Objective");
      expect(html).toContain("Important Distinction");
      expect(html).toContain("class=\"code-card\"");
      expect(html).toContain("my-next-app/");
      expect(html).not.toContain("<hr");
      expect(html).not.toContain("optimized_Internet_Programming_II_Nextjs_Assignmen");

      // 2. Executive PDF Generation
      const pdfBytes = await renderExecutivePdf(blocks, "Next.js Assignment", { removeDividers: true });
      expect(pdfBytes).toBeDefined();
      expect(pdfBytes.length).toBeGreaterThan(2000);
      const pdf = await PDFDocument.load(pdfBytes);
      expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);

      // 3. Executive DOCX Generation
      const docxData = await renderExecutiveDocx(blocks, "Next.js Assignment", { removeDividers: true });
      expect(docxData).toBeDefined();
      const docxSize = (docxData as any).size ?? (docxData as any).byteLength;
      expect(docxSize).toBeGreaterThan(2000);
    });
  });
});
