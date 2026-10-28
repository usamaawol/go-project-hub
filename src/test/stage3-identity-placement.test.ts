import { describe, expect, it } from "vitest";
import {
  generateAcademicIdentityHeaderHtml,
} from "@/components/workspace/AcademicIdentityHeader";
import { getDefaultAssignmentMetadata, type AssignmentMetadata } from "@/lib/assignment-types";
import { generateCoverElements } from "@/lib/cover-templates-registry";

describe("Stage 3 — Interactive Identity Placement Selector & Header Rendering", () => {
  it("formats first body page header without duplicate student/group names when placement is 'cover-only'", () => {
    const meta: AssignmentMetadata = {
      ...getDefaultAssignmentMetadata(),
      isAssignment: true,
      assignmentType: "individual",
      identityPlacement: "cover-only",
      studentName: "Lucas Vance",
      studentId: "STU-8899",
      courseName: "Distributed Systems Architecture",
      courseCode: "CS-401",
      instructorName: "Dr. Eleanor Vance",
      assignmentTitle: "Distributed Consensus Protocols",
      universityName: "Stanford University",
      submissionDate: "October 28, 2026",
    };

    const headerHtml = generateAcademicIdentityHeaderHtml(
      meta,
      meta.assignmentTitle,
      meta.courseName,
      meta.studentName,
      meta.universityName,
      meta.submissionDate,
    );

    // Title and institution are cleanly present
    expect(headerHtml).toContain("Distributed Consensus Protocols");
    expect(headerHtml).toContain("Stanford University");

    // Student name and ID are NOT duplicated in body header to prevent duplicate headings
    expect(headerHtml).not.toContain("Lucas Vance");
    expect(headerHtml).not.toContain("STU-8899");
  });

  it("renders full academic submission header on first body page when placement is 'first-body-page-only'", () => {
    const meta: AssignmentMetadata = {
      ...getDefaultAssignmentMetadata(),
      isAssignment: true,
      assignmentType: "individual",
      identityPlacement: "first-body-page-only",
      studentName: "Lucas Vance",
      studentId: "STU-8899",
      courseName: "Distributed Systems Architecture",
      courseCode: "CS-401",
      instructorName: "Dr. Eleanor Vance",
      assignmentTitle: "Distributed Consensus Protocols",
      universityName: "Stanford University",
      department: "School of Engineering",
      submissionDate: "October 28, 2026",
    };

    const headerHtml = generateAcademicIdentityHeaderHtml(
      meta,
      meta.assignmentTitle,
      meta.courseName,
      meta.studentName,
      meta.universityName,
      meta.submissionDate,
    );

    // Full student identity and course credentials are laid out cleanly on first body page
    expect(headerHtml).toContain("Lucas Vance");
    expect(headerHtml).toContain("STU-8899");
    expect(headerHtml).toContain("Distributed Systems Architecture");
    expect(headerHtml).toContain("Dr. Eleanor Vance");
    expect(headerHtml).toContain("School of Engineering");
  });

  it("renders group identity and all member credentials on first body page when placement is 'both'", () => {
    const meta: AssignmentMetadata = {
      ...getDefaultAssignmentMetadata(),
      isAssignment: true,
      assignmentType: "group",
      identityPlacement: "both",
      groupName: "Team Consensus Alpha",
      groupMembers: [
        { id: "m1", fullName: "Alice Smith", studentId: "STU-001", role: "Team Lead" },
        { id: "m2", fullName: "Bob Jones", studentId: "STU-002", role: "Researcher" },
      ],
      courseName: "Operating Systems",
      courseCode: "CS-301",
      instructorName: "Prof. Alan Turing",
      assignmentTitle: "Distributed File Systems & Raft",
      universityName: "MIT",
      submissionDate: "October 2026",
    };

    const headerHtml = generateAcademicIdentityHeaderHtml(
      meta,
      meta.assignmentTitle,
      meta.courseName,
      undefined,
      meta.universityName,
      meta.submissionDate,
    );

    expect(headerHtml).toContain("Team Consensus Alpha");
    expect(headerHtml).toContain("Alice Smith");
    expect(headerHtml).toContain("STU-001");
    expect(headerHtml).toContain("Team Lead");
    expect(headerHtml).toContain("Bob Jones");
    expect(headerHtml).toContain("STU-002");
    expect(headerHtml).toContain("Prof. Alan Turing");
  });

  it("omits group banner card from cover canvas elements when placement is 'first-body-page-only'", () => {
    const meta: AssignmentMetadata = {
      ...getDefaultAssignmentMetadata(),
      isAssignment: true,
      assignmentType: "group",
      identityPlacement: "first-body-page-only",
      groupName: "Alpha Phoenix",
      groupMembers: [{ id: "m1", fullName: "John Doe", studentId: "STU-1" }],
      courseName: "Software Engineering",
      instructorName: "Prof. Smith",
    };

    const elements = generateCoverElements("classic-university", meta);
    const hasGroupCard = elements.some((el) => el.id === "group-banner-card");
    expect(hasGroupCard).toBe(false);
  });
});
