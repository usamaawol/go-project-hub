/**
 * DocuMind Universal Cover-Page Template Registry & Canvas Schema
 * Contains 52+ distinct, editable cover-page templates spanning 8 categories:
 * Academic, Modern, Formal, Research, Business, Minimalist, Geometric, and Creative.
 * Compatible with A4 and Letter page geometry.
 */

import type {
  AssignmentMetadata,
  CoverTemplateDefinition,
  CanvasCoverElement,
} from "./assignment-types";

export type TemplateCategory =
  | "All"
  | "Academic"
  | "Modern"
  | "Formal"
  | "Research"
  | "Business"
  | "Minimalist"
  | "Geometric"
  | "Creative";

export interface ExtendedCoverTemplateDefinition extends CoverTemplateDefinition {
  secondaryColor?: string;
  backgroundColor?: string;
  tags?: string[];
  generateElements?: (
    metadata: AssignmentMetadata,
    pageWidth?: number,
    pageHeight?: number,
  ) => CanvasCoverElement[];
}

// Standard A4 Canvas Dimensions (px at 96 DPI)
export const CANVAS_A4_WIDTH = 794;
export const CANVAS_A4_HEIGHT = 1123;
export const CANVAS_LETTER_WIDTH = 816;
export const CANVAS_LETTER_HEIGHT = 1056;

/**
 * Universal element generator that populates standard cover elements
 * customized to the specific visual geometry, typography, and color tokens of each template.
 */
export function generateDefaultCoverElements(
  template: ExtendedCoverTemplateDefinition,
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  if (template.generateElements) {
    return template.generateElements(meta, pageW, pageH);
  }

  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;

  const accent = meta.accentColor || template.defaultAccent || "#1E3A8A";
  const secondary = template.secondaryColor || "#475569";
  const isGroup = meta.assignmentType === "group";
  const groupName = meta.groupName?.trim();
  const showGroupOnCover = isGroup && meta.groupNamePlacement !== "first-body-page" && meta.identityPlacement !== "first-body-page-only";

  const title =
    meta.assignmentTitle?.trim() ||
    (isGroup ? "Group Project & Analytical Report" : "Individual Academic Course Assignment");

  const course = meta.courseName?.trim() || "Course Title & Specification";
  const courseCode = meta.courseCode?.trim() || "";
  const instructor = meta.instructorName?.trim() || "Instructor / Professor";
  const university = meta.universityName?.trim() || "University or Academic Institution";
  const department = meta.department?.trim() || "";
  const faculty = meta.collegeOrFaculty?.trim() || "";
  const submissionDate = meta.submissionDate?.trim() || new Date().toISOString().split("T")[0];
  const academicYear = meta.academicYear?.trim() || "";
  const semester = meta.semester?.trim() || "";
  const logo = meta.logoDataUrl;

  const font = template.fontFamily || "Inter, sans-serif";
  const isSerif = font.toLowerCase().includes("serif") || font.toLowerCase().includes("georgia") || font.toLowerCase().includes("playfair");

  // Background / Canvas Base Fill
  elements.push({
    id: "canvas-bg",
    type: "shape",
    name: "Page Background",
    shapeType: "rectangle",
    x: 0,
    y: 0,
    width: pageW,
    height: pageH,
    fillColor: template.backgroundColor || "#FFFFFF",
    borderColor: "transparent",
    borderWidth: 0,
    zIndex: zIndex++,
  });

  // Border & Decorative Frames based on template archetype
  if (template.borderStyle === "double") {
    elements.push({
      id: "frame-outer",
      type: "shape",
      name: "Outer Border Frame",
      shapeType: "rectangle",
      x: 36,
      y: 36,
      width: pageW - 72,
      height: pageH - 72,
      fillColor: "transparent",
      borderColor: accent,
      borderWidth: 3,
      zIndex: zIndex++,
    });
    elements.push({
      id: "frame-inner",
      type: "shape",
      name: "Inner Border Rule",
      shapeType: "rectangle",
      x: 44,
      y: 44,
      width: pageW - 88,
      height: pageH - 88,
      fillColor: "transparent",
      borderColor: accent,
      borderWidth: 1,
      opacity: 0.5,
      zIndex: zIndex++,
    });
  } else if (template.borderStyle === "frame") {
    elements.push({
      id: "frame-single",
      type: "shape",
      name: "Perimeter Frame",
      shapeType: "rectangle",
      x: 36,
      y: 36,
      width: pageW - 72,
      height: pageH - 72,
      fillColor: "transparent",
      borderColor: accent,
      borderWidth: 2,
      borderRadius: 4,
      zIndex: zIndex++,
    });
  } else if (template.borderStyle === "accent-bar") {
    elements.push({
      id: "accent-spine",
      type: "shape",
      name: "Vertical Accent Spine",
      shapeType: "rectangle",
      x: 0,
      y: 0,
      width: 24,
      height: pageH,
      fillColor: accent,
      borderColor: "transparent",
      borderWidth: 0,
      zIndex: zIndex++,
    });
    elements.push({
      id: "accent-spine-sub",
      type: "shape",
      name: "Spine Pinstripe",
      shapeType: "rectangle",
      x: 28,
      y: 0,
      width: 4,
      height: pageH,
      fillColor: secondary,
      borderColor: "transparent",
      borderWidth: 0,
      opacity: 0.6,
      zIndex: zIndex++,
    });
  } else if (template.borderStyle === "asymmetric") {
    elements.push({
      id: "header-banner",
      type: "shape",
      name: "Executive Header Banner",
      shapeType: "rectangle",
      x: 0,
      y: 0,
      width: pageW,
      height: 190,
      fillColor: accent,
      borderColor: "transparent",
      borderWidth: 0,
      zIndex: zIndex++,
    });
  } else if (template.borderStyle === "grid") {
    elements.push({
      id: "grid-header-card",
      type: "shape",
      name: "Header Matrix Card",
      shapeType: "rounded-card",
      x: 48,
      y: 48,
      width: pageW - 96,
      height: 110,
      fillColor: "#F8FAFC",
      borderColor: "#E2E8F0",
      borderWidth: 1,
      borderRadius: 8,
      zIndex: zIndex++,
    });
  }

  // Canva-Grade Category Vector Geometries (Dynamic SVGs, Wedges & Matrices)
  const cat = template.category || "Academic";

  if (cat === "Academic" || template.borderStyle === "frame" || template.borderStyle === "double") {
    // 1. Top-Left Heraldic Corner Accent Wedge
    elements.push({
      id: "accent-tl-anchor",
      type: "shape",
      name: "Top-Left Corner Wedge",
      shapeType: "svg",
      x: 0,
      y: 0,
      width: 75,
      height: 75,
      fillColor: accent,
      svgContent: `<svg viewBox="0 0 75 75" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 75,0 0,75" fill="${accent}" /><polygon points="0,0 45,0 0,45" fill="${secondary}" opacity="0.4" /></svg>`,
      zIndex: zIndex++,
    });

    // 2. Bottom-Right Collegiate Anchor Wedge
    elements.push({
      id: "accent-br-anchor",
      type: "shape",
      name: "Bottom-Right Corner Anchor",
      shapeType: "svg",
      x: pageW - 75,
      y: pageH - 75,
      width: 75,
      height: 75,
      fillColor: accent,
      svgContent: `<svg viewBox="0 0 75 75" width="100%" height="100%" preserveAspectRatio="none"><polygon points="75,0 75,75 0,75" fill="${accent}" /><polygon points="75,30 75,75 30,75" fill="${secondary}" opacity="0.4" /></svg>`,
      zIndex: zIndex++,
    });

    // 3. Dot Matrix Accent
    elements.push({
      id: "accent-dot-matrix",
      type: "shape",
      name: "Collegiate Dot Accent",
      shapeType: "svg",
      x: pageW - 65,
      y: 90,
      width: 28,
      height: 60,
      fillColor: accent,
      svgContent: `<svg viewBox="0 0 28 60" width="100%" height="100%"><circle cx="6" cy="8" r="2.5" fill="${accent}" opacity="0.7"/><circle cx="20" cy="8" r="2.5" fill="${accent}" opacity="0.7"/><circle cx="6" cy="24" r="2.5" fill="${accent}" opacity="0.7"/><circle cx="20" cy="24" r="2.5" fill="${accent}" opacity="0.7"/><circle cx="6" cy="40" r="2.5" fill="${accent}" opacity="0.7"/><circle cx="20" cy="40" r="2.5" fill="${accent}" opacity="0.7"/></svg>`,
      zIndex: zIndex++,
    });
  } else if (cat === "Modern" || cat === "Geometric") {
    elements.push({
      id: "accent-tr-wedge",
      type: "shape",
      name: "Top-Right Angle Polygon",
      shapeType: "svg",
      x: pageW - 200,
      y: 0,
      width: 200,
      height: 180,
      fillColor: accent,
      svgContent: `<svg viewBox="0 0 200 180" width="100%" height="100%" preserveAspectRatio="none"><polygon points="50,0 200,0 200,180 0,0" fill="${accent}" /><polygon points="120,0 200,0 200,120" fill="${secondary}" opacity="0.5" /></svg>`,
      zIndex: zIndex++,
    });

    elements.push({
      id: "accent-bl-wedge",
      type: "shape",
      name: "Bottom-Left Angle Wedge",
      shapeType: "svg",
      x: 0,
      y: pageH - 120,
      width: 120,
      height: 120,
      fillColor: accent,
      svgContent: `<svg viewBox="0 0 120 120" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 0,120 120,120" fill="${accent}" /></svg>`,
      zIndex: zIndex++,
    });

    elements.push({
      id: "accent-dot-matrix",
      type: "shape",
      name: "Modern Dot Matrix Grid",
      shapeType: "svg",
      x: pageW - 60,
      y: 200,
      width: 30,
      height: 80,
      fillColor: secondary,
      svgContent: `<svg viewBox="0 0 30 80" width="100%" height="100%"><circle cx="7" cy="8" r="3" fill="${secondary}" opacity="0.8"/><circle cx="21" cy="8" r="3" fill="${secondary}" opacity="0.8"/><circle cx="7" cy="24" r="3" fill="${secondary}" opacity="0.8"/><circle cx="21" cy="24" r="3" fill="${secondary}" opacity="0.8"/><circle cx="7" cy="40" r="3" fill="${secondary}" opacity="0.8"/><circle cx="21" cy="40" r="3" fill="${secondary}" opacity="0.8"/><circle cx="7" cy="56" r="3" fill="${secondary}" opacity="0.8"/><circle cx="21" cy="56" r="3" fill="${secondary}" opacity="0.8"/><circle cx="7" cy="72" r="3" fill="${secondary}" opacity="0.8"/><circle cx="21" cy="72" r="3" fill="${secondary}" opacity="0.8"/></svg>`,
      zIndex: zIndex++,
    });
  } else if (cat === "Business" || cat === "Formal") {
    elements.push({
      id: "accent-top-ribbon",
      type: "shape",
      name: "Executive Diagonal Ribbon",
      shapeType: "svg",
      x: 0,
      y: 0,
      width: 220,
      height: 130,
      fillColor: accent,
      svgContent: `<svg viewBox="0 0 220 130" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 220,0 120,130 0,130" fill="${accent}" /><polygon points="120,130 150,130 220,0 190,0" fill="${secondary}" opacity="0.85" /></svg>`,
      zIndex: zIndex++,
    });

    elements.push({
      id: "accent-br-angle",
      type: "shape",
      name: "Bottom-Right Executive Wedge",
      shapeType: "svg",
      x: pageW - 160,
      y: pageH - 120,
      width: 160,
      height: 120,
      fillColor: accent,
      svgContent: `<svg viewBox="0 0 160 120" width="100%" height="100%" preserveAspectRatio="none"><polygon points="60,0 160,120 0,120" fill="${accent}" /></svg>`,
      zIndex: zIndex++,
    });
  } else if (cat === "Research") {
    elements.push({
      id: "accent-circuit-angle",
      type: "shape",
      name: "Technical Blueprint Angle",
      shapeType: "svg",
      x: 0,
      y: 0,
      width: 150,
      height: 150,
      fillColor: accent,
      svgContent: `<svg viewBox="0 0 150 150" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 150,0 0,150" fill="${accent}" opacity="0.9" /><circle cx="40" cy="40" r="4" fill="#FFFFFF" /><line x1="40" y1="40" x2="100" y2="40" stroke="#FFFFFF" stroke-width="2" /><circle cx="100" cy="40" r="3" fill="#FFFFFF" /></svg>`,
      zIndex: zIndex++,
    });

    elements.push({
      id: "accent-dot-matrix",
      type: "shape",
      name: "STEM Data Matrix",
      shapeType: "svg",
      x: pageW - 75,
      y: 100,
      width: 36,
      height: 70,
      fillColor: accent,
      svgContent: `<svg viewBox="0 0 36 70" width="100%" height="100%"><circle cx="6" cy="8" r="2.5" fill="${accent}"/><circle cx="18" cy="8" r="2.5" fill="${accent}"/><circle cx="30" cy="8" r="2.5" fill="${accent}"/><circle cx="6" cy="24" r="2.5" fill="${accent}"/><circle cx="18" cy="24" r="2.5" fill="${accent}"/><circle cx="30" cy="24" r="2.5" fill="${accent}"/><circle cx="6" cy="40" r="2.5" fill="${accent}"/><circle cx="18" cy="40" r="2.5" fill="${accent}"/><circle cx="30" cy="40" r="2.5" fill="${accent}"/></svg>`,
      zIndex: zIndex++,
    });
  } else if (cat === "Creative") {
    elements.push({
      id: "accent-creative-wave",
      type: "shape",
      name: "Creative Wave Fluid Ribbon",
      shapeType: "svg",
      x: pageW - 260,
      y: 0,
      width: 260,
      height: 220,
      fillColor: accent,
      svgContent: `<svg viewBox="0 0 260 220" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 C 100,60 180,140 260,220 L 260,0 Z" fill="${accent}" /><path d="M 40,0 C 120,70 190,160 260,240 L 260,0 Z" fill="${secondary}" opacity="0.6" /></svg>`,
      zIndex: zIndex++,
    });
  } else if (cat === "Minimalist") {
    elements.push({
      id: "accent-minimal-frame",
      type: "shape",
      name: "Minimalist Architectural Line",
      shapeType: "svg",
      x: 48,
      y: 48,
      width: 80,
      height: 80,
      fillColor: accent,
      svgContent: `<svg viewBox="0 0 80 80" width="100%" height="100%"><line x1="0" y1="0" x2="80" y2="0" stroke="${accent}" stroke-width="3" /><line x1="0" y1="0" x2="0" y2="80" stroke="${accent}" stroke-width="3" /></svg>`,
      zIndex: zIndex++,
    });
  }

  // Logo / University Crest Element
  if (logo) {
    const logoX =
      template.logoPosition === "top-left"
        ? 60
        : template.logoPosition === "sidebar"
          ? 48
          : pageW / 2 - 60;
    const logoY = template.borderStyle === "asymmetric" ? 36 : 60;

    elements.push({
      id: "cover-logo",
      type: "image",
      name: "Institutional Logo",
      x: logoX,
      y: logoY,
      width: 120,
      height: 64,
      imageUrl: logo,
      imageFit: "contain",
      zIndex: zIndex++,
    });
  }

  // University Header Text
  const univY = logo ? 134 : 68;
  const univAlign = template.metadataLayout === "left-stacked" ? "left" : "center";
  const univX = univAlign === "left" ? 64 : 48;
  const univW = univAlign === "left" ? pageW - 128 : pageW - 96;

  elements.push({
    id: "text-university",
    type: "text",
    name: "University Name",
    x: univX,
    y: univY,
    width: univW,
    height: 32,
    text: university.toUpperCase(),
    fontFamily: font,
    fontSize: 14,
    fontWeight: "700",
    textAlign: univAlign,
    textColor: template.borderStyle === "asymmetric" && !logo ? "#FFFFFF" : accent,
    letterSpacing: 2,
    textTransform: "uppercase",
    isMetadataField: "universityName",
    zIndex: zIndex++,
  });

  if (faculty || department) {
    elements.push({
      id: "text-department",
      type: "text",
      name: "Faculty & Department",
      x: univX,
      y: univY + 28,
      width: univW,
      height: 24,
      text: [faculty, department].filter(Boolean).join(" • "),
      fontFamily: font,
      fontSize: 11,
      fontWeight: "500",
      textAlign: univAlign,
      textColor: template.borderStyle === "asymmetric" && !logo ? "#E2E8F0" : secondary,
      zIndex: zIndex++,
    });
  }

  // Dividing Rule / Divider Line under header
  elements.push({
    id: "header-divider",
    type: "divider",
    name: "Header Accent Rule",
    x: univAlign === "left" ? 64 : pageW / 2 - 60,
    y: univY + (faculty || department ? 60 : 42),
    width: univAlign === "left" ? 180 : 120,
    height: 3,
    fillColor: accent,
    zIndex: zIndex++,
  });

  // Course Code Pill / Badge (if provided)
  const titleStartY = 330;
  if (courseCode) {
    elements.push({
      id: "badge-course-code",
      type: "badge",
      name: "Course Code Badge",
      shapeType: "badge-pill",
      x: univAlign === "left" ? 64 : pageW / 2 - 50,
      y: titleStartY - 38,
      width: 100,
      height: 26,
      fillColor: accent,
      borderRadius: 13,
      zIndex: zIndex++,
    });
    elements.push({
      id: "text-course-code",
      type: "text",
      name: "Course Code Text",
      x: univAlign === "left" ? 64 : pageW / 2 - 50,
      y: titleStartY - 34,
      width: 100,
      height: 20,
      text: courseCode,
      fontFamily: "monospace",
      fontSize: 11,
      fontWeight: "700",
      textAlign: "center",
      textColor: "#FFFFFF",
      zIndex: zIndex++,
    });
  }

  // Main Assignment Title
  elements.push({
    id: "text-assignment-title",
    type: "text",
    name: "Assignment Title",
    x: univAlign === "left" ? 64 : 60,
    y: titleStartY,
    width: pageW - 128,
    height: 90,
    text: title,
    fontFamily: font,
    fontSize: isSerif ? 26 : 24,
    fontWeight: "800",
    textAlign: univAlign,
    textColor: "#0F172A",
    lineHeight: 1.25,
    isMetadataField: "assignmentTitle",
    zIndex: zIndex++,
  });

  // Course Name Subtitle
  elements.push({
    id: "text-course-name",
    type: "text",
    name: "Course Name",
    x: univAlign === "left" ? 64 : 60,
    y: titleStartY + 96,
    width: pageW - 128,
    height: 30,
    text: `Course: ${course}`,
    fontFamily: font,
    fontSize: 13,
    fontWeight: "600",
    fontStyle: isSerif ? "italic" : "normal",
    textAlign: univAlign,
    textColor: secondary,
    isMetadataField: "courseName",
    zIndex: zIndex++,
  });

  // Group Name Banner / Header (If Group Assignment and Option A selected)
  if (showGroupOnCover && groupName) {
    elements.push({
      id: "group-banner-card",
      type: "shape",
      name: "Group Name Container",
      shapeType: "rounded-card",
      x: univAlign === "left" ? 64 : pageW / 2 - 160,
      y: titleStartY + 140,
      width: univAlign === "left" ? 340 : 320,
      height: 40,
      fillColor: "#F1F5F9",
      borderColor: accent,
      borderWidth: 1.5,
      borderRadius: 6,
      zIndex: zIndex++,
    });
    elements.push({
      id: "text-group-name",
      type: "text",
      name: "Group Name",
      x: univAlign === "left" ? 64 : pageW / 2 - 160,
      y: titleStartY + 148,
      width: univAlign === "left" ? 340 : 320,
      height: 24,
      text: `TEAM: ${groupName.toUpperCase()}`,
      fontFamily: font,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "center",
      textColor: accent,
      letterSpacing: 1,
      isMetadataField: "groupName",
      zIndex: zIndex++,
    });
  }

  // Student Section / Group Members Directory
  const studentStartY = titleStartY + (showGroupOnCover && groupName ? 200 : 160);

  if (isGroup) {
    const members = meta.groupMembers || [];
    elements.push({
      id: "card-group-directory",
      type: "shape",
      name: "Group Directory Container",
      shapeType: "rounded-card",
      x: 60,
      y: studentStartY,
      width: pageW - 120,
      height: Math.min(180, Math.max(90, members.length * 36 + 48)),
      fillColor: "#FAFAFA",
      borderColor: "#E2E8F0",
      borderWidth: 1,
      borderRadius: 8,
      zIndex: zIndex++,
    });

    elements.push({
      id: "text-group-header",
      type: "text",
      name: "Group Directory Header",
      x: 80,
      y: studentStartY + 12,
      width: pageW - 160,
      height: 20,
      text: "GROUP PROJECT MEMBERS",
      fontFamily: font,
      fontSize: 10,
      fontWeight: "700",
      textColor: accent,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      zIndex: zIndex++,
    });

    members.slice(0, 6).forEach((m, idx) => {
      const rowY = studentStartY + 38 + idx * 24;
      elements.push({
        id: `text-member-${idx}`,
        type: "text",
        name: `Member ${idx + 1}`,
        x: 80,
        y: rowY,
        width: pageW - 160,
        height: 22,
        text: `${idx + 1}. ${m.fullName || "Student Name"}  —  ID: ${m.studentId || "N/A"}`,
        fontFamily: font,
        fontSize: 11,
        fontWeight: "500",
        textColor: "#1E293B",
        zIndex: zIndex++,
      });
    });
  } else {
    // Individual Student Section (Clean Typography, No Clunky Boxes)
    elements.push({
      id: "text-submitted-by-label",
      type: "text",
      name: "Submitted By Label",
      x: univAlign === "left" ? 64 : pageW / 2 - 140,
      y: studentStartY,
      width: 280,
      height: 18,
      text: "SUBMITTED BY",
      fontFamily: font,
      fontSize: 9,
      fontWeight: "700",
      textAlign: univAlign,
      textColor: accent,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      zIndex: zIndex++,
    });

    elements.push({
      id: "text-student-name",
      type: "text",
      name: "Student Full Name",
      x: univAlign === "left" ? 64 : pageW / 2 - 140,
      y: studentStartY + 20,
      width: 280,
      height: 26,
      text: meta.studentName?.trim() || "Student Full Name",
      fontFamily: font,
      fontSize: 15,
      fontWeight: "700",
      textAlign: univAlign,
      textColor: "#0F172A",
      isMetadataField: "studentName",
      zIndex: zIndex++,
    });

    if (meta.studentId?.trim()) {
      elements.push({
        id: "text-student-id",
        type: "text",
        name: "Student ID",
        x: univAlign === "left" ? 64 : pageW / 2 - 140,
        y: studentStartY + 48,
        width: 280,
        height: 20,
        text: `ID: ${meta.studentId.trim()}`,
        fontFamily: "monospace",
        fontSize: 11,
        fontWeight: "600",
        textAlign: univAlign,
        textColor: secondary,
        isMetadataField: "studentId",
        zIndex: zIndex++,
      });
    }
  }

  // Footer Metadata Block (Instructor, Academic Year, Date)
  const footerY = pageH - 150;
  elements.push({
    id: "footer-divider-rule",
    type: "divider",
    name: "Footer Separator",
    x: 60,
    y: footerY,
    width: pageW - 120,
    height: 1,
    fillColor: "#E2E8F0",
    zIndex: zIndex++,
  });

  elements.push({
    id: "text-instructor",
    type: "text",
    name: "Instructor Name",
    x: 60,
    y: footerY + 16,
    width: (pageW - 120) / 2,
    height: 38,
    text: `Submitted to: ${instructor}`,
    fontFamily: font,
    fontSize: 11,
    fontWeight: "600",
    textColor: "#334155",
    isMetadataField: "instructorName",
    zIndex: zIndex++,
  });

  const academicInfo = [academicYear, semester].filter(Boolean).join(" · ");
  elements.push({
    id: "text-submission-date",
    type: "text",
    name: "Submission Date & Year",
    x: 60 + (pageW - 120) / 2,
    y: footerY + 16,
    width: (pageW - 120) / 2,
    height: 38,
    text: [submissionDate && `Date: ${submissionDate}`, academicInfo].filter(Boolean).join("\n"),
    fontFamily: font,
    fontSize: 10,
    fontWeight: "500",
    textAlign: "right",
    textColor: secondary,
    zIndex: zIndex++,
  });

  return elements;
}

