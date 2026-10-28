import { describe, expect, it } from "vitest";
import {
  detectExistingCoverPage,
  paginateSectionsIntoA4Pages,
  parseDocumentSections,
  type FormattingConfig,
} from "@/components/workspace/DocumentFormattingWorkflow";
import { getDefaultAssignmentMetadata } from "@/lib/assignment-types";

describe("Stage 1 — Cover Integration as Page 1 and Detection", () => {
  it("accurately detects existing assignment cover page front matter", () => {
    const rawText = `UNIVERSITY OF CAMBRIDGE
DEPARTMENT OF COMPUTER SCIENCE

ASSIGNMENT: DISTRIBUTED SYSTEMS ARCHITECTURE
Course: CS-401 Distributed Computing
Student Name: Emily Watson
Student ID: CS-2024-9876
Submitted to: Prof. Alan Vance
Date: October 28, 2026

1. Introduction
Distributed systems require consensus algorithms such as Raft or Paxos to maintain state across replicas.
`;

    const result = detectExistingCoverPage(rawText);
    expect(result.hasExistingCover).toBe(true);
    expect(result.detectedAuthor).toBe("Emily Watson");
    expect(result.detectedInstitution).toContain("CAMBRIDGE");
    expect(result.bodyTrimIndex).toBeDefined();
    expect(result.bodyTrimIndex!).toBeGreaterThan(0);

    const stripped = rawText.slice(result.bodyTrimIndex!).trim();
    expect(stripped).toContain("1. Introduction");
    expect(stripped).not.toContain("CS-2024-9876");
  });

  it("accurately detects standard business/report cover front matter", () => {
    const rawText = `ACME ENTERPRISE SOLUTIONS
QUARTERLY FINANCIAL REPORT Q3 2026
Prepared by: John Doe
Date: October 2026

1.0 Executive Summary
The company achieved revenue growth of 24% year-over-year.
`;

    const result = detectExistingCoverPage(rawText);
    expect(result.hasExistingCover).toBe(true);
    expect(result.detectedAuthor).toBe("John Doe");
    expect(result.bodyTrimIndex).toBeDefined();
    expect(result.bodyTrimIndex!).toBeGreaterThan(0);

    const stripped = rawText.slice(result.bodyTrimIndex!).trim();
    expect(stripped).toContain("Executive Summary");
  });

  it("returns hasExistingCover: false for normal content without cover front-matter", () => {
    const rawText = `Algorithms and Data Structures

In computer science, a binary search tree is a rooted binary tree data structure with the key of each internal node being greater than all the keys in the respective node's left subtree.

1. Binary Trees
Properties of binary search trees include logarithmic lookup time on average.
`;

    const result = detectExistingCoverPage(rawText);
    expect(result.hasExistingCover).toBe(false);
  });

  it("ensures Page 1 is always the cover sheet when hasCoverPage is true, followed by body pages", () => {
    const config: FormattingConfig = {
      layoutArchetype: "modern",
      hasCoverPage: true,
      coverStyle: "modern",
      docTitle: "AI Alignment and Agentic Reasoning",
      docSubtitle: "Research Monograph",
      authorName: "Sarah Connor",
      institution: "Robotics Institute",
      dateStr: "October 2026",
      fontFamily: "sans",
      baseFontSize: "11pt",
      lineSpacing: "1.5",
      paragraphSpacing: "normal",
      headingNumbering: "decimal",
      headingCase: "title",
      headingDivider: true,
      margins: "standard",
      headerText: "Research Monograph",
      headerAlign: "right",
      headerRule: true,
      pageNumberPosition: "bottom-center",
      pageNumberFormat: "page-x-of-y",
      firstPageUnnumbered: true,
      includeToc: false,
      tocLevels: 2,
      tocDotLeaders: true,
    };

    const text = `1. Introduction
Autonomous systems require robust verification.

2. Architecture
The architecture comprises a reasoning planner and verification checkers.`;

    const sections = parseDocumentSections(text, config.headingNumbering);
    const pages = paginateSectionsIntoA4Pages(sections, config);

    // Page 1 is the cover
    expect(pages[0]?.isCover).toBe(true);
    expect(pages[0]?.pageNumber).toBe(1);

    // Page 2 is the first body page
    expect(Boolean(pages[1]?.isCover)).toBe(false);
    expect(pages[1]?.isFirstBodyPage).toBe(true);
    expect(pages[1]?.pageNumber).toBe(2);
  });

  it("handles academic cover page with full assignment metadata as Page 1", () => {
    const meta = getDefaultAssignmentMetadata();
    meta.isAssignment = true;
    meta.assignmentMode = "group";
    meta.assignmentTitle = "Distributed Ledger Consensus Protocol";
    meta.groupName = "Team Consensus Alpha";
    meta.groupMembers = [
      { id: "1", name: "Alice Smith", studentId: "STU-001", role: "Lead" },
      { id: "2", name: "Bob Jones", studentId: "STU-002", role: "Contributor" },
    ];
    meta.coverTemplateId = "canva-split-left-modern";

    const config: FormattingConfig = {
      layoutArchetype: "academic",
      hasCoverPage: true,
      coverStyle: "academic",
      docTitle: meta.assignmentTitle,
      assignmentMetadata: meta,
      fontFamily: "serif",
      baseFontSize: "11pt",
      lineSpacing: "1.5",
      paragraphSpacing: "normal",
      headingNumbering: "decimal",
      headingCase: "title",
      headingDivider: true,
      margins: "academic",
      headerText: "CS Assignment",
      headerAlign: "right",
      headerRule: true,
      pageNumberPosition: "bottom-center",
      pageNumberFormat: "page-x-of-y",
      firstPageUnnumbered: true,
      includeToc: false,
      tocLevels: 2,
      tocDotLeaders: true,
    };

    const text = `1. Executive Summary\nWe explore consensus algorithms in blockchain architectures.\n\n2. Implementation Details\nByzantine fault tolerance is implemented using view change protocols.`;
    const sections = parseDocumentSections(text, config.headingNumbering);
    const pages = paginateSectionsIntoA4Pages(sections, config);

    expect(pages[0]?.isCover).toBe(true);
    expect(pages[0]?.pageNumber).toBe(1);
    expect(Boolean(pages[1]?.isCover)).toBe(false);
    expect(pages[1]?.pageNumber).toBe(2);
  });
});
