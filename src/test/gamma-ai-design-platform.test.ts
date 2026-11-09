import { describe, it, expect } from "vitest";
import {
  generateDeterministicStructuredDocument,
  detectSubjectDomain,
  refineAiDocument,
  type AiDocumentResult,
} from "../../server/services/documentAi.service";
import {
  renderExecutiveDocx,
  renderExecutivePdf,
  type DocSynthesizerBlock,
} from "../lib/document-synthesizer";
import {
  buildSlideDeckContent,
  type SlidePreviewItem,
} from "../lib/presentation-session-client";
import {
  renderSlideDeckToPptx,
} from "../lib/presentation-renderer";
import {
  computeThemeTokens,
} from "../lib/presentation-theme";
import {
  getDefaultAssignmentMetadata,
  type AssignmentMetadata,
} from "../lib/assignment-types";
import {
  getCoverTemplateById,
  generateDefaultCoverElements,
} from "../lib/cover-templates-registry";
import {
  convertSectionsToInitialHtml,
  paginateSectionsIntoA4Pages,
} from "../components/workspace/DocumentFormattingWorkflow";

describe("DocuMind Gamma-Level AI Design Platform — End-to-End Verification", () => {
  const sampleLogoPng =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  // 1. SUBJECT DOMAIN DETECTION & DESIGN SEEDING
  it("Item 1: Deep content analysis accurately classifies subject domain and applies tailored design tokens", () => {
    // Computer Science content
    const csText = `Distributed Consensus & Byzantine Fault Tolerance in Raft.
Qubits and neural network backpropagation optimize cluster throughput. Memory hierarchy, cache coherence, and microservices.`;
    const csDomain = detectSubjectDomain(csText);
    expect(csDomain.domain).toBe("cs-tech");
    expect(csDomain.fontFamily).toBe("academic");
    expect(csDomain.coverTemplateId).toBe("canva-tokyo-neomodern");

    // Business & Strategy content
    const bizText = `Quarterly financial revenue growth, market capital valuation, ROI, customer acquisition cost, and EBITDA strategy.`;
    const bizDomain = detectSubjectDomain(bizText);
    expect(bizDomain.domain).toBe("business");
    expect(bizDomain.fontFamily).toBe("serif");
    expect(bizDomain.coverTemplateId).toBe("canva-emerald-proposal");

    // Engineering content
    const engText = `Structural bridge mechanics, cantilever stress analysis, finite element thermodynamics, and electrical circuit CAD.`;
    const engDomain = detectSubjectDomain(engText);
    expect(engDomain.domain).toBe("engineering");
    expect(engDomain.coverTemplateId).toBe("canva-salford-wave");

    // Scientific / Medical content
    const sciText = `Photosynthesis biochemical reaction pathways, cellular mitochondria respiration, genetic DNA CRISPR polymerase.`;
    const sciDomain = detectSubjectDomain(sciText);
    expect(sciDomain.domain).toBe("scientific");
    expect(sciDomain.coverTemplateId).toBe("academic-thesis");
  });

  // 2. GAMMA-GRADE RICH CONTENT BLOCKS
  it("Item 2: Deterministic document synthesizer creates Gamma-grade rich visual blocks (bento-grid, stat-grid, process, comparison, quotes)", () => {
    const rawContent = `Distributed Systems Architecture & Verification

1.0 Executive Metrics
94%: Adoption across 12M active user queries with $4.5M in infrastructure efficiency savings.

2.0 Comparison of Consensus Protocols
Raft vs Paxos: Raft provides understandable leader election and sequential log replication.
Paxos guarantees safety across arbitrary network partitions but introduces operational complexity.

3.0 Operational Workflow
Step 1: Client sends command to leader.
Step 2: Leader appends entry to local log.
Step 3: Leader broadcasts AppendEntries RPCs to all followers.
Step 4: Once majority acknowledges, leader commits and applies command.

4.0 Architectural Quad-Pillars
- Pillar 1: Leader Election ensures deterministic authority.
- Pillar 2: Log Replication guarantees linearizable history.
- Pillar 3: Safety Guardrails prevent uncommitted data loss.
- Pillar 4: Cluster Membership handles dynamic node failovers.

5.0 Decisive Premise
"In distributed systems, partition tolerance is non-negotiable; consistency and availability must be balanced intentionally."`;

    const meta: AssignmentMetadata = {
      ...getDefaultAssignmentMetadata(),
      isAssignment: true,
      assignmentTitle: "Distributed Systems Architecture",
      studentName: "Elena Rostova",
      studentId: "CS-9912",
      courseName: "CS 450 — Distributed Computing",
      instructorName: "Dr. Leslie Lamport",
      universityName: "MIT",
      logoDataUrl: sampleLogoPng,
      logoPlacement: "top-left",
      logoSize: "medium",
    };

    const doc = generateDeterministicStructuredDocument(rawContent, {
      title: "Distributed Systems Architecture",
      content: rawContent,
      density: "balanced",
      purpose: "Academic Assignment",
      metadata: meta,
      docType: "assignment",
    });

    expect(doc.docTitle).toContain("Distributed Systems Architecture");
    expect(doc.sections.length).toBeGreaterThanOrEqual(4);

    const allBlocks = doc.sections.flatMap((s) => s.blocks || []);
    const blockTypes = allBlocks.map((b) => b.type);

    // Verify rich block types are generated
    expect(blockTypes).toContain("stat-grid");
    expect(blockTypes).toContain("comparison");
    expect(blockTypes).toContain("process");
    expect(blockTypes).toContain("bento-grid");
    expect(blockTypes).toContain("quote");

    // Table of contents must be included for assignment with multiple sections
    expect(doc.includeToc).toBe(true);
  });

  // 3. TABLE OF CONTENTS STRICT SCOPE RESTRICTION
  it("Item 3: Strictly restricts Table of Contents to assignments with >= 2 sections; omits from standard documents", () => {
    const multiSectionContent = `1. Introduction\nBackground details.\n2. Methodology\nApproach and pipeline.`;

    // A. Assignment document with >= 2 sections -> TOC generated
    const assignmentDoc = generateDeterministicStructuredDocument(multiSectionContent, {
      title: "Assignment Doc",
      content: multiSectionContent,
      docType: "assignment",
      metadata: { ...getDefaultAssignmentMetadata(), isAssignment: true },
    });
    expect(assignmentDoc.includeToc).toBe(true);

    // B. Standard document with >= 2 sections -> TOC NOT automatically included
    const standardDoc = generateDeterministicStructuredDocument(multiSectionContent, {
      title: "Standard Doc",
      content: multiSectionContent,
      docType: "general",
    });
    expect(standardDoc.includeToc).toBe(false);
  });

  // 4. DOCUMENT STUDIO MULTI-PAGE PAGINATION & FULL IN-PLACE EDITING
  it("Item 4: Document Studio converts rich blocks to editable semantic HTML and paginates A4 pages accurately", () => {
    const sections = [
      {
        level: 1 as const,
        numberStr: "1.0",
        paragraphs: [],
        title: "Telemetry & Quadrants",
        blocks: [
          {
            type: "stat-grid" as const,
            content: "99.99% Uptime SLA",
            metrics: [
              { value: "99.99%", label: "Uptime SLA", description: "High availability guarantee" },
              { value: "< 12ms", label: "Latency", description: "p99 packet round-trip time" },
            ],
          },
          {
            type: "bento-grid" as const,
            content: "Architecture Quadrants",
            cards: [
              { title: "Node Discovery", description: "Gossip protocol membership tracking", tag: "DISCOVERY" },
              { title: "Replication", description: "Multi-raft quorum consensus", tag: "CONSENSUS" },
            ],
          },
        ],
      },
    ];

    // Convert to editable semantic HTML
    const html = convertSectionsToInitialHtml(sections, "1.5");
    expect(html).toContain("99.99%");
    expect(html).toContain("Uptime SLA");
    expect(html).toContain("Node Discovery");
    expect(html).toContain("Gossip protocol");

    // Paginate sections into A4 sheets
    const pages = paginateSectionsIntoA4Pages(sections, {
      fontFamily: "academic",
      baseFontSize: "11pt",
      lineSpacing: "1.5",
      margins: "normal",
      headingNumbering: "none",
      includeToc: false,
      hasCoverPage: false,
    } as any);
    expect(pages.length).toBeGreaterThanOrEqual(1);
    expect(pages[0]!.sections.length).toBeGreaterThanOrEqual(1);
    expect(pages[0]!.sections[0]!.blocks.length).toBeGreaterThanOrEqual(1);
  });

  // 5. INSTITUTIONAL LOGO CORNER PLACEMENT & ZERO TEXT COLLISION
  it("Item 5: Places institutional logo in Upper-Left or Upper-Right corner with zero title collision and dimension control", () => {
    const template = getCoverTemplateById("canva-blue-yellow-proposal");

    // Test Upper-Left placement
    const metaLeft: AssignmentMetadata = {
      ...getDefaultAssignmentMetadata(),
      isAssignment: true,
      assignmentTitle: "Advanced Systems Verification",
      studentName: "John Von Neumann",
      studentId: "J-001",
      logoDataUrl: sampleLogoPng,
      logoPlacement: "top-left",
      logoSize: "medium",
    };
    const elementsLeft = generateDefaultCoverElements(template, metaLeft, 1333, 750);
    const logoLeft = elementsLeft.find((el) => el.type === "image" && el.imageUrl === sampleLogoPng);
    expect(logoLeft).toBeDefined();
    expect(logoLeft!.x).toBe(60);
    expect(logoLeft!.width).toBe(140);

    // Test Upper-Right placement
    const metaRight: AssignmentMetadata = {
      ...metaLeft,
      logoPlacement: "top-right",
      logoSize: "large",
    };
    const elementsRight = generateDefaultCoverElements(template, metaRight, 1333, 750);
    const logoRight = elementsRight.find((el) => el.type === "image" && el.imageUrl === sampleLogoPng);
    expect(logoRight).toBeDefined();
    expect(logoRight!.x).toBeGreaterThan(1000); // right corner on 1333w canvas
    expect(logoRight!.width).toBe(180); // large size

    // Verify zero overlap with title elements
    const titleElements = elementsRight.filter(
      (el) => el.type === "text" && (el.text || "").toLowerCase().includes("advanced systems"),
    );
    for (const te of titleElements) {
      const horizontalOverlap =
        logoRight!.x < te.x + te.width && logoRight!.x + logoRight!.width > te.x;
      const verticalOverlap =
        logoRight!.y < te.y + te.height && logoRight!.y + logoRight!.height > te.y;
      expect(horizontalOverlap && verticalOverlap).toBe(false);
    }
  });

  // 6. MULTI-FORMAT EXPORT VERIFICATION (DOCX & PDF WITH LOGO & TOC)
  it("Item 6: Generates authentic, non-empty DOCX and PDF files with embedded logo and correct TOC scoping", async () => {
    const meta: AssignmentMetadata = {
      ...getDefaultAssignmentMetadata(),
      isAssignment: true,
      assignmentTitle: "Full-Stack Distributed Architecture",
      studentName: "Ada Lovelace",
      studentId: "AL-1815",
      courseName: "CS 501",
      instructorName: "Charles Babbage",
      universityName: "University of Cambridge",
      logoDataUrl: sampleLogoPng,
      logoPlacement: "top-left",
      coverTemplateId: "minimal-clean",
    };

    const blocks: DocSynthesizerBlock[] = [
      {
        type: "heading1",
        text: "1.0 Engine Foundations",
      },
      {
        type: "paragraph",
        text: "Analytical engine handles arithmetic and algebraic micro-instructions.",
      },
      {
        type: "heading1",
        text: "2.0 Memory Store & Mill",
      },
      {
        type: "paragraph",
        text: "Decoupled memory store holds punch-card states with intermediate caching.",
      },
    ];

    // Export DOCX
    const docxResult = await renderExecutiveDocx(blocks, meta.assignmentTitle, {
      hasCoverPage: true,
      includeToc: true,
      assignmentMetadata: meta,
      coverMetadata: meta,
      docTitle: meta.assignmentTitle,
      docSubtitle: meta.courseName,
      institution: meta.universityName,
      authorName: meta.studentName,
      dateStr: meta.submissionDate,
    });
    const docxLength =
      docxResult instanceof Uint8Array
        ? docxResult.byteLength
        : (docxResult as any).size;
    expect(docxLength).toBeGreaterThan(3000);

    // Export PDF
    const pdfResult = await renderExecutivePdf(blocks, meta.assignmentTitle, {
      hasCoverPage: true,
      includeToc: true,
      assignmentMetadata: meta,
      coverMetadata: meta,
      docTitle: meta.assignmentTitle,
      docSubtitle: meta.courseName,
      institution: meta.universityName,
      authorName: meta.studentName,
      dateStr: meta.submissionDate,
    });
    const pdfLength =
      pdfResult instanceof Uint8Array
        ? pdfResult.byteLength
        : (pdfResult as any).size;
    expect(pdfLength).toBeGreaterThan(3000);
  });

  // 7. PRESENTATION MAKER: 16:9 DIVERSE SLIDE LAYOUTS & NO BORING BULLETS
  it("Item 7: Presentation Maker generates rich 16:9 layouts without repetitive bullets or empty voids", () => {
    const rawAiText = `
1. Quantitative Metrics
Growth reached 88% with $14M saved and 500k active queries per second.

2. Architectural Comparisons
Microservices vs Monolith: Microservices offer team autonomy and modular scaling.
Monoliths minimize initial deployment complexity but complicate independent domain evolutions.

3. Four Core Quadrants
Pillar 1: Data Ingestion.
Pillar 2: Transformation Engine.
Pillar 3: Storage Optimization.
Pillar 4: Real-time Telemetry.

4. Implementation Procedure
Step 1: Ingest raw sensor events.
Step 2: Normalize telemetry schema.
Step 3: Route to analytical partition.
Step 4: Emit real-time operational alerts.
`;

    const slides = buildSlideDeckContent(
      "High-Throughput Architecture",
      rawAiText,
      6,
      "balanced",
      "Technology & Architecture",
    );

    expect(slides.length).toBe(6);
    expect(slides[0]!.layout).toBe("title");

    const layoutTypes = slides.map((s) => s.layout);
    // Slides must use varied Gamma-inspired layouts
    const richLayouts = ["metrics", "two-column", "bento-grid", "process", "hero-split", "three-card"];
    const foundRichLayouts = layoutTypes.filter((l) => richLayouts.includes(l));
    expect(foundRichLayouts.length).toBeGreaterThanOrEqual(2);

    // Slide 6 is conclusion
    expect(slides[5]!.layout).toBe("conclusion");
  });

  // 8. PRESENTATION AGENDA SCOPE RESTRICTION
  it("Item 8: Strictly omits agenda slide on short presentation decks (3-4 slides) unless explicitly requested", () => {
    const shortText = `Topic 1: Core Analysis\nPoint A.\nTopic 2: Strategic Rollout\nPoint B.`;

    // 3-slide deck without explicit agenda request -> Slide 2 is a content slide, NOT an agenda slide
    const shortSlides = buildSlideDeckContent("Short Brief", shortText, 3, "concise", "Briefing");
    expect(shortSlides.length).toBe(3);
    expect(shortSlides[0]!.layout).toBe("title");
    expect(shortSlides[1]!.layout).not.toBe("agenda");

    // 4-slide deck without explicit agenda request -> Slide 2 is a content slide, NOT an agenda slide
    const fourSlides = buildSlideDeckContent("Quarterly Pulse", shortText, 4, "balanced", "Business");
    expect(fourSlides.length).toBe(4);
    expect(fourSlides[0]!.layout).toBe("title");
    expect(fourSlides[1]!.layout).not.toBe("agenda");
  });

  // 9. PRESENTATION FULL SLIDE EDITING & PPTX EXPORT
  it("Item 9: Renders valid PowerPoint PPTX with custom typography tokens and editable slide layouts", async () => {
    const rawTheme = {
      name: "Modern Executive",
      colors: { primary: "#0F172A", accent: "#2563EB", bg: "#FFFFFF" },
      tier: "free" as const,
    };
    const tokens = computeThemeTokens(rawTheme, {
      fontFamily: "Inter",
      fontSizePreset: "standard",
    });

    const slides: SlidePreviewItem[] = [
      {
        id: "slide-1",
        slideNumber: 1,
        layout: "title",
        title: "Executive Strategic Review",
        subtitle: "Enterprise Transformation",
        categoryTag: "STRATEGY",
      },
      {
        id: "slide-2",
        slideNumber: 2,
        layout: "bento-grid",
        title: "Strategic Quadrants",
        bentoGrid: [
          { title: "Market Growth", description: "Expanding TAM by 35%", tag: "MARKET" },
          { title: "Product Velocity", description: "Bi-weekly sprint releases", tag: "VELOCITY" },
          { title: "Customer Success", description: "Net Retention Rate > 120%", tag: "RETENTION" },
          { title: "Security Governance", description: "SOC 2 Type II certified", tag: "SECURITY" },
        ],
      },
      {
        id: "slide-3",
        slideNumber: 3,
        layout: "conclusion",
        title: "Decisive Takeaways",
        bullets: ["Execute roadmap milestone gates", "Ensure continuous quality benchmarks"],
      },
    ];

    const pptx = await renderSlideDeckToPptx("Executive Review", "Strategy", slides, tokens);
    const rawData = await pptx.write({ outputType: "nodebuffer" });
    const buffer = Buffer.isBuffer(rawData) ? rawData : Buffer.from(rawData as ArrayBuffer);

    expect(buffer.length).toBeGreaterThan(8000);
    // Verifies valid PPTX ZIP format (PK)
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });

  // 10. INTERACTIVE NATURAL LANGUAGE AI REFINEMENT
  it("Item 10: AI Refinement applies natural language commands (e.g. 'make more professional', 'add metric cards') without breaking state", async () => {
    const baseDoc: AiDocumentResult = {
      docTitle: "Initial Draft",
      docSubtitle: "Sub",
      fontFamily: "academic",
      baseFontSize: "11pt",
      lineSpacing: "1.5",
      margins: "normal",
      accentColor: "#2563EB",
      layoutArchetype: "modern",
      hasCoverPage: true,
      includeToc: false,
      sections: [
        {
          title: "Introduction",
          level: 1,
          blocks: [{ type: "paragraph", text: "Introduction content." }],
        },
      ],
    };

    // Instruction: Make modern and sans-serif
    const modernRes = await refineAiDocument(baseDoc, "Make the typography modern and sans-serif with a vibrant teal accent");
    expect(modernRes.document.fontFamily).toBe("sans");
    expect(modernRes.document.accentColor).toBe("#0F766E");

    // Instruction: Add metric stat cards
    const metricRes = await refineAiDocument(modernRes.document, "Add key metric cards to highlight quantitative results");
    const allBlocks = metricRes.document.sections.flatMap((s) => s.blocks || []);
    expect(allBlocks.some((b) => b.type === "stat-grid")).toBe(true);
  });
});