// -------------------------------------------------------------
// CANVA ARCHETYPE GENERATORS (Direct Canva Design Fidelity)
// -------------------------------------------------------------

export function generateCanvaSalfordWave(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;

  const navy = meta.accentColor || "#1B365D";
  const yellow = "#F59E0B";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Project Team")
    : (meta.studentName || "Benjamin Shah");

  const brand = meta.universityName || meta.department || "Salford & Co.";
  const title = meta.assignmentTitle || "Project Proposal";
  const year = meta.academicYear || "2026";
  const subtitle = meta.courseName || meta.courseCode || "Delivering innovative solutions for modern infrastructure";

  // 1. Crisp White Background
  elements.push({
    id: "canvas-bg",
    type: "shape",
    name: "Page Background",
    shapeType: "rectangle",
    x: 0,
    y: 0,
    width: pageW,
    height: pageH,
    fillColor: "#FFFFFF",
    borderColor: "transparent",
    borderWidth: 0,
    zIndex: zIndex++,
  });

  // 2. Top-Left Yellow Wave Underlay Ribbon
  elements.push({
    id: "salford-top-yellow",
    type: "shape",
    name: "Top Yellow Wave Ribbon",
    shapeType: "svg",
    x: 0,
    y: 0,
    width: 480,
    height: 220,
    fillColor: yellow,
    svgContent: `<svg viewBox="0 0 480 220" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 480,0 C 400,100 280,180 160,180 C 90,180 30,200 0,220 Z" fill="${yellow}" opacity="0.9" /></svg>`,
    zIndex: zIndex++,
  });

  // 3. Top-Left Deep Navy Fluid Wave Header
  elements.push({
    id: "salford-top-navy",
    type: "shape",
    name: "Top Navy Fluid Wave",
    shapeType: "svg",
    x: 0,
    y: 0,
    width: 450,
    height: 195,
    fillColor: navy,
    svgContent: `<svg viewBox="0 0 450 195" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 450,0 C 370,85 260,160 140,160 C 80,160 25,180 0,195 Z" fill="${navy}" /></svg>`,
    zIndex: zIndex++,
  });

  // 4. Top-Right Brand Pill Badge ("Salford & Co.")
  elements.push({
    id: "salford-brand-pill",
    type: "badge",
    name: "Brand Pill Badge",
    shapeType: "badge-pill",
    x: pageW - 220,
    y: 45,
    width: 160,
    height: 40,
    fillColor: navy,
    borderRadius: 20,
    zIndex: zIndex++,
  });

  elements.push({
    id: "salford-brand-text",
    type: "text",
    name: "Brand Label Text",
    x: pageW - 215,
    y: 54,
    width: 150,
    height: 22,
    text: brand,
    fontFamily: "Inter, Montserrat, sans-serif",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    textColor: "#FFFFFF",
    letterSpacing: 1,
    zIndex: zIndex++,
  });

  // 5. Title Area
  elements.push({
    id: "salford-title-main",
    type: "text",
    name: "Proposal Title",
    x: 80,
    y: 280,
    width: pageW - 160,
    height: 110,
    text: `${title} ${year}`,
    fontFamily: "Inter, Montserrat, sans-serif",
    fontSize: 48,
    fontWeight: "800",
    textColor: navy,
    lineHeight: 1.1,
    letterSpacing: -1,
    isMetadataField: "assignmentTitle",
    zIndex: zIndex++,
  });

  // 6. Subtitle / Course Description
  elements.push({
    id: "salford-subtitle",
    type: "text",
    name: "Proposal Subtitle",
    x: 80,
    y: 400,
    width: pageW - 160,
    height: 40,
    text: subtitle,
    fontFamily: "Inter, sans-serif",
    fontSize: 14,
    fontWeight: "500",
    textColor: "#64748B",
    zIndex: zIndex++,
  });

  // 7. Prepared by Metadata
  elements.push({
    id: "salford-meta-label",
    type: "text",
    name: "Prepared by Label",
    x: 80,
    y: 480,
    width: 320,
    height: 20,
    text: "Prepared by :",
    fontFamily: "Inter, sans-serif",
    fontSize: 13,
    fontWeight: "500",
    textColor: "#64748B",
    zIndex: zIndex++,
  });

  elements.push({
    id: "salford-meta-name",
    type: "text",
    name: "Author Name",
    x: 80,
    y: 505,
    width: 360,
    height: 32,
    text: author,
    fontFamily: "Inter, Montserrat, sans-serif",
    fontSize: 20,
    fontWeight: "800",
    textColor: navy,
    isMetadataField: "studentName",
    zIndex: zIndex++,
  });

  if (meta.studentId) {
    elements.push({
      id: "salford-meta-id",
      type: "text",
      name: "Student ID",
      x: 80,
      y: 540,
      width: 320,
      height: 22,
      text: `Student ID: ${meta.studentId}`,
      fontFamily: "monospace",
      fontSize: 12,
      fontWeight: "600",
      textColor: "#64748B",
      isMetadataField: "studentId",
      zIndex: zIndex++,
    });
  }

  if (meta.instructorName) {
    elements.push({
      id: "salford-meta-instructor",
      type: "text",
      name: "Submitted To Instructor",
      x: 80,
      y: meta.studentId ? 566 : 542,
      width: 360,
      height: 24,
      text: `Submitted to: ${meta.instructorName}`,
      fontFamily: "Inter, sans-serif",
      fontSize: 12,
      fontWeight: "600",
      textColor: "#475569",
      isMetadataField: "instructorName",
      zIndex: zIndex++,
    });
  }

  // 8. Bottom-Right Yellow Underlay Ribbon
  elements.push({
    id: "salford-br-yellow",
    type: "shape",
    name: "Bottom-Right Yellow Wave",
    shapeType: "svg",
    x: pageW - 380,
    y: pageH - 250,
    width: 380,
    height: 250,
    fillColor: yellow,
    svgContent: `<svg viewBox="0 0 380 250" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,250 C 130,250 210,160 380,80 L 380,250 Z" fill="${yellow}" opacity="0.9" /></svg>`,
    zIndex: zIndex++,
  });

  // 9. Bottom-Right Deep Navy Fluid Curve
  elements.push({
    id: "salford-br-navy",
    type: "shape",
    name: "Bottom-Right Navy Fluid Curve",
    shapeType: "svg",
    x: pageW - 350,
    y: pageH - 220,
    width: 350,
    height: 220,
    fillColor: navy,
    svgContent: `<svg viewBox="0 0 350 220" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,220 C 120,220 200,140 350,70 L 350,220 Z" fill="${navy}" /></svg>`,
    zIndex: zIndex++,
  });

  // 10. Footer Coordinates
  elements.push({
    id: "salford-footer-contact",
    type: "text",
    name: "Contact Information",
    x: 80,
    y: pageH - 120,
    width: 360,
    height: 55,
    text: "📞 +123-456-7890\n✉️ hello@reallygreatsite.com\n🌐 www.reallygreatsite.com",
    fontFamily: "Inter, sans-serif",
    fontSize: 11,
    fontWeight: "500",
    textColor: "#64748B",
    lineHeight: 1.5,
    zIndex: zIndex++,
  });

  return elements;
}

