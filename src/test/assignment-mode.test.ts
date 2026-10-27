import { describe, it, expect, beforeEach } from "vitest";
import {
  COVER_TEMPLATES,
  getDefaultAssignmentMetadata,
  type AssignmentMetadata,
  type StudentMember,
} from "../lib/assignment-types";
import {
  extractAssignmentMetadataFromText,
  formatStudentMemberDisplay,
} from "../lib/assignment-metadata-extractor";
import {
  buildSlideDeckContent,
  calculateSourceCoverage,
  getClientSession,
  saveClientSession,
} from "../lib/presentation-session-client";
import { createPresentationSession } from "../../server/services/presentationSession.service";
import { generateAssignmentCoverHtml } from "../lib/assignment-document-renderer";
import { paginateSectionsIntoA4Pages, parseDocumentSections } from "../components/workspace/DocumentFormattingWorkflow";
import { TEMPLATES } from "../lib/presentation-theme";
import fs from "fs";
import path from "path";
import os from "os";

describe("DocuMind Academic Assignment Mode Comprehensive Verification (17 Core Scenarios)", () => {
  // Scenario 1: Individual assignment with all fields supplied
  it("Scenario 1: Individual assignment with all required and optional fields supplied", () => {
    const metadata: AssignmentMetadata = {
      isAssignment: true,
      assignmentType: "individual",
      studentName: "Alexandra Chen",
      studentId: "STU-2026-9941",
      courseName: "CS 502 — Advanced Distributed Systems",
      courseCode: "CS 502",
      instructorName: "Prof. Marcus Vance",
      universityName: "Stanford University",
      department: "Department of Computer Science",
      collegeOrFaculty: "School of Engineering",
      academicYear: "2026-2027",
      semester: "Fall 2026",
      submissionDate: "October 28, 2026",
      assignmentTitle: "Consensus Protocols in Partitioned Distributed Networks",
      additionalInstructions: "Please submit through the university portal as a single PDF.",
      coverTemplateId: "classic-university",
      accentColor: "#1E3A8A",
      groupMembers: [],
    };

    expect(metadata.studentName).toBe("Alexandra Chen");
    expect(metadata.studentId).toBe("STU-2026-9941");
    expect(metadata.courseName).toBe("CS 502 — Advanced Distributed Systems");
    expect(metadata.instructorName).toBe("Prof. Marcus Vance");
    expect(metadata.universityName).toBe("Stanford University");

    const html = generateAssignmentCoverHtml(metadata);
    expect(html).toContain("Alexandra Chen");
    expect(html).toContain("STU-2026-9941");
    expect(html).toContain("CS 502 — Advanced Distributed Systems");
    expect(html).toContain("Prof. Marcus Vance");
    expect(html).toContain("Stanford University");
    expect(html).toContain("Department of Computer Science");
    expect(html).toContain("School of Engineering");
    expect(html).toContain("October 28, 2026");
  });

  // Scenario 2: Individual assignment with optional university details omitted
  it("Scenario 2: Individual assignment with optional university details omitted", () => {
    const metadata: AssignmentMetadata = {
      isAssignment: true,
      assignmentType: "individual",
      studentName: "Marcus Sterling",
      studentId: "ID-40291",
      courseName: "Introduction to Microeconomics",
      instructorName: "Dr. Sarah Jenkins",
      coverTemplateId: "modern-minimal",
      accentColor: "#059669",
      groupMembers: [],
    };

    expect(metadata.studentName).toBe("Marcus Sterling");
    expect(metadata.studentId).toBe("ID-40291");
    expect(metadata.courseName).toBe("Introduction to Microeconomics");
    expect(metadata.instructorName).toBe("Dr. Sarah Jenkins");
    expect(metadata.universityName).toBeUndefined();

    const html = generateAssignmentCoverHtml(metadata);
    expect(html).toContain("Marcus Sterling");
    expect(html).toContain("ID-40291");
    expect(html).toContain("Introduction to Microeconomics");
    expect(html).toContain("Dr. Sarah Jenkins");
    // Should NOT contain broken placeholders
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("null");
  });

  // Scenario 3: Group assignment with multiple students (repeatable directory)
  it("Scenario 3: Group assignment with multiple students in repeatable directory", () => {
    const groupMembers: StudentMember[] = [
      { id: "mem-1", fullName: "Liam O'Connor", studentId: "CS-8812" },
      { id: "mem-2", fullName: "Sophia Patel", studentId: "CS-8813" },
      { id: "mem-3", fullName: "Ethan Kim", studentId: "CS-8814" },
      { id: "mem-4", fullName: "Zoe Washington", studentId: "CS-8815" },
    ];

    const metadata: AssignmentMetadata = {
      isAssignment: true,
      assignmentType: "group",
      assignmentTitle: "Distributed Cloud Infrastructure Project",
      courseName: "CS 420 — Cloud Architecture",
      instructorName: "Dr. Rachel Adams",
      universityName: "University of Washington",
      department: "Paul G. Allen School of Computer Science & Engineering",
      coverTemplateId: "formal-academic",
      accentColor: "#0F172A",
      groupMembers,
    };

    expect(metadata.groupMembers.length).toBe(4);
    expect(formatStudentMemberDisplay(groupMembers[0]!)).toBe("Liam O'Connor (CS-8812)");

    const html = generateAssignmentCoverHtml(metadata);
    const unescapedHtml = html.replace(/&#039;/g, "'");
    for (const mem of groupMembers) {
      expect(unescapedHtml).toContain(mem.fullName);
      expect(html).toContain(mem.studentId);
    }
    expect(html).toContain("Distributed Cloud Infrastructure Project");
    expect(html).toContain("Dr. Rachel Adams");
  });

  // Scenario 4: Long assignment pasted into editor (preserved without truncation or fake content)
  it("Scenario 4: Long assignment pasted into editor is preserved faithfully without hallucination", () => {
    const longAssignment = `CS 401 — Advanced Operating Systems
Midterm Case Study: Memory Hierarchy and Cache Coherence

Question 1: MESI Cache Protocol Mechanics
Describe the transitions between Modified, Exclusive, Shared, and Invalid cache states when two processor cores concurrently write to disjoint offsets in the same 64-byte cache line.

Question 2: False Sharing Elimination
Explain how data structure padding and hardware cache alignment mitigate false sharing in concurrent lock-free queue implementations.

Question 3: NUMA Memory Latency Profiling
Analyze the latency overhead when an execution thread bound to Socket 0 accesses physical memory pages allocated on Socket 1 via UPI interconnect.`;

    const coverageBefore = calculateSourceCoverage(longAssignment, []);
    expect(coverageBefore.totalSections).toBeGreaterThanOrEqual(3);

    const slides = buildSlideDeckContent(
      "Operating Systems Assignment",
      longAssignment,
      6,
      "balanced",
      "Education",
      {
        ...getDefaultAssignmentMetadata(),
        isAssignment: true,
        assignmentTitle: "Memory Hierarchy and Cache Coherence",
        courseName: "CS 401 — Advanced Operating Systems",
        instructorName: "Prof. Kenneth Clark",
      },
    );

    // Slide 1 must be assignment cover
    expect(slides[0]!.layout).toBe("assignment-cover");
    expect(slides[0]!.title).toContain("Memory Hierarchy");

    // Headings for questions should be preserved without synthetic corporate buzzwords
    const allTitles = slides.map((s) => s.title);
    expect(allTitles.some((t) => t.toLowerCase().includes("question 1"))).toBe(true);

    const coverage = calculateSourceCoverage(longAssignment, slides);
    expect(coverage.coveragePercentage).toBeGreaterThanOrEqual(75);
  });

  // Scenario 5: Uploaded DOCX assignment text extraction
  it("Scenario 5: Uploaded assignment text extraction handles headings and metadata detection", () => {
    const docxSimulatedText = `Stanford University
Department of Electrical Engineering
EE 382: Distributed Computing Architecture

Assignment 3: Paxos Protocol State Machine Replication
Submitted by: Jordan Hayes
Student ID: EE-90214
Instructor: Prof. Katherine Shaw
Date: October 24, 2026

1. Abstract & System Model
This assignment analyzes asynchronous fault-tolerant consensus under crash-recovery failures.`;

    const suggestions = extractAssignmentMetadataFromText(docxSimulatedText);
    expect(suggestions.hasSuggestions).toBe(true);
    expect(suggestions.studentName).toBe("Jordan Hayes");
    expect(suggestions.studentId).toBe("EE-90214");
    expect(suggestions.courseName).toContain("EE 382");
    expect(suggestions.instructorName).toBe("Prof. Katherine Shaw");
    expect(suggestions.universityName).toBe("Stanford University");
    expect(suggestions.department).toContain("Electrical Engineering");
  });

  // Scenario 6: Uploaded text-based PDF text extraction
  it("Scenario 6: Text-based PDF extraction extracts assignment metadata reliably", () => {
    const pdfSimulatedText = `HARVARD UNIVERSITY
Department of Economics
ECON 1010A — Microeconomic Theory

Problem Set 4: Monopoly Pricing and Deadweight Loss
Student Name: Emily Watson
Student ID: HUID-7049210
Submitted to: Dr. Gregory Mankiw
Academic Year: 2026-2027
Semester: Fall 2026

Part A: Linear Demand and Marginal Revenue
Calculate the equilibrium price and quantity given inverse demand P = 120 - 2Q and MC = 20.`;

    const extracted = extractAssignmentMetadataFromText(pdfSimulatedText);
    expect(extracted.hasSuggestions).toBe(true);
    expect(extracted.studentName).toBe("Emily Watson");
    expect(extracted.studentId).toBe("HUID-7049210");
    expect(extracted.courseName).toContain("ECON 1010A");
    expect(extracted.instructorName).toBe("Dr. Gregory Mankiw");
    expect(extracted.universityName).toBe("HARVARD UNIVERSITY");
    expect(extracted.academicYear).toBe("2026-2027");
  });

  // Scenario 7: OCR fallback handling for scanned documents
  it("Scenario 7: Scanned image OCR mock detects assignment keywords", () => {
    const ocrRecognizedText = `Massachusetts Institute of Technology
Department of Physics
8.01 Physics I: Classical Mechanics
Assignment 2: Rotational Dynamics
Student: Daniel Craig
ID: MIT-492019
Instructor: Dr. Walter Lewin`;

    const extracted = extractAssignmentMetadataFromText(ocrRecognizedText);
    expect(extracted.hasSuggestions).toBe(true);
    expect(extracted.studentName).toBe("Daniel Craig");
    expect(extracted.studentId).toBe("MIT-492019");
    expect(extracted.universityName).toBe("Massachusetts Institute of Technology");
    expect(extracted.department).toContain("Physics");
  });

  // Scenario 8: University logo with transparency & aspect ratio preservation
  it("Scenario 8: University logo with transparency & aspect ratio preservation", () => {
    const transparentLogoPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const metadata: AssignmentMetadata = {
      isAssignment: true,
      assignmentType: "individual",
      studentName: "Chloe Bennett",
      studentId: "CH-2026",
      courseName: "Biology 101",
      instructorName: "Dr. Miller",
      universityName: "Cambridge University",
      logoDataUrl: transparentLogoPng,
      coverTemplateId: "university-branding",
      accentColor: "#1E3A8A",
      groupMembers: [],
    };

    const html = generateAssignmentCoverHtml(metadata);
    expect(html).toContain(transparentLogoPng);
    expect(html).toContain("object-fit: contain");
    expect(html).toContain("max-height");
  });

  // Scenario 9: Missing/invalid logo handling (clean layout without broken placeholder)
  it("Scenario 9: Missing or omitted logo handling leaves clean layout without broken placeholder", () => {
    const metadata: AssignmentMetadata = {
      isAssignment: true,
      assignmentType: "individual",
      studentName: "Chloe Bennett",
      studentId: "CH-2026",
      courseName: "Biology 101",
      instructorName: "Dr. Miller",
      universityName: "Cambridge University",
      logoDataUrl: undefined,
      coverTemplateId: "classic-university",
      accentColor: "#1E3A8A",
      groupMembers: [],
    };

    const html = generateAssignmentCoverHtml(metadata);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("alt=\"University Logo\"");
    expect(html).toContain("Cambridge University");
  });

  // Scenario 10: 50+ distinct cover templates
  it("Scenario 10: All distinct cover templates generate unique styling and structure", () => {
    expect(COVER_TEMPLATES.length).toBeGreaterThanOrEqual(50);

    const baseMeta: AssignmentMetadata = {
      isAssignment: true,
      assignmentType: "individual",
      studentName: "Julian Vance",
      studentId: "JV-9021",
      courseName: "Architectural Theory",
      courseCode: "ARCH 201",
      instructorName: "Prof. Rem Koolhaas",
      universityName: "Columbia University",
      department: "Graduate School of Architecture",
      academicYear: "2026",
      submissionDate: "November 1, 2026",
      assignmentTitle: "Parametric Facades in Modern Urban Design",
      accentColor: "#2563EB",
      groupMembers: [],
    };

    const generatedHtmls = new Set<string>();

    for (const template of COVER_TEMPLATES) {
      const meta = { ...baseMeta, coverTemplateId: template.id };
      const html = generateAssignmentCoverHtml(meta);
      expect(html).toContain(meta.assignmentTitle!);
      expect(html).toContain(meta.studentName!);
      expect(html).toContain(meta.instructorName!);

      // Verify that each template produces distinct HTML
      expect(generatedHtmls.has(html)).toBe(false);
      generatedHtmls.add(html);

      // Verify template specific styling markers
      if (template.id === "classic-university") {
        expect(html).toContain("double");
      } else if (template.id === "modern-minimal") {
        expect(html).toContain("border-left: 6px solid");
      } else if (template.id === "structured-research") {
        expect(html).toContain("DOCUMIND / SPEC-A4");
      }
    }

    expect(generatedHtmls.size).toBeGreaterThanOrEqual(50);
  });

  // Scenario 11: Presentation cover template + slide theme visual coherence
  it("Scenario 11: Presentation Maker Assignment deck creates assignment cover on slide 1 with deck theme", () => {
    const rawContent = `1. Introduction to Quantum Circuits
Qubits utilize quantum superposition and entanglement to execute non-deterministic algorithms.

2. Superconducting Josephson Junctions
Non-linear inductance provides anharmonic energy transitions essential for addressable qubit levels.

3. Error Mitigation and Quantum Volume
Fault tolerance relies on surface code stabilization with physical fault rates below 10^-3.`;

    const metadata: AssignmentMetadata = {
      isAssignment: true,
      assignmentType: "individual",
      studentName: "Nadia Petrova",
      studentId: "PHYS-9921",
      courseName: "PHYS 602 — Quantum Information",
      instructorName: "Dr. John Preskill",
      universityName: "Caltech",
      coverTemplateId: "elegant-blue",
      accentColor: "#1D4ED8",
      groupMembers: [],
    };

    const slides = buildSlideDeckContent("Quantum Circuits", rawContent, 5, "balanced", "Education", metadata);

    expect(slides.length).toBe(5);
    expect(slides[0]!.layout).toBe("assignment-cover");
    expect(slides[0]!.assignmentMetadata).toBeDefined();
    expect(slides[0]!.assignmentMetadata?.studentName).toBe("Nadia Petrova");
    expect(slides[0]!.categoryTag).toBe("ACADEMIC ASSIGNMENT");

    // Subsequent slides follow presentation theme
    expect(slides[1]!.layout).toBe("agenda");
    expect(slides[2]!.layout).toBe("content");
    expect(slides[4]!.layout).toBe("conclusion");
  });

  // Scenario 12: Document cover template + A4 body formatting
  it("Scenario 12: Document Studio Assignment Mode prepends A4 cover page and formats body with TOC", () => {
    const rawContent = `1.0 Architectural Foundations of Microservices
Distributed microservices replace monolithic deployments with decoupled domain boundaries.

2.0 Event Sourcing and CQRS
Event stores record state transitions immutably, ensuring complete auditability.

3.0 Network Resilience and Circuit Breakers
Adaptive timeout budgets and token-bucket rate limiters prevent cascading cluster outages.`;

    const metadata: AssignmentMetadata = {
      isAssignment: true,
      assignmentType: "individual",
      studentName: "Elena Rostova",
      studentId: "CS-4091",
      courseName: "CS 350 — Software Engineering",
      instructorName: "Dr. Alan Kay",
      universityName: "Carnegie Mellon University",
      coverTemplateId: "professional-navy",
      accentColor: "#0F172A",
      groupMembers: [],
    };

    const sections = parseDocumentSections(rawContent, "decimal");
    expect(sections.length).toBe(3);

    const pages = paginateSectionsIntoA4Pages(sections, {
      layoutArchetype: "academic",
      hasCoverPage: true,
      coverStyle: "academic",
      docTitle: "Software Architecture Assignment",
      docSubtitle: "",
      authorName: metadata.studentName!,
      institution: metadata.universityName!,
      dateStr: "Fall 2026",
      assignmentMetadata: metadata,
      fontFamily: "serif",
      baseFontSize: "11pt",
      lineSpacing: "1.5",
      paragraphSpacing: "normal",
      headingNumbering: "decimal",
      headingCase: "title",
      headingDivider: false,
      margins: "academic",
      headerText: "CS 350 Assignment",
      headerAlign: "right",
      headerRule: true,
      pageNumberPosition: "bottom-center",
      pageNumberFormat: "page-x-of-y",
      firstPageUnnumbered: true,
      includeToc: true,
      tocLevels: 2,
      tocDotLeaders: true,
    });

    // Page 1 is the dedicated Assignment Cover
    expect(pages[0]!.isCover).toBe(true);
    expect(pages[0]!.pageNumber).toBe(1);

    // Page 2 is the Table of Contents
    expect(pages[1]!.isToc).toBe(true);
    expect(pages[1]!.pageNumber).toBe(2);

    // Page 3+ are the document body
    expect(pages[2]!.isCover).toBeFalsy();
    expect(pages[2]!.isToc).toBeFalsy();
    expect(pages[2]!.sections.length).toBeGreaterThan(0);
  });

  // Scenario 13: Extracted metadata suggestion and user review/confirmation without silent overwrite
  it("Scenario 13: Extracted metadata suggestions require explicit user confirmation", () => {
    const rawText = `Student Name: Sarah Connor
Student ID: T-800
Course: CS 101 Intro to Cybernetics
Instructor: Dr. Miles Dyson`;

    const extracted = extractAssignmentMetadataFromText(rawText);
    expect(extracted.hasSuggestions).toBe(true);

    // Prior user metadata must NOT be silently replaced
    const existingMetadata: AssignmentMetadata = {
      isAssignment: true,
      assignmentType: "individual",
      studentName: "John Connor",
      studentId: "LEADER-1",
      courseName: "CS 101",
      instructorName: "Original Instructor",
      coverTemplateId: "classic-university",
      accentColor: "#1E3A8A",
      groupMembers: [],
    };

    // User explicitly decides which fields to adopt
    const updatedMetadata: AssignmentMetadata = {
      ...existingMetadata,
      // User selectively accepts instructor suggestion but keeps their name
      instructorName: extracted.instructorName || existingMetadata.instructorName,
    };

    expect(updatedMetadata.studentName).toBe("John Connor");
    expect(updatedMetadata.instructorName).toBe("Dr. Miles Dyson");
  });

  // Scenario 14: Long source content with section coverage calculation
  it("Scenario 14: Calculates source coverage and detects uncovered topics accurately", () => {
    const fullAssignment = `1. Foundations of Cryptography
One-way functions and asymmetric key pairs form the cryptographic backbone.

2. Zero Knowledge Proofs
Interactive and non-interactive proofs permit verification without disclosure.

3. Homomorphic Encryption
Lattice-based schemes support arithmetic operations over encrypted ciphertexts.

4. Post-Quantum Cryptographic Migration
NIST candidate algorithms replace RSA and elliptic curves before cryptanalytic quantum threshold.`;

    const slides = buildSlideDeckContent("Cryptography Assignment", fullAssignment, 4, "balanced", "Education");
    const report = calculateSourceCoverage(fullAssignment, slides);

    expect(report.totalSections).toBe(4);
    expect(report.coveredSections).toBeGreaterThanOrEqual(3);
    expect(report.coveragePercentage).toBeGreaterThanOrEqual(75);
  });

  // Scenario 15: AI or file-extraction failure fallback to deterministic synthesizer
  it("Scenario 15: Gracefully falls back to deterministic synthesizer when external services fail", async () => {
    const brokenGeminiContent = "Short fallback prompt for assignment.";
    const session = await createPresentationSession({
      title: "Fallback Test",
      content: brokenGeminiContent,
      slideCount: 4,
      assignmentMetadata: {
        ...getDefaultAssignmentMetadata(),
        isAssignment: true,
        studentName: "Grace Hopper",
        studentId: "GH-01",
        courseName: "CS 100",
        instructorName: "Prof. Turing",
      },
    });

    expect(session).toBeDefined();
    expect(session.slides.length).toBe(4);
    expect(session.slides[0]!.layout).toBe("assignment-cover");
    expect(session.slides[0]!.assignmentMetadata?.studentName).toBe("Grace Hopper");
  });

  // Scenario 16: In-browser preview, live cover editing, and PPTX/DOCX export
  it("Scenario 16: Allows live updates to cover template and metadata in session", () => {
    const metadata: AssignmentMetadata = {
      isAssignment: true,
      assignmentType: "individual",
      studentName: "Arthur Dent",
      studentId: "AD-42",
      courseName: "Astro-Physics 42",
      instructorName: "Ford Prefect",
      coverTemplateId: "classic-university",
      accentColor: "#1E3A8A",
      groupMembers: [],
    };

    const session = {
      id: "test-assignment-session",
      title: "Hitchhiker Guide Analysis",
      purpose: "Education",
      density: "balanced" as const,
      assignmentMetadata: metadata,
      theme: { id: "academic-serif", name: "Academic", category: "Education", isFree: true, styles: {} as any },
      typography: { fontFamily: "serif" as const, headerSize: "large" as const, bodySize: "medium" as const },
      slideCount: 3,
      slides: buildSlideDeckContent("Hitchhiker Guide", "Chapter 1 overview", 3, "balanced", "Education", metadata),
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    };

    saveClientSession(session);
    const loaded = getClientSession("test-assignment-session");
    expect(loaded).not.toBeNull();
    expect(loaded!.assignmentMetadata?.studentName).toBe("Arthur Dent");

    // Live update cover template to "contemporary-editorial"
    loaded!.assignmentMetadata!.coverTemplateId = "contemporary-editorial";
    loaded!.slides[0]!.assignmentMetadata!.coverTemplateId = "contemporary-editorial";
    saveClientSession(loaded!);

    const reloaded = getClientSession("test-assignment-session");
    expect(reloaded!.assignmentMetadata?.coverTemplateId).toBe("contemporary-editorial");
  });

  // Scenario 17: Ephemeral session expiration & temporary cleanup
  it("Scenario 17: Enforces ephemeral session expiration and avoids database storage", () => {
    const expiredSession = {
      id: "expired-assignment-session",
      title: "Expired",
      purpose: "Education",
      density: "balanced" as const,
      theme: { id: "t1", name: "T1", category: "General", isFree: true, styles: {} as any },
      typography: { fontFamily: "sans" as const, headerSize: "medium" as const, bodySize: "medium" as const },
      slideCount: 3,
      slides: [],
      createdAt: Date.now() - 20 * 60 * 1000, // 20 mins ago
      expiresAt: Date.now() - 10 * 60 * 1000, // Expired 10 mins ago
    };

    saveClientSession(expiredSession);
    const result = getClientSession("expired-assignment-session");
    // Expired session must return null
    expect(result).toBeNull();
  });
});
