/**
 * DocuMind Universal Cover-Page Template Registry & Canvas Schema
 * Contains 75+ distinct, modern editable cover-page templates spanning 8 categories:
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
function postProcessCoverElements(
  elements: CanvasCoverElement[],
  meta: AssignmentMetadata,
  pageW: number,
  pageH: number,
): CanvasCoverElement[] {
  const is169 = pageH <= 800; // 16:9 widescreen presentation canvas (e.g. 1333x750)
  const processed = [...elements];

  // 1. Enforce Logo Placement in Top-Left Corner
  if (meta.logoDataUrl) {
    const existingLogoIdx = processed.findIndex(
      (e) => e.id === "cover-logo" || e.name?.toLowerCase().includes("logo"),
    );
    const logoX = 60;
    const logoY = is169 ? 35 : 48;
    const logoW = 140;
    const logoH = is169 ? 60 : 65;

    if (existingLogoIdx >= 0) {
      processed[existingLogoIdx] = {
        ...processed[existingLogoIdx]!,
        x: logoX,
        y: logoY,
        width: logoW,
        height: logoH,
        imageUrl: meta.logoDataUrl,
        imageFit: "contain",
      };
    } else {
      const maxZ = Math.max(...processed.map((e) => e.zIndex || 1), 10) + 1;
      processed.push({
        id: "cover-logo",
        type: "image",
        name: "Institutional Logo",
        x: logoX,
        y: logoY,
        width: logoW,
        height: logoH,
        imageUrl: meta.logoDataUrl,
        imageFit: "contain",
        zIndex: maxZ,
      });
    }

    // 2. Prevent Logo & Text / Shapes Overriding Each Other
    for (let i = 0; i < processed.length; i++) {
      const el = processed[i]!;
      if (el.id === "cover-logo") continue;

      if (el.type === "text" || el.type === "badge") {
        if (el.x < 220 && el.y < 110) {
          if (el.isMetadataField === "assignmentTitle" || el.id?.includes("title")) {
            el.y = Math.max(el.y, is169 ? 120 : 135);
          } else {
            el.x = 220;
            el.width = Math.max(200, Math.min(el.width, pageW - 240));
          }
        }
      }
    }
  }

  // 3. Page-Filling Balance for 16:9 Widescreen
  if (is169) {
    const metaElements = processed.filter(
      (e) =>
        e.type === "text" &&
        e.id !== "canvas-bg" &&
        !e.id?.includes("title") &&
        !e.id?.includes("brand") &&
        !e.id?.includes("footer") &&
        e.y > 220,
    );

    if (metaElements.length > 0) {
      const minY = Math.min(...metaElements.map((e) => e.y));
      const maxY = Math.max(...metaElements.map((e) => e.y + e.height));
      const span = maxY - minY;

      if (span < 200 && maxY < 580) {
        const targetStart = 340;
        const targetEnd = 620;
        const scaleFactor = (targetEnd - targetStart) / Math.max(span, 1);

        for (const el of metaElements) {
          el.y = Math.round(targetStart + (el.y - minY) * Math.min(scaleFactor, 1.8));
          if (el.fontSize && el.fontSize < 16) {
            el.fontSize = Math.min(18, el.fontSize + 2);
          }
        }
      }
    }
  }

  // 4. Remove Fake Placeholders (reallygreatsite, +123-456-7890)
  const realAcademicContact = [
    meta.universityName,
    meta.department,
    meta.submissionDate ? `Date: ${meta.submissionDate}` : "",
    [meta.academicYear, meta.semester].filter(Boolean).join(" · "),
  ].filter(Boolean).join("  •  ");

  for (const el of processed) {
    if (el.type === "text" && el.text) {
      if (el.text.includes("reallygreatsite.com") || el.text.includes("+123-456-7890")) {
        if (realAcademicContact) {
          el.text = realAcademicContact;
        }
      }
    }
  }

  return processed;
}

export function generateDefaultCoverElements(
  template: ExtendedCoverTemplateDefinition,
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  if (template.generateElements) {
    const generated = template.generateElements(meta, pageW, pageH);
    return postProcessCoverElements(generated, meta, pageW, pageH);
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

  return postProcessCoverElements(elements, meta, pageW, pageH);
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

  return postProcessCoverElements(elements, meta, pageW, pageH);
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

  return postProcessCoverElements(elements, meta, pageW, pageH);
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

  return postProcessCoverElements(elements, meta, pageW, pageH);
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

  return postProcessCoverElements(elements, meta, pageW, pageH);
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

  return postProcessCoverElements(elements, meta, pageW, pageH);
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

  return postProcessCoverElements(elements, meta, pageW, pageH);
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

  return postProcessCoverElements(elements, meta, pageW, pageH);
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

  return postProcessCoverElements(elements, meta, pageW, pageH);
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

  return postProcessCoverElements(elements, meta, pageW, pageH);
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

  return postProcessCoverElements(elements, meta, pageW, pageH);
}

// -------------------------------------------------------------

// -------------------------------------------------------------
// -------------------------------------------------------------
// PREMIER MODERN CANVA-GRADE GENERATORS (70+ Collection Expansion)
// -------------------------------------------------------------

export function generateCanvaVioletAuroraWave(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const violet = meta.accentColor || "#4C1D95";
  const cyan = "#06B6D4";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Project Team")
    : (meta.studentName || "Benjamin Shah");
  const brand = meta.universityName || meta.department || "Academic Research Studio";
  const title = meta.assignmentTitle || "Comprehensive Research Proposal";
  const year = meta.academicYear || "2026";
  const subtitle = meta.courseName || meta.courseCode || "Next-Generation Systems Architecture & Analysis";

  elements.push({ id: "canvas-bg", type: "shape", name: "Page Background", shapeType: "rectangle", x: 0, y: 0, width: pageW, height: pageH, fillColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "aurora-top-cyan", type: "shape", name: "Top Cyan Wave", shapeType: "svg", x: 0, y: 0, width: 490, height: 225, fillColor: cyan, svgContent: `<svg viewBox="0 0 490 225" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 490,0 C 410,105 290,185 165,185 C 95,185 30,205 0,225 Z" fill="${cyan}" opacity="0.85" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "aurora-top-violet", type: "shape", name: "Top Violet Wave", shapeType: "svg", x: 0, y: 0, width: 455, height: 198, fillColor: violet, svgContent: `<svg viewBox="0 0 455 198" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 455,0 C 375,88 265,162 145,162 C 82,162 28,182 0,198 Z" fill="${violet}" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "aurora-brand-pill", type: "badge", name: "Brand Pill Badge", shapeType: "badge-pill", x: pageW - 220, y: 45, width: 160, height: 40, fillColor: violet, borderRadius: 20, zIndex: zIndex++ });
  elements.push({ id: "aurora-brand-text", type: "text", name: "Brand Label Text", x: pageW - 215, y: 54, width: 150, height: 22, text: brand, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 12, fontWeight: "700", textAlign: "center", textColor: "#FFFFFF", letterSpacing: 1, zIndex: zIndex++ });
  elements.push({ id: "aurora-title-main", type: "text", name: "Proposal Title", x: 80, y: 280, width: pageW - 160, height: 110, text: `${title} ${year}`, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 48, fontWeight: "800", textColor: violet, lineHeight: 1.1, letterSpacing: -1, isMetadataField: "assignmentTitle", zIndex: zIndex++ });
  elements.push({ id: "aurora-subtitle", type: "text", name: "Proposal Subtitle", x: 80, y: 400, width: pageW - 160, height: 40, text: subtitle, fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "aurora-meta-label", type: "text", name: "Prepared by Label", x: 80, y: 480, width: 320, height: 20, text: "Prepared by :", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "aurora-meta-name", type: "text", name: "Author Name", x: 80, y: 505, width: 360, height: 32, text: author, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 20, fontWeight: "800", textColor: violet, isMetadataField: "studentName", zIndex: zIndex++ });

  if (meta.studentId) {
    elements.push({ id: "aurora-meta-id", type: "text", name: "Student ID", x: 80, y: 540, width: 320, height: 22, text: `Student ID: ${meta.studentId}`, fontFamily: "monospace", fontSize: 12, fontWeight: "600", textColor: "#64748B", isMetadataField: "studentId", zIndex: zIndex++ });
  }
  if (meta.instructorName) {
    elements.push({ id: "aurora-instructor", type: "text", name: "Instructor", x: 80, y: meta.studentId ? 566 : 542, width: 360, height: 24, text: `Submitted to: ${meta.instructorName}`, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: "600", textColor: "#475569", isMetadataField: "instructorName", zIndex: zIndex++ });
  }

  elements.push({ id: "aurora-br-cyan", type: "shape", name: "Bottom-Right Cyan Wave", shapeType: "svg", x: pageW - 390, y: pageH - 260, width: 390, height: 260, fillColor: cyan, svgContent: `<svg viewBox="0 0 390 260" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,260 C 140,260 220,170 390,85 L 390,260 Z" fill="${cyan}" opacity="0.85" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "aurora-br-violet", type: "shape", name: "Bottom-Right Violet Wave", shapeType: "svg", x: pageW - 360, y: pageH - 230, width: 360, height: 230, fillColor: violet, svgContent: `<svg viewBox="0 0 360 230" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,230 C 130,230 210,150 360,75 L 360,230 Z" fill="${violet}" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "aurora-footer-contact", type: "text", name: "Contact Information", x: 80, y: pageH - 120, width: 360, height: 55, text: "📞 +123-456-7890\n✉️ contact@institution.edu\n🌐 www.institution.edu", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "500", textColor: "#64748B", lineHeight: 1.5, zIndex: zIndex++ });
  return postProcessCoverElements(elements, meta, pageW, pageH);
}

export function generateCanvaTokyoNeomodern(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const obsidian = meta.accentColor || "#0F172A";
  const lime = "#84CC16";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Development Lead")
    : (meta.studentName || "Kaito Takahashi");
  const brand = meta.universityName || meta.department || "Tokyo Tech Lab";
  const title = meta.assignmentTitle || "NEO-SYSTEMS BLUEPRINT";
  const year = meta.academicYear || "2026";
  const subtitle = meta.courseName || meta.courseCode || "High-Frequency Distributed Consensus Protocol";

  elements.push({ id: "canvas-bg", type: "shape", name: "Page Background", shapeType: "rectangle", x: 0, y: 0, width: pageW, height: pageH, fillColor: "#FAFAFA", zIndex: zIndex++ });
  elements.push({ id: "tokyo-header-bar", type: "shape", name: "Top Header Obsidian Block", shapeType: "rectangle", x: 0, y: 0, width: pageW, height: 170, fillColor: obsidian, zIndex: zIndex++ });
  elements.push({ id: "tokyo-lime-ribbon", type: "shape", name: "Lime Accent Rule", shapeType: "rectangle", x: 0, y: 170, width: pageW, height: 12, fillColor: lime, zIndex: zIndex++ });
  elements.push({ id: "tokyo-spec-badge", type: "badge", name: "Spec Badge", shapeType: "badge-pill", x: 60, y: 55, width: 220, height: 32, fillColor: "#1E293B", borderRadius: 4, zIndex: zIndex++ });
  elements.push({ id: "tokyo-spec-text", type: "text", name: "Spec Badge Text", x: 70, y: 62, width: 200, height: 20, text: `[ TECH // SPEC ${year} ]`, fontFamily: "monospace", fontSize: 11, fontWeight: "700", textAlign: "left", textColor: lime, letterSpacing: 2, zIndex: zIndex++ });
  elements.push({ id: "tokyo-brand-text", type: "text", name: "Brand Text", x: pageW - 280, y: 60, width: 220, height: 24, text: brand.toUpperCase(), fontFamily: "monospace", fontSize: 12, fontWeight: "700", textAlign: "right", textColor: "#F8FAFC", letterSpacing: 1.5, zIndex: zIndex++ });
  elements.push({ id: "tokyo-dot-matrix", type: "shape", name: "Dot Matrix Accent", shapeType: "svg", x: pageW - 90, y: 220, width: 40, height: 80, fillColor: obsidian, svgContent: `<svg viewBox="0 0 40 80" width="100%" height="100%"><circle cx="8" cy="10" r="3" fill="${obsidian}" opacity="0.6"/><circle cx="24" cy="10" r="3" fill="${obsidian}" opacity="0.6"/><circle cx="8" cy="30" r="3" fill="${obsidian}" opacity="0.6"/><circle cx="24" cy="30" r="3" fill="${obsidian}" opacity="0.6"/><circle cx="8" cy="50" r="3" fill="${obsidian}" opacity="0.6"/><circle cx="24" cy="50" r="3" fill="${obsidian}" opacity="0.6"/><circle cx="8" cy="70" r="3" fill="${obsidian}" opacity="0.6"/><circle cx="24" cy="70" r="3" fill="${obsidian}" opacity="0.6"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "tokyo-title", type: "text", name: "Title Main", x: 60, y: 240, width: pageW - 180, height: 130, text: title, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 46, fontWeight: "800", textColor: obsidian, lineHeight: 1.05, letterSpacing: -1.5, isMetadataField: "assignmentTitle", zIndex: zIndex++ });
  elements.push({ id: "tokyo-subtitle", type: "text", name: "Subtitle", x: 60, y: 390, width: pageW - 180, height: 45, text: subtitle, fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: "500", textColor: "#475569", zIndex: zIndex++ });
  elements.push({ id: "tokyo-author-card", type: "shape", name: "Author Card", shapeType: "rectangle", x: 60, y: 475, width: pageW - 120, height: 105, fillColor: "#F1F5F9", borderColor: lime, borderWidth: 3, borderRadius: 2, zIndex: zIndex++ });
  elements.push({ id: "tokyo-author-label", type: "text", name: "Author Label", x: 80, y: 490, width: 300, height: 18, text: "PRIMARY RESEARCHER / AUTHOR:", fontFamily: "monospace", fontSize: 10, fontWeight: "700", textColor: "#64748B", letterSpacing: 1.5, zIndex: zIndex++ });
  elements.push({ id: "tokyo-author-name", type: "text", name: "Author Name", x: 80, y: 510, width: 400, height: 30, text: author, fontFamily: "Inter, sans-serif", fontSize: 21, fontWeight: "800", textColor: obsidian, isMetadataField: "studentName", zIndex: zIndex++ });

  if (meta.instructorName) {
    elements.push({ id: "tokyo-instructor", type: "text", name: "Instructor", x: 80, y: 545, width: 400, height: 22, text: `Reviewed by: ${meta.instructorName}`, fontFamily: "monospace", fontSize: 11, fontWeight: "600", textColor: "#475569", isMetadataField: "instructorName", zIndex: zIndex++ });
  }

  elements.push({ id: "tokyo-bottom-poly", type: "shape", name: "Bottom Accent Polygon", shapeType: "svg", x: pageW - 280, y: pageH - 160, width: 280, height: 160, fillColor: obsidian, svgContent: `<svg viewBox="0 0 280 160" width="100%" height="100%" preserveAspectRatio="none"><polygon points="60,160 280,0 280,160" fill="${obsidian}" /><polygon points="0,160 80,160 280,10 260,0" fill="${lime}" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "tokyo-footer-text", type: "text", name: "Footer Text", x: 60, y: pageH - 65, width: 400, height: 30, text: "VERIFIED BLUEPRINT • ACADEMIC SPECIFICATION • ISO 2026", fontFamily: "monospace", fontSize: 9.5, fontWeight: "600", textColor: "#94A3B8", letterSpacing: 1, zIndex: zIndex++ });
  return postProcessCoverElements(elements, meta, pageW, pageH);
}

export function generateCanvaScandinavianFrost(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const teal = meta.accentColor || "#0D9488";
  const mint = "#5EEAD4";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Nordic Research Collective")
    : (meta.studentName || "Astrid Lindgren");
  const brand = meta.universityName || meta.department || "Stockholm University";
  const title = meta.assignmentTitle || "Nordic Sustainable Architecture";
  const year = meta.academicYear || "2026";
  const subtitle = meta.courseName || meta.courseCode || "Environmental Lifecycle Assessment & Passive Heating";

  elements.push({ id: "canvas-bg", type: "shape", name: "Page Background", shapeType: "rectangle", x: 0, y: 0, width: pageW, height: pageH, fillColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "frost-top-mint", type: "shape", name: "Mint Ribbon Underlay", shapeType: "svg", x: 0, y: 0, width: 460, height: 210, fillColor: mint, svgContent: `<svg viewBox="0 0 460 210" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 460,0 C 370,100 270,170 140,170 C 70,170 20,190 0,210 Z" fill="${mint}" opacity="0.6" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "frost-top-teal", type: "shape", name: "Top Teal Wave", shapeType: "svg", x: 0, y: 0, width: 420, height: 185, fillColor: teal, svgContent: `<svg viewBox="0 0 420 185" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 420,0 C 340,80 240,150 120,150 C 60,150 20,170 0,185 Z" fill="${teal}" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "frost-brand-pill", type: "badge", name: "Brand Badge", shapeType: "badge-pill", x: pageW - 200, y: 45, width: 140, height: 36, fillColor: teal, borderRadius: 18, zIndex: zIndex++ });
  elements.push({ id: "frost-brand-text", type: "text", name: "Brand Text", x: pageW - 195, y: 53, width: 130, height: 20, text: brand, fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "700", textAlign: "center", textColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "frost-title", type: "text", name: "Title Main", x: 80, y: 270, width: pageW - 160, height: 110, text: `${title} ${year}`, fontFamily: "Inter, sans-serif", fontSize: 44, fontWeight: "700", textColor: "#0F172A", lineHeight: 1.15, letterSpacing: -1, isMetadataField: "assignmentTitle", zIndex: zIndex++ });
  elements.push({ id: "frost-subtitle", type: "text", name: "Subtitle", x: 80, y: 395, width: pageW - 160, height: 45, text: subtitle, fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: "400", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "frost-divider", type: "divider", name: "Thin Divider Rule", x: 80, y: 460, width: 120, height: 3, fillColor: teal, zIndex: zIndex++ });
  elements.push({ id: "frost-meta-label", type: "text", name: "Author Label", x: 80, y: 485, width: 300, height: 18, text: "SUBMITTED BY :", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "600", textColor: "#94A3B8", letterSpacing: 1, zIndex: zIndex++ });
  elements.push({ id: "frost-meta-name", type: "text", name: "Author Name", x: 80, y: 508, width: 360, height: 30, text: author, fontFamily: "Inter, sans-serif", fontSize: 19, fontWeight: "700", textColor: teal, isMetadataField: "studentName", zIndex: zIndex++ });

  if (meta.instructorName) {
    elements.push({ id: "frost-instructor", type: "text", name: "Instructor", x: 80, y: 544, width: 360, height: 22, text: `Under Academic Supervision: ${meta.instructorName}`, fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: "500", textColor: "#64748B", isMetadataField: "instructorName", zIndex: zIndex++ });
  }

  elements.push({ id: "frost-br-mint", type: "shape", name: "Bottom Mint Wave", shapeType: "svg", x: pageW - 350, y: pageH - 240, width: 350, height: 240, fillColor: mint, svgContent: `<svg viewBox="0 0 350 240" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,240 C 120,240 190,160 350,80 L 350,240 Z" fill="${mint}" opacity="0.6" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "frost-br-teal", type: "shape", name: "Bottom Teal Wave", shapeType: "svg", x: pageW - 320, y: pageH - 210, width: 320, height: 210, fillColor: teal, svgContent: `<svg viewBox="0 0 320 210" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,210 C 110,210 180,140 320,70 L 320,210 Z" fill="${teal}" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "frost-footer", type: "text", name: "Footer Details", x: 80, y: pageH - 95, width: 350, height: 40, text: "Stockholm • Faculty of Natural Sciences\nwww.su.se • official academic document", fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: "400", textColor: "#64748B", lineHeight: 1.4, zIndex: zIndex++ });
  return postProcessCoverElements(elements, meta, pageW, pageH);
}

export function generateCanvaCrimsonExecutiveCurve(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const crimson = meta.accentColor || "#991B1B";
  const gold = "#D97706";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Executive Committee")
    : (meta.studentName || "Arthur Pendelton");
  const brand = meta.universityName || meta.department || "Vanguard & Partners";
  const title = meta.assignmentTitle || "Executive Strategic Assessment";
  const year = meta.academicYear || "2026";
  const subtitle = meta.courseName || meta.courseCode || "Global Market Expansion & Capital Allocation Framework";

  elements.push({ id: "canvas-bg", type: "shape", name: "Page Background", shapeType: "rectangle", x: 0, y: 0, width: pageW, height: pageH, fillColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "crimson-top-gold", type: "shape", name: "Top Gold Wave", shapeType: "svg", x: 0, y: 0, width: 480, height: 220, fillColor: gold, svgContent: `<svg viewBox="0 0 480 220" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 480,0 C 400,100 280,180 160,180 C 90,180 30,200 0,220 Z" fill="${gold}" opacity="0.85" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "crimson-top-crimson", type: "shape", name: "Top Crimson Wave", shapeType: "svg", x: 0, y: 0, width: 450, height: 195, fillColor: crimson, svgContent: `<svg viewBox="0 0 450 195" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 450,0 C 370,85 260,160 140,160 C 80,160 25,180 0,195 Z" fill="${crimson}" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "crimson-brand-pill", type: "badge", name: "Brand Badge", shapeType: "badge-pill", x: pageW - 220, y: 45, width: 160, height: 40, fillColor: crimson, borderRadius: 20, zIndex: zIndex++ });
  elements.push({ id: "crimson-brand-text", type: "text", name: "Brand Text", x: pageW - 215, y: 54, width: 150, height: 22, text: brand, fontFamily: "Georgia, serif", fontSize: 12, fontWeight: "700", textAlign: "center", textColor: "#FFFFFF", letterSpacing: 1, zIndex: zIndex++ });
  elements.push({ id: "crimson-title", type: "text", name: "Title Main", x: 80, y: 280, width: pageW - 160, height: 110, text: `${title} ${year}`, fontFamily: "Georgia, 'Playfair Display', serif", fontSize: 44, fontWeight: "700", textColor: crimson, lineHeight: 1.15, letterSpacing: -0.5, isMetadataField: "assignmentTitle", zIndex: zIndex++ });
  elements.push({ id: "crimson-subtitle", type: "text", name: "Subtitle", x: 80, y: 405, width: pageW - 160, height: 45, text: subtitle, fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "crimson-meta-label", type: "text", name: "Prepared by Label", x: 80, y: 485, width: 320, height: 20, text: "Prepared by :", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "crimson-meta-name", type: "text", name: "Author Name", x: 80, y: 510, width: 360, height: 32, text: author, fontFamily: "Georgia, serif", fontSize: 21, fontWeight: "700", textColor: crimson, isMetadataField: "studentName", zIndex: zIndex++ });

  if (meta.instructorName) {
    elements.push({ id: "crimson-instructor", type: "text", name: "Instructor", x: 80, y: 548, width: 360, height: 24, text: `Presented to: ${meta.instructorName}`, fontFamily: "Georgia, serif", fontSize: 12, fontWeight: "600", textColor: "#475569", isMetadataField: "instructorName", zIndex: zIndex++ });
  }

  elements.push({ id: "crimson-br-gold", type: "shape", name: "Bottom Gold Wave", shapeType: "svg", x: pageW - 380, y: pageH - 250, width: 380, height: 250, fillColor: gold, svgContent: `<svg viewBox="0 0 380 250" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,250 C 130,250 210,160 380,80 L 380,250 Z" fill="${gold}" opacity="0.85" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "crimson-br-crimson", type: "shape", name: "Bottom Crimson Wave", shapeType: "svg", x: pageW - 350, y: pageH - 220, width: 350, height: 220, fillColor: crimson, svgContent: `<svg viewBox="0 0 350 220" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,220 C 120,220 200,140 350,70 L 350,220 Z" fill="${crimson}" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "crimson-footer", type: "text", name: "Footer Coordinates", x: 80, y: pageH - 110, width: 360, height: 45, text: "Executive Confidential • Board Review", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  return postProcessCoverElements(elements, meta, pageW, pageH);
}

export function generateCanvaSunsetHorizon(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const rose = meta.accentColor || "#E11D48";
  const amber = "#F59E0B";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Creative Direction Group")
    : (meta.studentName || "Maya Lin");
  const brand = meta.universityName || meta.department || "Design & Media Institute";
  const title = meta.assignmentTitle || "Visual Brand Strategy";
  const year = meta.academicYear || "2026";
  const subtitle = meta.courseName || meta.courseCode || "Contemporary Design Systems & Digital Identity";

  elements.push({ id: "canvas-bg", type: "shape", name: "Page Background", shapeType: "rectangle", x: 0, y: 0, width: pageW, height: pageH, fillColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "sunset-top-amber", type: "shape", name: "Top Amber Wave", shapeType: "svg", x: 0, y: 0, width: 490, height: 225, fillColor: amber, svgContent: `<svg viewBox="0 0 490 225" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 490,0 C 410,105 290,185 165,185 C 95,185 30,205 0,225 Z" fill="${amber}" opacity="0.85" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "sunset-top-rose", type: "shape", name: "Top Rose Wave", shapeType: "svg", x: 0, y: 0, width: 455, height: 198, fillColor: rose, svgContent: `<svg viewBox="0 0 455 198" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 455,0 C 375,88 265,162 145,162 C 82,162 28,182 0,198 Z" fill="${rose}" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "sunset-brand-pill", type: "badge", name: "Brand Badge", shapeType: "badge-pill", x: pageW - 220, y: 45, width: 160, height: 40, fillColor: rose, borderRadius: 20, zIndex: zIndex++ });
  elements.push({ id: "sunset-brand-text", type: "text", name: "Brand Text", x: pageW - 215, y: 54, width: 150, height: 22, text: brand, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: "700", textAlign: "center", textColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "sunset-title", type: "text", name: "Title Main", x: 80, y: 280, width: pageW - 160, height: 110, text: `${title} ${year}`, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 48, fontWeight: "800", textColor: rose, lineHeight: 1.1, letterSpacing: -1, isMetadataField: "assignmentTitle", zIndex: zIndex++ });
  elements.push({ id: "sunset-subtitle", type: "text", name: "Subtitle", x: 80, y: 400, width: pageW - 160, height: 40, text: subtitle, fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "sunset-meta-label", type: "text", name: "Prepared by Label", x: 80, y: 480, width: 320, height: 20, text: "Prepared by :", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "sunset-meta-name", type: "text", name: "Author Name", x: 80, y: 505, width: 360, height: 32, text: author, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 20, fontWeight: "800", textColor: rose, isMetadataField: "studentName", zIndex: zIndex++ });

  if (meta.instructorName) {
    elements.push({ id: "sunset-instructor", type: "text", name: "Instructor", x: 80, y: 544, width: 360, height: 24, text: `Submitted to: ${meta.instructorName}`, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: "600", textColor: "#475569", isMetadataField: "instructorName", zIndex: zIndex++ });
  }

  elements.push({ id: "sunset-br-amber", type: "shape", name: "Bottom Amber Wave", shapeType: "svg", x: pageW - 390, y: pageH - 260, width: 390, height: 260, fillColor: amber, svgContent: `<svg viewBox="0 0 390 260" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,260 C 140,260 220,170 390,85 L 390,260 Z" fill="${amber}" opacity="0.85" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "sunset-br-rose", type: "shape", name: "Bottom Rose Wave", shapeType: "svg", x: pageW - 360, y: pageH - 230, width: 360, height: 230, fillColor: rose, svgContent: `<svg viewBox="0 0 360 230" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,230 C 130,230 210,150 360,75 L 360,230 Z" fill="${rose}" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "sunset-footer", type: "text", name: "Footer Contact", x: 80, y: pageH - 120, width: 360, height: 55, text: "📞 +123-456-7890\n✉️ contact@organization.org\n🌐 www.organization.org", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "500", textColor: "#64748B", lineHeight: 1.5, zIndex: zIndex++ });
  return postProcessCoverElements(elements, meta, pageW, pageH);
}

export function generateCanvaCyberHexMesh(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const cobalt = meta.accentColor || "#2563EB";
  const cyan = "#06B6D4";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Security Research Squad")
    : (meta.studentName || "Devon Vance");
  const brand = meta.universityName || meta.department || "Cyber Defense Institute";
  const title = meta.assignmentTitle || "FAULT-TOLERANT ARCHITECTURE";
  const year = meta.academicYear || "2026";
  const subtitle = meta.courseName || meta.courseCode || "Zero-Trust Distributed Cryptographic Consensus Engine";

  elements.push({ id: "canvas-bg", type: "shape", name: "Page Background", shapeType: "rectangle", x: 0, y: 0, width: pageW, height: pageH, fillColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "cyber-top-poly", type: "shape", name: "Top Cyber Polygon", shapeType: "svg", x: 0, y: 0, width: 440, height: 180, fillColor: cobalt, svgContent: `<svg viewBox="0 0 440 180" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 440,0 360,180 0,180" fill="${cobalt}" /><polygon points="360,0 440,0 390,180 310,180" fill="${cyan}" opacity="0.8" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "cyber-spec-badge", type: "badge", name: "Badge Pill", shapeType: "badge-pill", x: pageW - 220, y: 45, width: 160, height: 38, fillColor: cobalt, borderRadius: 19, zIndex: zIndex++ });
  elements.push({ id: "cyber-badge-text", type: "text", name: "Badge Text", x: pageW - 215, y: 53, width: 150, height: 20, text: brand, fontFamily: "monospace", fontSize: 11, fontWeight: "700", textAlign: "center", textColor: "#FFFFFF", letterSpacing: 1, zIndex: zIndex++ });
  elements.push({ id: "cyber-dot-matrix", type: "shape", name: "Hex Dot Cluster", shapeType: "svg", x: pageW - 80, y: 160, width: 40, height: 80, fillColor: cyan, svgContent: `<svg viewBox="0 0 40 80" width="100%" height="100%"><circle cx="8" cy="10" r="3" fill="${cyan}"/><circle cx="24" cy="10" r="3" fill="${cyan}"/><circle cx="8" cy="30" r="3" fill="${cyan}"/><circle cx="24" cy="30" r="3" fill="${cyan}"/><circle cx="8" cy="50" r="3" fill="${cyan}"/><circle cx="24" cy="50" r="3" fill="${cyan}"/><circle cx="8" cy="70" r="3" fill="${cyan}"/><circle cx="24" cy="70" r="3" fill="${cyan}"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "cyber-title", type: "text", name: "Title Main", x: 75, y: 260, width: pageW - 150, height: 120, text: `${title} // ${year}`, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 44, fontWeight: "800", textColor: cobalt, lineHeight: 1.1, letterSpacing: -1, isMetadataField: "assignmentTitle", zIndex: zIndex++ });
  elements.push({ id: "cyber-subtitle", type: "text", name: "Subtitle", x: 75, y: 395, width: pageW - 150, height: 45, text: subtitle, fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: "500", textColor: "#475569", zIndex: zIndex++ });
  elements.push({ id: "cyber-author-box", type: "shape", name: "Author Box", shapeType: "rectangle", x: 75, y: 470, width: pageW - 150, height: 95, fillColor: "#F8FAFC", borderColor: "#E2E8F0", borderWidth: 1, borderRadius: 8, zIndex: zIndex++ });
  elements.push({ id: "cyber-meta-label", type: "text", name: "Author Label", x: 95, y: 485, width: 300, height: 18, text: "PRINCIPAL INVESTIGATOR // AUTHOR:", fontFamily: "monospace", fontSize: 10, fontWeight: "700", textColor: "#64748B", letterSpacing: 1.5, zIndex: zIndex++ });
  elements.push({ id: "cyber-meta-name", type: "text", name: "Author Name", x: 95, y: 508, width: 380, height: 32, text: author, fontFamily: "Inter, sans-serif", fontSize: 20, fontWeight: "800", textColor: cobalt, isMetadataField: "studentName", zIndex: zIndex++ });

  if (meta.instructorName) {
    elements.push({ id: "cyber-instructor", type: "text", name: "Instructor", x: 95, y: 540, width: 380, height: 20, text: `Reviewer: ${meta.instructorName}`, fontFamily: "monospace", fontSize: 11, fontWeight: "600", textColor: "#475569", isMetadataField: "instructorName", zIndex: zIndex++ });
  }

  elements.push({ id: "cyber-br-poly", type: "shape", name: "Bottom Cyber Poly", shapeType: "svg", x: pageW - 320, y: pageH - 200, width: 320, height: 200, fillColor: cobalt, svgContent: `<svg viewBox="0 0 320 200" width="100%" height="100%" preserveAspectRatio="none"><polygon points="80,200 320,0 320,200" fill="${cobalt}" /><polygon points="0,200 120,200 320,40 200,0" fill="${cyan}" opacity="0.85" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "cyber-footer", type: "text", name: "Footer Text", x: 75, y: pageH - 85, width: 350, height: 35, text: "CLASSIFIED SPECIFICATION • SYSTEM CORE v4.2", fontFamily: "monospace", fontSize: 10, fontWeight: "600", textColor: "#94A3B8", letterSpacing: 1, zIndex: zIndex++ });
  return postProcessCoverElements(elements, meta, pageW, pageH);
}

export function generateCanvaAcademicCrestModern(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const navy = meta.accentColor || "#1E3A8A";
  const gold = "#EAB308";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Graduate Research Syndicate")
    : (meta.studentName || "Eleanor Vance");
  const brand = meta.universityName || meta.department || "Oxford Collegiate Faculty";
  const title = meta.assignmentTitle || "Constitutional Jurisprudence & Governance";
  const year = meta.academicYear || "2026";
  const subtitle = meta.courseName || meta.courseCode || "Comparative Treaties in Public Law & Statutory Interpretation";

  elements.push({ id: "canvas-bg", type: "shape", name: "Page Background", shapeType: "rectangle", x: 0, y: 0, width: pageW, height: pageH, fillColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "crest-top-gold", type: "shape", name: "Top Gold Arch", shapeType: "svg", x: 0, y: 0, width: pageW, height: 165, fillColor: gold, svgContent: `<svg viewBox="0 0 794 165" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 794,0 L 794,145 C 550,165 250,165 0,145 Z" fill="${gold}" opacity="0.85" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "crest-top-navy", type: "shape", name: "Top Navy Arch", shapeType: "svg", x: 0, y: 0, width: pageW, height: 150, fillColor: navy, svgContent: `<svg viewBox="0 0 794 150" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 794,0 L 794,130 C 550,150 250,150 0,130 Z" fill="${navy}" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "crest-inst-text", type: "text", name: "Institution Text", x: 60, y: 50, width: pageW - 120, height: 26, text: brand.toUpperCase(), fontFamily: "Georgia, serif", fontSize: 14, fontWeight: "700", textAlign: "center", textColor: "#FFFFFF", letterSpacing: 2.5, zIndex: zIndex++ });
  elements.push({ id: "crest-sub-header", type: "text", name: "Sub Header Text", x: 60, y: 80, width: pageW - 120, height: 20, text: `ACADEMIC YEAR ${year} • FACULTY OF LAW`, fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: "600", textAlign: "center", textColor: "#E2E8F0", letterSpacing: 1.5, zIndex: zIndex++ });
  elements.push({ id: "crest-title", type: "text", name: "Title Main", x: 80, y: 250, width: pageW - 160, height: 120, text: title, fontFamily: "Georgia, 'Playfair Display', serif", fontSize: 42, fontWeight: "700", textAlign: "center", textColor: navy, lineHeight: 1.2, isMetadataField: "assignmentTitle", zIndex: zIndex++ });
  elements.push({ id: "crest-divider", type: "divider", name: "Gold Divider", x: pageW / 2 - 60, y: 390, width: 120, height: 3, fillColor: gold, zIndex: zIndex++ });
  elements.push({ id: "crest-subtitle", type: "text", name: "Subtitle", x: 80, y: 415, width: pageW - 160, height: 45, text: subtitle, fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: "500", textAlign: "center", textColor: "#475569", zIndex: zIndex++ });
  elements.push({ id: "crest-author-card", type: "shape", name: "Credentials Card", shapeType: "rectangle", x: 120, y: 490, width: pageW - 240, height: 105, fillColor: "#F8FAFC", borderColor: "#E2E8F0", borderWidth: 1, borderRadius: 8, zIndex: zIndex++ });
  elements.push({ id: "crest-meta-label", type: "text", name: "Author Label", x: 140, y: 505, width: pageW - 280, height: 18, text: "SUBMITTED BY CANDIDATE :", fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: "700", textAlign: "center", textColor: "#64748B", letterSpacing: 1.5, zIndex: zIndex++ });
  elements.push({ id: "crest-meta-name", type: "text", name: "Author Name", x: 140, y: 526, width: pageW - 280, height: 28, text: author, fontFamily: "Georgia, serif", fontSize: 19, fontWeight: "700", textAlign: "center", textColor: navy, isMetadataField: "studentName", zIndex: zIndex++ });

  if (meta.instructorName) {
    elements.push({ id: "crest-instructor", type: "text", name: "Instructor", x: 140, y: 558, width: pageW - 280, height: 22, text: `Supervisor: ${meta.instructorName}`, fontFamily: "Georgia, serif", fontSize: 12, fontWeight: "600", textAlign: "center", textColor: "#475569", isMetadataField: "instructorName", zIndex: zIndex++ });
  }

  elements.push({ id: "crest-bottom-navy", type: "shape", name: "Bottom Navy Bar", shapeType: "rectangle", x: 0, y: pageH - 50, width: pageW, height: 50, fillColor: navy, zIndex: zIndex++ });
  elements.push({ id: "crest-bottom-gold", type: "shape", name: "Bottom Gold Rule", shapeType: "rectangle", x: 0, y: pageH - 53, width: pageW, height: 3, fillColor: gold, zIndex: zIndex++ });
  elements.push({ id: "crest-bottom-text", type: "text", name: "Bottom Text", x: 60, y: pageH - 35, width: pageW - 120, height: 20, text: "DISSERTATION SUBMISSION • ALL RIGHTS RESERVED", fontFamily: "Inter, sans-serif", fontSize: 9.5, fontWeight: "600", textAlign: "center", textColor: "#E2E8F0", letterSpacing: 1.5, zIndex: zIndex++ });
  return postProcessCoverElements(elements, meta, pageW, pageH);
}

export function generateCanvaForestBotanical(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const emerald = meta.accentColor || "#064E3B";
  const sage = "#34D399";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Ecology Project Group")
    : (meta.studentName || "Rowan Thorne");
  const brand = meta.universityName || meta.department || "Institute for Ecological Sciences";
  const title = meta.assignmentTitle || "Biodiversity Conservation & Climate Resilience";
  const year = meta.academicYear || "2026";
  const subtitle = meta.courseName || meta.courseCode || "Restoration Ecology & Ecosystem Services Valuation";

  elements.push({ id: "canvas-bg", type: "shape", name: "Page Background", shapeType: "rectangle", x: 0, y: 0, width: pageW, height: pageH, fillColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "forest-top-sage", type: "shape", name: "Top Sage Wave", shapeType: "svg", x: 0, y: 0, width: 490, height: 225, fillColor: sage, svgContent: `<svg viewBox="0 0 490 225" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 490,0 C 410,105 290,185 165,185 C 95,185 30,205 0,225 Z" fill="${sage}" opacity="0.85" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "forest-top-emerald", type: "shape", name: "Top Emerald Wave", shapeType: "svg", x: 0, y: 0, width: 455, height: 198, fillColor: emerald, svgContent: `<svg viewBox="0 0 455 198" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 455,0 C 375,88 265,162 145,162 C 82,162 28,182 0,198 Z" fill="${emerald}" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "forest-brand-pill", type: "badge", name: "Brand Badge", shapeType: "badge-pill", x: pageW - 220, y: 45, width: 160, height: 40, fillColor: emerald, borderRadius: 20, zIndex: zIndex++ });
  elements.push({ id: "forest-brand-text", type: "text", name: "Brand Text", x: pageW - 215, y: 54, width: 150, height: 22, text: brand, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: "700", textAlign: "center", textColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "forest-title", type: "text", name: "Title Main", x: 80, y: 280, width: pageW - 160, height: 110, text: `${title} ${year}`, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 44, fontWeight: "800", textColor: emerald, lineHeight: 1.15, letterSpacing: -1, isMetadataField: "assignmentTitle", zIndex: zIndex++ });
  elements.push({ id: "forest-subtitle", type: "text", name: "Subtitle", x: 80, y: 405, width: pageW - 160, height: 40, text: subtitle, fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "forest-meta-label", type: "text", name: "Author Label", x: 80, y: 480, width: 320, height: 20, text: "Prepared by :", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "forest-meta-name", type: "text", name: "Author Name", x: 80, y: 505, width: 360, height: 32, text: author, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 20, fontWeight: "800", textColor: emerald, isMetadataField: "studentName", zIndex: zIndex++ });

  if (meta.instructorName) {
    elements.push({ id: "forest-instructor", type: "text", name: "Instructor", x: 80, y: 544, width: 360, height: 24, text: `Submitted to: ${meta.instructorName}`, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: "600", textColor: "#475569", isMetadataField: "instructorName", zIndex: zIndex++ });
  }

  elements.push({ id: "forest-br-sage", type: "shape", name: "Bottom Sage Wave", shapeType: "svg", x: pageW - 390, y: pageH - 260, width: 390, height: 260, fillColor: sage, svgContent: `<svg viewBox="0 0 390 260" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,260 C 140,260 220,170 390,85 L 390,260 Z" fill="${sage}" opacity="0.85" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "forest-br-emerald", type: "shape", name: "Bottom Emerald Wave", shapeType: "svg", x: pageW - 360, y: pageH - 230, width: 360, height: 230, fillColor: emerald, svgContent: `<svg viewBox="0 0 360 230" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,230 C 130,230 210,150 360,75 L 360,230 Z" fill="${emerald}" /></svg>`, zIndex: zIndex++ });
  elements.push({ id: "forest-footer", type: "text", name: "Footer Contact", x: 80, y: pageH - 120, width: 360, height: 55, text: "📞 +123-456-7890\n✉️ research@institution.edu\n🌐 www.institution.edu", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "500", textColor: "#64748B", lineHeight: 1.5, zIndex: zIndex++ });
  return postProcessCoverElements(elements, meta, pageW, pageH);
}

// -------------------------------------------------------------
// Scalable Registry of 75+ Distinct Cover Templates
// -------------------------------------------------------------

export function generateCanvaQuantumIndigo(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const indigo = meta.accentColor || "#312E81";
  const cyan = meta.secondaryColor || "#06B6D4";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Quantum Systems Research Group")
    : (meta.studentName || "Dr. Elena Rostova");
  const brand = meta.universityName || meta.department || "Quantum Dynamics Laboratory";
  const title = meta.assignmentTitle || "QUANTUM ENTANGLEMENT & CRYPTOGRAPHY";
  const year = meta.academicYear || "2026";
  const subtitle = meta.courseName || meta.courseCode || "High-Coherence Qubit Simulation & Fault-Tolerant Gate Synthesis";

  elements.push({ id: "canvas-bg", type: "shape", name: "Page Background", shapeType: "rectangle", x: 0, y: 0, width: pageW, height: pageH, fillColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "quantum-top-cyan", type: "shape", name: "Top Cyan Tech Polygon", shapeType: "svg", x: 0, y: 0, width: 480, height: 210, fillColor: cyan, svgContent: `<svg viewBox="0 0 480 210" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 480,0 380,210 0,210" fill="${cyan}" opacity="0.85"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "quantum-top-indigo", type: "shape", name: "Top Indigo Tech Polygon", shapeType: "svg", x: 0, y: 0, width: 440, height: 185, fillColor: indigo, svgContent: `<svg viewBox="0 0 440 185" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 440,0 350,185 0,185" fill="${indigo}"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "quantum-brand-pill", type: "badge", name: "Brand Badge", shapeType: "badge-pill", x: pageW - 220, y: 45, width: 160, height: 40, fillColor: indigo, borderRadius: 20, zIndex: zIndex++ });
  elements.push({ id: "quantum-brand-text", type: "text", name: "Brand Text", x: pageW - 215, y: 54, width: 150, height: 22, text: brand, fontFamily: "monospace", fontSize: 11, fontWeight: "700", textAlign: "center", textColor: "#FFFFFF", letterSpacing: 1, zIndex: zIndex++ });
  elements.push({ id: "quantum-dot-cluster", type: "shape", name: "Tech Dot Cluster", shapeType: "svg", x: pageW - 75, y: 150, width: 36, height: 75, fillColor: cyan, svgContent: `<svg viewBox="0 0 36 75" width="100%" height="100%"><circle cx="8" cy="10" r="3" fill="${cyan}"/><circle cx="24" cy="10" r="3" fill="${cyan}"/><circle cx="8" cy="30" r="3" fill="${cyan}"/><circle cx="24" cy="30" r="3" fill="${cyan}"/><circle cx="8" cy="50" r="3" fill="${cyan}"/><circle cx="24" cy="50" r="3" fill="${cyan}"/><circle cx="8" cy="70" r="3" fill="${cyan}"/><circle cx="24" cy="70" r="3" fill="${cyan}"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "quantum-title", type: "text", name: "Title Main", x: 80, y: 275, width: pageW - 160, height: 115, text: `${title} [${year}]`, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 42, fontWeight: "800", textColor: indigo, lineHeight: 1.1, letterSpacing: -1, isMetadataField: "assignmentTitle", zIndex: zIndex++ });
  elements.push({ id: "quantum-subtitle", type: "text", name: "Subtitle", x: 80, y: 400, width: pageW - 160, height: 45, text: subtitle, fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "quantum-meta-box", type: "shape", name: "Author Box", shapeType: "rectangle", x: 80, y: 475, width: pageW - 160, height: 95, fillColor: "#F8FAFC", borderColor: "#E2E8F0", borderWidth: 1, borderRadius: 8, zIndex: zIndex++ });
  elements.push({ id: "quantum-meta-label", type: "text", name: "Author Label", x: 100, y: 490, width: 320, height: 18, text: "PRIMARY RESEARCHER / AUTHOR :", fontFamily: "monospace", fontSize: 10, fontWeight: "700", textColor: "#64748B", letterSpacing: 1.5, zIndex: zIndex++ });
  elements.push({ id: "quantum-meta-name", type: "text", name: "Author Name", x: 100, y: 512, width: 380, height: 32, text: author, fontFamily: "Inter, sans-serif", fontSize: 20, fontWeight: "800", textColor: indigo, isMetadataField: "studentName", zIndex: zIndex++ });
  if (meta.instructorName) {
    elements.push({ id: "quantum-instructor", type: "text", name: "Instructor", x: 100, y: 544, width: 380, height: 20, text: `Supervisor: ${meta.instructorName}`, fontFamily: "monospace", fontSize: 11, fontWeight: "600", textColor: "#475569", isMetadataField: "instructorName", zIndex: zIndex++ });
  }
  elements.push({ id: "quantum-br-cyan", type: "shape", name: "Bottom Cyan Polygon", shapeType: "svg", x: pageW - 360, y: pageH - 240, width: 360, height: 240, fillColor: cyan, svgContent: `<svg viewBox="0 0 360 240" width="100%" height="100%" preserveAspectRatio="none"><polygon points="100,240 360,0 360,240" fill="${cyan}" opacity="0.85"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "quantum-br-indigo", type: "shape", name: "Bottom Indigo Polygon", shapeType: "svg", x: pageW - 330, y: pageH - 215, width: 330, height: 215, fillColor: indigo, svgContent: `<svg viewBox="0 0 330 215" width="100%" height="100%" preserveAspectRatio="none"><polygon points="90,215 330,0 330,215" fill="${indigo}"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "quantum-footer", type: "text", name: "Footer Contact", x: 80, y: pageH - 95, width: 380, height: 40, text: "📞 +123-456-7890 • ✉️ quantum@research.edu\nVerified Academic Research • Peer Reviewed", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  return postProcessCoverElements(elements, meta, pageW, pageH);
}

export function generateCanvaMonochromeArch(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const charcoal = meta.accentColor || "#18181B";
  const zinc = meta.secondaryColor || "#71717A";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Architectural Collective")
    : (meta.studentName || "Julian Sterling");
  const brand = meta.universityName || meta.department || "Atelier Modern Architecture";
  const title = meta.assignmentTitle || "MONOCHROME SPATIAL DESIGN";
  const year = meta.academicYear || "2026";
  const subtitle = meta.courseName || meta.courseCode || "Brutalist Form, Sustainable Timber Structures, and Natural Illumination";

  elements.push({ id: "canvas-bg", type: "shape", name: "Page Background", shapeType: "rectangle", x: 0, y: 0, width: pageW, height: pageH, fillColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "mono-top-arch", type: "shape", name: "Architectural Top Arch", shapeType: "svg", x: 0, y: 0, width: 440, height: 210, fillColor: charcoal, svgContent: `<svg viewBox="0 0 440 210" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 440,0 C 440,110 330,210 200,210 L 0,210 Z" fill="${charcoal}"/><path d="M 0,210 L 220,210 C 350,210 440,120 440,0 L 455,0 C 455,130 360,225 220,225 L 0,225 Z" fill="${zinc}" opacity="0.6"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "mono-brand-pill", type: "badge", name: "Brand Badge", shapeType: "badge-pill", x: pageW - 220, y: 45, width: 160, height: 40, fillColor: charcoal, borderRadius: 20, zIndex: zIndex++ });
  elements.push({ id: "mono-brand-text", type: "text", name: "Brand Text", x: pageW - 215, y: 54, width: 150, height: 22, text: brand, fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "700", textAlign: "center", textColor: "#FFFFFF", letterSpacing: 1, zIndex: zIndex++ });
  elements.push({ id: "mono-title", type: "text", name: "Title Main", x: 80, y: 280, width: pageW - 160, height: 110, text: `${title} ${year}`, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 44, fontWeight: "800", textColor: charcoal, lineHeight: 1.1, letterSpacing: -1, isMetadataField: "assignmentTitle", zIndex: zIndex++ });
  elements.push({ id: "mono-subtitle", type: "text", name: "Subtitle", x: 80, y: 405, width: pageW - 160, height: 40, text: subtitle, fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "mono-meta-label", type: "text", name: "Prepared by Label", x: 80, y: 480, width: 320, height: 20, text: "Prepared by :", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "mono-meta-name", type: "text", name: "Author Name", x: 80, y: 505, width: 360, height: 32, text: author, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 20, fontWeight: "800", textColor: charcoal, isMetadataField: "studentName", zIndex: zIndex++ });
  if (meta.instructorName) {
    elements.push({ id: "mono-instructor", type: "text", name: "Instructor", x: 80, y: 544, width: 360, height: 24, text: `Submitted to: ${meta.instructorName}`, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: "600", textColor: "#475569", isMetadataField: "instructorName", zIndex: zIndex++ });
  }
  elements.push({ id: "mono-br-arch", type: "shape", name: "Bottom Arch", shapeType: "svg", x: pageW - 360, y: pageH - 230, width: 360, height: 230, fillColor: charcoal, svgContent: `<svg viewBox="0 0 360 230" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,230 C 130,230 230,130 230,0 L 360,0 L 360,230 Z" fill="${charcoal}"/><path d="M 0,215 C 120,215 215,120 215,0 L 230,0 C 230,130 130,230 0,230 Z" fill="${zinc}" opacity="0.6"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "mono-footer", type: "text", name: "Footer Contact", x: 80, y: pageH - 120, width: 360, height: 55, text: "📞 +123-456-7890\n✉️ design@atelier.io\n🌐 www.atelier.io", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "500", textColor: "#64748B", lineHeight: 1.5, zIndex: zIndex++ });
  return postProcessCoverElements(elements, meta, pageW, pageH);
}

export function generateCanvaPrismGeometric(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const cobalt = meta.accentColor || "#1D4ED8";
  const coral = meta.secondaryColor || "#F43F5E";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Prismatic Analytics Team")
    : (meta.studentName || "Claire Beaumont");
  const brand = meta.universityName || meta.department || "Prism Analytics Co";
  const title = meta.assignmentTitle || "PRISMATIC DATA ARCHITECTURE";
  const year = meta.academicYear || "2026";
  const subtitle = meta.courseName || meta.courseCode || "High-Throughput Analytics & Vector Embedding Pipelines";

  elements.push({ id: "canvas-bg", type: "shape", name: "Page Background", shapeType: "rectangle", x: 0, y: 0, width: pageW, height: pageH, fillColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "prism-tl-coral", type: "shape", name: "Top Coral Facet", shapeType: "svg", x: 0, y: 0, width: 440, height: 210, fillColor: coral, svgContent: `<svg viewBox="0 0 440 210" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 440,0 320,210 0,210" fill="${coral}" opacity="0.85"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "prism-tl-cobalt", type: "shape", name: "Top Cobalt Facet", shapeType: "svg", x: 0, y: 0, width: 400, height: 185, fillColor: cobalt, svgContent: `<svg viewBox="0 0 400 185" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 400,0 290,185 0,185" fill="${cobalt}"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "prism-brand-pill", type: "badge", name: "Brand Badge", shapeType: "badge-pill", x: pageW - 220, y: 45, width: 160, height: 40, fillColor: cobalt, borderRadius: 20, zIndex: zIndex++ });
  elements.push({ id: "prism-brand-text", type: "text", name: "Brand Text", x: pageW - 215, y: 54, width: 150, height: 22, text: brand, fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "700", textAlign: "center", textColor: "#FFFFFF", letterSpacing: 1, zIndex: zIndex++ });
  elements.push({ id: "prism-dot-cluster", type: "shape", name: "Prism Dot Matrix", shapeType: "svg", x: pageW - 75, y: 150, width: 36, height: 75, fillColor: coral, svgContent: `<svg viewBox="0 0 36 75" width="100%" height="100%"><circle cx="8" cy="10" r="3" fill="${coral}"/><circle cx="24" cy="10" r="3" fill="${coral}"/><circle cx="8" cy="30" r="3" fill="${coral}"/><circle cx="24" cy="30" r="3" fill="${coral}"/><circle cx="8" cy="50" r="3" fill="${coral}"/><circle cx="24" cy="50" r="3" fill="${coral}"/><circle cx="8" cy="70" r="3" fill="${coral}"/><circle cx="24" cy="70" r="3" fill="${coral}"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "prism-title", type: "text", name: "Title Main", x: 80, y: 280, width: pageW - 160, height: 110, text: `${title} ${year}`, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 44, fontWeight: "800", textColor: cobalt, lineHeight: 1.1, letterSpacing: -1, isMetadataField: "assignmentTitle", zIndex: zIndex++ });
  elements.push({ id: "prism-subtitle", type: "text", name: "Subtitle", x: 80, y: 405, width: pageW - 160, height: 40, text: subtitle, fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "prism-meta-label", type: "text", name: "Prepared by Label", x: 80, y: 480, width: 320, height: 20, text: "Prepared by :", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "prism-meta-name", type: "text", name: "Author Name", x: 80, y: 505, width: 360, height: 32, text: author, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 20, fontWeight: "800", textColor: cobalt, isMetadataField: "studentName", zIndex: zIndex++ });
  if (meta.instructorName) {
    elements.push({ id: "prism-instructor", type: "text", name: "Instructor", x: 80, y: 544, width: 360, height: 24, text: `Reviewed by: ${meta.instructorName}`, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: "600", textColor: "#475569", isMetadataField: "instructorName", zIndex: zIndex++ });
  }
  elements.push({ id: "prism-br-coral", type: "shape", name: "Bottom Coral Facet", shapeType: "svg", x: pageW - 380, y: pageH - 250, width: 380, height: 250, fillColor: coral, svgContent: `<svg viewBox="0 0 380 250" width="100%" height="100%" preserveAspectRatio="none"><polygon points="120,250 380,0 380,250" fill="${coral}" opacity="0.85"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "prism-br-cobalt", type: "shape", name: "Bottom Cobalt Facet", shapeType: "svg", x: pageW - 350, y: pageH - 225, width: 350, height: 225, fillColor: cobalt, svgContent: `<svg viewBox="0 0 350 225" width="100%" height="100%" preserveAspectRatio="none"><polygon points="110,225 350,0 350,225" fill="${cobalt}"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "prism-footer", type: "text", name: "Footer Contact", x: 80, y: pageH - 120, width: 360, height: 55, text: "📞 +123-456-7890\n✉️ info@prism.io\n🌐 www.prism.io", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "500", textColor: "#64748B", lineHeight: 1.5, zIndex: zIndex++ });
  return postProcessCoverElements(elements, meta, pageW, pageH);
}

export function generateCanvaBauhausModernist(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const navy = meta.accentColor || "#0F172A";
  const vermilion = meta.secondaryColor || "#EF4444";
  const yellow = "#F59E0B";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Bauhaus Design Studio")
    : (meta.studentName || "Walter Gropius");
  const brand = meta.universityName || meta.department || "Bauhaus Visual Studies";
  const title = meta.assignmentTitle || "BAUHAUS MODERNIST PROPOSAL";
  const year = meta.academicYear || "2026";
  const subtitle = meta.courseName || meta.courseCode || "Form Follows Function • Asymmetric Modern Typography & Color Blocking";

  elements.push({ id: "canvas-bg", type: "shape", name: "Page Background", shapeType: "rectangle", x: 0, y: 0, width: pageW, height: pageH, fillColor: "#FAFAFA", zIndex: zIndex++ });
  elements.push({ id: "bauhaus-top-bar", type: "shape", name: "Top Navy Bar", shapeType: "rectangle", x: 0, y: 0, width: pageW, height: 160, fillColor: navy, zIndex: zIndex++ });
  elements.push({ id: "bauhaus-yellow-rule", type: "shape", name: "Yellow Accent Rule", shapeType: "rectangle", x: 0, y: 160, width: pageW, height: 14, fillColor: yellow, zIndex: zIndex++ });
  elements.push({ id: "bauhaus-red-circle", type: "shape", name: "Red Circle Accent", shapeType: "svg", x: pageW - 180, y: 90, width: 140, height: 140, fillColor: vermilion, svgContent: `<svg viewBox="0 0 140 140" width="100%" height="100%"><circle cx="70" cy="70" r="70" fill="${vermilion}"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "bauhaus-brand-text", type: "text", name: "Brand Text", x: 60, y: 60, width: 340, height: 30, text: brand.toUpperCase(), fontFamily: "Inter, Montserrat, sans-serif", fontSize: 13, fontWeight: "800", textAlign: "left", textColor: "#FFFFFF", letterSpacing: 2, zIndex: zIndex++ });
  elements.push({ id: "bauhaus-year-badge", type: "text", name: "Year Numeral", x: pageW - 170, y: 145, width: 120, height: 35, text: year, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 24, fontWeight: "900", textAlign: "center", textColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "bauhaus-title", type: "text", name: "Title Main", x: 60, y: 260, width: pageW - 160, height: 130, text: title, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 48, fontWeight: "900", textColor: navy, lineHeight: 1.05, letterSpacing: -1.5, isMetadataField: "assignmentTitle", zIndex: zIndex++ });
  elements.push({ id: "bauhaus-subtitle", type: "text", name: "Subtitle", x: 60, y: 405, width: pageW - 160, height: 45, text: subtitle, fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: "600", textColor: "#475569", zIndex: zIndex++ });
  elements.push({ id: "bauhaus-author-card", type: "shape", name: "Author Block", shapeType: "rectangle", x: 60, y: 485, width: pageW - 120, height: 100, fillColor: "#FFFFFF", borderColor: navy, borderWidth: 3, borderRadius: 0, zIndex: zIndex++ });
  elements.push({ id: "bauhaus-author-label", type: "text", name: "Author Label", x: 80, y: 500, width: 300, height: 18, text: "PRINCIPAL DESIGNER / AUTHOR :", fontFamily: "monospace", fontSize: 10, fontWeight: "800", textColor: vermilion, letterSpacing: 1.5, zIndex: zIndex++ });
  elements.push({ id: "bauhaus-author-name", type: "text", name: "Author Name", x: 80, y: 522, width: 400, height: 32, text: author, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 22, fontWeight: "800", textColor: navy, isMetadataField: "studentName", zIndex: zIndex++ });
  if (meta.instructorName) {
    elements.push({ id: "bauhaus-instructor", type: "text", name: "Instructor", x: 80, y: 556, width: 400, height: 20, text: `Faculty Advisor: ${meta.instructorName}`, fontFamily: "monospace", fontSize: 11, fontWeight: "600", textColor: "#475569", isMetadataField: "instructorName", zIndex: zIndex++ });
  }
  elements.push({ id: "bauhaus-bottom-vermilion", type: "shape", name: "Bottom Vermilion Block", shapeType: "rectangle", x: 0, y: pageH - 100, width: 140, height: 100, fillColor: vermilion, zIndex: zIndex++ });
  elements.push({ id: "bauhaus-bottom-yellow", type: "shape", name: "Bottom Yellow Block", shapeType: "rectangle", x: 140, y: pageH - 40, width: 200, height: 40, fillColor: yellow, zIndex: zIndex++ });
  elements.push({ id: "bauhaus-footer-text", type: "text", name: "Footer Text", x: 160, y: pageH - 85, width: pageW - 200, height: 30, text: "BAUHAUS DESIGN ARCHIVE • MODERN ARCHIVE 2026", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "700", textColor: navy, letterSpacing: 1, zIndex: zIndex++ });
  return postProcessCoverElements(elements, meta, pageW, pageH);
}

export function generateCanvaGradientGlassmorphism(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const primary = meta.accentColor || "#6366F1";
  const secondary = meta.secondaryColor || "#EC4899";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Innovation Research Lab")
    : (meta.studentName || "Amara Vance");
  const brand = meta.universityName || meta.department || "NextGen Innovation Labs";
  const title = meta.assignmentTitle || "DIGITAL TRANSFORMATION STRATEGY";
  const year = meta.academicYear || "2026";
  const subtitle = meta.courseName || meta.courseCode || "Artificial Intelligence Adoption, Cloud Modernization & UX Agility";

  elements.push({ id: "canvas-bg", type: "shape", name: "Page Background", shapeType: "rectangle", x: 0, y: 0, width: pageW, height: pageH, fillColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "glass-top-pink", type: "shape", name: "Top Pink Wave", shapeType: "svg", x: 0, y: 0, width: 490, height: 225, fillColor: secondary, svgContent: `<svg viewBox="0 0 490 225" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 490,0 C 410,105 290,185 165,185 C 95,185 30,205 0,225 Z" fill="${secondary}" opacity="0.85"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "glass-top-indigo", type: "shape", name: "Top Indigo Wave", shapeType: "svg", x: 0, y: 0, width: 455, height: 198, fillColor: primary, svgContent: `<svg viewBox="0 0 455 198" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 455,0 C 375,88 265,162 145,162 C 82,162 28,182 0,198 Z" fill="${primary}"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "glass-brand-pill", type: "badge", name: "Brand Badge", shapeType: "badge-pill", x: pageW - 220, y: 45, width: 160, height: 40, fillColor: primary, borderRadius: 20, zIndex: zIndex++ });
  elements.push({ id: "glass-brand-text", type: "text", name: "Brand Text", x: pageW - 215, y: 54, width: 150, height: 22, text: brand, fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "700", textAlign: "center", textColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "glass-card", type: "shape", name: "Glass Card Container", shapeType: "rectangle", x: 60, y: 250, width: pageW - 120, height: 350, fillColor: "#F8FAFC", borderColor: "#E2E8F0", borderWidth: 1.5, borderRadius: 16, zIndex: zIndex++ });
  elements.push({ id: "glass-title", type: "text", name: "Title Main", x: 90, y: 280, width: pageW - 180, height: 105, text: `${title} ${year}`, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 40, fontWeight: "800", textColor: primary, lineHeight: 1.15, letterSpacing: -1, isMetadataField: "assignmentTitle", zIndex: zIndex++ });
  elements.push({ id: "glass-subtitle", type: "text", name: "Subtitle", x: 90, y: 395, width: pageW - 180, height: 40, text: subtitle, fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "glass-divider", type: "divider", name: "Divider", x: 90, y: 450, width: 120, height: 3, fillColor: primary, zIndex: zIndex++ });
  elements.push({ id: "glass-meta-label", type: "text", name: "Author Label", x: 90, y: 475, width: 300, height: 18, text: "SUBMITTED BY :", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "600", textColor: "#94A3B8", letterSpacing: 1, zIndex: zIndex++ });
  elements.push({ id: "glass-meta-name", type: "text", name: "Author Name", x: 90, y: 498, width: 360, height: 32, text: author, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 20, fontWeight: "800", textColor: primary, isMetadataField: "studentName", zIndex: zIndex++ });
  if (meta.instructorName) {
    elements.push({ id: "glass-instructor", type: "text", name: "Instructor", x: 90, y: 536, width: 360, height: 22, text: `Evaluated by: ${meta.instructorName}`, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: "600", textColor: "#475569", isMetadataField: "instructorName", zIndex: zIndex++ });
  }
  elements.push({ id: "glass-br-pink", type: "shape", name: "Bottom Pink Wave", shapeType: "svg", x: pageW - 390, y: pageH - 260, width: 390, height: 260, fillColor: secondary, svgContent: `<svg viewBox="0 0 390 260" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,260 C 140,260 220,170 390,85 L 390,260 Z" fill="${secondary}" opacity="0.85"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "glass-br-indigo", type: "shape", name: "Bottom Indigo Wave", shapeType: "svg", x: pageW - 360, y: pageH - 230, width: 360, height: 230, fillColor: primary, svgContent: `<svg viewBox="0 0 360 230" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,230 C 130,230 210,150 360,75 L 360,230 Z" fill="${primary}"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "glass-footer", type: "text", name: "Footer Details", x: 80, y: pageH - 100, width: 360, height: 45, text: "📞 +123-456-7890 • ✉️ innovate@institution.edu\nVerified Executive Dossier", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  return postProcessCoverElements(elements, meta, pageW, pageH);
}

export function generateCanvaTerracottaEditorial(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const terracotta = meta.accentColor || "#C2410C";
  const sand = meta.secondaryColor || "#D97706";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Editorial Board")
    : (meta.studentName || "Camilla Sterling");
  const brand = meta.universityName || meta.department || "Atelier Literary Press";
  const title = meta.assignmentTitle || "MEDITERRANEAN ARCHITECTURAL REVIEW";
  const year = meta.academicYear || "2026";
  const subtitle = meta.courseName || meta.courseCode || "Earth, Terracotta & Coastal Urban Planning in Southern Europe";

  elements.push({ id: "canvas-bg", type: "shape", name: "Page Background", shapeType: "rectangle", x: 0, y: 0, width: pageW, height: pageH, fillColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "terra-top-sand", type: "shape", name: "Top Sand Wave", shapeType: "svg", x: 0, y: 0, width: 480, height: 220, fillColor: sand, svgContent: `<svg viewBox="0 0 480 220" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 480,0 C 400,100 280,180 160,180 C 90,180 30,200 0,220 Z" fill="${sand}" opacity="0.85"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "terra-top-terra", type: "shape", name: "Top Terracotta Wave", shapeType: "svg", x: 0, y: 0, width: 450, height: 195, fillColor: terracotta, svgContent: `<svg viewBox="0 0 450 195" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 450,0 C 370,85 260,160 140,160 C 80,160 25,180 0,195 Z" fill="${terracotta}"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "terra-brand-pill", type: "badge", name: "Brand Badge", shapeType: "badge-pill", x: pageW - 220, y: 45, width: 160, height: 40, fillColor: terracotta, borderRadius: 20, zIndex: zIndex++ });
  elements.push({ id: "terra-brand-text", type: "text", name: "Brand Text", x: pageW - 215, y: 54, width: 150, height: 22, text: brand, fontFamily: "Georgia, serif", fontSize: 12, fontWeight: "700", textAlign: "center", textColor: "#FFFFFF", letterSpacing: 1, zIndex: zIndex++ });
  elements.push({ id: "terra-title", type: "text", name: "Title Main", x: 80, y: 280, width: pageW - 160, height: 110, text: `${title} ${year}`, fontFamily: "Georgia, 'Playfair Display', serif", fontSize: 42, fontWeight: "700", textColor: terracotta, lineHeight: 1.15, letterSpacing: -0.5, isMetadataField: "assignmentTitle", zIndex: zIndex++ });
  elements.push({ id: "terra-subtitle", type: "text", name: "Subtitle", x: 80, y: 405, width: pageW - 160, height: 45, text: subtitle, fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "terra-meta-label", type: "text", name: "Prepared by Label", x: 80, y: 485, width: 320, height: 20, text: "Prepared by :", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "terra-meta-name", type: "text", name: "Author Name", x: 80, y: 510, width: 360, height: 32, text: author, fontFamily: "Georgia, serif", fontSize: 21, fontWeight: "700", textColor: terracotta, isMetadataField: "studentName", zIndex: zIndex++ });
  if (meta.instructorName) {
    elements.push({ id: "terra-instructor", type: "text", name: "Instructor", x: 80, y: 548, width: 360, height: 24, text: `Presented to: ${meta.instructorName}`, fontFamily: "Georgia, serif", fontSize: 12, fontWeight: "600", textColor: "#475569", isMetadataField: "instructorName", zIndex: zIndex++ });
  }
  elements.push({ id: "terra-br-sand", type: "shape", name: "Bottom Sand Wave", shapeType: "svg", x: pageW - 380, y: pageH - 250, width: 380, height: 250, fillColor: sand, svgContent: `<svg viewBox="0 0 380 250" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,250 C 130,250 210,160 380,80 L 380,250 Z" fill="${sand}" opacity="0.85"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "terra-br-terra", type: "shape", name: "Bottom Terracotta Wave", shapeType: "svg", x: pageW - 350, y: pageH - 220, width: 350, height: 220, fillColor: terracotta, svgContent: `<svg viewBox="0 0 350 220" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,220 C 120,220 200,140 350,70 L 350,220 Z" fill="${terracotta}"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "terra-footer", type: "text", name: "Footer Coordinates", x: 80, y: pageH - 110, width: 360, height: 45, text: "Mediterranean Monograph • Architecture Series", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  return postProcessCoverElements(elements, meta, pageW, pageH);
}

export function generateCanvaCyberpunkNeon(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const cyan = meta.accentColor || "#00F0FF";
  const magenta = meta.secondaryColor || "#EC4899";
  const darkBg = "#0A0F1D";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Cybernetics Core Team")
    : (meta.studentName || "Kenji Sato");
  const brand = meta.universityName || meta.department || "Cyber Systems Lab";
  const title = meta.assignmentTitle || "NEURAL INTERFACE & QUANTUM MESH";
  const year = meta.academicYear || "2026";
  const subtitle = meta.courseName || meta.courseCode || "High-Bandwidth Brain-Machine Systems & Cryptographic Substrates";

  elements.push({ id: "canvas-bg", type: "shape", name: "Page Background", shapeType: "rectangle", x: 0, y: 0, width: pageW, height: pageH, fillColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "cyber-top-dark", type: "shape", name: "Top Dark Hex Polygon", shapeType: "svg", x: 0, y: 0, width: 500, height: 210, fillColor: darkBg, svgContent: `<svg viewBox="0 0 500 210" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 500,0 410,210 0,210" fill="${darkBg}"/><line x1="0" y1="208" x2="410" y2="208" stroke="${cyan}" stroke-width="4"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "cyber-neon-ribbon", type: "shape", name: "Neon Magenta Slice", shapeType: "svg", x: 410, y: 0, width: 70, height: 210, fillColor: magenta, svgContent: `<svg viewBox="0 0 70 210" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 70,0 40,210 0,210" fill="${magenta}" opacity="0.9"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "cyber-brand-pill", type: "badge", name: "Brand Badge", shapeType: "badge-pill", x: pageW - 220, y: 45, width: 160, height: 40, fillColor: darkBg, borderRadius: 20, zIndex: zIndex++ });
  elements.push({ id: "cyber-brand-text", type: "text", name: "Brand Text", x: pageW - 215, y: 54, width: 150, height: 22, text: brand, fontFamily: "monospace", fontSize: 11, fontWeight: "700", textAlign: "center", textColor: cyan, letterSpacing: 1, zIndex: zIndex++ });
  elements.push({ id: "cyber-dot-matrix", type: "shape", name: "Matrix Dots", shapeType: "svg", x: pageW - 70, y: 140, width: 36, height: 80, fillColor: cyan, svgContent: `<svg viewBox="0 0 36 80" width="100%" height="100%"><circle cx="8" cy="10" r="3" fill="${cyan}"/><circle cx="24" cy="10" r="3" fill="${cyan}"/><circle cx="8" cy="30" r="3" fill="${cyan}"/><circle cx="24" cy="30" r="3" fill="${cyan}"/><circle cx="8" cy="50" r="3" fill="${cyan}"/><circle cx="24" cy="50" r="3" fill="${cyan}"/><circle cx="8" cy="70" r="3" fill="${cyan}"/><circle cx="24" cy="70" r="3" fill="${cyan}"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "cyber-title", type: "text", name: "Title Main", x: 75, y: 280, width: pageW - 150, height: 115, text: `${title} // ${year}`, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 44, fontWeight: "900", textColor: darkBg, lineHeight: 1.1, letterSpacing: -1, isMetadataField: "assignmentTitle", zIndex: zIndex++ });
  elements.push({ id: "cyber-subtitle", type: "text", name: "Subtitle", x: 75, y: 405, width: pageW - 150, height: 40, text: subtitle, fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "cyber-author-box", type: "shape", name: "Author Box", shapeType: "rectangle", x: 75, y: 480, width: pageW - 150, height: 95, fillColor: "#F8FAFC", borderColor: cyan, borderWidth: 2, borderRadius: 6, zIndex: zIndex++ });
  elements.push({ id: "cyber-meta-label", type: "text", name: "Author Label", x: 95, y: 495, width: 300, height: 18, text: "CHIEF ARCHITECT / AUTHOR :", fontFamily: "monospace", fontSize: 10, fontWeight: "700", textColor: magenta, letterSpacing: 1.5, zIndex: zIndex++ });
  elements.push({ id: "cyber-meta-name", type: "text", name: "Author Name", x: 95, y: 518, width: 380, height: 32, text: author, fontFamily: "Inter, sans-serif", fontSize: 20, fontWeight: "800", textColor: darkBg, isMetadataField: "studentName", zIndex: zIndex++ });
  if (meta.instructorName) {
    elements.push({ id: "cyber-instructor", type: "text", name: "Instructor", x: 95, y: 550, width: 380, height: 20, text: `Evaluator: ${meta.instructorName}`, fontFamily: "monospace", fontSize: 11, fontWeight: "600", textColor: "#475569", isMetadataField: "instructorName", zIndex: zIndex++ });
  }
  elements.push({ id: "cyber-br-dark", type: "shape", name: "Bottom Dark Polygon", shapeType: "svg", x: pageW - 350, y: pageH - 220, width: 350, height: 220, fillColor: darkBg, svgContent: `<svg viewBox="0 0 350 220" width="100%" height="100%" preserveAspectRatio="none"><polygon points="90,220 350,0 350,220" fill="${darkBg}"/><line x1="90" y1="218" x2="350" y2="2" stroke="${cyan}" stroke-width="4"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "cyber-footer", type: "text", name: "Footer Text", x: 75, y: pageH - 90, width: 350, height: 35, text: "CYBER SPECIFICATION • SECURE LAYER 2026", fontFamily: "monospace", fontSize: 10, fontWeight: "600", textColor: "#94A3B8", letterSpacing: 1, zIndex: zIndex++ });
  return postProcessCoverElements(elements, meta, pageW, pageH);
}

export function generateCanvaEmeraldBlueprint(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const emerald = meta.accentColor || "#065F46";
  const mint = meta.secondaryColor || "#10B981";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Sustainable Systems Team")
    : (meta.studentName || "Harrison Brooks");
  const brand = meta.universityName || meta.department || "Nordic Ecology & Architecture";
  const title = meta.assignmentTitle || "EMERALD SUSTAINABLE BLUEPRINT";
  const year = meta.academicYear || "2026";
  const subtitle = meta.courseName || meta.courseCode || "Passive Solar Envelope, Geothermal Grids, and Zero-Carbon Material Life Cycle";

  elements.push({ id: "canvas-bg", type: "shape", name: "Page Background", shapeType: "rectangle", x: 0, y: 0, width: pageW, height: pageH, fillColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "em-top-mint", type: "shape", name: "Top Mint Ribbon", shapeType: "svg", x: 0, y: 0, width: 480, height: 220, fillColor: mint, svgContent: `<svg viewBox="0 0 480 220" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 480,0 C 400,100 280,180 160,180 C 90,180 30,200 0,220 Z" fill="${mint}" opacity="0.85"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "em-top-emerald", type: "shape", name: "Top Emerald Wave", shapeType: "svg", x: 0, y: 0, width: 450, height: 195, fillColor: emerald, svgContent: `<svg viewBox="0 0 450 195" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 450,0 C 370,85 260,160 140,160 C 80,160 25,180 0,195 Z" fill="${emerald}"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "em-brand-pill", type: "badge", name: "Brand Badge", shapeType: "badge-pill", x: pageW - 220, y: 45, width: 160, height: 40, fillColor: emerald, borderRadius: 20, zIndex: zIndex++ });
  elements.push({ id: "em-brand-text", type: "text", name: "Brand Text", x: pageW - 215, y: 54, width: 150, height: 22, text: brand, fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "700", textAlign: "center", textColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "em-title", type: "text", name: "Title Main", x: 80, y: 280, width: pageW - 160, height: 110, text: `${title} ${year}`, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 44, fontWeight: "800", textColor: emerald, lineHeight: 1.1, letterSpacing: -1, isMetadataField: "assignmentTitle", zIndex: zIndex++ });
  elements.push({ id: "em-subtitle", type: "text", name: "Subtitle", x: 80, y: 405, width: pageW - 160, height: 40, text: subtitle, fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "em-meta-label", type: "text", name: "Prepared by Label", x: 80, y: 480, width: 320, height: 20, text: "Prepared by :", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "em-meta-name", type: "text", name: "Author Name", x: 80, y: 505, width: 360, height: 32, text: author, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 20, fontWeight: "800", textColor: emerald, isMetadataField: "studentName", zIndex: zIndex++ });
  if (meta.instructorName) {
    elements.push({ id: "em-instructor", type: "text", name: "Instructor", x: 80, y: 544, width: 360, height: 24, text: `Submitted to: ${meta.instructorName}`, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: "600", textColor: "#475569", isMetadataField: "instructorName", zIndex: zIndex++ });
  }
  elements.push({ id: "em-br-mint", type: "shape", name: "Bottom Mint Wave", shapeType: "svg", x: pageW - 390, y: pageH - 260, width: 390, height: 260, fillColor: mint, svgContent: `<svg viewBox="0 0 390 260" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,260 C 140,260 220,170 390,85 L 390,260 Z" fill="${mint}" opacity="0.85"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "em-br-emerald", type: "shape", name: "Bottom Emerald Wave", shapeType: "svg", x: pageW - 360, y: pageH - 230, width: 360, height: 230, fillColor: emerald, svgContent: `<svg viewBox="0 0 360 230" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,230 C 130,230 210,150 360,75 L 360,230 Z" fill="${emerald}"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "em-footer", type: "text", name: "Footer Contact", x: 80, y: pageH - 120, width: 360, height: 55, text: "📞 +123-456-7890\n✉️ research@institution.edu\n🌐 www.institution.edu", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "500", textColor: "#64748B", lineHeight: 1.5, zIndex: zIndex++ });
  return postProcessCoverElements(elements, meta, pageW, pageH);
}

export function generateCanvaRoseGoldLuxury(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const rose = meta.accentColor || "#E11D48";
  const gold = meta.secondaryColor || "#FBBF24";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Prestige Strategic Group")
    : (meta.studentName || "Genevieve Monet");
  const brand = meta.universityName || meta.department || "Haute Prestige Luxury Group";
  const title = meta.assignmentTitle || "GLOBAL LUXURY BRAND STRATEGY";
  const year = meta.academicYear || "2026";
  const subtitle = meta.courseName || meta.courseCode || "High-Net-Worth Consumer Acquisition & Heritage Craftsmanship Positioning";

  elements.push({ id: "canvas-bg", type: "shape", name: "Page Background", shapeType: "rectangle", x: 0, y: 0, width: pageW, height: pageH, fillColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "rose-top-gold", type: "shape", name: "Top Gold Ribbon", shapeType: "svg", x: 0, y: 0, width: 480, height: 220, fillColor: gold, svgContent: `<svg viewBox="0 0 480 220" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 480,0 C 400,100 280,180 160,180 C 90,180 30,200 0,220 Z" fill="${gold}" opacity="0.85"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "rose-top-rose", type: "shape", name: "Top Rose Ribbon", shapeType: "svg", x: 0, y: 0, width: 450, height: 195, fillColor: rose, svgContent: `<svg viewBox="0 0 450 195" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 450,0 C 370,85 260,160 140,160 C 80,160 25,180 0,195 Z" fill="${rose}"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "rose-brand-pill", type: "badge", name: "Brand Badge", shapeType: "badge-pill", x: pageW - 220, y: 45, width: 160, height: 40, fillColor: rose, borderRadius: 20, zIndex: zIndex++ });
  elements.push({ id: "rose-brand-text", type: "text", name: "Brand Text", x: pageW - 215, y: 54, width: 150, height: 22, text: brand, fontFamily: "Georgia, serif", fontSize: 11, fontWeight: "700", textAlign: "center", textColor: "#FFFFFF", letterSpacing: 1, zIndex: zIndex++ });
  elements.push({ id: "rose-title", type: "text", name: "Title Main", x: 80, y: 280, width: pageW - 160, height: 110, text: `${title} ${year}`, fontFamily: "Georgia, 'Playfair Display', serif", fontSize: 44, fontWeight: "700", textColor: rose, lineHeight: 1.15, letterSpacing: -0.5, isMetadataField: "assignmentTitle", zIndex: zIndex++ });
  elements.push({ id: "rose-subtitle", type: "text", name: "Subtitle", x: 80, y: 405, width: pageW - 160, height: 45, text: subtitle, fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "rose-meta-label", type: "text", name: "Prepared by Label", x: 80, y: 485, width: 320, height: 20, text: "Prepared by :", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "rose-meta-name", type: "text", name: "Author Name", x: 80, y: 510, width: 360, height: 32, text: author, fontFamily: "Georgia, serif", fontSize: 21, fontWeight: "700", textColor: rose, isMetadataField: "studentName", zIndex: zIndex++ });
  if (meta.instructorName) {
    elements.push({ id: "rose-instructor", type: "text", name: "Instructor", x: 80, y: 548, width: 360, height: 24, text: `Presented to: ${meta.instructorName}`, fontFamily: "Georgia, serif", fontSize: 12, fontWeight: "600", textColor: "#475569", isMetadataField: "instructorName", zIndex: zIndex++ });
  }
  elements.push({ id: "rose-br-gold", type: "shape", name: "Bottom Gold Wave", shapeType: "svg", x: pageW - 380, y: pageH - 250, width: 380, height: 250, fillColor: gold, svgContent: `<svg viewBox="0 0 380 250" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,250 C 130,250 210,160 380,80 L 380,250 Z" fill="${gold}" opacity="0.85"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "rose-br-rose", type: "shape", name: "Bottom Rose Wave", shapeType: "svg", x: pageW - 350, y: pageH - 220, width: 350, height: 220, fillColor: rose, svgContent: `<svg viewBox="0 0 350 220" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,220 C 120,220 200,140 350,70 L 350,220 Z" fill="${rose}"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "rose-footer", type: "text", name: "Footer Details", x: 80, y: pageH - 110, width: 360, height: 45, text: "Haute Prestige Luxury Edition • Monograph Series", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  return postProcessCoverElements(elements, meta, pageW, pageH);
}

export function generateCanvaSwissInternational(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const black = meta.accentColor || "#111827";
  const orange = meta.secondaryColor || "#EA580C";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Swiss Typography Laboratory")
    : (meta.studentName || "Max Miedinger");
  const brand = meta.universityName || meta.department || "Kunstgewerbeschule Zürich";
  const title = meta.assignmentTitle || "SWISS INTERNATIONAL TYPOGRAPHIC STYLE";
  const year = meta.academicYear || "2026";
  const subtitle = meta.courseName || meta.courseCode || "Mathematical Grid Alignment, Asymmetric Structure & Objective Photography";

  elements.push({ id: "canvas-bg", type: "shape", name: "Page Background", shapeType: "rectangle", x: 0, y: 0, width: pageW, height: pageH, fillColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "swiss-orange-block", type: "shape", name: "Orange Anchor Block", shapeType: "rectangle", x: 60, y: 60, width: 140, height: 140, fillColor: orange, zIndex: zIndex++ });
  elements.push({ id: "swiss-numeral", type: "text", name: "Numeral Badge", x: 60, y: 85, width: 140, height: 90, text: "01", fontFamily: "Inter, Montserrat, sans-serif", fontSize: 72, fontWeight: "900", textAlign: "center", textColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "swiss-brand-label", type: "text", name: "Brand Text", x: 220, y: 65, width: pageW - 280, height: 30, text: brand.toUpperCase(), fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: "800", textColor: black, letterSpacing: 2, zIndex: zIndex++ });
  elements.push({ id: "swiss-spec-label", type: "text", name: "Spec Header", x: 220, y: 100, width: pageW - 280, height: 25, text: `SPECIFICATION DOSSIER // ${year}`, fontFamily: "monospace", fontSize: 11, fontWeight: "600", textColor: orange, letterSpacing: 1.5, zIndex: zIndex++ });
  elements.push({ id: "swiss-grid-line", type: "divider", name: "Main Grid Line", x: 60, y: 230, width: pageW - 120, height: 4, fillColor: black, zIndex: zIndex++ });
  elements.push({ id: "swiss-title", type: "text", name: "Title Main", x: 60, y: 270, width: pageW - 120, height: 140, text: title, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 50, fontWeight: "900", textColor: black, lineHeight: 1.05, letterSpacing: -2, isMetadataField: "assignmentTitle", zIndex: zIndex++ });
  elements.push({ id: "swiss-subtitle", type: "text", name: "Subtitle", x: 60, y: 430, width: pageW - 120, height: 50, text: subtitle, fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: "500", textColor: "#4B5563", zIndex: zIndex++ });
  elements.push({ id: "swiss-card", type: "shape", name: "Author Card", shapeType: "rectangle", x: 60, y: 510, width: pageW - 120, height: 110, fillColor: "#F9FAFB", borderColor: "#E5E7EB", borderWidth: 1, borderRadius: 0, zIndex: zIndex++ });
  elements.push({ id: "swiss-author-label", type: "text", name: "Author Label", x: 85, y: 525, width: 300, height: 18, text: "SUBMITTED BY // RESEARCH LEAD:", fontFamily: "monospace", fontSize: 10, fontWeight: "700", textColor: orange, letterSpacing: 1.5, zIndex: zIndex++ });
  elements.push({ id: "swiss-author-name", type: "text", name: "Author Name", x: 85, y: 550, width: 400, height: 32, text: author, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 22, fontWeight: "900", textColor: black, isMetadataField: "studentName", zIndex: zIndex++ });
  if (meta.instructorName) {
    elements.push({ id: "swiss-instructor", type: "text", name: "Instructor", x: 85, y: 585, width: 400, height: 20, text: `Under Supervision: ${meta.instructorName}`, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: "600", textColor: "#6B7280", isMetadataField: "instructorName", zIndex: zIndex++ });
  }
  elements.push({ id: "swiss-bottom-bar", type: "shape", name: "Bottom Black Bar", shapeType: "rectangle", x: 60, y: pageH - 90, width: pageW - 120, height: 6, fillColor: black, zIndex: zIndex++ });
  elements.push({ id: "swiss-footer-text", type: "text", name: "Footer Text", x: 60, y: pageH - 70, width: pageW - 120, height: 30, text: "ZÜRICH DESIGN ARCHIVE • HELVETICA STANDARDS", fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: "700", textColor: "#9CA3AF", letterSpacing: 1.5, zIndex: zIndex++ });
  return postProcessCoverElements(elements, meta, pageW, pageH);
}

export function generateCanvaStanfordCardinalWave(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const cardinal = meta.accentColor || "#8C1515";
  const gold = meta.secondaryColor || "#E98300";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Stanford Engineering Cohort")
    : (meta.studentName || "Alexander Hayes");
  const brand = meta.universityName || meta.department || "Stanford University";
  const title = meta.assignmentTitle || "DISTRIBUTED MACHINE LEARNING ACCELERATION";
  const year = meta.academicYear || "2026";
  const subtitle = meta.courseName || meta.courseCode || "CS 349 — Tensor Parallelism, Ring All-Reduce, and GPU Kernel Optimization";

  elements.push({ id: "canvas-bg", type: "shape", name: "Page Background", shapeType: "rectangle", x: 0, y: 0, width: pageW, height: pageH, fillColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "cardinal-top-gold", type: "shape", name: "Top Gold Ribbon", shapeType: "svg", x: 0, y: 0, width: 480, height: 220, fillColor: gold, svgContent: `<svg viewBox="0 0 480 220" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 480,0 C 400,100 280,180 160,180 C 90,180 30,200 0,220 Z" fill="${gold}" opacity="0.85"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "cardinal-top-red", type: "shape", name: "Top Cardinal Wave", shapeType: "svg", x: 0, y: 0, width: 450, height: 195, fillColor: cardinal, svgContent: `<svg viewBox="0 0 450 195" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 450,0 C 370,85 260,160 140,160 C 80,160 25,180 0,195 Z" fill="${cardinal}"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "cardinal-brand-pill", type: "badge", name: "Brand Badge", shapeType: "badge-pill", x: pageW - 220, y: 45, width: 160, height: 40, fillColor: cardinal, borderRadius: 20, zIndex: zIndex++ });
  elements.push({ id: "cardinal-brand-text", type: "text", name: "Brand Text", x: pageW - 215, y: 54, width: 150, height: 22, text: brand, fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "700", textAlign: "center", textColor: "#FFFFFF", letterSpacing: 1, zIndex: zIndex++ });
  elements.push({ id: "cardinal-title", type: "text", name: "Title Main", x: 80, y: 280, width: pageW - 160, height: 110, text: `${title} ${year}`, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 44, fontWeight: "800", textColor: cardinal, lineHeight: 1.1, letterSpacing: -1, isMetadataField: "assignmentTitle", zIndex: zIndex++ });
  elements.push({ id: "cardinal-subtitle", type: "text", name: "Subtitle", x: 80, y: 405, width: pageW - 160, height: 40, text: subtitle, fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "cardinal-meta-label", type: "text", name: "Prepared by Label", x: 80, y: 480, width: 320, height: 20, text: "Prepared by :", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "cardinal-meta-name", type: "text", name: "Author Name", x: 80, y: 505, width: 360, height: 32, text: author, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 20, fontWeight: "800", textColor: cardinal, isMetadataField: "studentName", zIndex: zIndex++ });
  if (meta.instructorName) {
    elements.push({ id: "cardinal-instructor", type: "text", name: "Instructor", x: 80, y: 544, width: 360, height: 24, text: `Under Direction of: ${meta.instructorName}`, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: "600", textColor: "#475569", isMetadataField: "instructorName", zIndex: zIndex++ });
  }
  elements.push({ id: "cardinal-br-gold", type: "shape", name: "Bottom Gold Wave", shapeType: "svg", x: pageW - 390, y: pageH - 260, width: 390, height: 260, fillColor: gold, svgContent: `<svg viewBox="0 0 390 260" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,260 C 140,260 220,170 390,85 L 390,260 Z" fill="${gold}" opacity="0.85"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "cardinal-br-red", type: "shape", name: "Bottom Cardinal Wave", shapeType: "svg", x: pageW - 360, y: pageH - 230, width: 360, height: 230, fillColor: cardinal, svgContent: `<svg viewBox="0 0 360 230" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,230 C 130,230 210,150 360,75 L 360,230 Z" fill="${cardinal}"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "cardinal-footer", type: "text", name: "Footer Contact", x: 80, y: pageH - 120, width: 360, height: 55, text: "Stanford Engineering • CS Research Publishing\nVerified Academic Research Report", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "500", textColor: "#64748B", lineHeight: 1.5, zIndex: zIndex++ });
  return postProcessCoverElements(elements, meta, pageW, pageH);
}

export function generateCanvaOceanicMaritimeCurve(
  meta: AssignmentMetadata,
  pageW: number = CANVAS_A4_WIDTH,
  pageH: number = CANVAS_A4_HEIGHT,
): CanvasCoverElement[] {
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;
  const ocean = meta.accentColor || "#0369A1";
  const aqua = meta.secondaryColor || "#0D9488";
  const isGroup = meta.assignmentType === "group";
  const author = isGroup
    ? (meta.groupName || meta.groupMembers?.[0]?.fullName || "Marine Research Expedition")
    : (meta.studentName || "Dr. Douglas Ballard");
  const brand = meta.universityName || meta.department || "Institute for Oceanographic Sciences";
  const title = meta.assignmentTitle || "OCEANIC BIODIVERSITY & THERMAL CURRENTS";
  const year = meta.academicYear || "2026";
  const subtitle = meta.courseName || meta.courseCode || "Deep-Sea Pelagic Ecosystems & Autonomous Submersible Bathymetry";

  elements.push({ id: "canvas-bg", type: "shape", name: "Page Background", shapeType: "rectangle", x: 0, y: 0, width: pageW, height: pageH, fillColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "ocean-top-aqua", type: "shape", name: "Top Aqua Wave", shapeType: "svg", x: 0, y: 0, width: 490, height: 225, fillColor: aqua, svgContent: `<svg viewBox="0 0 490 225" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 490,0 C 410,105 290,185 165,185 C 95,185 30,205 0,225 Z" fill="${aqua}" opacity="0.85"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "ocean-top-blue", type: "shape", name: "Top Ocean Wave", shapeType: "svg", x: 0, y: 0, width: 455, height: 198, fillColor: ocean, svgContent: `<svg viewBox="0 0 455 198" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,0 L 455,0 C 375,88 265,162 145,162 C 82,162 28,182 0,198 Z" fill="${ocean}"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "ocean-brand-pill", type: "badge", name: "Brand Badge", shapeType: "badge-pill", x: pageW - 220, y: 45, width: 160, height: 40, fillColor: ocean, borderRadius: 20, zIndex: zIndex++ });
  elements.push({ id: "ocean-brand-text", type: "text", name: "Brand Text", x: pageW - 215, y: 54, width: 150, height: 22, text: brand, fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "700", textAlign: "center", textColor: "#FFFFFF", zIndex: zIndex++ });
  elements.push({ id: "ocean-title", type: "text", name: "Title Main", x: 80, y: 280, width: pageW - 160, height: 110, text: `${title} ${year}`, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 44, fontWeight: "800", textColor: ocean, lineHeight: 1.1, letterSpacing: -1, isMetadataField: "assignmentTitle", zIndex: zIndex++ });
  elements.push({ id: "ocean-subtitle", type: "text", name: "Subtitle", x: 80, y: 405, width: pageW - 160, height: 40, text: subtitle, fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "ocean-meta-label", type: "text", name: "Prepared by Label", x: 80, y: 480, width: 320, height: 20, text: "Prepared by :", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: "500", textColor: "#64748B", zIndex: zIndex++ });
  elements.push({ id: "ocean-meta-name", type: "text", name: "Author Name", x: 80, y: 505, width: 360, height: 32, text: author, fontFamily: "Inter, Montserrat, sans-serif", fontSize: 20, fontWeight: "800", textColor: ocean, isMetadataField: "studentName", zIndex: zIndex++ });
  if (meta.instructorName) {
    elements.push({ id: "ocean-instructor", type: "text", name: "Instructor", x: 80, y: 544, width: 360, height: 24, text: `Expedition Lead: ${meta.instructorName}`, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: "600", textColor: "#475569", isMetadataField: "instructorName", zIndex: zIndex++ });
  }
  elements.push({ id: "ocean-br-aqua", type: "shape", name: "Bottom Aqua Wave", shapeType: "svg", x: pageW - 390, y: pageH - 260, width: 390, height: 260, fillColor: aqua, svgContent: `<svg viewBox="0 0 390 260" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,260 C 140,260 220,170 390,85 L 390,260 Z" fill="${aqua}" opacity="0.85"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "ocean-br-blue", type: "shape", name: "Bottom Ocean Wave", shapeType: "svg", x: pageW - 360, y: pageH - 230, width: 360, height: 230, fillColor: ocean, svgContent: `<svg viewBox="0 0 360 230" width="100%" height="100%" preserveAspectRatio="none"><path d="M 0,230 C 130,230 210,150 360,75 L 360,230 Z" fill="${ocean}"/></svg>`, zIndex: zIndex++ });
  elements.push({ id: "ocean-footer", type: "text", name: "Footer Contact", x: 80, y: pageH - 120, width: 360, height: 55, text: "LAT 32°44'N LONG 117°10'W • SCRIPPS SECTOR\nMarine Research Publishing", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: "500", textColor: "#64748B", lineHeight: 1.5, zIndex: zIndex++ });
  return postProcessCoverElements(elements, meta, pageW, pageH);
}

// -------------------------------------------------------------
// Scalable Registry of 84+ Modern Distinct Cover Templates
// -------------------------------------------------------------
export const COVER_TEMPLATES_REGISTRY: ExtendedCoverTemplateDefinition[] = [
  // -----------------------------------------------------------
  // 0. CANVA PREMIER ARCHETYPES (Modern Executive & Proposal Templates)
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
    id: "canva-violet-aurora-wave",
    name: "Violet & Cyan Fluid Aurora Modern Proposal",
    tagline: "Canva Layered Aurora Waves & Modern Badge",
    description: "Deep violet organic curved header with electric cyan underlay ribbon, dark brand pill badge, bold modern title, and matching dual-tone bottom wave curve.",
    category: "Modern",
    defaultAccent: "#4C1D95",
    secondaryColor: "#06B6D4",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, Montserrat, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Aurora", "Violet", "Cyan", "Modern", "Proposal", "Wave"],
    generateElements: generateCanvaVioletAuroraWave,
  },
  {
    id: "canva-tokyo-neomodern",
    name: "Tokyo Neo-Brutalist Tech Grid & Lime Ribbon",
    tagline: "Canva High-Contrast Obsidian & Electric Lime Spec",
    description: "Architectural dark charcoal header with electric lime pinstripe ribbon, dot matrix grid, monospace spec badge, and high-impact title block.",
    category: "Modern",
    defaultAccent: "#0F172A",
    secondaryColor: "#84CC16",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, Montserrat, monospace",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Tokyo", "Brutalist", "Lime", "Tech", "Modern"],
    generateElements: generateCanvaTokyoNeomodern,
  },
  {
    id: "canva-scandinavian-frost",
    name: "Nordic Minimalist Glacial Teal Curve",
    tagline: "Canva Swiss Refined Organic Teal Ribbon",
    description: "Flowing glacial teal organic curve with soft mint underlay, ultra-clean sans typography, minimalist divider rules, and elegant bottom accent.",
    category: "Minimalist",
    defaultAccent: "#0D9488",
    secondaryColor: "#5EEAD4",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Nordic", "Teal", "Minimalist", "Clean"],
    generateElements: generateCanvaScandinavianFrost,
  },
  {
    id: "canva-crimson-executive-curve",
    name: "Crimson Carmine & Gold Executive Ribbons",
    tagline: "Canva Dynamic Fluid Corporate Curves",
    description: "Flowing rich carmine red and warm gold dynamic wave curves, luxury editorial serif typography, executive metadata card, and matching bottom curve.",
    category: "Business",
    defaultAccent: "#991B1B",
    secondaryColor: "#D97706",
    backgroundColor: "#FFFFFF",
    fontFamily: "Georgia, 'Playfair Display', serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Crimson", "Gold", "Executive", "Corporate", "Wave"],
    generateElements: generateCanvaCrimsonExecutiveCurve,
  },
  {
    id: "canva-sunset-horizon",
    name: "Sunset Coral & Amber Organic Fluid Wave",
    tagline: "Canva Warm Sunset Layered Flowing Contours",
    description: "Radiant rose-coral and amber fluid wave ribbons curving gracefully across top and bottom, clean modern typography, and credentials badge.",
    category: "Creative",
    defaultAccent: "#E11D48",
    secondaryColor: "#F59E0B",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, Montserrat, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Sunset", "Coral", "Amber", "Creative", "Wave"],
    generateElements: generateCanvaSunsetHorizon,
  },
  {
    id: "canva-cyber-hex-mesh",
    name: "Cybernetic Cobalt & Aqua Hex Lattice",
    tagline: "Canva STEM Architecture & System Blueprint",
    description: "Deep cobalt angled tech polygons with aqua hexagon matrix accents, tech spec pill badge, and structured engineering metadata layout.",
    category: "Research",
    defaultAccent: "#2563EB",
    secondaryColor: "#06B6D4",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, monospace",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Cyber", "Hex", "Research", "Tech", "Cobalt"],
    generateElements: generateCanvaCyberHexMesh,
  },
  {
    id: "canva-academic-crest-modern",
    name: "Modern Ivy Academic Crest & Navy Arch",
    tagline: "Canva Contemporary Collegiate Heraldry",
    description: "Deep navy curved arch with heraldic crest emblem ribbon, golden amber rules, refined academic serif typography, and evaluator box.",
    category: "Academic",
    defaultAccent: "#1E3A8A",
    secondaryColor: "#D97706",
    backgroundColor: "#FFFFFF",
    fontFamily: "Georgia, 'Playfair Display', serif",
    borderStyle: "none",
    logoPosition: "top-center",
    metadataLayout: "centered",
    tags: ["Canva", "Academic", "Ivy", "Crest", "University", "Navy"],
    generateElements: generateCanvaAcademicCrestModern,
  },
  {
    id: "canva-forest-botanical",
    name: "Modern Emerald Botanical & Sage Ribbon",
    tagline: "Canva Organic Nature & Sustainability Curve",
    description: "Rich forest emerald and sage green flowing wave ribbons, clean modern typography, and environmental credentials stamp.",
    category: "Modern",
    defaultAccent: "#047857",
    secondaryColor: "#10B981",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, Montserrat, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Emerald", "Botanical", "Sage", "Modern", "Sustainability"],
    generateElements: generateCanvaForestBotanical,
  },
  {
    id: "canva-terracotta-editorial",
    name: "Terracotta & Warm Sand Editorial Magazine",
    tagline: "Canva Organic Diagonal Earth Tone Waves",
    description: "Warm terracotta and golden sand flowing organic wave ribbons, editorial serif typography, and elegant credentials layout.",
    category: "Formal",
    defaultAccent: "#C2410C",
    secondaryColor: "#D97706",
    backgroundColor: "#FFFFFF",
    fontFamily: "Georgia, 'Playfair Display', serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Terracotta", "Editorial", "Earth", "Formal", "Wave"],
    generateElements: generateCanvaTerracottaEditorial,
  },
  {
    id: "canva-quantum-indigo",
    name: "Quantum Indigo & Electric Violet Deck",
    tagline: "Canva High-Coherence Tech Polygon Architecture",
    description: "Deep indigo and electric cyan angular tech polygons with STEM dot cluster, monospace specs badge, and high-impact title block.",
    category: "Research",
    defaultAccent: "#312E81",
    secondaryColor: "#06B6D4",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, Montserrat, monospace",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Quantum", "Indigo", "Research", "Tech", "Polygon"],
    generateElements: generateCanvaQuantumIndigo,
  },
  {
    id: "canva-monochrome-arch",
    name: "Architectural Charcoal Arch & Zinc Slice",
    tagline: "Canva Spatial Design & Brutalist Minimalism",
    description: "Architectural charcoal geometric arch with zinc pinstripe contour, pill badge, and stark modern typography.",
    category: "Geometric",
    defaultAccent: "#18181B",
    secondaryColor: "#71717A",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, Montserrat, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Charcoal", "Arch", "Architecture", "Geometric", "Brutalist"],
    generateElements: generateCanvaMonochromeArch,
  },
  {
    id: "canva-prism-geometric",
    name: "Prismatic Cobalt & Coral Dynamic Facets",
    tagline: "Canva Multi-Angle Polygons & Tech Grid",
    description: "Dynamic cobalt and coral diagonal faceted polygons with dot matrix cluster and modern corporate credentials box.",
    category: "Geometric",
    defaultAccent: "#1D4ED8",
    secondaryColor: "#F43F5E",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, Montserrat, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Prism", "Cobalt", "Coral", "Geometric", "Facet"],
    generateElements: generateCanvaPrismGeometric,
  },
  {
    id: "canva-bauhaus-modernist",
    name: "Modern Bauhaus Primary Color Blocking",
    tagline: "Canva Asymmetric Modernism & Bold Geometry",
    description: "Deep navy header bar with vermilion circle cutout, golden yellow underlay rule, and heavy grotesque typography.",
    category: "Creative",
    defaultAccent: "#0F172A",
    secondaryColor: "#EF4444",
    backgroundColor: "#FAFAFA",
    fontFamily: "Inter, Montserrat, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Bauhaus", "Primary", "Creative", "Color Block", "Modernist"],
    generateElements: generateCanvaBauhausModernist,
  },
  {
    id: "canva-gradient-glassmorphism",
    name: "Pastel Gradient Wave & Glass Card",
    tagline: "Canva Soft Mesh Gradient & Glassmorphism Card",
    description: "Pastel indigo and pink fluid waves surrounding a central rounded glass card with contemporary badge and typography.",
    category: "Modern",
    defaultAccent: "#6366F1",
    secondaryColor: "#EC4899",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, Montserrat, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Pastel", "Gradient", "Glass", "Modern", "Wave"],
    generateElements: generateCanvaGradientGlassmorphism,
  },
  {
    id: "canva-cyberpunk-neon",
    name: "Cyberpunk Neon Grid & Cyan Wedge",
    tagline: "Canva High-Impact Dark Matrix & Neon Geometry",
    description: "Obsidian dark polygon wedge header with electric neon cyan and magenta laser rules, dot matrix grid, and monospace specs badge.",
    category: "Research",
    defaultAccent: "#00F0FF",
    secondaryColor: "#EC4899",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, monospace",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Cyberpunk", "Neon", "Cyan", "Research", "Tech"],
    generateElements: generateCanvaCyberpunkNeon,
  },
  {
    id: "canva-emerald-blueprint",
    name: "Emerald Quartz Hexagonal Blueprint",
    tagline: "Canva Sustainable Engineering & Hex Lattice",
    description: "Deep emerald and mint flowing wave ribbons, pill badge, and sustainable architectural credentials box.",
    category: "Geometric",
    defaultAccent: "#065F46",
    secondaryColor: "#10B981",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, Montserrat, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Emerald", "Blueprint", "Hex", "Sustainability", "Geometric"],
    generateElements: generateCanvaEmeraldBlueprint,
  },
  {
    id: "canva-rose-gold-luxury",
    name: "Rose Gold Luxury Fluid Ribbon",
    tagline: "Canva High-End Editorial Metallic Waves",
    description: "Flowing luxury rose-coral and metallic gold wave ribbons sweeping across top and bottom, editorial serif typography, and credentials badge.",
    category: "Creative",
    defaultAccent: "#E11D48",
    secondaryColor: "#FBBF24",
    backgroundColor: "#FFFFFF",
    fontFamily: "Georgia, 'Playfair Display', serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Rose Gold", "Luxury", "Waves", "Creative", "Editorial"],
    generateElements: generateCanvaRoseGoldLuxury,
  },
  {
    id: "canva-swiss-international",
    name: "Swiss International Bold Grid 2026",
    tagline: "Canva Zurich Objective Grotesque Layout",
    description: "Heavy black and international orange anchor block with oversized numeral, clean mathematical grid line, and authoritative typography.",
    category: "Minimalist",
    defaultAccent: "#111827",
    secondaryColor: "#EA580C",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, Montserrat, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Swiss", "International", "Minimalist", "Grotesque", "Grid"],
    generateElements: generateCanvaSwissInternational,
  },
  {
    id: "canva-stanford-cardinal-wave",
    name: "Stanford Cardinal Executive Diagonal Wave",
    tagline: "Canva Dynamic Cardinal Crimson & Gold Contours",
    description: "Dynamic Stanford cardinal red and warm gold organic wave ribbons, collegiate pill badge, and academic research publication footer.",
    category: "Academic",
    defaultAccent: "#8C1515",
    secondaryColor: "#E98300",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, Montserrat, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Stanford", "Cardinal", "Academic", "Wave", "Gold"],
    generateElements: generateCanvaStanfordCardinalWave,
  },
  {
    id: "canva-oceanic-maritime-curve",
    name: "Oceanic Deep Sapphire & Aquamarine Curve",
    tagline: "Canva Marine Expedition & Pelagic Oceanography",
    description: "Deep ocean sapphire and aquamarine layered fluid wave ribbons with research vessel coordinates stamp and environmental metadata layout.",
    category: "Creative",
    defaultAccent: "#0369A1",
    secondaryColor: "#0D9488",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter, Montserrat, sans-serif",
    borderStyle: "none",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
    tags: ["Canva", "Ocean", "Maritime", "Aquamarine", "Creative", "Wave"],
    generateElements: generateCanvaOceanicMaritimeCurve,
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