export function generateCanvaHanoverRedGeometric(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;

  const red = meta.accentColor || "#DC2626";
  const charcoal = "#1E293B";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Proposal Strategy Team")
    : (meta.studentName || "Eleanor Fitzgerald");

  const brand = meta.universityName || meta.department || "HANOVER CO";
  const title = meta.assignmentTitle || "STRATEGIC PROPOSAL";
  const subtitle = meta.courseName || meta.courseCode || "Delivering Results Through Innovation";
  const instructor = meta.instructorName || "Connor Hamilton";

  // 1. White Background
  elements.push({
    id: "canvas-bg",
    type: "shape",
    name: "Page Background",
    shapeType: "rectangle",
    x: 0,
    y: 0,
    width: pageW,
    height: pageH,
    fillColor: "#FFFFFF",
    borderColor: "transparent",
    borderWidth: 0,
    zIndex: zIndex++,
  });

  // 2. Left Edge Red Facet Wedge
  elements.push({
    id: "hanover-left-red-top",
    type: "shape",
    name: "Top-Left Red Facet",
    shapeType: "svg",
    x: 0,
    y: 0,
    width: 140,
    height: 320,
    fillColor: red,
    svgContent: `<svg viewBox="0 0 140 320" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 140,0 45,320 0,320" fill="${red}" /></svg>`,
    zIndex: zIndex++,
  });

  // 3. Left Edge Charcoal Facet Polygon
  elements.push({
    id: "hanover-left-charcoal",
    type: "shape",
    name: "Left Charcoal Facet",
    shapeType: "svg",
    x: 0,
    y: 280,
    width: 120,
    height: 280,
    fillColor: charcoal,
    svgContent: `<svg viewBox="0 0 120 280" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 55,0 120,280 0,280" fill="${charcoal}" /></svg>`,
    zIndex: zIndex++,
  });

  // 4. Left Edge Mid Red Wedge
  elements.push({
    id: "hanover-left-red-mid",
    type: "shape",
    name: "Mid-Left Red Wedge",
    shapeType: "svg",
    x: 0,
    y: 530,
    width: 60,
    height: 180,
    fillColor: red,
    svgContent: `<svg viewBox="0 0 60 180" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 50,0 20,180 0,180" fill="${red}" opacity="0.9" /></svg>`,
    zIndex: zIndex++,
  });

  // 5. Bottom-Left Charcoal & Red Diagonal Cut Wedges
  elements.push({
    id: "hanover-bl-charcoal",
    type: "shape",
    name: "Bottom-Left Charcoal Wedge",
    shapeType: "svg",
    x: 0,
    y: pageH - 180,
    width: 260,
    height: 180,
    fillColor: charcoal,
    svgContent: `<svg viewBox="0 0 260 180" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,40 0,180 260,180 140,0" fill="${charcoal}" /></svg>`,
    zIndex: zIndex++,
  });

  elements.push({
    id: "hanover-bl-red",
    type: "shape",
    name: "Bottom-Left Red Wedge Accent",
    shapeType: "svg",
    x: 180,
    y: pageH - 120,
    width: 160,
    height: 120,
    fillColor: red,
    svgContent: `<svg viewBox="0 0 160 120" width="100%" height="100%" preserveAspectRatio="none"><polygon points="40,0 160,120 0,120" fill="${red}" /></svg>`,
    zIndex: zIndex++,
  });

  // 6. Right Edge 6x3 Circular Red Dot Matrix Grid
  elements.push({
    id: "hanover-dot-grid",
    type: "shape",
    name: "Right Dot Grid Matrix",
    shapeType: "svg",
    x: pageW - 80,
    y: 350,
    width: 44,
    height: 100,
    fillColor: red,
    svgContent: `<svg viewBox="0 0 44 100" width="100%" height="100%"><circle cx="8" cy="10" r="3" fill="${red}" opacity="0.85"/><circle cx="22" cy="10" r="3" fill="${red}" opacity="0.85"/><circle cx="36" cy="10" r="3" fill="${red}" opacity="0.85"/><circle cx="8" cy="28" r="3" fill="${red}" opacity="0.85"/><circle cx="22" cy="28" r="3" fill="${red}" opacity="0.85"/><circle cx="36" cy="28" r="3" fill="${red}" opacity="0.85"/><circle cx="8" cy="46" r="3" fill="${red}" opacity="0.85"/><circle cx="22" cy="46" r="3" fill="${red}" opacity="0.85"/><circle cx="36" cy="46" r="3" fill="${red}" opacity="0.85"/><circle cx="8" cy="64" r="3" fill="${red}" opacity="0.85"/><circle cx="22" cy="64" r="3" fill="${red}" opacity="0.85"/><circle cx="36" cy="64" r="3" fill="${red}" opacity="0.85"/><circle cx="8" cy="82" r="3" fill="${red}" opacity="0.85"/><circle cx="22" cy="82" r="3" fill="${red}" opacity="0.85"/><circle cx="36" cy="82" r="3" fill="${red}" opacity="0.85"/></svg>`,
    zIndex: zIndex++,
  });

  // 7. Top-Right Brand Mark
  elements.push({
    id: "hanover-brand",
    type: "text",
    name: "Brand Logo Text",
    x: pageW - 280,
    y: 60,
    width: 220,
    height: 28,
    text: brand.toUpperCase(),
    fontFamily: "Inter, Montserrat, sans-serif",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right",
    textColor: charcoal,
    letterSpacing: 2,
    textTransform: "uppercase",
    zIndex: zIndex++,
  });

  elements.push({
    id: "hanover-brand-line",
    type: "divider",
    name: "Brand Accent Line",
    x: pageW - 140,
    y: 92,
    width: 80,
    height: 3,
    fillColor: red,
    zIndex: zIndex++,
  });

  // 8. Main Proposal Title
  elements.push({
    id: "hanover-title",
    type: "text",
    name: "Strategic Title",
    x: 160,
    y: 280,
    width: pageW - 240,
    height: 100,
    text: title,
    fontFamily: "Inter, Montserrat, sans-serif",
    fontSize: 44,
    fontWeight: "900",
    textColor: "#0F172A",
    textTransform: "uppercase",
    lineHeight: 1.05,
    letterSpacing: -1,
    isMetadataField: "assignmentTitle",
    zIndex: zIndex++,
  });

  // 9. Subtitle
  elements.push({
    id: "hanover-subtitle",
    type: "text",
    name: "Strategic Subtitle",
    x: 160,
    y: 390,
    width: pageW - 240,
    height: 30,
    text: subtitle,
    fontFamily: "Inter, sans-serif",
    fontSize: 14,
    fontWeight: "700",
    textColor: red,
    zIndex: zIndex++,
  });

  // 10. Prepared For / Prepared By Two-Tier Metadata
  const metaY = 480;

  elements.push({
    id: "hanover-for-label",
    type: "text",
    name: "Prepared For Label",
    x: 160,
    y: metaY,
    width: 240,
    height: 20,
    text: "PREPARED FOR :",
    fontFamily: "Inter, sans-serif",
    fontSize: 11,
    fontWeight: "700",
    textColor: "#64748B",
    letterSpacing: 1,
    textTransform: "uppercase",
    zIndex: zIndex++,
  });

  elements.push({
    id: "hanover-for-name",
    type: "text",
    name: "Client / Instructor Name",
    x: 160,
    y: metaY + 22,
    width: 240,
    height: 26,
    text: instructor,
    fontFamily: "Inter, sans-serif",
    fontSize: 15,
    fontWeight: "700",
    textColor: charcoal,
    isMetadataField: "instructorName",
    zIndex: zIndex++,
  });

  elements.push({
    id: "hanover-by-label",
    type: "text",
    name: "Prepared By Label",
    x: 160,
    y: metaY + 70,
    width: 240,
    height: 20,
    text: "PREPARED BY :",
    fontFamily: "Inter, sans-serif",
    fontSize: 11,
    fontWeight: "700",
    textColor: "#64748B",
    letterSpacing: 1,
    textTransform: "uppercase",
    zIndex: zIndex++,
  });

  elements.push({
    id: "hanover-by-name",
    type: "text",
    name: "Student / Author Name",
    x: 160,
    y: metaY + 92,
    width: 260,
    height: 26,
    text: author,
    fontFamily: "Inter, sans-serif",
    fontSize: 15,
    fontWeight: "700",
    textColor: charcoal,
    isMetadataField: "studentName",
    zIndex: zIndex++,
  });

  if (meta.studentId) {
    elements.push({
      id: "hanover-by-id",
      type: "text",
      name: "Student ID",
      x: 160,
      y: metaY + 118,
      width: 240,
      height: 20,
      text: `ID: ${meta.studentId}`,
      fontFamily: "monospace",
      fontSize: 11,
      fontWeight: "600",
      textColor: "#64748B",
      isMetadataField: "studentId",
      zIndex: zIndex++,
    });
  }

  // 11. Footer Coordinates
  elements.push({
    id: "hanover-footer-contact",
    type: "text",
    name: "Contact Information",
    x: 360,
    y: pageH - 90,
    width: pageW - 420,
    height: 45,
    text: "📞 +123-456-7890   •   🌐 reallygreatsite.com\n✉️ hello@reallygreatsite.com",
    fontFamily: "Inter, sans-serif",
    fontSize: 11,
    fontWeight: "500",
    textAlign: "right",
    textColor: "#64748B",
    lineHeight: 1.5,
    zIndex: zIndex++,
  });

  return elements;
}

