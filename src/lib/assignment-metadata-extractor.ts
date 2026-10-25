/**
 * DocuMind Deterministic Academic Assignment Metadata Extractor
 * Scans unformatted or uploaded document text to discover student credentials,
 * course details, instructors, university identifiers, and submission terms.
 * Never silently replaces user input; surfaces suggestions for confirmation.
 */

import type { StudentMember } from "./assignment-types";

export interface ExtractedAssignmentSuggestions {
  hasSuggestions: boolean;
  studentName?: string;
  studentId?: string;
  courseName?: string;
  courseCode?: string;
  instructorName?: string;
  universityName?: string;
  department?: string;
  collegeOrFaculty?: string;
  academicYear?: string;
  semester?: string;
  submissionDate?: string;
  assignmentTitle?: string;
  groupMembers?: StudentMember[];
}

export function extractAssignmentMetadataFromText(text: string): ExtractedAssignmentSuggestions {
  const suggestions: ExtractedAssignmentSuggestions = {
    hasSuggestions: false,
  };

  if (!text || text.trim().length === 0) {
    return suggestions;
  }

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Group members list candidate collector
  const groupMembers: StudentMember[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // 1. Student Full Name
    if (!suggestions.studentName) {
      const nameMatch = line.match(
        /^(?:Student(?:\s*Name)?|Submitted\s*By|Author|Name)\s*[:=–—]\s*([A-Za-z\s.'-]{3,60})$/i,
      );
      if (nameMatch && nameMatch[1]) {
        const val = nameMatch[1].trim();
        if (!/^(university|college|department|course|dr|prof)/i.test(val)) {
          suggestions.studentName = val;
          suggestions.hasSuggestions = true;
        }
      }
    }

    // 2. Student ID / Matriculation / Roll Number
    if (!suggestions.studentId) {
      const idMatch = line.match(
        /^(?:Student\s*ID|ID\s*Number|Matric(?:ulation)?(?:\s*No|\s*Number)?|Roll\s*(?:No|Number)|Registration\s*No|ID)\s*[:=–—]\s*([A-Za-z0-9\-_/]{3,30})$/i,
      );
      if (idMatch && idMatch[1]) {
        suggestions.studentId = idMatch[1].trim();
        suggestions.hasSuggestions = true;
      }
    }

    // 3. Course Name & Course Code
    if (!suggestions.courseName) {
      const courseMatch = line.match(
        /^(?:Course(?:\s*Name|\s*Title)?|Subject|Module)\s*[:=–—]\s*(.{3,80})$/i,
      );
      if (courseMatch && courseMatch[1]) {
        suggestions.courseName = courseMatch[1].trim();
        suggestions.hasSuggestions = true;
      } else {
        // Direct pattern like "CS 401: Distributed Systems" or "ECON 1010A — Principles of Microeconomics"
        const directCourse = line.match(
          /^([A-Z]{2,5}\s*[-]?\s*\d{2,5}[A-Za-z]?)\s*[:–—-]\s*([A-Za-z0-9\s,&'-]{3,80})$/i,
        );
        if (directCourse && directCourse[1] && directCourse[2]) {
          suggestions.courseCode = directCourse[1].trim();
          suggestions.courseName = line.trim();
          suggestions.hasSuggestions = true;
        }
      }
    }

    // Course Code
    if (!suggestions.courseCode) {
      const codeMatch = line.match(
        /^(?:Course\s*Code|Module\s*Code|Subject\s*Code|Code)\s*[:=–—]\s*([A-Za-z]{2,5}\s*[-]?\s*\d{2,5}[A-Za-z]?)$/i,
      );
      if (codeMatch && codeMatch[1]) {
        suggestions.courseCode = codeMatch[1].trim().replace(/\s+/g, "");
        suggestions.hasSuggestions = true;
      } else {
        const inlineCode = line.match(/\b([A-Z]{2,5}\s*[-]?\s*\d{2,5}[A-Za-z]?)\b/);
        if (inlineCode && inlineCode[1] && (line.toLowerCase().includes("course") || line.toLowerCase().includes("econ") || line.toLowerCase().includes("cs"))) {
          suggestions.courseCode = inlineCode[1].trim().replace(/\s+/g, "");
          suggestions.hasSuggestions = true;
        }
      }
    }

    // 4. Instructor / Professor
    if (!suggestions.instructorName) {
      const instMatch = line.match(
        /^(?:Submitted\s*To|Instructor|Professor|Teacher|Lecturer|Faculty\s*Advisor|Evaluator)\s*[:=–—]\s*([A-Za-z\s.'-]{3,60})$/i,
      );
      if (instMatch && instMatch[1]) {
        suggestions.instructorName = instMatch[1].trim();
        suggestions.hasSuggestions = true;
      } else if (/^(?:Prof\.|Dr\.)\s+[A-Za-z\s.'-]{3,40}$/i.test(line)) {
        suggestions.instructorName = line.trim();
        suggestions.hasSuggestions = true;
      }
    }

    // 5. University Name
    if (!suggestions.universityName) {
      const uniMatch = line.match(
        /^(?:University(?:\s*Name)?|Institution|Academy|College)\s*[:=–—]\s*(.{4,80})$/i,
      );
      if (uniMatch && uniMatch[1]) {
        suggestions.universityName = uniMatch[1].trim();
        suggestions.hasSuggestions = true;
      } else if (
        /\b(?:University|College|Institute of Technology|Polytechnic)\b/i.test(line) &&
        line.length < 80 &&
        !line.includes(":") &&
        !line.includes("http")
      ) {
        suggestions.universityName = line.trim();
        suggestions.hasSuggestions = true;
      }
    }

    // 6. Department & College / Faculty
    if (!suggestions.department) {
      const deptMatch = line.match(
        /^(?:Department(?:\s*of)?|Dept\.?|Division)\s*[:=–—]\s*(.{4,80})$/i,
      );
      if (deptMatch && deptMatch[1]) {
        suggestions.department = deptMatch[1].trim();
        suggestions.hasSuggestions = true;
      } else if (/^Department\s+of\s+[A-Za-z\s&'-]{4,60}$/i.test(line)) {
        suggestions.department = line.trim();
        suggestions.hasSuggestions = true;
      }
    }

    if (!suggestions.collegeOrFaculty) {
      const facMatch = line.match(
        /^(?:Faculty(?:\s*of)?|College(?:\s*of)?|School(?:\s*of)?)\s*[:=–—]\s*(.{4,80})$/i,
      );
      if (facMatch && facMatch[1]) {
        suggestions.collegeOrFaculty = facMatch[1].trim();
        suggestions.hasSuggestions = true;
      } else if (/^(?:Faculty|College|School)\s+of\s+[A-Za-z\s&'-]{4,60}$/i.test(line)) {
        suggestions.collegeOrFaculty = line.trim();
        suggestions.hasSuggestions = true;
      }
    }

    // 7. Academic Year & Semester
    if (!suggestions.academicYear) {
      const yearMatch = line.match(
        /^(?:Academic\s*Year|Study\s*Year|Year)\s*[:=–—]\s*(\d{4}\s*[-–/]\s*\d{2,4}|\d{4})$/i,
      );
      if (yearMatch && yearMatch[1]) {
        suggestions.academicYear = yearMatch[1].trim();
        suggestions.hasSuggestions = true;
      } else {
        const directYear = line.match(/\b(20\d{2}\s*[-–/]\s*20\d{2}|20\d{2}\s*[-–/]\s*\d{2})\b/);
        if (directYear && directYear[1]) {
          suggestions.academicYear = directYear[1].trim();
          suggestions.hasSuggestions = true;
        }
      }
    }

    if (!suggestions.semester) {
      const semMatch = line.match(
        /^(?:Semester|Term)\s*[:=–—]\s*([A-Za-z0-9\s]{2,30})$/i,
      );
      if (semMatch && semMatch[1]) {
        suggestions.semester = semMatch[1].trim();
        suggestions.hasSuggestions = true;
      } else {
        const directSem = line.match(/\b(Fall|Spring|Summer|Winter)\s+(20\d{2}|\d{1})\b/i);
        if (directSem && directSem[0]) {
          suggestions.semester = directSem[0].trim();
          suggestions.hasSuggestions = true;
        }
      }
    }

    // 8. Submission Date
    if (!suggestions.submissionDate) {
      const dateMatch = line.match(
        /^(?:Submission\s*Date|Submitted\s*On|Due\s*Date|Date)\s*[:=–—]\s*([A-Za-z0-9,\s/-]{4,40})$/i,
      );
      if (dateMatch && dateMatch[1]) {
        suggestions.submissionDate = dateMatch[1].trim();
        suggestions.hasSuggestions = true;
      }
    }

    // 9. Assignment Title
    if (!suggestions.assignmentTitle) {
      const titleMatch = line.match(
        /^(?:Assignment\s*Title|Title|Topic|Project\s*Title)\s*[:=–—]\s*(.{4,100})$/i,
      );
      if (titleMatch && titleMatch[1]) {
        suggestions.assignmentTitle = titleMatch[1].trim();
        suggestions.hasSuggestions = true;
      } else if (
        /^(?:Assignment\s+\d+|Midterm\s+Assignment|Final\s+Project|Case\s+Study|Lab\s+Report)\s*[:–—-]\s*(.{4,100})$/i.test(
          line,
        )
      ) {
        const m = line.match(
          /^(?:Assignment\s+\d+|Midterm\s+Assignment|Final\s+Project|Case\s+Study|Lab\s+Report)\s*[:–—-]\s*(.{4,100})$/i,
        );
        if (m && m[1]) {
          suggestions.assignmentTitle = m[1].trim();
          suggestions.hasSuggestions = true;
        }
      }
    }

    // 10. Repeatable Group Member detection: e.g. "John Doe - ID 12345" or "1. Jane Smith (CS-4019)"
    const memberMatch = line.match(
      /^(?:\d+[.)]\s*|-|\*)?\s*([A-Za-z\s.'-]{3,40})\s*[-–—(:\s]\s*(?:ID[:\s]*)?([A-Za-z0-9\-_/]{3,20})\)?$/i,
    );
    if (memberMatch && memberMatch[1] && memberMatch[2]) {
      const name = memberMatch[1].trim();
      const id = memberMatch[2].trim();
      if (
        !/^(fall|spring|summer|winter|university|department|assignment|problem|submitted|instructor)/i.test(
          name,
        ) &&
        !groupMembers.some((m) => m.fullName === name || m.studentId === id)
      ) {
        groupMembers.push({
          id: `extracted-${groupMembers.length + 1}`,
          fullName: name,
          studentId: id,
        });
      }
    }
  }

  if (groupMembers.length >= 2) {
    suggestions.groupMembers = groupMembers;
    suggestions.hasSuggestions = true;
  }

  return suggestions;
}

export function formatStudentMemberDisplay(member: StudentMember): string {
  if (!member.studentId) return member.fullName;
  return `${member.fullName} (${member.studentId})`;
}
