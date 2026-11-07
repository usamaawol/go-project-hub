import { describe, it, expect } from "bun:test";
import { generateAiDocument, refineAiDocument, type GenerateAiDocumentInput } from "../../server/services/documentAi.service";
import { generateCoverElements } from "../lib/cover-templates-registry";
import { deriveDocumentMetadata, convertSectionsToInitialHtml, type DocSection } from "../components/workspace/DocumentFormattingWorkflow";
import { renderExecutiveDocx, renderExecutivePdf, parseHtmlToBlocks } from "../lib/document-synthesizer";
import { createPresentationSession } from "../../server/services/presentationSession.service";

describe("DocuMind Full AI Document & Presentation Generation Pipeline", () => {
  const sampleAcademicText = `CS 401 — Advanced Distributed Systems Midterm Research Assignment: Byzantine Fault Tolerant Consensus Protocols
Course: CS 401 — Advanced Distributed Systems
Submitted by: Alice Chen (Student ID: 884912)
Department of Computer Science, Stanford University
Date: November 2026

1.0 Introduction & System Model
Distributed consensus in asynchronous adversarial environments requires deterministic guarantees against Byzantine faults.
Unlike crash-fault-tolerant protocols (e.g. Raft, Multi-Paxos), Byzantine Fault Tolerant (BFT) systems tolerate up to f arbitrary failures in a network of 3f + 1 nodes.

2.0 Protocol Comparison: PBFT vs. Raft
Protocol Comparison Matrix:
Metric | Raft | PBFT | HotStuff
Fault Model | Crash-Stop (CFT) | Byzantine (BFT) | Byzantine (BFT)
Resilience Threshold | f out of 2f + 1 | f out of 3f + 1 | f out of 3f + 1
Communication Complexity | O(N) | O(N^2) | O(N) view change
Throughput (tx/s) | 12,500 | 1,850 | 8,200

3.0 Security & Liveness Analysis
A primary vulnerability in classical PBFT is view-change message explosion under adversarial network partitions.
Pipelines must enforce cryptographic threshold signatures (BLS) to compress validator votes.

4.0 Experimental Benchmark Results
Empirical evaluation across a 64-node geodistributed testbed demonstrated that pipelined consensus sustains 4.5x higher throughput with sub-second finality.`;

  it("1. Deep Content Analysis: Correctly extracts compound course and assignment topic", () => {
    const meta = deriveDocumentMetadata(sampleAcademicText);
    expect(meta.docTitle).toBe("Byzantine Fault Tolerant Consensus Protocols");
    expect(meta.docSubtitle).toContain("CS 401");
    expect(meta.authorName).toBe("Alice Chen");
    expect(meta.institution).toContain("Stanford");
  });

  it("2. AI Document Generation: Generates structured document with authentic metadata and zero corporate boilerplate", async () => {
    const input: GenerateAiDocumentInput = {
      content: sampleAcademicText,
      docType: "assignment",
      metadata: {
        assignmentTitle: "Byzantine Fault Tolerant Consensus Protocols",
        courseName: "CS 401 — Advanced Distributed Systems",
        studentName: "Alice Chen",
        universityName: "Stanford University",
        submissionDate: "November 2026",
      },
    };

    const doc = await generateAiDocument(input);
    expect(doc).toBeDefined();
    expect(doc.docTitle).toBe("Byzantine Fault Tolerant Consensus Protocols");
    expect(doc.authorName).toBe("Alice Chen");
    expect(doc.institution).toBe("Stanford University");
    expect(doc.sections.length).toBeGreaterThanOrEqual(3);

    // Verify no corporate placeholder leaked
    const jsonStr = JSON.stringify(doc).toLowerCase();
    expect(jsonStr).not.toContain("eleanor fitzgerald");
    expect(jsonStr).not.toContain("hanover co");
    expect(jsonStr).not.toContain("delivering results through innovation");
    expect(jsonStr).not.toContain("reallygreatsite.com");
    expect(jsonStr).not.toContain("+123-456-7890");

    // Verify sections have rich elements
    const hasTable = doc.sections.some((s) => s.blocks.some((b) => b.type === "table"));
    expect(hasTable).toBe(true);
  });

  it("3. Canva Cover Templates: Sanitized and purge corporate dummy defaults", () => {
    // Test the two templates that previously had hardcoded Eleanor Fitzgerald / Hanover Co
    const testIds = ["canva-salford-wave", "canva-hanover-red-geometric"];

    for (const tId of testIds) {
      // Render with user metadata
      const elementsWithMeta = generateCoverElements(tId, {
        assignmentTitle: "Byzantine Fault Tolerant Consensus Protocols",
        courseName: "CS 401",
        studentName: "Alice Chen",
        universityName: "Stanford University",
        submissionDate: "November 2026",
      });

      const textMeta = elementsWithMeta.map((e) => (e as any).text || (e as any).content || "").join(" ").toLowerCase();
      expect(textMeta).not.toContain("eleanor fitzgerald");
      expect(textMeta).not.toContain("hanover co");
      expect(textMeta).not.toContain("delivering results through innovation");
      expect(textMeta).not.toContain("reallygreatsite.com");
      expect(textMeta).not.toContain("+123-456-7890");
      expect(textMeta).toContain("byzantine");

      // Render with empty metadata (user didn't fill in author or subtitle)
      const elementsEmpty = generateCoverElements(tId, {});
      const textEmpty = elementsEmpty.map((e) => (e as any).text || (e as any).content || "").join(" ").toLowerCase();
      expect(textEmpty).not.toContain("eleanor fitzgerald");
      expect(textEmpty).not.toContain("hanover co");
      expect(textEmpty).not.toContain("delivering results through innovation");
    }
  });

  it("4. AI Refinement: Handles natural language prompt commands dynamically", async () => {
    const input: GenerateAiDocumentInput = {
      content: sampleAcademicText,
      docType: "assignment",
      metadata: {
        assignmentTitle: "Byzantine Fault Tolerant Consensus Protocols",
        studentName: "Alice Chen",
      },
    };

    const initialDoc = await generateAiDocument(input);

    // Test 4a: Add an executive summary
    const resSummary = await refineAiDocument(initialDoc, "Please add an executive summary at the start");
    expect(resSummary.document.sections[0]?.title).toBe("Executive Summary");
    expect(resSummary.document.sections[0]?.level).toBe(1);

    // Test 4b: Change theme to teal and modern typography
    const resStyle = await refineAiDocument(initialDoc, "Change the accent color to deep teal and use modern typography");
    expect(resStyle.document.accentColor).toBe("#0F766E");
    expect(resStyle.document.fontFamily).toBe("sans");
  });

  it("5. Export Verification: Generates valid, non-empty publication-grade DOCX and PDF", async () => {
    const input: GenerateAiDocumentInput = {
      content: sampleAcademicText,
      docType: "assignment",
      metadata: {
        assignmentTitle: "Byzantine Fault Tolerant Consensus Protocols",
        studentName: "Alice Chen",
        universityName: "Stanford University",
      },
    };

    const doc = await generateAiDocument(input);

    // Map AiDocSection to DocSection
    const docSections: DocSection[] = doc.sections.map((s, idx) => ({
      level: s.level,
      numberStr: s.numberStr,
      title: s.title,
      paragraphs: s.paragraphs,
      blocks: s.blocks.map((b) => ({
        type: b.type,
        content: b.content,
        calloutType: b.calloutType,
        calloutTitle: b.calloutTitle,
        listItems: b.listItems,
        tableData: b.tableData,
      })),
      sectionIndex: idx,
    }));

    const html = convertSectionsToInitialHtml(docSections);
    const blocks = parseHtmlToBlocks(html);

    // Render DOCX
    const docxBlob = await renderExecutiveDocx(blocks, doc.docTitle, {
      fontFamily: doc.fontFamily,
      fontSize: doc.baseFontSize,
      lineSpacing: doc.lineSpacing,
      hasCoverPage: true,
      coverMetadata: {
        assignmentTitle: doc.docTitle,
        courseName: doc.docSubtitle,
        studentName: doc.authorName,
        universityName: doc.institution,
        submissionDate: doc.dateStr,
        coverTemplateId: "canva-salford-wave",
      },
    });

    expect(docxBlob).toBeDefined();
    const docxByteSize = (docxBlob as any).size ?? (docxBlob as Uint8Array).byteLength ?? (docxBlob as any).length;
    expect(docxByteSize).toBeGreaterThan(3000);

    // Render PDF
    const pdfBytes = await renderExecutivePdf(blocks, doc.docTitle, {
      fontFamily: doc.fontFamily,
      hasCoverPage: true,
      coverMetadata: {
        assignmentTitle: doc.docTitle,
        courseName: doc.docSubtitle,
        studentName: doc.authorName,
        universityName: doc.institution,
        submissionDate: doc.dateStr,
        coverTemplateId: "canva-salford-wave",
      },
      docTitle: doc.docTitle,
      docSubtitle: doc.docSubtitle,
      institution: doc.institution,
      authorName: doc.authorName,
      dateStr: doc.dateStr,
      primaryColor: doc.accentColor,
    });

    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.byteLength).toBeGreaterThan(4000);
  });

  it("6. Presentation Maker: Generates diverse, modern slide layouts with genuine content", async () => {
    const session = await createPresentationSession({
      title: "Byzantine Fault Tolerant Consensus Protocols",
      content: sampleAcademicText,
      slideCount: 6,
      purpose: "Technical Architecture Breakdown",
      assignmentMetadata: {
        isAssignment: true,
        assignmentTitle: "Byzantine Fault Tolerant Consensus Protocols",
        courseName: "CS 401 — Advanced Distributed Systems",
        studentName: "Alice Chen",
      },
    });

    expect(session.slides.length).toBe(6);
    expect(session.slides[0]?.layout).toBe("assignment-cover");
    expect(session.slides[0]?.title).toContain("Byzantine Fault Tolerant");

    // Verify slide layouts are diverse, not repetitive
    const layouts = session.slides.map((s) => s.layout);
    const uniqueLayouts = new Set(layouts);
    expect(uniqueLayouts.size).toBeGreaterThanOrEqual(3);

    // Verify content preservation
    const allText = JSON.stringify(session.slides);
    expect(allText).toContain("PBFT");
    expect(allText).not.toContain("Lorem ipsum");
    expect(session.fileSize).toBeGreaterThan(1000);
  });
});