export function generateCanvaEmeraldGeometric(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;

  const emerald = meta.accentColor || "#065F46";
  const mint = "#10B981";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Sustainable Systems Team")
    : (meta.studentName || "Marcus Vance");

  const brand = meta.universityName || meta.department || "EcoSphere Institute";
  const title = meta.assignmentTitle || "SUSTAINABILITY & ENERGY REPORT";
  const subtitle = meta.courseName || meta.courseCode || "Environmental Technology & Systems Analysis";

  // White Background
  elements.push({
    id: "canvas-bg",
    type: "shape",
    name: "Page Background",
    shapeType: "rectangle",
    x: 0,
    y: 0,
    width: pageW,
    height: pageH,
    fillColor: "#FFFFFF",
    borderColor: "transparent",
    borderWidth: 0,
    zIndex: zIndex++,
  });

  // Top-Right Emerald Angles
  elements.push({
    id: "emerald-tr-mint",
    type: "shape",
    name: "Top-Right Mint Angle",
    shapeType: "svg",
    x: pageW - 280,
    y: 0,
    width: 280,
    height: 240,
    fillColor: mint,
    svgContent: `<svg viewBox="0 0 280 240" width="100%" height="100%" preserveAspectRatio="none"><polygon points="50,0 280,0 280,240 0,0" fill="${mint}" /></svg>`,
    zIndex: zIndex++,
  });

  elements.push({
    id: "emerald-tr-dark",
    type: "shape",
    name: "Top-Right Emerald Angle",
    shapeType: "svg",
    x: pageW - 250,
    y: 0,
    width: 250,
    height: 210,
    fillColor: emerald,
    svgContent: `<svg viewBox="0 0 250 210" width="100%" height="100%" preserveAspectRatio="none"><polygon points="45,0 250,0 250,210 0,0" fill="${emerald}" /></svg>`,
    zIndex: zIndex++,
  });

  // Bottom-Left Emerald Wedge
  elements.push({
    id: "emerald-bl-wedge",
    type: "shape",
    name: "Bottom-Left Geometric Wedge",
    shapeType: "svg",
    x: 0,
    y: pageH - 220,
    width: 240,
    height: 220,
    fillColor: emerald,
    svgContent: `<svg viewBox="0 0 240 220" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 120,220 0,220" fill="${emerald}" /><polygon points="0,60 180,220 120,220" fill="${mint}" opacity="0.8" /></svg>`,
    zIndex: zIndex++,
  });

  // Dot Grid
  elements.push({
    id: "emerald-dot-grid",
    type: "shape",
    name: "Emerald Dot Matrix",
    shapeType: "svg",
    x: pageW - 70,
    y: 80,
    width: 30,
    height: 80,
    fillColor: mint,
    svgContent: `<svg viewBox="0 0 30 80" width="100%" height="100%"><circle cx="8" cy="10" r="3" fill="${mint}"/><circle cx="22" cy="10" r="3" fill="${mint}"/><circle cx="8" cy="30" r="3" fill="${mint}"/><circle cx="22" cy="30" r="3" fill="${mint}"/><circle cx="8" cy="50" r="3" fill="${mint}"/><circle cx="22" cy="50" r="3" fill="${mint}"/><circle cx="8" cy="70" r="3" fill="${mint}"/><circle cx="22" cy="70" r="3" fill="${mint}"/></svg>`,
    zIndex: zIndex++,
  });

  // Brand Header
  elements.push({
    id: "emerald-brand",
    type: "text",
    name: "Institution Brand",
    x: 80,
    y: 80,
    width: 360,
    height: 26,
    text: brand.toUpperCase(),
    fontFamily: "Inter, Montserrat, sans-serif",
    fontSize: 13,
    fontWeight: "700",
    textColor: emerald,
    letterSpacing: 2,
    zIndex: zIndex++,
  });

  // Title
  elements.push({
    id: "emerald-title",
    type: "text",
    name: "Main Title",
    x: 80,
    y: 300,
    width: pageW - 160,
    height: 110,
    text: title,
    fontFamily: "Inter, Montserrat, sans-serif",
    fontSize: 42,
    fontWeight: "800",
    textColor: "#0F172A",
    textTransform: "uppercase",
    lineHeight: 1.1,
    isMetadataField: "assignmentTitle",
    zIndex: zIndex++,
  });

  elements.push({
    id: "emerald-subtitle",
    type: "text",
    name: "Subtitle",
    x: 80,
    y: 420,
    width: pageW - 160,
    height: 30,
    text: subtitle,
    fontFamily: "Inter, sans-serif",
    fontSize: 14,
    fontWeight: "600",
    textColor: emerald,
    zIndex: zIndex++,
  });

  // Author Metadata
  elements.push({
    id: "emerald-meta-name",
    type: "text",
    name: "Author Name",
    x: 80,
    y: 500,
    width: 360,
    height: 30,
    text: author,
    fontFamily: "Inter, sans-serif",
    fontSize: 18,
    fontWeight: "700",
    textColor: "#0F172A",
    isMetadataField: "studentName",
    zIndex: zIndex++,
  });

  if (meta.instructorName) {
    elements.push({
      id: "emerald-meta-instructor",
      type: "text",
      name: "Submitted To",
      x: 80,
      y: 535,
      width: 360,
      height: 24,
      text: `Submitted to: ${meta.instructorName}`,
      fontFamily: "Inter, sans-serif",
      fontSize: 12,
      fontWeight: "500",
      textColor: "#64748B",
      isMetadataField: "instructorName",
      zIndex: zIndex++,
    });
  }

  return elements;
}

export function generateCanvaCharcoalAmber(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;

  const charcoal = meta.accentColor || "#18181B";
  const amber = "#F59E0B";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Executive Committee")
    : (meta.studentName || "Arthur Pendelton");

  const brand = meta.universityName || meta.department || "Vanguard Strategic Partners";
  const title = meta.assignmentTitle || "ANNUAL EXECUTIVE BRIEF";
  const subtitle = meta.courseName || meta.courseCode || "Global Market Intelligence & Operational Strategy";

  // White Background
  elements.push({
    id: "canvas-bg",
    type: "shape",
    name: "Page Background",
    shapeType: "rectangle",
    x: 0,
    y: 0,
    width: pageW,
    height: pageH,
    fillColor: "#FFFFFF",
    borderColor: "transparent",
    borderWidth: 0,
    zIndex: zIndex++,
  });

  // Top Diagonal Charcoal Slice & Amber Pinstripe
  elements.push({
    id: "charcoal-top-slice",
    type: "shape",
    name: "Top Charcoal Angle Slice",
    shapeType: "svg",
    x: 0,
    y: 0,
    width: 340,
    height: 180,
    fillColor: charcoal,
    svgContent: `<svg viewBox="0 0 340 180" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 340,0 180,180 0,180" fill="${charcoal}" /></svg>`,
    zIndex: zIndex++,
  });

  elements.push({
    id: "charcoal-top-amber",
    type: "shape",
    name: "Amber Speed Stripe",
    shapeType: "svg",
    x: 175,
    y: 0,
    width: 170,
    height: 180,
    fillColor: amber,
    svgContent: `<svg viewBox="0 0 170 180" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 16,0 170,180 154,180" fill="${amber}" /></svg>`,
    zIndex: zIndex++,
  });

  // Top-Right Dot Matrix
  elements.push({
    id: "charcoal-dot-grid",
    type: "shape",
    name: "Amber Dot Cluster",
    shapeType: "svg",
    x: pageW - 75,
    y: 90,
    width: 32,
    height: 80,
    fillColor: amber,
    svgContent: `<svg viewBox="0 0 32 80" width="100%" height="100%"><circle cx="8" cy="8" r="3" fill="${amber}"/><circle cx="24" cy="8" r="3" fill="${amber}"/><circle cx="8" cy="28" r="3" fill="${amber}"/><circle cx="24" cy="28" r="3" fill="${amber}"/><circle cx="8" cy="48" r="3" fill="${amber}"/><circle cx="24" cy="48" r="3" fill="${amber}"/><circle cx="8" cy="68" r="3" fill="${amber}"/><circle cx="24" cy="68" r="3" fill="${amber}"/></svg>`,
    zIndex: zIndex++,
  });

  // Brand Header
  elements.push({
    id: "charcoal-brand",
    type: "text",
    name: "Corporate Header",
    x: pageW - 320,
    y: 50,
    width: 260,
    height: 24,
    text: brand.toUpperCase(),
    fontFamily: "Inter, Montserrat, sans-serif",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
    textColor: charcoal,
    letterSpacing: 1.5,
    zIndex: zIndex++,
  });

  // Main Title
  elements.push({
    id: "charcoal-title",
    type: "text",
    name: "Executive Title",
    x: 80,
    y: 320,
    width: pageW - 160,
    height: 100,
    text: title,
    fontFamily: "Inter, Montserrat, sans-serif",
    fontSize: 44,
    fontWeight: "900",
    textColor: "#09090B",
    textTransform: "uppercase",
    lineHeight: 1.05,
    isMetadataField: "assignmentTitle",
    zIndex: zIndex++,
  });

  elements.push({
    id: "charcoal-subtitle",
    type: "text",
    name: "Executive Subtitle",
    x: 80,
    y: 430,
    width: pageW - 160,
    height: 30,
    text: subtitle,
    fontFamily: "Inter, sans-serif",
    fontSize: 14,
    fontWeight: "600",
    textColor: amber,
    zIndex: zIndex++,
  });

  // Author & Instructor Metadata
  elements.push({
    id: "charcoal-meta-author",
    type: "text",
    name: "Author Name",
    x: 80,
    y: 520,
    width: 360,
    height: 28,
    text: `Prepared by: ${author}`,
    fontFamily: "Inter, sans-serif",
    fontSize: 16,
    fontWeight: "700",
    textColor: charcoal,
    isMetadataField: "studentName",
    zIndex: zIndex++,
  });

  if (meta.instructorName) {
    elements.push({
      id: "charcoal-meta-instructor",
      type: "text",
      name: "Instructor Name",
      x: 80,
      y: 555,
      width: 360,
      height: 24,
      text: `Submitted to: ${meta.instructorName}`,
      fontFamily: "Inter, sans-serif",
      fontSize: 12,
      fontWeight: "500",
      textColor: "#71717A",
      isMetadataField: "instructorName",
      zIndex: zIndex++,
    });
  }

  // Bottom Chevron
  elements.push({
    id: "charcoal-br-chevron",
    type: "shape",
    name: "Bottom-Right Chevron",
    shapeType: "svg",
    x: pageW - 180,
    y: pageH - 140,
    width: 180,
    height: 140,
    fillColor: charcoal,
    svgContent: `<svg viewBox="0 0 180 140" width="100%" height="100%" preserveAspectRatio="none"><polygon points="60,0 180,0 180,140 0,140" fill="${charcoal}" /></svg>`,
    zIndex: zIndex++,
  });

  return elements;
}

