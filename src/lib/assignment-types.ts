/**
 * DocuMind Universal Assignment Mode Types
 * Supports both Presentation Maker and Document Studio workflows.
 */

export type AssignmentType = "individual" | "group";

export interface StudentMember {
  id: string;
  fullName: string;
  studentId: string;
}

export interface AssignmentMetadata {
  isAssignment: boolean;
  assignmentType: AssignmentType;

  // Individual fields
  studentName?: string;
  studentId?: string;

  // Group fields
  groupMembers: StudentMember[];

  // Course & Submission (Required)
  courseName: string;
  instructorName: string;

  // Optional Academic Details
  assignmentTitle?: string;
  courseCode?: string;
  universityName?: string;
  department?: string;
  collegeOrFaculty?: string;
  academicYear?: string;
  semester?: string;
  submissionDate?: string;
  additionalInstructions?: string;

  // University Logo
  logoDataUrl?: string; // base64 or object URL
  logoFileName?: string;

  // Cover Page Template Selection (1 - 10)
  coverTemplateId: string;
  accentColor?: string;
}

export interface CoverTemplateDefinition {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: "Classic" | "Modern" | "Formal" | "Creative" | "Minimal";
  defaultAccent: string;
  fontFamily: string;
  borderStyle: "none" | "single" | "double" | "accent-bar" | "frame" | "asymmetric" | "grid";
  logoPosition: "top-center" | "top-left" | "hero-center" | "sidebar" | "corner-badge";
  metadataLayout: "centered" | "split-two-col" | "grid-box" | "left-stacked" | "card-frame";
}

export const COVER_TEMPLATES: CoverTemplateDefinition[] = [
  {
    id: "classic-university",
    name: "Classic University",
    tagline: "Traditional Academic Heritage",
    description: "Centered formal academic hierarchy with elegant serif typography, crest framing, and traditional collegiate presentation.",
    category: "Classic",
    defaultAccent: "#1E3A8A", // Navy / Oxford Blue
    fontFamily: "Playfair Display, serif",
    borderStyle: "frame",
    logoPosition: "top-center",
    metadataLayout: "centered",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    tagline: "Contemporary Clean Sans",
    description: "Ultra-clean left-aligned layout with subtle vertical accent bars, ample whitespace, and sleek modern typography.",
    category: "Minimal",
    defaultAccent: "#0F766E", // Deep Teal
    fontFamily: "Inter, sans-serif",
    borderStyle: "accent-bar",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
  },
  {
    id: "formal-academic",
    name: "Formal Academic",
    tagline: "Rigorous Double-Ruled Border",
    description: "Rigorous institutional style featuring a perimeter double border, uppercase department badges, and structured submission grid.",
    category: "Formal",
    defaultAccent: "#334155", // Slate
    fontFamily: "Merriweather, serif",
    borderStyle: "double",
    logoPosition: "top-center",
    metadataLayout: "split-two-col",
  },
  {
    id: "elegant-blue",
    name: "Elegant Blue",
    tagline: "Refined Royal Framing",
    description: "Distinguished sapphire blue framing with subtle drop-card containers, modern geometric accents, and refined typography.",
    category: "Modern",
    defaultAccent: "#2563EB", // Royal Blue
    fontFamily: "Montserrat, sans-serif",
    borderStyle: "frame",
    logoPosition: "top-center",
    metadataLayout: "card-frame",
  },
  {
    id: "professional-navy",
    name: "Professional Navy",
    tagline: "Prestige Executive Banner",
    description: "Deep navy header banner anchoring institutional credentials with a structured corporate-academic two-column split.",
    category: "Formal",
    defaultAccent: "#0F172A", // Dark Navy
    fontFamily: "Calibri, sans-serif",
    borderStyle: "asymmetric",
    logoPosition: "sidebar",
    metadataLayout: "split-two-col",
  },
  {
    id: "clean-black-white",
    name: "Clean Black and White",
    tagline: "Editorial High-Contrast",
    description: "High-contrast monochrome editorial layout emphasizing pristine typographic weights, bold divider rules, and zero distraction.",
    category: "Minimal",
    defaultAccent: "#000000", // Pure Black
    fontFamily: "Inter, sans-serif",
    borderStyle: "single",
    logoPosition: "top-left",
    metadataLayout: "left-stacked",
  },
  {
    id: "contemporary-editorial",
    name: "Contemporary Editorial",
    tagline: "Journal & Magazine Aesthetic",
    description: "Academic journal styling with prominent display title, dual-column student/instructor matrix, and publication date stamp.",
    category: "Creative",
    defaultAccent: "#7C3AED", // Violet
    fontFamily: "Playfair Display, serif",
    borderStyle: "accent-bar",
    logoPosition: "top-left",
    metadataLayout: "split-two-col",
  },
  {
    id: "university-branding",
    name: "University Branding",
    tagline: "Hero Emblem & Badge Focus",
    description: "Hero emblem placement with institutional ribbon, bold university headers, and official assignment certification badge.",
    category: "Classic",
    defaultAccent: "#B91C1C", // Crimson / Harvard Red
    fontFamily: "Merriweather, serif",
    borderStyle: "frame",
    logoPosition: "hero-center",
    metadataLayout: "centered",
  },
  {
    id: "structured-research",
    name: "Structured Research",
    tagline: "Technical Matrix & Box Grid",
    description: "Laboratory and technical report aesthetic with boxed metadata cells, course code pill badges, and structured member tables.",
    category: "Formal",
    defaultAccent: "#0369A1", // Ocean Sky
    fontFamily: "Roboto, sans-serif",
    borderStyle: "grid",
    logoPosition: "top-left",
    metadataLayout: "grid-box",
  },
  {
    id: "simple-student-assignment",
    name: "Simple Student Assignment",
    tagline: "Quick Standard Submission",
    description: "Straightforward, approachable layout designed for standard homework, course projects, and swift student submissions.",
    category: "Minimal",
    defaultAccent: "#4F46E5", // Indigo
    fontFamily: "Inter, sans-serif",
    borderStyle: "single",
    logoPosition: "top-center",
    metadataLayout: "card-frame",
  },
];

export function getDefaultAssignmentMetadata(): AssignmentMetadata {
  return {
    isAssignment: false,
    assignmentType: "individual",
    studentName: "",
    studentId: "",
    groupMembers: [
      { id: "member-1", fullName: "", studentId: "" },
      { id: "member-2", fullName: "", studentId: "" },
    ],
    courseName: "",
    instructorName: "",
    assignmentTitle: "",
    courseCode: "",
    universityName: "",
    department: "",
    collegeOrFaculty: "",
    academicYear: "",
    semester: "",
    submissionDate: new Date().toISOString().split("T")[0],
    additionalInstructions: "",
    logoDataUrl: undefined,
    logoFileName: undefined,
    coverTemplateId: "classic-university",
    accentColor: "#1E3A8A",
  };
}
