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

export type CoverElementType = "text" | "shape" | "image" | "badge" | "divider";

export interface CanvasCoverElement {
  id: string;
  type: CoverElementType;
  name?: string;
  x: number; // pixels in standard canvas coordinate space (794 x 1123)
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex: number;
  // Text properties
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold" | "500" | "600" | "700" | "800";
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  textColor?: string;
  textTransform?: "none" | "uppercase" | "capitalize" | "lowercase";
  lineHeight?: number;
  letterSpacing?: number;
  isMetadataField?: keyof AssignmentMetadata | "groupMembersList" | "instructorBlock" | "institutionBlock";
  // Shape properties
  shapeType?: "rectangle" | "rounded-card" | "circle" | "accent-bar" | "badge-pill" | "ribbon";
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  // Image / Logo properties
  imageUrl?: string;
  imageFit?: "contain" | "cover";
}

export interface AssignmentMetadata {
  isAssignment: boolean;
  assignmentType: AssignmentType;

  // Individual fields
  studentName?: string;
  studentId?: string;

  // Group fields
  groupName?: string;
  groupNamePlacement?: "cover" | "first-body-page";
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

  // University / Group Logo
  logoDataUrl?: string; // base64 or object URL
  logoFileName?: string;

  // Cover Page Template Selection (50+ Templates)
  coverTemplateId: string;
  accentColor?: string;

  // Native Canva-like Canvas Editor Data
  customCoverElements?: CanvasCoverElement[];
  pageFormat?: "A4" | "Letter";
  pageOrientation?: "portrait" | "landscape";
}

export interface CoverTemplateDefinition {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category:
    | "Classic"
    | "Modern"
    | "Formal"
    | "Creative"
    | "Minimal"
    | "Academic"
    | "Research"
    | "Business"
    | "Geometric"
    | "Minimalist";
  defaultAccent: string;
  secondaryColor?: string;
  fontFamily: string;
  borderStyle: "none" | "single" | "double" | "accent-bar" | "frame" | "asymmetric" | "grid";
  logoPosition: "top-center" | "top-left" | "hero-center" | "sidebar" | "corner-badge";
  metadataLayout: "centered" | "split-two-col" | "grid-box" | "left-stacked" | "card-frame";
}

import { COVER_TEMPLATES_REGISTRY } from "./cover-templates-registry";

export const COVER_TEMPLATES: CoverTemplateDefinition[] = COVER_TEMPLATES_REGISTRY;

export function getDefaultAssignmentMetadata(): AssignmentMetadata {
  return {
    isAssignment: false,
    assignmentType: "individual",
    studentName: "",
    studentId: "",
    groupName: "",
    groupNamePlacement: "cover",
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
    pageFormat: "A4",
    pageOrientation: "portrait",
  };
}