export function generateCanvaBlueYellowProposal(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;

  const navy = meta.accentColor || "#1B365D";
  const yellow = "#F59E0B";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Group Project Team")
    : (meta.studentName || "Benjamin Shah");

  const institution = meta.universityName || meta.department || "Studio Shodwe";
  const title = meta.assignmentTitle || (isGroup ? "PROJECT PROPOSAL" : "PROJECT PROPOSAL");
  const course = meta.courseName || meta.courseCode || "";
  const studentId = meta.studentId || "";

  // 1. Crisp White Background
  elements.push({
    id: "canvas-bg",
    type: "shape",
    name: "Page Background",
    shapeType: "rectangle",
    x: 0,
    y: 0,
    width: pageW,
    height: pageH,
    fillColor: "#FFFFFF",
    borderColor: "transparent",
    borderWidth: 0,
    zIndex: zIndex++,
  });

  // 2. Top-Left Corner Wedges
  elements.push({
    id: "canva-tl-navy",
    type: "shape",
    name: "Top-Left Navy Triangle",
    shapeType: "svg",
    x: 0,
    y: 0,
    width: 90,
    height: 90,
    fillColor: navy,
    svgContent: `<svg viewBox="0 0 90 90" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 90,0 0,90" fill="${navy}" /></svg>`,
    zIndex: zIndex++,
  });

  elements.push({
    id: "canva-tl-yellow",
    type: "shape",
    name: "Top-Left Yellow Accent",
    shapeType: "svg",
    x: 0,
    y: 0,
    width: 55,
    height: 55,
    fillColor: yellow,
    svgContent: `<svg viewBox="0 0 55 55" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 55,0 0,55" fill="${yellow}" /></svg>`,
    zIndex: zIndex++,
  });

  // 3. Top-Right Big Navy Polygon & Yellow Underlay
  elements.push({
    id: "canva-tr-yellow",
    type: "shape",
    name: "Top-Right Yellow Stripe Angle",
    shapeType: "svg",
    x: pageW - 270,
    y: 0,
    width: 270,
    height: 270,
    fillColor: yellow,
    svgContent: `<svg viewBox="0 0 270 270" width="100%" height="100%" preserveAspectRatio="none"><polygon points="60,0 270,0 270,270 0,0" fill="${yellow}" /></svg>`,
    zIndex: zIndex++,
  });

  elements.push({
    id: "canva-tr-navy",
    type: "shape",
    name: "Top-Right Navy Wedge Polygon",
    shapeType: "svg",
    x: pageW - 240,
    y: 0,
    width: 240,
    height: 240,
    fillColor: navy,
    svgContent: `<svg viewBox="0 0 240 240" width="100%" height="100%" preserveAspectRatio="none"><polygon points="50,0 240,0 240,240 0,0" fill="${navy}" /></svg>`,
    zIndex: zIndex++,
  });

  // 4. Top-Right Dot Matrix Grid
  elements.push({
    id: "canva-tr-dots",
    type: "shape",
    name: "Top-Right Dot Grid Matrix",
    shapeType: "svg",
    x: pageW - 65,
    y: 90,
    width: 32,
    height: 90,
    fillColor: "#60A5FA",
    svgContent: `<svg viewBox="0 0 32 90" width="100%" height="100%">
      <circle cx="8" cy="10" r="3" fill="#60A5FA" opacity="0.85"/>
      <circle cx="24" cy="10" r="3" fill="#60A5FA" opacity="0.85"/>
      <circle cx="8" cy="32" r="3" fill="#60A5FA" opacity="0.85"/>
      <circle cx="24" cy="32" r="3" fill="#60A5FA" opacity="0.85"/>
      <circle cx="8" cy="54" r="3" fill="#60A5FA" opacity="0.85"/>
      <circle cx="24" cy="54" r="3" fill="#60A5FA" opacity="0.85"/>
      <circle cx="8" cy="76" r="3" fill="#60A5FA" opacity="0.85"/>
      <circle cx="24" cy="76" r="3" fill="#60A5FA" opacity="0.85"/>
    </svg>`,
    zIndex: zIndex++,
  });

  // 5. Bottom-Right Chevron Layered Angle
  elements.push({
    id: "canva-br-yellow",
    type: "shape",
    name: "Bottom-Right Yellow Chevron Stripe",
    shapeType: "svg",
    x: pageW - 150,
    y: pageH - 280,
    width: 150,
    height: 280,
    fillColor: yellow,
    svgContent: `<svg viewBox="0 0 150 280" width="100%" height="100%" preserveAspectRatio="none"><polygon points="150,0 150,280 0,280 95,140" fill="${yellow}" /></svg>`,
    zIndex: zIndex++,
  });

  elements.push({
    id: "canva-br-navy",
    type: "shape",
    name: "Bottom-Right Navy Chevron",
    shapeType: "svg",
    x: pageW - 120,
    y: pageH - 230,
    width: 120,
    height: 230,
    fillColor: navy,
    svgContent: `<svg viewBox="0 0 120 230" width="100%" height="100%" preserveAspectRatio="none"><polygon points="120,0 120,230 0,230 75,115" fill="${navy}" /></svg>`,
    zIndex: zIndex++,
  });

  // 6. Bottom-Left Navy Corner Wedge
  elements.push({
    id: "canva-bl-navy",
    type: "shape",
    name: "Bottom-Left Navy Corner",
    shapeType: "svg",
    x: 0,
    y: pageH - 85,
    width: 85,
    height: 85,
    fillColor: navy,
    svgContent: `<svg viewBox="0 0 85 85" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 0,85 85,85" fill="${navy}" /></svg>`,
    zIndex: zIndex++,
  });

  // 7. Brand / Studio / University Header
  if (meta.logoDataUrl) {
    elements.push({
      id: "cover-logo",
      type: "image",
      name: "Institutional / Company Logo",
      x: 100,
      y: 140,
      width: 140,
      height: 55,
      imageUrl: meta.logoDataUrl,
      imageFit: "contain",
      zIndex: zIndex++,
    });
  } else {
    elements.push({
      id: "canva-brand-dot",
      type: "shape",
      name: "Yellow Accent Dot",
      shapeType: "circle",
      x: 100,
      y: 160,
      width: 14,
      height: 14,
      fillColor: yellow,
      borderRadius: 7,
      zIndex: zIndex++,
    });

    elements.push({
      id: "canva-brand-name",
      type: "text",
      name: "Company / Studio / University Name",
      x: 124,
      y: 156,
      width: 340,
      height: 22,
      text: institution,
      fontFamily: "Inter, Montserrat, sans-serif",
      fontSize: 13,
      fontWeight: "700",
      textColor: navy,
      zIndex: zIndex++,
    });
  }

  // 8. Main Proposal Title
  elements.push({
    id: "canva-title-year",
    type: "text",
    name: "Year / Category Lead",
    x: 100,
    y: 235,
    width: 480,
    height: 52,
    text: meta.academicYear || "2026",
    fontFamily: "Inter, Montserrat, sans-serif",
    fontSize: 48,
    fontWeight: "800",
    textColor: navy,
    letterSpacing: -1,
    zIndex: zIndex++,
  });

  elements.push({
    id: "canva-title-main",
    type: "text",
    name: "Main Title Heading",
    x: 100,
    y: 285,
    width: 480,
    height: 120,
    text: title || "PROJECT PROPOSAL",
    fontFamily: "Inter, Montserrat, sans-serif",
    fontSize: 46,
    fontWeight: "800",
    textColor: navy,
    textTransform: "uppercase",
    lineHeight: 1.05,
    letterSpacing: -1,
    isMetadataField: "assignmentTitle",
    zIndex: zIndex++,
  });

  // 9. Prepared By / Author Metadata
  elements.push({
    id: "canva-meta-label",
    type: "text",
    name: "Prepared By Label",
    x: 100,
    y: 445,
    width: 360,
    height: 20,
    text: "Prepared by :",
    fontFamily: "Inter, sans-serif",
    fontSize: 13,
    fontWeight: "500",
    textColor: "#64748B",
    zIndex: zIndex++,
  });

  elements.push({
    id: "canva-meta-name",
    type: "text",
    name: "Author / Student Name",
    x: 100,
    y: 470,
    width: 360,
    height: 30,
    text: author,
    fontFamily: "Inter, Montserrat, sans-serif",
    fontSize: 18,
    fontWeight: "700",
    textColor: navy,
    isMetadataField: "studentName",
    zIndex: zIndex++,
  });

  if (course || studentId) {
    elements.push({
      id: "canva-meta-course",
      type: "text",
      name: "Course / Student ID",
      x: 100,
      y: 505,
      width: 360,
      height: 24,
      text: [course, studentId].filter(Boolean).join(" · "),
      fontFamily: "Inter, sans-serif",
      fontSize: 12,
      fontWeight: "500",
      textColor: "#64748B",
      zIndex: zIndex++,
    });
  }

  if (meta.instructorName) {
    elements.push({
      id: "canva-meta-instructor",
      type: "text",
      name: "Instructor Name",
      x: 100,
      y: 535,
      width: 360,
      height: 24,
      text: `Submitted to: ${meta.instructorName}`,
      fontFamily: "Inter, sans-serif",
      fontSize: 12,
      fontWeight: "500",
      textColor: "#64748B",
      isMetadataField: "instructorName",
      zIndex: zIndex++,
    });
  }

  // 10. Footer Contact & Institutional Coordinates
  elements.push({
    id: "canva-footer-contact",
    type: "text",
    name: "Footer Coordinates / Links",
    x: 100,
    y: pageH - 180,
    width: 360,
    height: 50,
    text: "📞 +123-456-7890\n🌐 www.reallygreatsite.com",
    fontFamily: "Inter, sans-serif",
    fontSize: 11,
    fontWeight: "500",
    textColor: "#475569",
    lineHeight: 1.6,
    zIndex: zIndex++,
  });

  return elements;
}

export function generateCanvaDiagonalStripes(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const blue = meta.accentColor || "#2563EB";
  const yellow = "#F59E0B";

  elements.push({
    id: "canvas-bg",
    type: "shape",
    name: "Page Background",
    shapeType: "rectangle",
    x: 0,
    y: 0,
    width: pageW,
    height: pageH,
    fillColor: "#FFFFFF",
    zIndex: zIndex++,
  });

  // Top-Left Speed Bands
  elements.push({
    id: "stripes-tl-blue",
    type: "shape",
    name: "Top Diagonal Band",
    shapeType: "svg",
    x: 0,
    y: 0,
    width: 260,
    height: 140,
    fillColor: blue,
    svgContent: `<svg viewBox="0 0 260 140" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 260,0 120,140 0,140" fill="${blue}"/></svg>`,
    zIndex: zIndex++,
  });

  elements.push({
    id: "stripes-tl-yellow",
    type: "shape",
    name: "Top Yellow Pinstripe",
    shapeType: "svg",
    x: 10,
    y: 145,
    width: 220,
    height: 16,
    fillColor: yellow,
    svgContent: `<svg viewBox="0 0 220 16" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 220,0 200,16 0,16" fill="${yellow}"/></svg>`,
    zIndex: zIndex++,
  });

  elements.push({
    id: "stripes-dots",
    type: "shape",
    name: "Dot Cluster",
    shapeType: "svg",
    x: 40,
    y: 175,
    width: 60,
    height: 24,
    fillColor: blue,
    svgContent: `<svg viewBox="0 0 60 24" width="100%" height="100%">
      <circle cx="8" cy="8" r="3.5" fill="${blue}"/>
      <circle cx="24" cy="8" r="3.5" fill="${blue}"/>
      <circle cx="40" cy="8" r="3.5" fill="${blue}"/>
    </svg>`,
    zIndex: zIndex++,
  });

  // Main Title
  elements.push({
    id: "stripes-title",
    type: "text",
    name: "Document Title",
    x: 80,
    y: 360,
    width: pageW - 160,
    height: 90,
    text: meta.assignmentTitle || "ANNUAL BUSINESS REPORT",
    fontFamily: "Inter, Montserrat, sans-serif",
    fontSize: 42,
    fontWeight: "800",
    textColor: "#0F172A",
    textTransform: "uppercase",
    lineHeight: 1.1,
    isMetadataField: "assignmentTitle",
    zIndex: zIndex++,
  });

  elements.push({
    id: "stripes-author",
    type: "text",
    name: "Author Name",
    x: 80,
    y: 470,
    width: 400,
    height: 28,
    text: meta.studentName || "Lead Researcher",
    fontFamily: "Inter, sans-serif",
    fontSize: 16,
    fontWeight: "700",
    textColor: blue,
    isMetadataField: "studentName",
    zIndex: zIndex++,
  });

  if (meta.instructorName) {
    elements.push({
      id: "stripes-instructor",
      type: "text",
      name: "Instructor Name",
      x: 80,
      y: 505,
      width: 400,
      height: 24,
      text: `Submitted to: ${meta.instructorName}`,
      fontFamily: "Inter, sans-serif",
      fontSize: 12,
      fontWeight: "500",
      textColor: "#64748B",
      isMetadataField: "instructorName",
      zIndex: zIndex++,
    });
  }

  return elements;
}

export function generateCanvaCoralArchitectural(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const coral = "#F87171";

  elements.push({
    id: "canvas-bg",
    type: "shape",
    name: "Page Background",
    shapeType: "rectangle",
    x: 0,
    y: 0,
    width: pageW,
    height: pageH,
    fillColor: "#FFFFFF",
    zIndex: zIndex++,
  });

  // Intersecting Coral and Slate Frames
  elements.push({
    id: "coral-frame-1",
    type: "shape",
    name: "Coral Architectural Frame",
    shapeType: "rectangle",
    x: 80,
    y: 120,
    width: 240,
    height: 480,
    fillColor: "transparent",
    borderColor: coral,
    borderWidth: 2,
    zIndex: zIndex++,
  });

  elements.push({
    id: "coral-frame-2",
    type: "shape",
    name: "Offset Inner Frame",
    shapeType: "rectangle",
    x: 120,
    y: 160,
    width: 240,
    height: 480,
    fillColor: "transparent",
    borderColor: "#0F172A",
    borderWidth: 1.5,
    opacity: 0.35,
    zIndex: zIndex++,
  });

  // Clean Editorial Typography
  elements.push({
    id: "coral-title",
    type: "text",
    name: "Editorial Title",
    x: 100,
    y: 700,
    width: pageW - 200,
    height: 80,
    text: meta.assignmentTitle || "ARCHITECTURAL PORTFOLIO",
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: 36,
    fontWeight: "700",
    textColor: "#0F172A",
    textTransform: "uppercase",
    letterSpacing: 2,
    isMetadataField: "assignmentTitle",
    zIndex: zIndex++,
  });

  if (meta.studentName) {
    elements.push({
      id: "coral-author",
      type: "text",
      name: "Author Name",
      x: 100,
      y: 790,
      width: 400,
      height: 24,
      text: meta.studentName,
      fontFamily: "Inter, sans-serif",
      fontSize: 14,
      fontWeight: "600",
      textColor: coral,
      isMetadataField: "studentName",
      zIndex: zIndex++,
    });
  }

  if (meta.instructorName) {
    elements.push({
      id: "coral-instructor",
      type: "text",
      name: "Instructor Name",
      x: 100,
      y: 820,
      width: 400,
      height: 24,
      text: `Submitted to: ${meta.instructorName}`,
      fontFamily: "Inter, sans-serif",
      fontSize: 12,
      fontWeight: "500",
      textColor: "#64748B",
      isMetadataField: "instructorName",
      zIndex: zIndex++,
    });
  }

  return elements;
}

export function generateCanvaGoldWave(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const gold = "#D97706";

  elements.push({
    id: "canvas-bg",
    type: "shape",
    name: "Page Background",
    shapeType: "rectangle",
    x: 0,
    y: 0,
    width: pageW,
    height: pageH,
    fillColor: "#FFFFFF",
    zIndex: zIndex++,
  });

  // Flowing Gold Fluid Waves at Top-Right
  elements.push({
    id: "gold-wave-top",
    type: "shape",
    name: "Gold Fluid Ribbon",
    shapeType: "svg",
    x: pageW - 320,
    y: 0,
    width: 320,
    height: 260,
    fillColor: gold,
    svgContent: `<svg viewBox="0 0 320 260" width="100%" height="100%" preserveAspectRatio="none">
      <path d="M 0 0 C 140 40, 220 160, 320 240 L 320 0 Z" fill="${gold}"/>
      <path d="M 40 0 C 160 50, 240 190, 320 260 L 320 0 Z" fill="#FBBF24" opacity="0.6"/>
    </svg>`,
    zIndex: zIndex++,
  });

  elements.push({
    id: "gold-title",
    type: "text",
    name: "Luxury Title",
    x: 80,
    y: 380,
    width: pageW - 160,
    height: 80,
    text: meta.assignmentTitle || "EXECUTIVE STRATEGY REVIEW",
    fontFamily: "Inter, sans-serif",
    fontSize: 38,
    fontWeight: "800",
    textColor: "#0F172A",
    textTransform: "uppercase",
    letterSpacing: -0.5,
    isMetadataField: "assignmentTitle",
    zIndex: zIndex++,
  });

  if (meta.studentName) {
    elements.push({
      id: "gold-author",
      type: "text",
      name: "Author Name",
      x: 80,
      y: 470,
      width: 400,
      height: 26,
      text: meta.studentName,
      fontFamily: "Inter, sans-serif",
      fontSize: 16,
      fontWeight: "700",
      textColor: gold,
      isMetadataField: "studentName",
      zIndex: zIndex++,
    });
  }

  if (meta.instructorName) {
    elements.push({
      id: "gold-instructor",
      type: "text",
      name: "Instructor Name",
      x: 80,
      y: 505,
      width: 400,
      height: 24,
      text: `Submitted to: ${meta.instructorName}`,
      fontFamily: "Inter, sans-serif",
      fontSize: 12,
      fontWeight: "500",
      textColor: "#64748B",
      isMetadataField: "instructorName",
      zIndex: zIndex++,
    });
  }

  return elements;
}

