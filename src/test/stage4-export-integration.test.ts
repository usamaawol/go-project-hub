import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  renderExecutiveDocx,
  renderExecutivePdf,
  parseHtmlToBlocks,
  parsePlainTextToBlocks,
  parseInlineHtmlToRuns,
  type DocSynthesizerBlock,
} from "@/lib/document-synthesizer";
import { getDefaultAssignmentMetadata, type AssignmentMetadata } from "@/lib/assignment-types";

describe("Stage 4 — Real DOCX and PDF Export Integration", () => {
  it("parses inline rich-text formatting tags into discrete runs for word processor export", () => {
    const html = `<p>This sentence has <strong>bold text</strong> and <em>italicized phrasing</em> with <u>underlined points</u> and <s>strikethrough text</s>.</p>`;
    const runs = parseInlineHtmlToRuns(html);

    expect(runs.length).toBeGreaterThan(1);
    const boldRun = runs.find((r) => r.bold);
    const italicRun = runs.find((r) => r.italics);
    const underlineRun = runs.find((r) => r.underline);
    const strikeRun = runs.find((r) => r.strike);

    expect(boldRun?.text).toContain("bold text");
    expect(italicRun?.text).toContain("italicized phrasing");
    expect(underlineRun?.text).toContain("underlined points");
    expect(strikeRun?.text).toContain("strikethrough text");
  });

  it("exports genuine multi-section DOCX with Page 1 Cover and Page 2+ Body", async () => {
    const meta: AssignmentMetadata = {
      ...getDefaultAssignmentMetadata(),
      isAssignment: true,
      assignmentType: "individual",
      identityPlacement: "cover-only",
      studentName: "Maya Lin",
      studentId: "ARCH-2026",
      assignmentTitle: "Sustainable Architectural Synthesis",
      courseName: "Environmental Design IV",
      courseCode: "ARCH-404",
      instructorName: "Prof. Kenneth Frampton",
      universityName: "Columbia Graduate School of Architecture",
      submissionDate: "October 2026",
    };

    const blocks: DocSynthesizerBlock[] = [
      { type: "heading1", text: "1. Introduction to Bioclimatic envelopes" },
      {
        type: "paragraph",
        text: "Bioclimatic architecture optimizes thermal efficiency through passive daylighting and cross-ventilation.",
        runs: [
          { text: "Bioclimatic architecture optimizes " },
          { text: "thermal efficiency", bold: true },
          { text: " through passive daylighting." },
        ],
      },
      {
        type: "table",
        table: {
          headers: ["Strategy", "R-Value", "Embodied Carbon"],
          rows: [
            ["Triple Glazing", "R-8.5", "Medium"],
            ["Strawbale Insulation", "R-30", "Ultra-Low"],
          ],
        },
      },
    ];

    const docxResult = await renderExecutiveDocx(blocks, meta.assignmentTitle, {
      hasCoverPage: true,
      coverMetadata: meta,
      docTitle: meta.assignmentTitle,
      docSubtitle: meta.courseName,
      institution: meta.universityName,
      authorName: meta.studentName,
      dateStr: meta.submissionDate,
      identityPlacement: "cover-only",
    });

    expect(docxResult).toBeDefined();
    // In Node test environment, Packer.toBuffer produces a Uint8Array; in browser Packer.toBlob produces a Blob
    const byteLength =
      docxResult instanceof Uint8Array
        ? docxResult.byteLength
        : (docxResult as any).size;
    expect(byteLength).toBeGreaterThan(3000);
  });

  it("exports genuine PDF with Page 1 Cover and Page 2+ Body using pdf-lib", async () => {
    const meta: AssignmentMetadata = {
      ...getDefaultAssignmentMetadata(),
      isAssignment: true,
      assignmentType: "group",
      identityPlacement: "both",
      groupName: "Consensus Nexus Group",
      groupMembers: [
        { id: "m1", fullName: "Diana Prince", studentId: "STU-101", role: "Architecture Lead" },
        { id: "m2", fullName: "Clark Kent", studentId: "STU-102", role: "Documentation Specialist" },
      ],
      assignmentTitle: "High-Performance Distributed Key-Value Store",
      courseName: "Distributed Systems",
      courseCode: "CS-8803",
      instructorName: "Dr. Leslie Lamport",
      universityName: "Georgia Institute of Technology",
      submissionDate: "October 28, 2026",
    };

    const blocks = parseHtmlToBlocks(`
      <h1>1. Executive Architecture Summary</h1>
      <p>This report documents our fault-tolerant state machine replication engine utilizing Raft consensus.</p>
      <h2>2. Replication Protocol Benchmarks</h2>
      <p>Throughput benchmarks demonstrate sub-5ms commit latencies under 3-node cluster quorum.</p>
    `);

    const pdfBytes = await renderExecutivePdf(blocks, meta.assignmentTitle, {
      hasCoverPage: true,
      coverMetadata: meta,
      docTitle: meta.assignmentTitle,
      docSubtitle: meta.courseName,
      institution: meta.universityName,
      primaryColor: "#0284c7",
      identityPlacement: "both",
    });

    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.byteLength).toBeGreaterThan(2000);

    const loadedPdf = await PDFDocument.load(pdfBytes);
    // Page count must be at least 2: Page 0 is the Cover Page, Page 1 is the Body
    expect(loadedPdf.getPageCount()).toBeGreaterThanOrEqual(2);

    const coverPage = loadedPdf.getPage(0);
    const bodyPage = loadedPdf.getPage(1);

    // Standard ISO A4 dimensions (595.28 x 841.89 points)
    expect(coverPage.getWidth()).toBeCloseTo(595.28, 1);
    expect(coverPage.getHeight()).toBeCloseTo(841.89, 1);
    expect(bodyPage.getWidth()).toBeCloseTo(595.28, 1);
    expect(bodyPage.getHeight()).toBeCloseTo(841.89, 1);
  });

  it("handles backwards-compatible parameter order (title, blocks, options)", async () => {
    const blocks = parsePlainTextToBlocks(`
# Section Alpha
Paragraph content for testing parameter flexibility.
`);
    // Testing legacy (docTitle, blocks, options) call signature
    const pdfBytes = await renderExecutivePdf("Flexible_Call_Signature.pdf", blocks, {
      hasCoverPage: false,
    });
    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.byteLength).toBeGreaterThan(1000);

    const docxResult = await renderExecutiveDocx("Flexible_Docx_Signature", blocks);
    expect(docxResult).toBeDefined();
  });
});
