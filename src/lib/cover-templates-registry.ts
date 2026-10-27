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
  const elements: CanvasCoverElement[] = [];
  let zIndex = 1;

  const accent = meta.accentColor || template.defaultAccent || "#1E3A8A";
  const secondary = template.secondaryColor || "#475569";
  const isGroup = meta.assignmentType === "group";
  const groupName = meta.groupName?.trim();
  const showGroupOnCover = isGroup && meta.groupNamePlacement !== "first-body-page";

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
    // Individual Student Section
    elements.push({
      id: "card-student-box",
      type: "shape",
      name: "Student Info Card",
      shapeType: "rounded-card",
      x: univAlign === "left" ? 64 : pageW / 2 - 160,
      y: studentStartY,
      width: univAlign === "left" ? 340 : 320,
      height: 84,
      fillColor: "#F8FAFC",
      borderColor: "#E2E8F0",
      borderWidth: 1,
      borderRadius: 8,
      zIndex: zIndex++,
    });

    elements.push({
      id: "text-submitted-by-label",
      type: "text",
      name: "Submitted By Label",
      x: univAlign === "left" ? 80 : pageW / 2 - 140,
      y: studentStartY + 10,
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
      x: univAlign === "left" ? 80 : pageW / 2 - 140,
      y: studentStartY + 30,
      width: 280,
      height: 24,
      text: meta.studentName?.trim() || "Student Full Name",
      fontFamily: font,
      fontSize: 14,
      fontWeight: "700",
      textAlign: univAlign,
      textColor: "#0F172A",
      isMetadataField: "studentName",
      zIndex: zIndex++,
    });

    elements.push({
      id: "text-student-id",
      type: "text",
      name: "Student ID",
      x: univAlign === "left" ? 80 : pageW / 2 - 140,
      y: studentStartY + 54,
      width: 280,
      height: 20,
      text: `ID: ${meta.studentId?.trim() || "Student ID"}`,
      fontFamily: "monospace",
      fontSize: 11,
      fontWeight: "600",
      textAlign: univAlign,
      textColor: secondary,
      isMetadataField: "studentId",
      zIndex: zIndex++,
    });
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
// Scalable Registry of 52+ Distinct Cover Templates
// -------------------------------------------------------------
export const COVER_TEMPLATES_REGISTRY: ExtendedCoverTemplateDefinition[] = [
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
    COVER_TEMPLATES_REGISTRY[0]!
  );
}