export function generateCanvaOceanFluid(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;

  elements.push({
    id: "canvas-bg",
    type: "shape",
    name: "Page Background",
    shapeType: "rectangle",
    x: 0,
    y: 0,
    width: pageW,
    height: pageH,
    fillColor: "#FFFFFF",
    zIndex: zIndex++,
  });

  // Layered Ocean Waves (Adora Montminy style)
  elements.push({
    id: "ocean-waves",
    type: "shape",
    name: "Ocean Fluid Curves",
    shapeType: "svg",
    x: pageW - 280,
    y: 0,
    width: 280,
    height: 340,
    fillColor: "#0284C7",
    svgContent: `<svg viewBox="0 0 280 340" width="100%" height="100%" preserveAspectRatio="none">
      <path d="M 0 0 C 120 80, 200 180, 280 320 L 280 0 Z" fill="#0C4A6E" />
      <path d="M 40 0 C 140 100, 220 210, 280 340 L 280 0 Z" fill="#0284C7" opacity="0.8" />
    </svg>`,
    zIndex: zIndex++,
  });

  elements.push({
    id: "ocean-label",
    type: "text",
    name: "Brand Lead",
    x: 80,
    y: 120,
    width: 300,
    height: 30,
    text: meta.universityName || "ADORA MONTMINT",
    fontFamily: "Inter, sans-serif",
    fontSize: 14,
    fontWeight: "700",
    textColor: "#0C4A6E",
    textTransform: "uppercase",
    letterSpacing: 3,
    zIndex: zIndex++,
  });

  elements.push({
    id: "ocean-title",
    type: "text",
    name: "Main Title",
    x: 80,
    y: 700,
    width: pageW - 160,
    height: 80,
    text: meta.assignmentTitle || "PORTFOLIO",
    fontFamily: "Inter, sans-serif",
    fontSize: 52,
    fontWeight: "900",
    textColor: "#0C4A6E",
    textTransform: "uppercase",
    letterSpacing: 2,
    isMetadataField: "assignmentTitle",
    zIndex: zIndex++,
  });

  if (meta.studentName) {
    elements.push({
      id: "ocean-author",
      type: "text",
      name: "Author Name",
      x: 80,
      y: 790,
      width: 400,
      height: 26,
      text: meta.studentName,
      fontFamily: "Inter, sans-serif",
      fontSize: 16,
      fontWeight: "700",
      textColor: "#0284C7",
      isMetadataField: "studentName",
      zIndex: zIndex++,
    });
  }

  if (meta.instructorName) {
    elements.push({
      id: "ocean-instructor",
      type: "text",
      name: "Instructor Name",
      x: 80,
      y: 825,
      width: 400,
      height: 24,
      text: `Submitted to: ${meta.instructorName}`,
      fontFamily: "Inter, sans-serif",
      fontSize: 12,
      fontWeight: "500",
      textColor: "#64748B",
      isMetadataField: "instructorName",
      zIndex: zIndex++,
    });
  }

  return elements;
}

export function generateCanvaWarmEditorial(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;

  elements.push({
    id: "canvas-bg",
    type: "shape",
    name: "Page Background",
    shapeType: "rectangle",
    x: 0,
    y: 0,
    width: pageW,
    height: pageH,
    fillColor: "#FFFFFF",
    zIndex: zIndex++,
  });

  elements.push({
    id: "warm-banner",
    type: "shape",
    name: "Warm Sand Split Banner",
    shapeType: "rectangle",
    x: 0,
    y: 0,
    width: pageW,
    height: 320,
    fillColor: "#F5F0EB",
    zIndex: zIndex++,
  });

  elements.push({
    id: "warm-brand",
    type: "text",
    name: "Studio / Company Lead",
    x: 60,
    y: 80,
    width: pageW - 120,
    height: 30,
    text: (meta.universityName || "Keithston and Partners").toUpperCase(),
    fontFamily: "Georgia, serif",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    textColor: "#1E293B",
    letterSpacing: 2,
    zIndex: zIndex++,
  });

  elements.push({
    id: "warm-title",
    type: "text",
    name: "Editorial Title",
    x: 60,
    y: 440,
    width: pageW - 120,
    height: 80,
    text: meta.assignmentTitle || "ANNUAL CONSULTANCY DOSSIER",
    fontFamily: "Georgia, serif",
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    textColor: "#0F172A",
    isMetadataField: "assignmentTitle",
    zIndex: zIndex++,
  });

  if (meta.studentName) {
    elements.push({
      id: "warm-author",
      type: "text",
      name: "Author Name",
      x: 60,
      y: 530,
      width: pageW - 120,
      height: 28,
      text: meta.studentName,
      fontFamily: "Georgia, serif",
      fontSize: 16,
      fontWeight: "700",
      textAlign: "center",
      textColor: "#475569",
      isMetadataField: "studentName",
      zIndex: zIndex++,
    });
  }

  if (meta.instructorName) {
    elements.push({
      id: "warm-instructor",
      type: "text",
      name: "Instructor Name",
      x: 60,
      y: 565,
      width: pageW - 120,
      height: 24,
      text: `Submitted to: ${meta.instructorName}`,
      fontFamily: "Georgia, serif",
      fontSize: 13,
      fontWeight: "500",
      textAlign: "center",
      textColor: "#64748B",
      isMetadataField: "instructorName",
      zIndex: zIndex++,
    });
  }

  return elements;
}

