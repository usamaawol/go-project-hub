import { describe, expect, it } from "vitest";
import {
  createPresentationSession,
  getPresentationSession,
  updateSessionSlide,
  regenerateSlideVisual,
  regenerateSlideWithAI,
  reorderSessionSlides,
  addSessionSlide,
  deleteSessionSlide,
  type CreatePresentationSessionInput,
} from "../../server/services/presentationSession.service";
import { renderSlideDeckToPptx } from "../lib/presentation-renderer";
import { computeThemeTokens, type RawThemeInput } from "../lib/presentation-theme";
import fs from "fs";

describe("DocuMind AI Presentation Designer Engine", () => {
  const baseTheme: CreatePresentationSessionInput["theme"] = {
    id: "executive-modern",
    name: "Executive Modern",
    category: "Business",
    kind: "business",
    colors: { primary: "#0F172A", accent: "#2563EB", bg: "#FFFFFF" },
    fonts: "Inter / Montserrat",
    tier: "free",
  };

  it("Case 1: Standard Presentation with Computer Science content synthesizes dynamic modern layouts", async () => {
    const csContent = `
Distributed Cloud Architecture & Consensus Primitives
Chapter 1: Foundations of Distributed Storage
Modern hyperscale infrastructure requires decoupled storage volumes, asynchronous replication pipelines, and zero-loss failover gates.

Chapter 2: Byzantine Fault Tolerance & Quorum
Consensus protocols enforce Raft leader election, Byzantine agreement matrices, and multi-region quorum validation.

Chapter 3: Telemetry Indicators & Operational Metrics
Target system availability: 99.999% uptime. Latency under 12ms. Automated self-healing kicks in under 4 seconds.

Chapter 4: Implementation Roadmap & Execution Workflow
Phase 1: Kernel parameter tuning. Phase 2: Microservice sharding. Phase 3: Global mesh routing and release.
    `;

    const session = await createPresentationSession({
      title: "Distributed Cloud Architecture",
      content: csContent,
      purpose: "Business Strategy & Operations",
      density: "balanced",
      audience: "Cloud Architects & Lead Engineers",
      language: "English",
      additionalInstructions: "Include architectural quadrants and telemetry indicators",
      presentationType: "standard",
      theme: baseTheme,
      slideCount: 8,
    });

    expect(session).toBeDefined();
    expect(session.slides.length).toBe(8);
    expect(fs.existsSync(session.filePath)).toBe(true);
    expect(session.fileSize).toBeGreaterThan(1000);

    // Verify slide layout diversity across the 8 slides
    const layouts = session.slides.map((s) => s.layout);
    expect(layouts[0]).toBe("title");
    expect(layouts[1]).toBe("agenda");
    expect(layouts[7]).toBe("conclusion");

    // Must contain modern visual layouts (e.g. hero-split, bento-grid, metrics, timeline, or text-visual)
    const hasModernLayout = layouts.some((l) =>
      ["hero-split", "bento-grid", "headline-hero", "metrics", "two-column", "three-card", "timeline", "process", "text-visual"].includes(l),
    );
    expect(hasModernLayout).toBe(true);

    // Verify at least one slide has an attached visual illustration or diagram
    const hasVisual = session.slides.some((s) => Boolean(s.visual?.imageUrl));
    expect(hasVisual).toBe(true);
  });

  it("Case 2: Academic Assignment Presentation rigorously preserves student metadata and official cover", async () => {
    const academicContent = `
Machine Learning in Genomic Sequencing & Cancer Mutation Detection
Abstract:
This research study examines convolutional graph networks applied to high-throughput genomic data.
Methodology:
We analyzed 4,500 annotated tissue biopsies using unsupervised dimensional reduction and stratified cross-validation.
Findings:
Our neural model demonstrated 94.8% classification accuracy, outperforming classical random forest baselines.
Conclusion:
Targeted genomic biomarkers provide critical diagnostic leverage for early clinical intervention.
    `;

    const assignmentMeta = {
      isAssignment: true,
      assignmentType: "group" as const,
      assignmentTitle: "Machine Learning in Genomic Sequencing",
      courseName: "Computational Bioinformatics & Deep Learning",
      courseCode: "BIO-409",
      instructorName: "Dr. Evelyn Vance",
      universityName: "National Institute of Technology",
      department: "Department of Computer Science & Genomic Biology",
      submissionDate: "November 2026",
      coverTemplateId: "academic-yale",
      accentColor: "#1E3A8A",
      groupMembers: [
        { id: "m1", fullName: "Sophia Chen", studentId: "CS-2024-881" },
        { id: "m2", fullName: "Liam Walker", studentId: "CS-2024-882" },
      ],
    };

    const session = await createPresentationSession({
      title: "Machine Learning in Genomic Sequencing",
      content: academicContent,
      purpose: "Education & Academic Lecture",
      density: "detailed",
      presentationType: "assignment",
      assignmentMetadata: assignmentMeta,
      theme: {
        ...baseTheme,
        id: "academic-serif",
        name: "Academic Classical",
        kind: "academic",
        colors: { primary: "#1E3A8A", accent: "#0D9488", bg: "#FFFFFF" },
      },
      slideCount: 6,
    });

    expect(session.slides.length).toBe(6);

    // Slide 1 must be the official assignment cover
    const cover = session.slides[0]!;
    expect(cover.layout).toBe("assignment-cover");
    expect(cover.assignmentMetadata).toBeDefined();
    expect(cover.assignmentMetadata?.courseName).toBe("Computational Bioinformatics & Deep Learning");
    expect(cover.assignmentMetadata?.instructorName).toBe("Dr. Evelyn Vance");
    expect(cover.assignmentMetadata?.groupMembers?.length).toBe(2);

    // Verify PPTX is valid and written to disk
    expect(fs.existsSync(session.filePath)).toBe(true);
    expect(session.fileSize).toBeGreaterThan(1500);
  });

  it("Case 3: Interactive Natural Language AI Slide Assistant redesigns specific slide in-place", async () => {
    const session = await createPresentationSession({
      title: "Sustainable Urban Energy Systems",
      content: `
Smart Grid Topology & Microgeneration
Section 1: Solar and wind microgeneration arrays provide decentralized power.
Section 2: Battery storage and fast-response capacitors absorb peak demand surges.
Section 3: Edge telemetry dynamically balances local distribution feeder lines.
Section 4: Predictive AI load dispatch minimizes transmission loss by 18%.
      `,
      purpose: "Project Proposal & Pitch Deck",
      density: "balanced",
      theme: baseTheme,
      slideCount: 5,
    });

    const targetSlideIdx = 2;
    const originalSlide = { ...session.slides[targetSlideIdx]! };

    // Ask AI to convert slide into a 4-card Bento Grid
    const updatedSession = await regenerateSlideWithAI(
      session.id,
      targetSlideIdx,
      "Convert this slide into a modern 4-card bento grid with distinct pillar tags",
    );

    expect(updatedSession).toBeDefined();
    const redesignedSlide = updatedSession!.slides[targetSlideIdx]!;
    expect(redesignedSlide.layout).toBe("bento-grid");
    expect(redesignedSlide.bentoGrid).toBeDefined();
    expect(redesignedSlide.bentoGrid!.length).toBe(4);

    // Rest of presentation must be preserved
    expect(updatedSession!.slides[0]!.title).toBe(session.slides[0]!.title);
    expect(updatedSession!.slides.length).toBe(5);

    // Recompiled PPTX on disk must exist and be valid
    expect(fs.existsSync(updatedSession!.filePath)).toBe(true);
  });

  it("Case 4: Supports dynamic slide management: reorder, add, and delete slides", async () => {
    const session = await createPresentationSession({
      title: "Enterprise Cloud Governance",
      content: `
Pillar 1: Identity and Access Management
Pillar 2: Data Loss Prevention & Encryption
Pillar 3: Infrastructure as Code & Pipeline Gates
Pillar 4: Continuous Audit Telemetry
      `,
      theme: baseTheme,
      slideCount: 5,
    });

    expect(session.slides.length).toBe(5);
    const originalSlide1Title = session.slides[1]!.title;
    const originalSlide2Title = session.slides[2]!.title;

    // 1. Reorder slides (swap slide index 1 and 2)
    const reordered = await reorderSessionSlides(session.id, [0, 2, 1, 3, 4]);
    expect(reordered).toBeDefined();
    expect(reordered!.slides[1]!.title).toBe(originalSlide2Title);
    expect(reordered!.slides[2]!.title).toBe(originalSlide1Title);
    expect(reordered!.slides[1]!.slideNumber).toBe(2);
    expect(reordered!.slides[2]!.slideNumber).toBe(3);

    // 2. Add slide after index 1
    const withAdded = await addSessionSlide(session.id, 1, {
      title: "Regulatory Compliance Gates",
      subtitle: "SOC2 and ISO 27001 continuous verification telemetry",
      layout: "hero-split",
    });
    expect(withAdded).toBeDefined();
    expect(withAdded!.slides.length).toBe(6);
    expect(withAdded!.slides[2]!.title).toBe("Regulatory Compliance Gates");
    expect(withAdded!.slides[2]!.slideNumber).toBe(3);

    // 3. Delete slide at index 2
    const withDeleted = await deleteSessionSlide(session.id, 2);
    expect(withDeleted).toBeDefined();
    expect(withDeleted!.slides.length).toBe(5);
    expect(withDeleted!.slides.every((s, idx) => s.slideNumber === idx + 1)).toBe(true);
  });

  it("Case 5: Renders all new layout primitives (hero-split, bento-grid, headline-hero, diagram-explainer) into PPTX with zero errors", async () => {
    const rawTheme: RawThemeInput = {
      name: "Modern Agency Dark",
      kind: "tech",
      colors: { primary: "#0F172A", accent: "#06B6D4", bg: "#0B0F19" },
    };
    const tokens = computeThemeTokens(rawTheme, { fontFamily: "Inter", fontSizePreset: "standard" });

    const testSlides = [
      {
        id: "s1",
        slideNumber: 1,
        layout: "title" as const,
        title: "AI Presentation Architecture",
        subtitle: "Next-Generation Information Design",
      },
      {
        id: "s2",
        slideNumber: 2,
        layout: "hero-split" as const,
        title: "Executive Mandate",
        subtitle: "High-impact split screen layout",
        heroSplit: {
          headline: "Mission Critical Reliability",
          highlight: "Zero downtime autonomous orchestration across hybrid cloud clusters",
          details: ["Dynamic failover routing", "Distributed state recovery", "Real-time compliance validation"],
        },
      },
      {
        id: "s3",
        slideNumber: 3,
        layout: "bento-grid" as const,
        title: "Architectural Foundations",
        bentoGrid: [
          { title: "Gateway", description: "Edge traffic routing and TLS termination", tag: "GATEWAY" },
          { title: "Compute", description: "Autoscaling container pods with zero cold-starts", tag: "COMPUTE" },
          { title: "Storage", description: "Distributed persistent volumes with multi-AZ replication", tag: "STORAGE" },
          { title: "Telemetry", description: "Sub-millisecond metric aggregation and tracing", tag: "TELEMETRY" },
        ],
      },
      {
        id: "s4",
        slideNumber: 4,
        layout: "headline-hero" as const,
        title: "Global Scale Performance",
        statCallout: {
          stat: "99.999% Service Level",
          label: "Mission-critical benchmark verified across 12 worldwide regions",
          context: "Production telemetry indicators exceeding enterprise reliability standards",
          bullets: ["Sub-5ms edge response", "Zero packet drop under stress", "Continuous cryptographic verification"],
        },
      },
      {
        id: "s5",
        slideNumber: 5,
        layout: "diagram-explainer" as const,
        title: "System Interaction Topology",
        bullets: [
          "Client requests arrive through global load balancer.",
          "Stateless worker nodes process asynchronous tasks.",
          "Persistent state is committed via distributed Raft log.",
        ],
      },
    ];

    const pptx = await renderSlideDeckToPptx("AI Presentation Architecture", "Tech Architecture", testSlides, tokens);
    expect(pptx).toBeDefined();
    const buffer = await pptx.write({ outputType: "nodebuffer" });
    expect(buffer).toBeDefined();
    expect(Buffer.isBuffer(buffer) ? buffer.length : (buffer as ArrayBuffer).byteLength).toBeGreaterThan(2000);
  });

  it("Case 6: Eliminates tautological duplicate bullets, robotic filler, and empty voids across large slide requests", async () => {
    const userPromptContent = `
# DocuMind — Upgrade File Converter and PDF Compressor with Full Image Support

Implementation Requirements
- Modular Flutter Architecture
- Separate responsibilities

Test
- Image generation.
- Image placement.
- Layout diversity.
- Slide content organization.

Definition of Done
- Complete verification and deliverable sign-off
`;

    const session = await createPresentationSession({
      title: "DocuMind System Upgrade",
      content: userPromptContent,
      purpose: "Business Strategy & Operations",
      density: "balanced",
      presentationType: "standard",
      theme: {
        id: "slidesgo-argumentative-fallacy",
        name: "Argumentative Fallacy",
        category: "Minimal",
        kind: "minimal",
        colors: { primary: "#F8FAFC", accent: "#EAB308", bg: "#0F172A" },
        fonts: "Plus Jakarta + Inter",
        tier: "free",
      },
      slideCount: 8,
    });

    expect(session).toBeDefined();
    expect(session.slides.length).toBe(8);

    // Verify all bullets across all slides
    for (const slide of session.slides) {
      // 1. Must NOT contain repetitive subtitle
      if (slide.subtitle) {
        expect(slide.subtitle).not.toContain("Strategic Analysis & Core Dimensions");
      }

      // 2. Must NOT contain tautological anchors or robotic filler
      if (slide.bullets) {
        for (const bullet of slide.bullets) {
          expect(bullet).not.toMatch(/^([A-Za-z\s]+):\s*\1$/i);
          expect(bullet).not.toContain("Definition Of Done: Definition of Done");
          expect(bullet).not.toContain("Image Generation.: Image generation.");
          expect(bullet).not.toContain("Image Placement.: Image placement.");
          expect(bullet).not.toContain("Layout Diversity.: Layout diversity.");
          expect(bullet).not.toContain("Detailed breakdown and evaluation of");
          // Verify that bullets have substantive length and real content
          expect(bullet.length).toBeGreaterThan(15);
        }
      }
    }
  });
});