// -------------------------------------------------------------
// Scalable Registry of 60+ Distinct Cover Templates
// -------------------------------------------------------------
export const COVER_TEMPLATES_REGISTRY: ExtendedCoverTemplateDefinition[] = [
  // -----------------------------------------------------------
  // 0. CANVA PREMIER ARCHETYPES (Directly matching Canva Studio)
  // -----------------------------------------------------------
  {
    id: "canva-salford-wave",
    name: "Blue White Yellow Modern Minimalist Project Proposal - Salford & Co.",
    tagline: "Canva Organic Wave & Ribbon Proposal",
    description: "Flowing deep navy organic wave header with bright yellow underlay ribbon, dark brand pill badge, bold modern title, and matching bottom-right wave curve.",
    category: "Modern",
    defaultAccent: "#1B365D",
    secondaryColor: "#F59E0B",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, Montserrat, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Salford", "Proposal", "Wave", "Modern", "Minimalist"],
    generateElements: generateCanvaSalfordWave,
  },
  {
    id: "canva-hanover-red-geometric",
    name: "Red White Modern Geometric Business Proposal - Hanover Co",
    tagline: "Canva Faceted Geometric Red & Charcoal Proposal",
    description: "Dynamic red and dark charcoal diagonal faceted polygons along left margin, right 6x3 circular red dot matrix, top-right brand mark, and two-tier metadata layout.",
    category: "Business",
    defaultAccent: "#DC2626",
    secondaryColor: "#1E293B",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, Montserrat, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Hanover", "Geometric", "Red", "Business", "Proposal"],
    generateElements: generateCanvaHanoverRedGeometric,
  },
  {
    id: "canva-emerald-geometric",
    name: "Emerald Green Modern Hex & Facet Report",
    tagline: "Canva Emerald Hexagonal Geometry",
    description: "Deep emerald and mint angular geometric corner facets, right dot matrix, and crisp modern typography.",
    category: "Geometric",
    defaultAccent: "#065F46",
    secondaryColor: "#10B981",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, Montserrat, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Emerald", "Green", "Geometric"],
    generateElements: generateCanvaEmeraldGeometric,
  },
  {
    id: "canva-charcoal-amber",
    name: "Charcoal & Amber Executive Brief",
    tagline: "Canva High-Contrast Executive Angles",
    description: "Dark charcoal angular header slices with bright amber pinstripe accents, dot matrix clusters, and executive metadata cards.",
    category: "Business",
    defaultAccent: "#18181B",
    secondaryColor: "#F59E0B",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, Montserrat, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Executive", "Charcoal", "Amber"],
    generateElements: generateCanvaCharcoalAmber,
  },
  {
    id: "canva-modern-proposal",
    name: "Blue & Yellow Minimalist Modern Proposal",
    tagline: "Canva Flagship Geometric Proposal",
    description: "Iconic Canva layout featuring sharp deep navy and vibrant yellow corner polygons, layered edge chevrons, dot matrix grid, and bold modern sans-serif typography.",
    category: "Modern",
    defaultAccent: "#1B365D",
    secondaryColor: "#F59E0B",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, Montserrat, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Proposal", "Modern", "Geometric", "Minimalist"],
    generateElements: generateCanvaBlueYellowProposal,
  },
  {
    id: "canva-diagonal-stripes",
    name: "Modern Diagonal Tech Stripes",
    tagline: "Dynamic Angular Slices & Dot Accents",
    description: "Cobalt and amber angular speed stripes slicing across top and bottom with dot matrix clusters on clean white paper.",
    category: "Modern",
    defaultAccent: "#2563EB",
    secondaryColor: "#F59E0B",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, Montserrat, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Tech", "Stripes", "Dynamic"],
    generateElements: generateCanvaDiagonalStripes,
  },
  {
    id: "canva-coral-architectural",
    name: "Minimal Coral Architectural",
    tagline: "Offset Minimalist Line Frame",
    description: "Clean white background with intersecting terracotta/coral fine rectangular lines and bold modern editorial typography.",
    category: "Minimalist",
    defaultAccent: "#F87171",
    secondaryColor: "#1E293B",
    backgroundColor: "#FFFFFF",
    fontFamily: "'Playfair Display', Georgia, serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Architectural", "Coral", "Editorial"],
    generateElements: generateCanvaCoralArchitectural,
  },
  {
    id: "canva-gold-wave",
    name: "Luxury Gold Fluid Waves",
    tagline: "Organic Flowing Metallic Ribbons",
    description: "Flowing metallic gold wave curve ribbons sweeping dynamically from top corner on crisp white editorial layout.",
    category: "Creative",
    defaultAccent: "#D97706",
    secondaryColor: "#FBBF24",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Gold", "Waves", "Fluid", "Luxury"],
    generateElements: generateCanvaGoldWave,
  },
  {
    id: "canva-ocean-fluid",
    name: "Deep Ocean Fluid Curve",
    tagline: "Adora Organic Coastal Waves",
    description: "Layered cyan and deep ocean blue curved fluid ribbons on pure white with elegant centered modern title.",
    category: "Creative",
    defaultAccent: "#0284C7",
    secondaryColor: "#0F766E",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Fluid", "Ocean", "Waves"],
    generateElements: generateCanvaOceanFluid,
  },
  {
    id: "canva-warm-editorial",
    name: "Warm Beige Editorial Split",
    tagline: "Keithston & Partners Architectural Split",
    description: "Warm sand and slate architectural split banner with logo frame and executive serif layout.",
    category: "Business",
    defaultAccent: "#475569",
    secondaryColor: "#D97706",
    backgroundColor: "#FFFFFF",
    fontFamily: "Georgia, serif",
    borderStyle: "none",
    logoPosition: "top-center",
    metadataLayout: "centered",
    tags: ["Canva", "Warm", "Editorial", "Split"],
    generateElements: generateCanvaWarmEditorial,
  },
  // -----------------------------------------------------------
  // 1. ACADEMIC ARCHETYPES (1 - 8)
  // -----------------------------------------------------------
  {
    id: "classic-university",
    name: "Classic University",
    tagline: "Collegiate Academic Heritage",
    description: "Centered formal academic hierarchy with elegant serif typography, double frame border, and heraldic layout.",
    category: "Academic",
    defaultAccent: "#1E3A8A", // Navy Blue
    secondaryColor: "#475569",
    fontFamily: "Georgia, 'Playfair Display', serif",
    borderStyle: "frame",
    logoPosition: "top-center",
    metadataLayout: "centered",
    tags: ["Collegiate", "Formal", "Classic", "University"],
  },
  {
    id: "cambridge-heritage",
    name: "Cambridge Heritage",
    tagline: "Traditional Oxbridge Architecture",
    description: "Distinguished burgundy and warm gold heraldic layout with serif typography and centered crest positioning.",
    category: "Academic",
    defaultAccent: "#831843", // Deep Burgundy
    secondaryColor: "#B45309", // Warm Gold
    fontFamily: "'Playfair Display', Georgia, serif",
    borderStyle: "double",
    logoPosition: "top-center",
    metadataLayout: "centered",
    tags: ["Heritage", "Oxbridge", "Burgundy", "Traditional"],
  },
  {
    id: "oxford-royal",
    name: "Oxford Royal",
    tagline: "Prestige Sapphire Framing",
    description: "Deep sapphire blue border framing with dual-column student and advisor credentials, suited for formal degrees.",
    category: "Academic",
    defaultAccent: "#1E40AF", // Oxford Blue
    secondaryColor: "#64748B",
    fontFamily: "Merriweather, Georgia, serif",
    borderStyle: "double",
    logoPosition: "top-center",
    metadataLayout: "split-two-col",
    tags: ["Oxford", "Prestige", "Degree", "Formal"],
  },
  {
    id: "doctoral-dissertation",
    name: "Doctoral Dissertation",
    tagline: "Graduate Committee Specification",
    description: "Rigorous doctoral and thesis format featuring advisory committee credentials, department rubric, and archival margins.",
    category: "Academic",
    defaultAccent: "#0F172A", // Slate Dark
    secondaryColor: "#334155",
    fontFamily: "'Times New Roman', Times, serif",
    borderStyle: "single",
    logoPosition: "top-center",
    metadataLayout: "card-frame",
    tags: ["PhD", "Dissertation", "Thesis", "Committee"],
  },
  {
    id: "undergraduate-thesis",
    name: "Undergraduate Capstone",
    tagline: "Senior Project & Portfolio",
    description: "Balanced academic layout designed for senior capstone papers, bachelor theses, and departmental research defenses.",
    category: "Academic",
    defaultAccent: "#0369A1", // Ocean Sky
    secondaryColor: "#475569",
    fontFamily: "'Newsreader', Georgia, serif",
    borderStyle: "frame",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Capstone", "Senior Project", "Thesis"],
  },
  {
    id: "harvard-crimson",
    name: "Harvard Crimson",
    tagline: "Presidential Ivy Ribbon",
    description: "Bold crimson banner anchoring university credentials with high-contrast serif display and presidential seal placement.",
    category: "Academic",
    defaultAccent: "#991B1B", // Crimson
    secondaryColor: "#78350F",
    fontFamily: "'Playfair Display', Georgia, serif",
    borderStyle: "frame",
    logoPosition: "hero-center",
    metadataLayout: "centered",
    tags: ["Ivy League", "Crimson", "Seal", "Presidential"],
  },
  {
    id: "stanford-cardinal",
    name: "Stanford Cardinal",
    tagline: "Pacific Academic Distinction",
    description: "Clean California collegiate layout with cardinal accents, generous whitespace, and modern card frames for members.",
    category: "Academic",
    defaultAccent: "#B91C1C", // Cardinal Red
    secondaryColor: "#1E293B",
    fontFamily: "Inter, sans-serif",
    borderStyle: "accent-bar",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Cardinal", "West Coast", "Clean", "Academic"],
  },
  {
    id: "mit-polytechnic",
    name: "Polytechnic Institute",
    tagline: "Technical Precision & Code Badges",
    description: "STEM and polytechnic focus with monospace course tags, sharp 90-degree geometry, and structured lab division lines.",
    category: "Academic",
    defaultAccent: "#2563EB", // Cobalt
    secondaryColor: "#0284C7",
    fontFamily: "Roboto, sans-serif",
    borderStyle: "grid",
    logoPosition: "top-left",
    metadataLayout: "grid-box",
    tags: ["STEM", "Polytechnic", "Code", "Laboratory"],
  },

  // -----------------------------------------------------------
  // 2. MODERN ARCHETYPES (9 - 15)
  // -----------------------------------------------------------
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    tagline: "Contemporary Clean Sans",
    description: "Ultra-clean left-aligned layout with subtle vertical accent bars, ample whitespace, and sleek modern typography.",
    category: "Modern",
    defaultAccent: "#0F766E", // Deep Teal
    secondaryColor: "#475569",
    fontFamily: "Inter, sans-serif",
    borderStyle: "accent-bar",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Clean", "Minimal", "Teal", "Contemporary"],
  },
  {
    id: "sleek-indigo",
    name: "Sleek Indigo",
    tagline: "Digital Studio Framing",
    description: "Polished modern aesthetic with vibrant indigo highlights, rounded card containers, and clean sans-serif typography.",
    category: "Modern",
    defaultAccent: "#4F46E5", // Indigo
    secondaryColor: "#6366F1",
    fontFamily: "Inter, sans-serif",
    borderStyle: "frame",
    logoPosition: "top-center",
    metadataLayout: "card-frame",
    tags: ["Indigo", "Sleek", "Studio", "Clean"],
  },
  {
    id: "dynamic-gradient",
    name: "Dynamic Spectrum",
    tagline: "Modern Rounded Fluidity",
    description: "Vibrant contemporary styling with subtle gradient ribbon cues, soft rounded badge containers, and high contrast.",
    category: "Modern",
    defaultAccent: "#7C3AED", // Violet
    secondaryColor: "#EC4899", // Rose
    fontFamily: "Montserrat, sans-serif",
    borderStyle: "accent-bar",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Spectrum", "Gradient", "Dynamic", "Modern"],
  },
  {
    id: "contemporary-split",
    name: "Contemporary Split",
    tagline: "Dual-Tone Contrast Canvas",
    description: "Modern asymmetric split layout separating institutional context from the core project title with crisp margins.",
    category: "Modern",
    defaultAccent: "#0284C7", // Ocean Blue
    secondaryColor: "#0F172A",
    fontFamily: "Inter, sans-serif",
    borderStyle: "asymmetric",
    logoPosition: "sidebar",
    metadataLayout: "split-two-col",
    tags: ["Split", "Dual-Tone", "Contemporary", "Bold"],
  },
  {
    id: "nordic-clean",
    name: "Nordic Clean",
    tagline: "Scandinavian Design Balance",
    description: "Restrained Scandinavian aesthetic with sage and muted slate tones, balanced negative space, and refined typography.",
    category: "Modern",
    defaultAccent: "#15803D", // Forest Sage
    secondaryColor: "#64748B",
    fontFamily: "Inter, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Nordic", "Scandinavian", "Sage", "Minimal"],
  },
  {
    id: "elegant-blue",
    name: "Elegant Blue",
    tagline: "Refined Royal Framing",
    description: "Distinguished sapphire blue framing with subtle drop-card containers, modern geometric accents, and refined typography.",
    category: "Modern",
    defaultAccent: "#2563EB", // Royal Blue
    secondaryColor: "#1E40AF",
    fontFamily: "Montserrat, sans-serif",
    borderStyle: "frame",
    logoPosition: "top-center",
    metadataLayout: "card-frame",
    tags: ["Royal Blue", "Framed", "Elegant", "Card"],
  },
  {
    id: "simple-student-assignment",
    name: "Simple Student Assignment",
    tagline: "Quick Course Submission",
    description: "Straightforward, approachable layout designed for standard homework, course projects, and swift student submissions.",
    category: "Modern",
    defaultAccent: "#4F46E5", // Indigo
    secondaryColor: "#334155",
    fontFamily: "Inter, sans-serif",
    borderStyle: "single",
    logoPosition: "top-center",
    metadataLayout: "card-frame",
    tags: ["Homework", "Student", "Quick", "Accessible"],
  },

  // -----------------------------------------------------------
  // 3. FORMAL ARCHETYPES (16 - 22)
  // -----------------------------------------------------------
  {
    id: "formal-academic",
    name: "Formal Academic",
    tagline: "Rigorous Double-Ruled Institutional",
    description: "Institutional style featuring a perimeter double border, uppercase department badges, and structured submission grid.",
    category: "Formal",
    defaultAccent: "#334155", // Slate
    secondaryColor: "#475569",
    fontFamily: "Merriweather, serif",
    borderStyle: "double",
    logoPosition: "top-center",
    metadataLayout: "split-two-col",
    tags: ["Formal", "Institutional", "Rigorous", "Double-Border"],
  },
  {
    id: "professional-navy",
    name: "Professional Navy",
    tagline: "Prestige Executive Banner",
    description: "Deep navy header banner anchoring institutional credentials with a structured corporate-academic two-column split.",
    category: "Formal",
    defaultAccent: "#0F172A", // Dark Navy
    secondaryColor: "#334155",
    fontFamily: "Calibri, sans-serif",
    borderStyle: "asymmetric",
    logoPosition: "sidebar",
    metadataLayout: "split-two-col",
    tags: ["Navy", "Executive", "Corporate", "Banner"],
  },
  {
    id: "law-legal-brief",
    name: "Legal Jurisprudence",
    tagline: "Appellate & Court Docket Brief",
    description: "High-formality legal cover with docket number box, jurisdictional authority header, and formal attorney/student sign-offs.",
    category: "Formal",
    defaultAccent: "#1E293B", // Obsidian
    secondaryColor: "#475569",
    fontFamily: "'Times New Roman', Times, serif",
    borderStyle: "double",
    logoPosition: "top-center",
    metadataLayout: "centered",
    tags: ["Legal", "Law", "Docket", "Jurisprudence"],
  },
  {
    id: "corporate-governance",
    name: "Corporate Governance",
    tagline: "Boardroom Resolution Standard",
    description: "Sober charcoal and platinum styling engineered for institutional charters, compliance audits, and committee whitepapers.",
    category: "Formal",
    defaultAccent: "#18181B", // Zinc Charcoal
    secondaryColor: "#52525B",
    fontFamily: "Inter, sans-serif",
    borderStyle: "single",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Governance", "Boardroom", "Audit", "Charter"],
  },
  {
    id: "strict-archival",
    name: "Strict Archival",
    tagline: "Preservation Repository Matrix",
    description: "Archival catalog styling with accession number badges, verified depository stamp box, and strict typographic hierarchy.",
    category: "Formal",
    defaultAccent: "#44403C", // Warm Stone
    secondaryColor: "#78716C",
    fontFamily: "Georgia, serif",
    borderStyle: "single",
    logoPosition: "top-center",
    metadataLayout: "card-frame",
    tags: ["Archival", "Library", "Repository", "Historic"],
  },
  {
    id: "university-branding",
    name: "University Branding",
    tagline: "Hero Emblem & Badge Focus",
    description: "Hero emblem placement with institutional ribbon, bold university headers, and official assignment certification badge.",
    category: "Formal",
    defaultAccent: "#B91C1C", // Crimson
    secondaryColor: "#1E3A8A",
    fontFamily: "Merriweather, serif",
    borderStyle: "frame",
    logoPosition: "hero-center",
    metadataLayout: "centered",
    tags: ["Emblem", "Branding", "Certification", "University"],
  },
  {
    id: "diplomatic-whitepaper",
    name: "Diplomatic Whitepaper",
    tagline: "International Relations Protocol",
    description: "High-prestige diplomatic layout with crest header, dual language rubric support, and multilateral policy framing.",
    category: "Formal",
    defaultAccent: "#0C4A6E", // Deep Sky
    secondaryColor: "#0369A1",
    fontFamily: "'Newsreader', Georgia, serif",
    borderStyle: "frame",
    logoPosition: "top-center",
    metadataLayout: "centered",
    tags: ["Diplomatic", "Whitepaper", "Policy", "International"],
  },

  // -----------------------------------------------------------
  // 4. RESEARCH ARCHETYPES (23 - 29)
  // -----------------------------------------------------------
  {
    id: "structured-research",
    name: "Structured Research",
    tagline: "Technical Matrix & Box Grid",
    description: "Laboratory and technical report aesthetic with boxed metadata cells, course code pill badges, and structured member tables.",
    category: "Research",
    defaultAccent: "#0369A1", // Ocean Sky
    secondaryColor: "#0284C7",
    fontFamily: "Roboto, sans-serif",
    borderStyle: "grid",
    logoPosition: "top-left",
    metadataLayout: "grid-box",
    tags: ["Research", "Grid", "Laboratory", "Technical"],
  },
  {
    id: "cyber-systems",
    name: "Cyber & Systems Architecture",
    tagline: "Distributed Computing Specification",
    description: "Computing specification styling with monospace telemetry tags, dark cyan accents, and protocol revision blocks.",
    category: "Research",
    defaultAccent: "#0891B2", // Cyan
    secondaryColor: "#0E7490",
    fontFamily: "'JetBrains Mono', monospace",
    borderStyle: "accent-bar",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Computer Science", "Cyber", "Systems", "Code"],
  },
  {
    id: "engineering-blueprint",
    name: "Engineering Blueprint",
    tagline: "CAD & Technical Draft Aesthetic",
    description: "Architectural blueprint layout with subtle technical coordinate ticks, deep navy backing, and engineering title blocks.",
    category: "Research",
    defaultAccent: "#1D4ED8", // Blueprint Blue
    secondaryColor: "#3B82F6",
    fontFamily: "'Roboto', sans-serif",
    borderStyle: "grid",
    logoPosition: "top-left",
    metadataLayout: "grid-box",
    tags: ["Engineering", "Blueprint", "CAD", "Technical"],
  },
  {
    id: "scientific-laboratory",
    name: "Scientific Laboratory",
    tagline: "Clinical Trial & Lab Experiment",
    description: "Biomedical and chemistry lab report format with hypothesis callout box, lab section badge, and safety certification.",
    category: "Research",
    defaultAccent: "#059669", // Emerald Green
    secondaryColor: "#10B981",
    fontFamily: "Inter, sans-serif",
    borderStyle: "frame",
    logoPosition: "top-center",
    metadataLayout: "card-frame",
    tags: ["Biology", "Chemistry", "Lab", "Experiment"],
  },
  {
    id: "data-science-ai",
    name: "Data Science & AI",
    tagline: "Machine Learning Research Paper",
    description: "AI conference paper aesthetic with neural network accent motifs, metric summary cards, and model architecture headers.",
    category: "Research",
    defaultAccent: "#6366F1", // Indigo AI
    secondaryColor: "#A855F7", // Purple
    fontFamily: "Inter, sans-serif",
    borderStyle: "accent-bar",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["AI", "Data Science", "Machine Learning", "Neural"],
  },
  {
    id: "clinical-medical",
    name: "Clinical & Health Sciences",
    tagline: "Hospital & Medical Case Review",
    description: "Sterile healthcare format featuring clinical department tags, patient case study demarcation, and medical ethics seals.",
    category: "Research",
    defaultAccent: "#0284C7", // Medical Cyan
    secondaryColor: "#0F766E",
    fontFamily: "Inter, sans-serif",
    borderStyle: "frame",
    logoPosition: "top-center",
    metadataLayout: "split-two-col",
    tags: ["Medical", "Healthcare", "Clinical", "Case Study"],
  },
  {
    id: "quantum-physics",
    name: "Quantum Physics & Optics",
    tagline: "Theoretical Physics Monograph",
    description: "Theoretical physics paper styling with mathematical formula display area, institutional observatory badge, and dark accents.",
    category: "Research",
    defaultAccent: "#4338CA", // Deep Indigo
    secondaryColor: "#6366F1",
    fontFamily: "'Newsreader', Georgia, serif",
    borderStyle: "frame",
    logoPosition: "top-center",
    metadataLayout: "centered",
    tags: ["Physics", "Quantum", "Optics", "Theory"],
  },

  // -----------------------------------------------------------
  // 5. BUSINESS & ENTERPRISE ARCHETYPES (30 - 36)
  // -----------------------------------------------------------
  {
    id: "executive-brief",
    name: "Executive Brief",
    tagline: "Fortune 500 Boardroom Cover",
    description: "Polished corporate management report with charcoal and gold pinstripes, executive summary block, and client metadata.",
    category: "Business",
    defaultAccent: "#0F172A", // Slate Dark
    secondaryColor: "#D97706", // Amber Gold
    fontFamily: "Inter, sans-serif",
    borderStyle: "asymmetric",
    logoPosition: "top-left",
    metadataLayout: "split-two-col",
    tags: ["Corporate", "Executive", "Boardroom", "Brief"],
  },
  {
    id: "navy-orange-corp",
    name: "Navy & Orange Corporate",
    tagline: "High-Contrast Enterprise Proposal",
    description: "Bold enterprise proposal aesthetic combining deep corporate navy with dynamic electric orange geometric accent bands.",
    category: "Business",
    defaultAccent: "#0F172A", // Deep Navy
    secondaryColor: "#EA580C", // Vibrant Orange
    fontFamily: "Inter, sans-serif",
    borderStyle: "asymmetric",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Navy", "Orange", "Enterprise", "Proposal"],
  },
  {
    id: "enterprise-blueprint",
    name: "Enterprise Architecture",
    tagline: "Strategic Transformation Plan",
    description: "Clean enterprise consulting layout with deliverable milestone tracker, project phase pills, and executive sponsor matrix.",
    category: "Business",
    defaultAccent: "#1E3A8A", // Blue
    secondaryColor: "#0284C7",
    fontFamily: "Inter, sans-serif",
    borderStyle: "frame",
    logoPosition: "top-center",
    metadataLayout: "card-frame",
    tags: ["Consulting", "Architecture", "Transformation"],
  },
  {
    id: "strategic-proposal",
    name: "Strategic Project Proposal",
    tagline: "Commercial RFP & Bid Document",
    description: "Commercial proposal cover featuring large display typography, RFP solicitation number badge, and client submission panel.",
    category: "Business",
    defaultAccent: "#2563EB", // Royal Blue
    secondaryColor: "#F59E0B",
    fontFamily: "Montserrat, sans-serif",
    borderStyle: "accent-bar",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Proposal", "RFP", "Bid", "Commercial"],
  },
  {
    id: "annual-report-prestige",
    name: "Prestige Annual Report",
    tagline: "Fiscal Review & Shareholder Letter",
    description: "Luxury corporate financial review featuring forest green and metallic gold framing, fiscal year display, and auditor sign-off.",
    category: "Business",
    defaultAccent: "#14532D", // Forest
    secondaryColor: "#CA8A04", // Gold
    fontFamily: "'Playfair Display', Georgia, serif",
    borderStyle: "double",
    logoPosition: "top-center",
    metadataLayout: "centered",
    tags: ["Annual Report", "Shareholder", "Fiscal", "Prestige"],
  },
  {
    id: "financial-audit",
    name: "Financial Audit & Assurance",
    tagline: "GAAP & IFRS Accounting Review",
    description: "Strict accounting and valuation cover with audit clearance stamp, fiscal period box, and senior partner validation line.",
    category: "Business",
    defaultAccent: "#334155", // Slate
    secondaryColor: "#0F766E",
    fontFamily: "Inter, sans-serif",
    borderStyle: "single",
    logoPosition: "top-left",
    metadataLayout: "grid-box",
    tags: ["Audit", "Accounting", "Financial", "Valuation"],
  },
  {
    id: "business-management",
    name: "Business Case Analysis",
    tagline: "HBS Case Study Standard",
    description: "Harvard Business School case study layout with clean masthead, protagonist company badge, and student analytical team box.",
    category: "Business",
    defaultAccent: "#B91C1C", // Crimson
    secondaryColor: "#1E293B",
    fontFamily: "Georgia, serif",
    borderStyle: "single",
    logoPosition: "top-left",
    metadataLayout: "split-two-col",
    tags: ["Case Study", "HBS", "Business", "Management"],
  },

  // -----------------------------------------------------------
  // 6. MINIMALIST ARCHETYPES (37 - 42)
  // -----------------------------------------------------------
  {
    id: "clean-black-white",
    name: "Clean Black and White",
    tagline: "Monochrome High-Contrast",
    description: "High-contrast monochrome editorial layout emphasizing pristine typographic weights, bold divider rules, and zero distraction.",
    category: "Minimalist",
    defaultAccent: "#000000", // Pure Black
    secondaryColor: "#52525B",
    fontFamily: "Inter, sans-serif",
    borderStyle: "single",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Monochrome", "Black and White", "Contrast", "Minimal"],
  },
  {
    id: "swiss-typography",
    name: "Swiss International Style",
    tagline: "Rigorous Grid & Asymmetric Accent",
    description: "Iconic Helvetica-inspired Swiss design with mathematical asymmetry, stark black text, and an iconic minimalist red dot.",
    category: "Minimalist",
    defaultAccent: "#DC2626", // Swiss Red
    secondaryColor: "#18181B",
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Swiss", "Helvetica", "International Style", "Asymmetric"],
  },
  {
    id: "monoline-border",
    name: "Monoline Wireframe",
    tagline: "Delicate 1px Perimeter Framing",
    description: "Understated elegance featuring a hairline 1px border, airy uppercase typography, and centered metadata balance.",
    category: "Minimalist",
    defaultAccent: "#64748B", // Slate
    secondaryColor: "#94A3B8",
    fontFamily: "Inter, sans-serif",
    borderStyle: "single",
    logoPosition: "top-center",
    metadataLayout: "centered",
    tags: ["Wireframe", "Monoline", "Hairline", "Delicate"],
  },
  {
    id: "zen-editorial",
    name: "Zen Editorial",
    tagline: "Japanese Paper Tranquility",
    description: "Subtle Japanese minimalist aesthetic with generous breathing room, refined vertical title positioning, and charcoal tones.",
    category: "Minimalist",
    defaultAccent: "#27272A", // Charcoal
    secondaryColor: "#71717A",
    fontFamily: "'Newsreader', Georgia, serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Zen", "Paper", "Minimalist", "Editorial"],
  },
  {
    id: "low-ink-eco",
    name: "Eco Print Friendly",
    tagline: "Zero Heavy Fills & Low-Ink Economy",
    description: "Designed specifically for home and campus laser printers with zero heavy color ink blocks, clean line art, and high clarity.",
    category: "Minimalist",
    defaultAccent: "#18181B", // Dark Zinc
    secondaryColor: "#52525B",
    fontFamily: "Inter, sans-serif",
    borderStyle: "single",
    logoPosition: "top-left",
    metadataLayout: "split-two-col",
    tags: ["Eco", "Low Ink", "Printer Friendly", "Laser"],
  },
  {
    id: "pure-sans",
    name: "Pure Typography Sans",
    tagline: "Type-Driven Modernism",
    description: "Eliminates all unnecessary ornamentation, allowing pure typography hierarchy and letterform weight to communicate the topic.",
    category: "Minimalist",
    defaultAccent: "#09090B", // Black
    secondaryColor: "#71717A",
    fontFamily: "Inter, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Pure Sans", "Typography", "Hierarchy", "Modern"],
  },

  // -----------------------------------------------------------
  // 7. GEOMETRIC ARCHETYPES (43 - 48)
  // -----------------------------------------------------------
  {
    id: "green-geometric",
    name: "Green Geometric Sustainability",
    tagline: "Emerald Facets & Climate Focus",
    description: "Dynamic emerald polygon geometry engineered for environmental science, sustainability proposals, and agriculture reports.",
    category: "Geometric",
    defaultAccent: "#047857", // Deep Emerald
    secondaryColor: "#10B981", // Light Emerald
    fontFamily: "Inter, sans-serif",
    borderStyle: "asymmetric",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Green", "Geometric", "Sustainability", "Climate"],
  },
  {
    id: "diamond-angle",
    name: "Diamond Angle",
    tagline: "Angular Facets & Coral Dynamics",
    description: "Angular diagonal bands crossing the top-right corner with deep navy base and vibrant coral accent lines.",
    category: "Geometric",
    defaultAccent: "#0F172A", // Deep Navy
    secondaryColor: "#F43F5E", // Rose Coral
    fontFamily: "Montserrat, sans-serif",
    borderStyle: "asymmetric",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Diamond", "Angle", "Diagonal", "Coral"],
  },
  {
    id: "hexagonal-tech",
    name: "Hexagonal Tech",
    tagline: "Honeycomb Nanotech Grid",
    description: "Subtle honeycomb geometry and sharp hexagonal accent cards designed for materials science, robotics, and cybernetics.",
    category: "Geometric",
    defaultAccent: "#0284C7", // Cyan Sky
    secondaryColor: "#0369A1",
    fontFamily: "Roboto, sans-serif",
    borderStyle: "grid",
    logoPosition: "top-left",
    metadataLayout: "grid-box",
    tags: ["Hexagon", "Nanotech", "Robotics", "Grid"],
  },
  {
    id: "circular-focus",
    name: "Circular Focus",
    tagline: "Radial Emblem Framing",
    description: "Dramatic central circular focal point framing the university emblem with radial orbital lines and balanced typography.",
    category: "Geometric",
    defaultAccent: "#4F46E5", // Indigo
    secondaryColor: "#6366F1",
    fontFamily: "Inter, sans-serif",
    borderStyle: "frame",
    logoPosition: "top-center",
    metadataLayout: "centered",
    tags: ["Circle", "Radial", "Emblem", "Orbital"],
  },
  {
    id: "asymmetric-modern",
    name: "Asymmetric Blocks",
    tagline: "Mondrian-Inspired Geometry",
    description: "Staggered primary colored rectangular cards establishing clear hierarchical zones for title, course, and student directory.",
    category: "Geometric",
    defaultAccent: "#2563EB", // Royal Blue
    secondaryColor: "#EF4444", // Red
    fontFamily: "Inter, sans-serif",
    borderStyle: "asymmetric",
    logoPosition: "sidebar",
    metadataLayout: "card-frame",
    tags: ["Mondrian", "Blocks", "Asymmetric", "Color"],
  },
  {
    id: "triangular-vector",
    name: "Triangular Vector",
    tagline: "Dynamic Polygon Vectors",
    description: "Bold triangular chevron accents cutting across the header margin, infusing energy into university team project proposals.",
    category: "Geometric",
    defaultAccent: "#0D9488", // Teal
    secondaryColor: "#14B8A6",
    fontFamily: "Montserrat, sans-serif",
    borderStyle: "asymmetric",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Triangle", "Vector", "Chevron", "Teal"],
  },

  // -----------------------------------------------------------
  // 8. CREATIVE ARCHETYPES (49 - 54)
  // -----------------------------------------------------------
  {
    id: "contemporary-editorial",
    name: "Contemporary Editorial",
    tagline: "Journal & Magazine Aesthetic",
    description: "Academic journal styling with prominent display title, dual-column student/instructor matrix, and publication date stamp.",
    category: "Creative",
    defaultAccent: "#7C3AED", // Violet
    secondaryColor: "#A855F7",
    fontFamily: "Playfair Display, serif",
    borderStyle: "accent-bar",
    logoPosition: "top-left",
    metadataLayout: "split-two-col",
    tags: ["Journal", "Editorial", "Magazine", "Violet"],
  },
  {
    id: "bauhaus-display",
    name: "Bauhaus Display",
    tagline: "Form Follows Function Modernism",
    description: "Iconic Bauhaus homage with primary cobalt, warm amber, and vermilion accents framing heavy geometric typography.",
    category: "Creative",
    defaultAccent: "#1D4ED8", // Cobalt
    secondaryColor: "#EAB308", // Amber
    fontFamily: "Montserrat, sans-serif",
    borderStyle: "asymmetric",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Bauhaus", "Primary Colors", "Modernism", "Display"],
  },
  {
    id: "studio-portfolio",
    name: "Studio Portfolio",
    tagline: "Architecture & Design Exhibition",
    description: "Spacious layout with display typography, project discipline tags, and curator/student designer credits for visual arts.",
    category: "Creative",
    defaultAccent: "#09090B", // Black
    secondaryColor: "#E11D48", // Rose Red
    fontFamily: "Inter, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Portfolio", "Studio", "Architecture", "Design"],
  },
  {
    id: "vibrant-yellow-proposal",
    name: "Vibrant Yellow Proposal",
    tagline: "High-Energy Venture Pitch",
    description: "Electric yellow and jet black banner framing designed for hackathon submissions, entrepreneurship pitches, and startup briefs.",
    category: "Creative",
    defaultAccent: "#CA8A04", // Gold Yellow
    secondaryColor: "#18181B", // Black
    fontFamily: "Montserrat, sans-serif",
    borderStyle: "asymmetric",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Yellow", "Startup", "Hackathon", "High-Energy"],
  },
  {
    id: "violet-magazine",
    name: "Cultural Review Magazine",
    tagline: "Literary & Humanities Masthead",
    description: "Expansive literary publication masthead with elegant serif italic display, issue/volume rubric, and author credentials.",
    category: "Creative",
    defaultAccent: "#6D28D9", // Purple
    secondaryColor: "#9333EA",
    fontFamily: "'Playfair Display', Georgia, serif",
    borderStyle: "frame",
    logoPosition: "top-center",
    metadataLayout: "centered",
    tags: ["Literary", "Humanities", "Magazine", "Review"],
  },
  {
    id: "ocean-gradient",
    name: "Oceanic Marine Research",
    tagline: "Maritime & Oceanography Study",
    description: "Deep oceanic blue and aquamarine styling with wave-inspired clean geometry, research vessel badge, and latitude stamp.",
    category: "Creative",
    defaultAccent: "#0284C7", // Ocean Blue
    secondaryColor: "#0D9488", // Aquamarine
    fontFamily: "Inter, sans-serif",
    borderStyle: "accent-bar",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Ocean", "Marine", "Aquamarine", "Environmental"],
  },
];

/**
 * Retrieves a template by ID, falling back to Classic University if not found.
 */
export function getCoverTemplateById(id: string): ExtendedCoverTemplateDefinition {
  return (
    COVER_TEMPLATES_REGISTRY.find((t) => t.id === id) ||
    COVER_TEMPLATES_REGISTRY.find((t) => t.id === "classic-university") ||
    COVER_TEMPLATES_REGISTRY[0]!
  );
}

/**
 * Convenience helper to generate cover canvas elements directly from template ID or object
 */
export function generateCoverElements(
  templateOrId: string | ExtendedCoverTemplateDefinition,
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const template = typeof templateOrId === "string" ? getCoverTemplateById(templateOrId) : templateOrId;
  return generateDefaultCoverElements(template, meta, pageW, pageH);
}

