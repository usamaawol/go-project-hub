/**
 * DocuMind Unified AI-Powered Assignment Creation Workflow
 * Shared across Document Studio (ISO A4 Documents) and Presentation Maker (16:9 Decks).
 *
 * 7 Dedicated Stages:
 * 1. Assignment Information (Individual vs Group, with placement options)
 * 2. Optional University Logo Upload (PNG, JPG, WebP with aspect ratio & transparency)
 * 3. Professional Cover-Page Template Selection (50+ genuinely distinct templates)
 * 4. Assignment Content Upload (PDF, DOCX, TXT, multi-file & paste text)
 * 5. AI Processing & Formatting (strict preservation of authentic facts/equations)
 * 6. Final Preview & Editing (A4 multi-page viewer, Canva cover editor, rich Word toolbar)
 * 7. Export & Download (genuine DOCX, publication PDF, and 16:9 PPTX)
 */

import React, { useState, useRef, useEffect } from "react";
import {
  AssignmentMetadata,
  AssignmentType,
  StudentMember,
  getDefaultAssignmentMetadata,
  COVER_TEMPLATES,
  type CoverTemplateDefinition,
  type CanvasCoverElement,
} from "@/lib/assignment-types";
import { getCoverTemplateById } from "@/lib/cover-templates-registry";
import {
  extractAssignmentMetadataFromText,
  type ExtractedAssignmentSuggestions,
  formatStudentMemberDisplay,
} from "@/lib/assignment-metadata-extractor";
import { extractDocumentText } from "@/lib/api-client";
import {
  renderExecutiveDocx,
  renderExecutivePdf,
  parsePlainTextToBlocks,
  parseHtmlToBlocks,
  type DocBlock,
} from "@/lib/document-synthesizer";
import {
  parseDocumentSections,
  paginateSectionsIntoA4Pages,
  convertSectionsToInitialHtml,
  type FormattingConfig,
  type DocumentSection,
} from "./DocumentFormattingWorkflow";
import { AssignmentCoverRenderer } from "./AssignmentCoverRenderer";
import { CoverCanvasEditor } from "./CoverCanvasEditor";
import { DocumentWordToolbar } from "./DocumentWordToolbar";
import {
  buildSlideDeckContent,
  generateAndDownloadClientPptx,
  type SlidePreviewItem,
  type PresentationSessionData,
  type SlideLayoutType,
} from "@/lib/presentation-session-client";
import { computeThemeTokens, TEMPLATES } from "@/lib/presentation-theme";
import { eraseWorkspaceJobsOnDownload } from "@/lib/workspace-history";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  User,
  Users,
  Upload,
  Sparkles,
  FileText,
  Building,
  GraduationCap,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
  Printer,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Sliders,
  Palette,
  Search,
  Layout,
  Eye,
  Edit3,
  Wand2,
  AlertCircle,
  FileCheck,
  Check,
  Layers,
  Presentation,
  BookOpen,
  RefreshCw,
  X,
  FileCode,
  Copy,
  ExternalLink,
  Bold,
  Italic,
  Type,
  Columns,
  Quote,
  ListChecks,
  BarChart3,
  MessageSquare,
  Minus,
} from "lucide-react";

export interface UnifiedAssignmentWorkflowProps {
  mode: "document" | "presentation";
  onExitAssignmentMode?: () => void;
  initialMetadata?: AssignmentMetadata;
  initialContent?: string;
}

interface UploadedFileItem {
  id: string;
  name: string;
  size: number;
  format: string;
  text: string;
  status: "success" | "error" | "extracting";
}

const MAX_LOGO_SIZE_MB = 5;

const ACCENT_PALETTE = [
  { name: "Oxford Navy", hex: "#1E3A8A" },
  { name: "Royal Blue", hex: "#2563EB" },
  { name: "Deep Teal", hex: "#0F766E" },
  { name: "Harvard Crimson", hex: "#B91C1C" },
  { name: "Slate Charcoal", hex: "#334155" },
  { name: "Monochrome Black", hex: "#111827" },
  { name: "Amethyst Violet", hex: "#7C3AED" },
  { name: "Ocean Sky", hex: "#0284C7" },
  { name: "Forest Green", hex: "#15803D" },
  { name: "Amber Gold", hex: "#D97706" },
  { name: "Terracotta Orange", hex: "#C2410C" },
];

const TEMPLATE_CATEGORIES = [
  "All",
  "Academic",
  "Modern",
  "Formal",
  "Research",
  "Business",
  "Minimalist",
  "Geometric",
  "Creative",
];

const STAGES = [
  { num: 1, title: "Assignment Info", desc: "Student & Course" },
  { num: 2, title: "University Logo", desc: "Optional Emblem" },
  { num: 3, title: "Cover Template", desc: "50+ Academic Styles" },
  { num: 4, title: "Content Upload", desc: "PDF, Word, or Notes" },
  { num: 5, title: "AI Formatting", desc: "Intelligent Layout" },
  { num: 6, title: "Preview & Edit", desc: "Review & Refine" },
  { num: 7, title: "Export", desc: "DOCX, PDF, PPTX" },
];

export function UnifiedAssignmentWorkflow({
  mode,
  onExitAssignmentMode,
  initialMetadata,
  initialContent = "",
}: UnifiedAssignmentWorkflowProps) {
  // Current active stage (1 to 7)
  const [currentStage, setCurrentStage] = useState<number>(1);

  // Assignment metadata state
  const [metadata, setMetadata] = useState<AssignmentMetadata>(() => ({
    ...getDefaultAssignmentMetadata(),
    ...(initialMetadata || {}),
    isAssignment: true,
    assignmentType: initialMetadata?.assignmentType || "individual",
    submissionDate: initialMetadata?.submissionDate || new Date().toISOString().split("T")[0],
  }));

  // Logo upload state
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Cover selection state
  const [coverSearch, setCoverSearch] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // Content upload state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const [rawContent, setRawContent] = useState<string>(initialContent);
  const [contentTab, setContentTab] = useState<"upload" | "paste">("upload");
  const [isExtractingFile, setIsExtractingFile] = useState<boolean>(false);
  const contentFileInputRef = useRef<HTMLInputElement>(null);

  // Non-intrusive metadata suggestions detected from uploaded files
  const [extractedSuggestions, setExtractedSuggestions] =
    useState<ExtractedAssignmentSuggestions | null>(null);

  // Stage 5 AI Processing State
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [aiProgress, setAiProgress] = useState<number>(0);
  const [aiMilestoneIndex, setAiMilestoneIndex] = useState<number>(0);

  // Stage 6 Preview & Editing State (Document Mode)
  const [formattingConfig, setFormattingConfig] = useState<FormattingConfig>({
    fontFamily: "academic",
    baseFontSize: "11pt",
    lineSpacing: "1.5",
    margins: "normal",
    headingNumbering: "decimal",
    includeToc: true,
    headerText: "",
    footerText: "",
    pageNumberFormat: "page-x-of-y",
    hasCoverPage: true,
    layoutArchetype: "academic",
    docTitle: metadata.assignmentTitle || "Academic Assignment",
    docSubtitle: metadata.courseName || "",
    institution: metadata.universityName || "",
    authorName: metadata.studentName || "",
    dateStr: metadata.submissionDate || "",
    accentColor: metadata.accentColor || "#1E3A8A",
    assignmentMetadata: metadata,
  });

  const [documentViewMode, setDocumentViewMode] = useState<"all" | "single" | "editor" | "toc" | "cover">("all");
  const [activePageNum, setActivePageNum] = useState<number>(1);
  const [bodyHtml, setBodyHtml] = useState<string>("");
  const [isCanvasEditorOpen, setIsCanvasEditorOpen] = useState<boolean>(false);
  const [isEditCoverModalOpen, setIsEditCoverModalOpen] = useState<boolean>(false);

  // Stage 6 Preview & Editing State (Presentation Mode)
  const [presentationSession, setPresentationSession] = useState<PresentationSessionData | null>(null);
  const [currentSlideIdx, setCurrentSlideIdx] = useState<number>(0);
  const [showNotesDrawer, setShowNotesDrawer] = useState<boolean>(false);

  const updateCurrentSlide = (fields: Partial<SlidePreviewItem>) => {
    if (!presentationSession) return;
    setPresentationSession((prev) => {
      if (!prev) return null;
      const updatedSlides = [...prev.slides];
      const target = updatedSlides[currentSlideIdx];
      if (!target) return prev;
      updatedSlides[currentSlideIdx] = {
        ...target,
        ...fields,
      };
      const updatedTitle = currentSlideIdx === 0 && fields.title ? fields.title : prev.title;
      return {
        ...prev,
        title: updatedTitle,
        slides: updatedSlides,
      };
    });
  };

  const handleAddNewSlide = () => {
    if (!presentationSession) return;
    const newIdx = currentSlideIdx + 1;
    const newSlide: SlidePreviewItem = {
      id: `slide-${Date.now()}`,
      slideNumber: newIdx + 1,
      layout: "content",
      title: "New Analysis Slide",
      subtitle: "Supporting academic analysis and findings",
      categoryTag: metadata.courseName ? metadata.courseName.toUpperCase() : "ANALYSIS",
      bullets: [
        "Primary premise and contextual evaluation.",
        "Key evidence supporting this section.",
        "Analytical conclusion or implications.",
      ],
      notes: "Speaker notes for this analysis slide.",
    };

    setPresentationSession((prev) => {
      if (!prev) return null;
      const slides = [...prev.slides];
      slides.splice(newIdx, 0, newSlide);
      return {
        ...prev,
        slides: slides.map((s, idx) => ({ ...s, slideNumber: idx + 1 })),
        slideCount: slides.length,
      };
    });
    setCurrentSlideIdx(newIdx);
    toast.success("New slide added!");
  };

  const handleDuplicateCurrentSlide = () => {
    if (!presentationSession || currentSlideIdx <= 0) return;
    const target = presentationSession.slides[currentSlideIdx];
    if (!target) return;
    const newIdx = currentSlideIdx + 1;
    const dupSlide: SlidePreviewItem = {
      ...target,
      id: `slide-${Date.now()}`,
      slideNumber: newIdx + 1,
      title: `${target.title} (Copy)`,
      bullets: target.bullets ? [...target.bullets] : undefined,
    };

    setPresentationSession((prev) => {
      if (!prev) return null;
      const slides = [...prev.slides];
      slides.splice(newIdx, 0, dupSlide);
      return {
        ...prev,
        slides: slides.map((s, idx) => ({ ...s, slideNumber: idx + 1 })),
        slideCount: slides.length,
      };
    });
    setCurrentSlideIdx(newIdx);
    toast.success("Slide duplicated!");
  };

  const handleDeleteCurrentSlide = () => {
    if (!presentationSession || currentSlideIdx <= 0) {
      toast.error("The Assignment Cover Page cannot be deleted.");
      return;
    }
    if (presentationSession.slides.length <= 2) {
      toast.error("Presentation requires at least one content slide.");
      return;
    }
    setPresentationSession((prev) => {
      if (!prev) return null;
      const slides = prev.slides.filter((_, idx) => idx !== currentSlideIdx);
      return {
        ...prev,
        slides: slides.map((s, idx) => ({ ...s, slideNumber: idx + 1 })),
        slideCount: slides.length,
      };
    });
    setCurrentSlideIdx((prev) => Math.max(0, prev - 1));
    toast.success("Slide deleted.");
  };

  const handleMoveSlide = (direction: "up" | "down") => {
    if (!presentationSession || currentSlideIdx <= 0) return;
    const targetIdx = direction === "up" ? currentSlideIdx - 1 : currentSlideIdx + 1;
    if (targetIdx <= 0 || targetIdx >= presentationSession.slides.length) return;

    setPresentationSession((prev) => {
      if (!prev) return null;
      const slides = [...prev.slides];
      const temp = slides[currentSlideIdx]!;
      slides[currentSlideIdx] = slides[targetIdx]!;
      slides[targetIdx] = temp;
      return {
        ...prev,
        slides: slides.map((s, idx) => ({ ...s, slideNumber: idx + 1 })),
      };
    });
    setCurrentSlideIdx(targetIdx);
  };

  const handleAddBullet = () => {
    if (!presentationSession || currentSlideIdx <= 0) return;
    const cur = presentationSession.slides[currentSlideIdx];
    if (!cur) return;
    const bullets = [...(cur.bullets || []), "New key analytical point"];
    updateCurrentSlide({ bullets });
  };

  const handleUpdateBullet = (bIdx: number, val: string) => {
    if (!presentationSession || currentSlideIdx <= 0) return;
    const cur = presentationSession.slides[currentSlideIdx];
    if (!cur) return;
    const bullets = [...(cur.bullets || [])];
    bullets[bIdx] = val;
    updateCurrentSlide({ bullets });
  };

  const handleRemoveBullet = (bIdx: number) => {
    if (!presentationSession || currentSlideIdx <= 0) return;
    const cur = presentationSession.slides[currentSlideIdx];
    if (!cur) return;
    const bullets = (cur.bullets || []).filter((_, idx) => idx !== bIdx);
    updateCurrentSlide({ bullets });
  };

  const handleAdjustFontSize = (delta: number) => {
    if (!presentationSession || currentSlideIdx <= 0) return;
    const cur = presentationSession.slides[currentSlideIdx];
    if (!cur) return;
    const currentSize = cur.titleFontSize || 26;
    const nextSize = Math.max(14, Math.min(48, currentSize + delta));
    updateCurrentSlide({ titleFontSize: nextSize });
  };

  const handleToggleBold = () => {
    if (!presentationSession || currentSlideIdx <= 0) return;
    const cur = presentationSession.slides[currentSlideIdx];
    if (!cur) return;
    const currentBold = cur.isTitleBold !== undefined ? cur.isTitleBold : true;
    updateCurrentSlide({ isTitleBold: !currentBold });
  };

  const handleToggleItalic = () => {
    if (!presentationSession || currentSlideIdx <= 0) return;
    const cur = presentationSession.slides[currentSlideIdx];
    if (!cur) return;
    const currentItalic = cur.isSubtitleItalic !== undefined ? cur.isSubtitleItalic : true;
    updateCurrentSlide({ isSubtitleItalic: !currentItalic });
  };

  const handleSelectTextColor = (hex: string) => {
    if (!presentationSession || currentSlideIdx <= 0) return;
    updateCurrentSlide({ textColor: hex });
  };

  const handleSelectLayout = (layout: SlideLayoutType) => {
    if (!presentationSession || currentSlideIdx <= 0) return;
    updateCurrentSlide({ layout });
  };

  // Stage 7 Export States
  const [isExportingDocx, setIsExportingDocx] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isExportingPptx, setIsExportingPptx] = useState<boolean>(false);
  const [lastExportedFormat, setLastExportedFormat] = useState<string | null>(null);

  // Synchronize document config when metadata changes
  useEffect(() => {
    setFormattingConfig((prev) => ({
      ...prev,
      docTitle: metadata.assignmentTitle || metadata.courseName || prev.docTitle,
      docSubtitle: metadata.courseName || prev.docSubtitle,
      institution: metadata.universityName || prev.institution,
      authorName:
        metadata.assignmentType === "individual"
          ? metadata.studentName || prev.authorName
          : metadata.groupMembers[0]?.fullName || metadata.groupName || prev.authorName,
      dateStr: metadata.submissionDate || prev.dateStr,
      accentColor: metadata.accentColor || prev.accentColor,
      assignmentMetadata: metadata,
    }));
  }, [metadata]);

  // Validation helper for Stage 1
  const validateStage1 = (): boolean => {
    const isGroup = metadata.assignmentType === "group";

    if (!isGroup) {
      if (!metadata.studentName?.trim()) {
        toast.error("Please enter Student's Full Name");
        return false;
      }
      if (!metadata.studentId?.trim()) {
        toast.error("Please enter Student ID");
        return false;
      }
    } else {
      if (!metadata.assignmentTitle?.trim()) {
        toast.error("Please enter Group Assignment Title");
        return false;
      }
      const validMembers = (metadata.groupMembers || []).filter(
        (m) => m && m.fullName.trim() && m.studentId.trim()
      );
      if (validMembers.length === 0) {
        toast.error("Group assignments require at least one member with Full Name and Student ID");
        return false;
      }
    }

    if (!metadata.courseName?.trim()) {
      toast.error("Please enter Course Name or Subject");
      return false;
    }
    if (!metadata.instructorName?.trim()) {
      toast.error("Please enter Instructor's Name (Submitted to)");
      return false;
    }

    return true;
  };

  // Field updater
  const updateMetaField = (key: keyof AssignmentMetadata, value: any) => {
    setMetadata((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Group member manipulation
  const handleAddMember = () => {
    const newMember: StudentMember = {
      id: `member-${Date.now()}-${(metadata.groupMembers || []).length + 1}`,
      fullName: "",
      studentId: "",
    };
    updateMetaField("groupMembers", [...(metadata.groupMembers || []), newMember]);
  };

  const handleUpdateMember = (index: number, key: keyof StudentMember, val: string) => {
    const updated = (metadata.groupMembers || []).map((m, i) =>
      i === index ? { ...m, [key]: val } : m
    );
    updateMetaField("groupMembers", updated);
  };

  const handleRemoveMember = (index: number) => {
    if ((metadata.groupMembers || []).length <= 1) {
      toast.error("At least one group member is required for group assignments.");
      return;
    }
    const updated = (metadata.groupMembers || []).filter((_, i) => i !== index);
    updateMetaField("groupMembers", updated);
  };

  const handleMoveMember = (index: number, direction: "up" | "down") => {
    const members = [...(metadata.groupMembers || [])];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= members.length) return;
    const temp = members[targetIdx]!;
    members[targetIdx] = members[index]!;
    members[index] = temp;
    updateMetaField("groupMembers", members);
  };

  // Stage 2 Logo Upload Handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoError(null);
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setLogoError("Please upload a PNG, JPG, or WebP university logo image.");
      return;
    }

    if (file.size > MAX_LOGO_SIZE_MB * 1024 * 1024) {
      setLogoError(`Logo image must be smaller than ${MAX_LOGO_SIZE_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      updateMetaField("logoDataUrl", dataUrl);
      updateMetaField("logoFileName", file.name);
      toast.success("University logo attached", {
        description: `Preserving aspect ratio & native transparency (${file.name}).`,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    updateMetaField("logoDataUrl", undefined);
    updateMetaField("logoFileName", undefined);
    if (logoInputRef.current) logoInputRef.current.value = "";
    toast.info("University logo removed");
  };

  // Stage 4 Content Upload Handler
  const handleContentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsExtractingFile(true);
    let aggregatedText = rawContent;

    for (const file of files) {
      const newFileItem: UploadedFileItem = {
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        size: file.size,
        format: file.name.split(".").pop()?.toUpperCase() || "TXT",
        text: "",
        status: "extracting",
      };

      setUploadedFiles((prev) => [...prev, newFileItem]);

      try {
        const extraction = await extractDocumentText(file);
        const extractedText = extraction.text || "";

        newFileItem.text = extractedText;
        newFileItem.status = "success";

        setUploadedFiles((prev) =>
          prev.map((f) => (f.id === newFileItem.id ? newFileItem : f))
        );

        if (aggregatedText.trim()) {
          aggregatedText += `\n\n--- ${file.name} ---\n\n` + extractedText;
        } else {
          aggregatedText = extractedText;
        }

        // Detect suggestions from text
        const suggestions = extractAssignmentMetadataFromText(extractedText);
        if (suggestions.hasSuggestions) {
          setExtractedSuggestions(suggestions);
        }
      } catch (err: any) {
        newFileItem.status = "error";
        setUploadedFiles((prev) =>
          prev.map((f) => (f.id === newFileItem.id ? newFileItem : f))
        );
        toast.error(`Could not extract ${file.name}: ${err?.message || "File error"}`);
      }
    }

    setRawContent(aggregatedText);
    setIsExtractingFile(false);
    toast.success("Assignment material extracted successfully!");
  };

  const handleRemoveUploadedFile = (id: string) => {
    const remaining = uploadedFiles.filter((f) => f.id !== id);
    setUploadedFiles(remaining);
    const combined = remaining.map((f) => f.text).join("\n\n");
    setRawContent(combined);
  };

  // Apply suggestions from uploaded text to metadata
  const handleApplySuggestions = () => {
    if (!extractedSuggestions) return;
    setMetadata((prev) => ({
      ...prev,
      studentName: extractedSuggestions.studentName || prev.studentName,
      studentId: extractedSuggestions.studentId || prev.studentId,
      courseName: extractedSuggestions.courseName || prev.courseName,
      instructorName: extractedSuggestions.instructorName || prev.instructorName,
      universityName: extractedSuggestions.universityName || prev.universityName,
      department: extractedSuggestions.department || prev.department,
      assignmentTitle: extractedSuggestions.assignmentTitle || prev.assignmentTitle,
      assignmentType: extractedSuggestions.detectedType || prev.assignmentType,
    }));
    setExtractedSuggestions(null);
    toast.success("Applied detected assignment information!");
  };

  // Stage 5 Trigger: Execute AI Processing
  const handleExecuteAiProcessing = async () => {
    if (!rawContent.trim()) {
      toast.error("Please upload assignment files or paste your content first.");
      return;
    }

    setCurrentStage(5);
    setIsAiProcessing(true);
    setAiProgress(10);
    setAiMilestoneIndex(0);

    // Realistic milestone progression
    const milestones = [
      "Analyzing uploaded assignment content and preserving authentic text...",
      "Normalizing heading hierarchy, subheadings, and section structure...",
      "Formatting academic typography, spacing, citations, and tables...",
      mode === "document"
        ? "Applying ISO A4 page layout, margins, and Table of Contents..."
        : "Synthesizing widescreen 16:9 presentation slide deck...",
      "Embedding Cover Page (Page 1) with student credentials and institutional logo...",
    ];

    for (let i = 0; i < milestones.length; i++) {
      setAiMilestoneIndex(i);
      setAiProgress(20 + i * 18);
      await new Promise((r) => setTimeout(r, 450));
    }

    setAiProgress(100);

    if (mode === "document") {
      // Build document sections and initial HTML
      const sections = parseDocumentSections(rawContent, formattingConfig.headingNumbering);
      const initialHtml = convertSectionsToInitialHtml(sections);
      setBodyHtml(initialHtml);
    } else {
      // Build presentation slides with assignment cover as Slide 1
      const title =
        metadata.assignmentTitle?.trim() ||
        metadata.courseName?.trim() ||
        "Course Assignment";

      const slides = buildSlideDeckContent(
        title,
        rawContent,
        8,
        "balanced",
        "Academic Assignment",
        { ...metadata, isAssignment: true },
      );

      const session: PresentationSessionData = {
        id: `sess-${Date.now()}`,
        title,
        purpose: "Academic Assignment",
        density: "balanced",
        assignmentMetadata: { ...metadata, isAssignment: true },
        theme: {
          id: "corporate-clean",
          name: "Academic Clean",
          category: "Academic",
          kind: "academic",
          colors: {
            primary: metadata.accentColor || "#1E3A8A",
            accent: "#3B82F6",
            bg: "#FFFFFF",
          },
          fonts: "Inter",
          tier: "free",
        },
        typography: {
          fontFamily: "Inter",
          fontSizePreset: "standard",
        },
        slideCount: slides.length,
        slides,
        fileSize: 1024 * 120,
        createdAt: Date.now(),
        expiresAt: Date.now() + 600000,
        secondsRemaining: 600,
      };

      setPresentationSession(session);
      setCurrentSlideIdx(0);
    }

    await new Promise((r) => setTimeout(r, 300));
    setIsAiProcessing(false);
    setCurrentStage(6);
    toast.success("Assignment formatted with AI!");
  };

  // Stage 7: DOCX Export
  const handleExportDocx = async () => {
    try {
      setIsExportingDocx(true);
      toast.loading("Generating genuine Microsoft Word document (.docx)...", { id: "docx-exp" });

      const blocks = bodyHtml ? parseHtmlToBlocks(bodyHtml) : parsePlainTextToBlocks(rawContent);
      const title = metadata.assignmentTitle || metadata.courseName || "Academic_Assignment";

      const docxResult = await renderExecutiveDocx(blocks, title, {
        hasCoverPage: true,
        coverMetadata: metadata,
        docTitle: title,
        docSubtitle: metadata.courseName,
        institution: metadata.universityName,
        authorName: metadata.studentName,
        dateStr: metadata.submissionDate,
        primaryColor: metadata.accentColor || "#1E3A8A",
        identityPlacement: metadata.identityPlacement || "cover-only",
      });

      const blob = docxResult instanceof Blob
        ? docxResult
        : new Blob([docxResult], {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          });

      const filename = `${title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32)}.docx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      eraseWorkspaceJobsOnDownload();

      setLastExportedFormat("Microsoft Word (.docx)");
      toast.success("Microsoft Word document exported successfully!", { id: "docx-exp" });
    } catch (err: any) {
      toast.error(`DOCX export failed: ${err?.message || "Error"}`, { id: "docx-exp" });
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Stage 7: PDF Export
  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      toast.loading("Rendering publication-grade PDF (.pdf)...", { id: "pdf-exp" });

      const blocks = bodyHtml ? parseHtmlToBlocks(bodyHtml) : parsePlainTextToBlocks(rawContent);
      const title = metadata.assignmentTitle || metadata.courseName || "Academic_Assignment";

      const pdfBytes = await renderExecutivePdf(blocks, title, {
        hasCoverPage: true,
        coverMetadata: metadata,
        docTitle: title,
        docSubtitle: metadata.courseName,
        institution: metadata.universityName,
        authorName: metadata.studentName,
        dateStr: metadata.submissionDate,
        primaryColor: metadata.accentColor || "#1E3A8A",
        identityPlacement: metadata.identityPlacement || "cover-only",
      });

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const filename = `${title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32)}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      eraseWorkspaceJobsOnDownload();

      setLastExportedFormat("PDF Document (.pdf)");
      toast.success("Publication-grade PDF exported successfully!", { id: "pdf-exp" });
    } catch (err: any) {
      toast.error(`PDF export failed: ${err?.message || "Error"}`, { id: "pdf-exp" });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Stage 7: PPTX Export (Presentation Mode)
  const handleExportPptx = async () => {
    if (!presentationSession) return;
    try {
      setIsExportingPptx(true);
      toast.loading("Generating Microsoft PowerPoint deck (.pptx)...", { id: "pptx-exp" });
      const updatedSession: PresentationSessionData = {
        ...presentationSession,
        assignmentMetadata: { ...metadata, isAssignment: true },
        slides: presentationSession.slides.map((s, idx) =>
          idx === 0
            ? {
                ...s,
                assignmentMetadata: { ...metadata, isAssignment: true },
                title: metadata.assignmentTitle || s.title,
              }
            : s
        ),
      };
      await generateAndDownloadClientPptx(updatedSession);
      eraseWorkspaceJobsOnDownload();
      setLastExportedFormat("PowerPoint Presentation (.pptx)");
      toast.success("PowerPoint deck downloaded successfully!", { id: "pptx-exp" });
    } catch (err: any) {
      toast.error(`PPTX export failed: ${err?.message || "Error"}`, { id: "pptx-exp" });
    } finally {
      setIsExportingPptx(false);
    }
  };

  // Filter templates for Stage 3
  const filteredTemplates = COVER_TEMPLATES.filter((t) => {
    const matchesCategory =
      activeCategory === "All" ||
      t.category.toLowerCase() === activeCategory.toLowerCase() ||
      (activeCategory === "Minimalist" && t.category.toLowerCase() === "minimal");

    const query = coverSearch.trim().toLowerCase();
    const matchesQuery =
      !query ||
      t.name.toLowerCase().includes(query) ||
      t.tagline.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.category.toLowerCase().includes(query);

    return matchesCategory && matchesQuery;
  });

  return (
    <div className="w-full space-y-6">
      {/* Top Banner: Workflow Header & Output Type Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-base sm:text-lg font-bold text-foreground">
                Unified Assignment Creation Workflow
              </h2>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                {mode === "document" ? "ISO A4 Document" : "16:9 Presentation"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {mode === "document"
                ? "Academic assignment document with Cover Page, Table of Contents, and verified citations."
                : "Academic assignment slide deck with Slide 1 Cover Page, vector layouts, and presenter notes."}
            </p>
          </div>
        </div>

        {onExitAssignmentMode && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onExitAssignmentMode}
            className="text-xs text-muted-foreground hover:text-foreground h-8 self-end sm:self-auto gap-1"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Switch to {mode === "document" ? "Standard Document" : "Standard Presentation"}</span>
          </Button>
        )}
      </div>

      {/* 7-Stage Visible Progress Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {STAGES.map((s) => {
          const isActive = currentStage === s.num;
          const isDone = currentStage > s.num;
          return (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                // Allow navigating back or forward if validated
                if (s.num <= currentStage || (currentStage === 1 && validateStage1())) {
                  setCurrentStage(s.num);
                }
              }}
              className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                isActive
                  ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30"
                  : isDone
                  ? "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500 cursor-pointer"
                  : "border-border/60 bg-surface-2/30 opacity-60 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center gap-1.5 w-full">
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${
                    isDone
                      ? "bg-emerald-600 text-white"
                      : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? <Check className="h-2.5 w-2.5" /> : s.num}
                </span>
                <span
                  className={`text-[11px] font-semibold truncate ${
                    isActive ? "text-primary" : isDone ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"
                  }`}
                >
                  {s.title}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate hidden sm:block">
                {s.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* STAGE 1: ASSIGNMENT INFORMATION */}
      {/* ============================================================== */}
      {currentStage === 1 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-paper space-y-6">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Stage 1 — Collect Assignment Information
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Specify whether this is an individual or group submission and provide your academic details.
              </p>
            </div>
            <span className="text-[11px] font-mono text-destructive font-bold">* Required Fields</span>
          </div>

          {/* Individual vs Group Mode Toggle */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Assignment Submission Mode <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateMetaField("assignmentType", "individual")}
                className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                  metadata.assignmentType === "individual"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-xs"
                    : "border-border bg-card hover:border-border/80"
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    metadata.assignmentType === "individual"
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-2 text-muted-foreground"
                  }`}
                >
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-foreground">Individual Assignment</h4>
                    {metadata.assignmentType === "individual" && (
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Single student submission with full name, student ID, and course instructor.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => updateMetaField("assignmentType", "group")}
                className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                  metadata.assignmentType === "group"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-xs"
                    : "border-border bg-card hover:border-border/80"
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    metadata.assignmentType === "group"
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-2 text-muted-foreground"
                  }`}
                >
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-foreground">Group Assignment</h4>
                    {metadata.assignmentType === "group" && (
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Multi-student team submission with repeatable member directory and individual IDs.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Individual Form Fields */}
          {metadata.assignmentType === "individual" && (
            <div className="p-4 rounded-xl border border-border bg-surface-2/40 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <User className="h-4 w-4 text-primary" />
                Student Credentials
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Student Full Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Alex Johnson"
                    value={metadata.studentName || ""}
                    onChange={(e) => updateMetaField("studentName", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Student ID <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. STU-2026-8841"
                    value={metadata.studentId || ""}
                    onChange={(e) => updateMetaField("studentId", e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Assignment Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Memory Hierarchy and Cache Coherence Analysis"
                  value={metadata.assignmentTitle || ""}
                  onChange={(e) => updateMetaField("assignmentTitle", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Group Form Fields */}
          {metadata.assignmentType === "group" && (
            <div className="p-4 rounded-xl border border-border bg-surface-2/40 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                Group Assignment & Member Directory
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Group Assignment Title <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Distributed Consensus Systems Evaluation"
                    value={metadata.assignmentTitle || ""}
                    onChange={(e) => updateMetaField("assignmentTitle", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Group or Team Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Team Alpha, Systems Syndicate"
                    value={metadata.groupName || ""}
                    onChange={(e) => updateMetaField("groupName", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  />
                </div>
              </div>

              {/* Repeatable Group Members Section */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    Team Members Directory (At least 1 required)
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddMember}
                    className="text-xs h-7 px-2.5 gap-1 text-primary border-primary/30 hover:bg-primary/5"
                  >
                    <Plus className="h-3 w-3" /> Add Member
                  </Button>
                </div>

                <div className="space-y-2">
                  {(metadata.groupMembers || []).map((member, idx) => (
                    <div
                      key={member.id || idx}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border"
                    >
                      <span className="h-6 w-6 rounded bg-surface-2 border border-border flex items-center justify-center font-mono text-[10px] text-muted-foreground shrink-0 font-bold">
                        {idx + 1}
                      </span>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Member Full Name *"
                          value={member.fullName || ""}
                          onChange={(e) => handleUpdateMember(idx, "fullName", e.target.value)}
                          className="px-2.5 py-1.5 text-xs rounded border border-border bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Student ID *"
                          value={member.studentId || ""}
                          onChange={(e) => handleUpdateMember(idx, "studentId", e.target.value)}
                          className="px-2.5 py-1.5 text-xs font-mono rounded border border-border bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveMember(idx, "up")}
                          className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
                          title="Move member up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx >= (metadata.groupMembers || []).length - 1}
                          onClick={() => handleMoveMember(idx, "down")}
                          className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
                          title="Move member down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        {(metadata.groupMembers || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(idx)}
                            className="p-1 text-muted-foreground hover:text-destructive ml-1"
                            title="Remove member"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Course & Instructor Details (Required) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Course Name / Subject <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. CS 502 — Advanced Distributed Systems"
                value={metadata.courseName || ""}
                onChange={(e) => updateMetaField("courseName", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Instructor Name (Submitted to) <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Prof. Marcus Vance, Ph.D."
                value={metadata.instructorName || ""}
                onChange={(e) => updateMetaField("instructorName", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Optional Academic Details */}
          <div className="p-4 rounded-xl border border-border bg-surface-2/20 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-primary" />
              Optional Academic & Institutional Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  University / Institution
                </label>
                <input
                  type="text"
                  placeholder="e.g. Stanford University"
                  value={metadata.universityName || ""}
                  onChange={(e) => updateMetaField("universityName", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  College or Faculty
                </label>
                <input
                  type="text"
                  placeholder="e.g. School of Engineering"
                  value={metadata.collegeOrFaculty || ""}
                  onChange={(e) => updateMetaField("collegeOrFaculty", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Department
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dept. of Computer Science"
                  value={metadata.department || ""}
                  onChange={(e) => updateMetaField("department", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Course Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. CS-502"
                  value={metadata.courseCode || ""}
                  onChange={(e) => updateMetaField("courseCode", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-border bg-background text-foreground focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Academic Year
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2026–2027"
                  value={metadata.academicYear || ""}
                  onChange={(e) => updateMetaField("academicYear", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Semester
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fall Semester"
                  value={metadata.semester || ""}
                  onChange={(e) => updateMetaField("semester", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Submission Date
                </label>
                <input
                  type="date"
                  value={metadata.submissionDate || ""}
                  onChange={(e) => updateMetaField("submissionDate", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-border bg-background text-foreground focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Identity Information Placement Decision */}
          <div className="p-4 rounded-xl border border-primary/25 bg-primary/5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-primary" />
              Identity Information Placement
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Choose where your student or group credentials should appear in the exported document:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: "cover-only",
                  title: "Cover Page Only",
                  desc: "Styled exclusively on Cover Page 1. The document body starts cleanly without duplicate headers.",
                },
                {
                  id: "first-body-page-only",
                  title: "Inside Assignment Only",
                  desc: "Cover shows clean topic branding. An official submission block is formatted at the top of Page 2.",
                },
                {
                  id: "both",
                  title: "Both Cover & Inside",
                  desc: "Full credentials appear on the Cover Page, and a running submission header is also included on body pages.",
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateMetaField("identityPlacement", opt.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    metadata.identityPlacement === opt.id
                      ? "border-primary bg-background ring-2 ring-primary/30 shadow-xs"
                      : "border-border bg-card hover:bg-surface-2"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center ${
                        metadata.identityPlacement === opt.id ? "border-primary bg-primary" : "border-muted-foreground"
                      }`}
                    >
                      {metadata.identityPlacement === opt.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-xs font-bold text-foreground">{opt.title}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5 pl-5 leading-relaxed">
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Continue Action */}
          <div className="pt-4 border-t border-border flex justify-end">
            <Button
              type="button"
              variant="hero"
              onClick={() => {
                if (validateStage1()) {
                  setCurrentStage(2);
                }
              }}
              className="px-6 text-xs font-semibold gap-1.5"
            >
              <span>Continue to Logo Upload</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STAGE 2: OPTIONAL UNIVERSITY LOGO UPLOAD */}
      {/* ============================================================== */}
      {currentStage === 2 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-paper space-y-6">
          <div className="border-b border-border pb-3">
            <h3 className="font-serif text-lg font-bold text-foreground flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Stage 2 — University or Organization Logo (Optional)
            </h3>
            <p className="text-xs font-medium text-primary mt-1">
              Upload your university, college, department, or organization logo to personalize your assignment. This is optional.
            </p>
          </div>

          {logoError && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{logoError}</span>
            </div>
          )}

          {metadata.logoDataUrl ? (
            /* Uploaded Logo Preview */
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="h-28 w-28 rounded-xl bg-white p-2 border border-border shadow-xs flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={metadata.logoDataUrl}
                    alt="University Logo"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="space-y-1.5 flex-1 text-center sm:text-left">
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    <Check className="h-3 w-3" /> Logo Attached
                  </span>
                  <h4 className="font-semibold text-sm text-foreground truncate">
                    {metadata.logoFileName || "University Emblem"}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Native transparency preserved. The logo will be placed in the emblem position of your selected cover page template with balanced proportions.
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      className="text-xs h-8"
                    >
                      <Upload className="h-3.5 w-3.5 mr-1" /> Replace Logo
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      className="text-xs h-8 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove Logo
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Logo Dropzone */
            <div
              onClick={() => logoInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-primary/60 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all bg-surface-2/30 hover:bg-surface-2/60 space-y-3"
            >
              <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-xs">
                <Upload className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  <span className="text-primary hover:underline">Click to upload your institutional logo</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supported formats: PNG, JPG, WebP (Max 5MB). Native transparency preserved.
                </p>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  If omitted, cover templates format cleanly with balanced academic typography.
                </span>
              </div>
            </div>
          )}

          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleLogoUpload}
            className="hidden"
          />

          {/* Navigation Controls */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStage(1)}
              className="text-xs"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span>Back to Assignment Information</span>
            </Button>

            <Button
              type="button"
              variant="hero"
              onClick={() => setCurrentStage(3)}
              className="px-6 text-xs font-semibold gap-1.5"
            >
              <span>{metadata.logoDataUrl ? "Continue to Cover Selection" : "Continue without Logo"}</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STAGE 3: COVER-PAGE TEMPLATE SELECTION (50+ TEMPLATES) */}
      {/* ============================================================== */}
      {currentStage === 3 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-paper space-y-6">
          <div className="border-b border-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-serif text-lg font-bold text-foreground flex items-center gap-2">
                <Layout className="h-5 w-5 text-primary" />
                Stage 3 — Professional Assignment Cover-Page Selection
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Choose from 50+ genuinely distinct academic cover designs. Each template dynamically renders your credentials and logo.
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full w-fit">
              {COVER_TEMPLATES.length} Cover Designs Available
            </span>
          </div>

          {/* Search, Filter Categories & Accent Color Swatches */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search 50+ templates by style, discipline, or university name..."
                  value={coverSearch}
                  onChange={(e) => setCoverSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              {/* Accent Color Picker Swatches */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                <span className="text-[11px] font-semibold text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
                  <Palette className="h-3.5 w-3.5" /> Accent:
                </span>
                {ACCENT_PALETTE.map((pal) => (
                  <button
                    key={pal.hex}
                    type="button"
                    title={pal.name}
                    onClick={() => updateMetaField("accentColor", pal.hex)}
                    style={{ backgroundColor: pal.hex }}
                    className={`h-6 w-6 rounded-full shrink-0 transition-transform ${
                      metadata.accentColor === pal.hex
                        ? "ring-2 ring-primary ring-offset-2 scale-110 shadow-xs"
                        : "hover:scale-105 opacity-85 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {TEMPLATE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-surface-2 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Cover Templates Gallery Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[550px] overflow-y-auto p-1 rounded-xl">
            {filteredTemplates.map((tpl) => {
              const isSelected = metadata.coverTemplateId === tpl.id;
              const previewMeta: AssignmentMetadata = {
                ...metadata,
                coverTemplateId: tpl.id,
                accentColor: metadata.accentColor || tpl.defaultAccent,
              };

              return (
                <div
                  key={tpl.id}
                  onClick={() => {
                    updateMetaField("coverTemplateId", tpl.id);
                    updateMetaField("accentColor", tpl.defaultAccent);
                  }}
                  className={`group relative rounded-xl border p-2 flex flex-col justify-between cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-paper"
                      : "border-border bg-card hover:border-primary/50 hover:shadow-xs"
                  }`}
                >
                  {/* Real Live Scaled Cover Preview */}
                  <div className="w-full aspect-[1/1.414] rounded-lg overflow-hidden border border-border/80 bg-white shadow-2xs relative">
                    <AssignmentCoverRenderer
                      metadata={previewMeta}
                      aspectRatio="a4"
                      isThumbnail={true}
                    />
                    {isSelected && (
                      <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>

                  <div className="pt-2 px-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-xs text-foreground truncate">{tpl.name}</h4>
                      <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-surface-2 text-muted-foreground shrink-0">
                        {tpl.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                      {tpl.tagline}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Template Summary Card & Canvas Editor Launch */}
          <div className="p-4 rounded-xl border border-primary/25 bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Selected Cover Page Template:</p>
                <h4 className="text-sm font-bold text-foreground">
                  {COVER_TEMPLATES.find((t) => t.id === metadata.coverTemplateId)?.name || metadata.coverTemplateId}
                  <span className="ml-2 font-mono text-[10px] text-primary font-semibold">
                    ({metadata.accentColor || "#1E3A8A"})
                  </span>
                </h4>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCanvasEditorOpen(true)}
              className="text-xs h-8 px-3.5 gap-1.5 bg-background font-semibold"
            >
              <Wand2 className="h-3.5 w-3.5 text-primary" />
              <span>Customize in Canva Editor</span>
            </Button>
          </div>

          {/* Navigation Controls */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStage(2)}
              className="text-xs"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span>Back to Logo Upload</span>
            </Button>

            <Button
              type="button"
              variant="hero"
              onClick={() => setCurrentStage(4)}
              className="px-6 text-xs font-semibold gap-1.5"
            >
              <span>Continue to Content Upload</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STAGE 4: ASSIGNMENT CONTENT UPLOAD */}
      {/* ============================================================== */}
      {currentStage === 4 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-paper space-y-6">
          <div className="border-b border-border pb-3">
            <h3 className="font-serif text-lg font-bold text-foreground flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Stage 4 — Upload Assignment Content
            </h3>
            <p className="text-xs font-medium text-primary mt-1">
              Upload your assignment content. DocuMind will analyze your material, organize it, and professionally format it while preserving your original meaning.
            </p>
          </div>

          {/* Tabs: Upload File vs Paste Text */}
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <button
              type="button"
              onClick={() => setContentTab("upload")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                contentTab === "upload"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-surface-2 text-muted-foreground hover:text-foreground"
              }`}
            >
              Upload Document Files (.pdf, .docx, .txt)
            </button>
            <button
              type="button"
              onClick={() => setContentTab("paste")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                contentTab === "paste"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-surface-2 text-muted-foreground hover:text-foreground"
              }`}
            >
              Paste Unformatted Text Draft
            </button>
          </div>

          {/* Extracted Suggestions Alert (if detected) */}
          {extractedSuggestions?.hasSuggestions && (
            <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs text-foreground font-medium">
                  Identified assignment details from content:{" "}
                  <strong>
                    {[
                      extractedSuggestions.studentName,
                      extractedSuggestions.courseName,
                      extractedSuggestions.instructorName,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </strong>
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleApplySuggestions}
                className="text-xs h-7 px-3 bg-primary text-primary-foreground"
              >
                Apply Details
              </Button>
            </div>
          )}

          {contentTab === "upload" ? (
            /* Upload File Dropzone */
            <div className="space-y-4">
              <div
                onClick={() => contentFileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary/60 rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all bg-surface-2/30 hover:bg-surface-2/60 space-y-3"
              >
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-xs">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    <span className="text-primary hover:underline">Choose files</span> or drag and drop your assignment documents
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports Microsoft Word (.docx, .doc), Adobe PDF (.pdf), and Plain Text (.txt, .md, .rtf).
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <span className="font-mono text-[10px] bg-surface-2 px-2 py-0.5 rounded text-muted-foreground font-bold">
                    Multi-file supported
                  </span>
                  <span className="font-mono text-[10px] bg-surface-2 px-2 py-0.5 rounded text-muted-foreground font-bold">
                    100% Client-side extraction
                  </span>
                </div>
              </div>

              <input
                ref={contentFileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.txt,.rtf,.md"
                onChange={handleContentFileUpload}
                className="hidden"
              />

              {/* Uploaded File List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Attached Files ({uploadedFiles.length})
                  </span>
                  <div className="space-y-2">
                    {uploadedFiles.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-border bg-card shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono text-xs font-bold shrink-0">
                            {item.format}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {(item.size / 1024).toFixed(1)} KB • {item.text.length} characters extracted
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            <Check className="h-3 w-3" /> Extracted
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveUploadedFile(item.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md"
                            title="Remove file"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Paste Text Mode */
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                Paste your assignment content, lecture notes, or rough draft:
              </label>
              <textarea
                rows={12}
                placeholder="Paste your assignment questions, solutions, literature review, or essay text here..."
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                className="w-full p-4 text-xs font-mono rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{rawContent.length} characters • ~{rawContent.split(/\s+/).filter(Boolean).length} words</span>
                <button
                  type="button"
                  onClick={() =>
                    setRawContent(
                      `1. Introduction to Quantum Complexity\nQuantum computing leverages superposition and entanglement to execute non-deterministic algorithms exponentially faster than classical Turing architectures.\n\n2. Qubit Decoherence & Fault-Tolerance\nPhysical qubits are vulnerable to thermal fluctuations and ambient electromagnetic noise. Surface codes and fault-tolerant stabilizer circuits maintain coherence across error thresholds.\n\n3. Algorithmic Speedups (Shor & Grover)\nShor's algorithm achieves polynomial time prime factorization, whereas Grover's algorithm provides quadratic acceleration for unstructured search problems.\n\n4. Conclusion & Experimental Roadmap\nCryogenic CMOS control circuits and topological anyons present the most viable pathway toward million-qubit fault-tolerant quantum processors.`
                    )
                  }
                  className="text-primary hover:underline font-semibold"
                >
                  Load Sample Academic Paper
                </button>
              </div>
            </div>
          )}

          {/* Extracted Preview Snippet */}
          {rawContent.trim() && (
            <div className="p-3.5 rounded-xl border border-border bg-surface-2/40 space-y-1.5">
              <h4 className="text-xs font-bold text-foreground">Extracted Text Preview:</h4>
              <p className="text-[11px] font-mono text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                {rawContent}
              </p>
            </div>
          )}

          {/* Navigation & AI Processing Trigger */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStage(3)}
              className="text-xs"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span>Back to Cover Selection</span>
            </Button>

            <Button
              type="button"
              variant="hero"
              disabled={!rawContent.trim() || isExtractingFile}
              onClick={handleExecuteAiProcessing}
              className="px-6 text-xs font-semibold gap-1.5 shadow-md"
            >
              <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
              <span>Format Assignment with AI</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STAGE 5: AI-POWERED ASSIGNMENT PROCESSING */}
      {/* ============================================================== */}
      {currentStage === 5 && (
        <div className="rounded-2xl border border-primary/30 bg-card p-8 sm:p-12 text-center shadow-paper space-y-6 max-w-2xl mx-auto my-8">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-xs">
            <Sparkles className="h-8 w-8 animate-spin" />
          </div>

          <div>
            <h3 className="font-serif text-xl font-bold text-foreground">
              AI Assignment Synthesizer Active
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Analyzing sections, organizing heading hierarchies, applying professional academic typography, and embedding your selected cover page.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-surface-2 h-2.5 rounded-full overflow-hidden border border-border">
            <div
              className="bg-primary h-full transition-all duration-300 rounded-full"
              style={{ width: `${aiProgress}%` }}
            />
          </div>

          {/* 5 Animated Milestones */}
          <div className="space-y-2 text-left bg-surface-2/40 p-4 rounded-xl border border-border">
            {[
              "Extracting semantic structure and preserving authentic user content",
              "Normalizing heading hierarchy, subheadings, and academic structure",
              "Formatting citations, references, bullet lists, and data tables",
              mode === "document"
                ? "Synthesizing ISO A4 page layout & Table of Contents"
                : "Synthesizing widescreen 16:9 presentation slide deck",
              "Embedding Cover Page (Page 1) with student credentials and institutional logo",
            ].map((milestone, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs">
                {idx <= aiMilestoneIndex ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0" />
                )}
                <span
                  className={
                    idx === aiMilestoneIndex
                      ? "font-bold text-primary"
                      : idx < aiMilestoneIndex
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }
                >
                  {milestone}
                </span>
              </div>
            ))}
          </div>

          {/* Non-Hallucination Integrity Guarantee */}
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300">
            <strong>DocuMind Academic Integrity Guarantee:</strong> Your authentic citations, facts, equations, and solutions are 100% preserved. The AI formats and organizes without rewriting or hallucinating fictional research.
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STAGE 6: FINAL PREVIEW AND EDITING */}
      {/* ============================================================== */}
      {currentStage === 6 && (
        <div className="space-y-6">
          {/* Top Control Bar for Stage 6 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card shadow-paper">
            <div>
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-emerald-500" />
                <h3 className="font-serif text-base font-bold text-foreground">
                  Stage 6 — Final Assignment Preview & Editing
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {mode === "document"
                  ? "Page 1 is your selected cover page. Body pages contain formatted academic text with rich Word toolbar."
                  : "Slide 1 is your selected cover slide. Review slides and speaker notes below."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStage(3)}
                className="text-xs h-8"
              >
                <Layout className="h-3.5 w-3.5 mr-1" /> Change Cover
              </Button>

              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setIsCanvasEditorOpen(true)}
                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-semibold shadow-xs"
              >
                <Wand2 className="h-3.5 w-3.5" /> Customize Cover (Canva Editor)
              </Button>

              <Button
                type="button"
                variant="hero"
                size="sm"
                onClick={() => setCurrentStage(7)}
                className="text-xs h-8 px-4 font-bold gap-1 shadow-xs"
              >
                <span>Proceed to Export</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mode-Specific Preview Canvas */}
          {mode === "document" ? (
            /* DOCUMENT STUDIO PREVIEW (A4 MULTI-PAGE VIEWER & WORD TOOLBAR) */
            <div className="space-y-4">
              {/* Word Processing Formatting Toolbar */}
              <DocumentWordToolbar
                currentLineSpacing={formattingConfig.lineSpacing}
                onLineSpacingChange={(sp) =>
                  setFormattingConfig((prev) => ({ ...prev, lineSpacing: sp }))
                }
              />

              {/* View Switcher Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-xl border border-border bg-surface-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDocumentViewMode("all")}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${
                      documentViewMode === "all"
                        ? "bg-card text-foreground font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All Pages (A4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocumentViewMode("editor")}
                    className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                      documentViewMode === "editor"
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Edit3 className="h-3 w-3" /> Interactive Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocumentViewMode("cover")}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${
                      documentViewMode === "cover"
                        ? "bg-card text-foreground font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Cover Page (Page 1)
                  </button>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground font-mono text-[11px]">
                  <span>ISO A4 Portrait</span>
                  <span>•</span>
                  <span>Font: {formattingConfig.fontFamily.toUpperCase()}</span>
                </div>
              </div>

              {/* A4 Canvas Container */}
              {(() => {
                const sections = parseDocumentSections(rawContent, formattingConfig.headingNumbering);
                const a4Pages = paginateSectionsIntoA4Pages(sections, formattingConfig);

                if (documentViewMode === "editor") {
                  return (
                    <div className="rounded-2xl border border-border bg-card p-6 shadow-paper space-y-3">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-xs font-bold text-foreground">Interactive Body Content Editor</span>
                        <span className="text-[11px] text-muted-foreground">Changes automatically update exported files</span>
                      </div>
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const updated = e.currentTarget.innerHTML;
                          setBodyHtml(updated);
                          setRawContent(e.currentTarget.innerText);
                        }}
                        dangerouslySetInnerHTML={{ __html: bodyHtml || convertSectionsToInitialHtml(sections) }}
                        className="w-full min-h-[450px] p-6 rounded-xl border border-border bg-white text-slate-900 focus:outline-none font-serif text-sm leading-relaxed"
                        style={{ fontFamily: formattingConfig.fontFamily === "academic" ? "Georgia, serif" : "Inter, sans-serif" }}
                      />
                    </div>
                  );
                }

                if (documentViewMode === "cover") {
                  return (
                    <div className="w-full max-w-xl mx-auto aspect-[1/1.414] rounded-2xl border border-border bg-white shadow-paper overflow-hidden p-2">
                      <AssignmentCoverRenderer
                        metadata={metadata}
                        aspectRatio="a4"
                      />
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {/* Render Page 1 Cover Sheet */}
                    <div className="w-full max-w-2xl mx-auto aspect-[1/1.414] rounded-2xl border border-border bg-white shadow-paper overflow-hidden relative">
                      <div className="absolute top-3 left-3 px-2 py-0.5 rounded font-mono text-[10px] bg-slate-900/80 text-white z-20">
                        Page 1 of {a4Pages.length} (Cover Page)
                      </div>
                      <AssignmentCoverRenderer
                        metadata={metadata}
                        aspectRatio="a4"
                      />
                    </div>

                    {/* Render Formatted Body Pages */}
                    {a4Pages
                      .filter((p) => !p.isCover)
                      .map((p) => (
                        <div
                          key={p.pageNumber}
                          className="w-full max-w-2xl mx-auto min-h-[750px] rounded-2xl border border-border bg-white text-slate-900 p-8 shadow-paper flex flex-col justify-between"
                          style={{
                            fontFamily: formattingConfig.fontFamily === "academic" ? "Georgia, serif" : "Inter, sans-serif",
                            fontSize: formattingConfig.baseFontSize === "12pt" ? "16px" : "14px",
                            lineHeight: formattingConfig.lineSpacing,
                          }}
                        >
                          {/* Running Header */}
                          <div className="pb-3 mb-4 border-b border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-500">
                            <span className="truncate max-w-[70%]">
                              {metadata.assignmentTitle || metadata.courseName}
                            </span>
                            <span>A4 Page {p.pageNumber}</span>
                          </div>

                          {/* Page Sections */}
                          <div className="flex-1 space-y-4">
                            {p.sections.map((sec, sIdx) => (
                              <div key={sIdx} className="space-y-2">
                                <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-1">
                                  {sec.numberStr} {sec.title}
                                </h3>
                                <div className="text-slate-800 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                                  {sec.rawContent}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Running Footer */}
                          <div className="pt-3 mt-6 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-500">
                            <span>{metadata.universityName || metadata.courseName}</span>
                            <span>Page {p.pageNumber} of {p.totalPages}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                );
              })()}
            </div>
          ) : (
            /* PRESENTATION MAKER PREVIEW (16:9 SLIDE CANVAS & SLIDE EDITOR) */
            presentationSession && (() => {
              const tokens = computeThemeTokens(presentationSession.theme, presentationSession.typography);
              const curSlide = presentationSession.slides[currentSlideIdx] || presentationSession.slides[0]!;

              return (
                <div className="space-y-4">
                  {/* Slide Editor Top Toolbar */}
                  <div className="p-3 rounded-2xl border border-border bg-card shadow-xs flex flex-wrap items-center justify-between gap-3">
                    {currentSlideIdx === 0 ? (
                      /* Slide 1 Cover Page Actions */
                      <div className="flex flex-wrap items-center gap-2.5 w-full justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-mono font-bold uppercase text-muted-foreground flex items-center gap-1.5 mr-1">
                            <Layers className="h-3.5 w-3.5 text-primary" /> Cover Template:
                          </span>
                          <select
                            value={metadata.coverTemplateId}
                            onChange={(e) => {
                              const newTplId = e.target.value;
                              const tpl = COVER_TEMPLATES.find((t) => t.id === newTplId);
                              const newAccent = tpl?.defaultAccent || metadata.accentColor;
                              setMetadata((prev) => ({
                                ...prev,
                                coverTemplateId: newTplId,
                                accentColor: newAccent,
                              }));
                              toast.success(`Applied ${tpl?.name || newTplId} template!`);
                            }}
                            className="h-8 text-xs px-2.5 rounded-lg border border-border bg-surface-2/40 text-foreground font-semibold outline-none focus:border-primary max-w-[220px]"
                          >
                            {COVER_TEMPLATES.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.category})
                              </option>
                            ))}
                          </select>

                          {/* Quick Edit Academic Info */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditCoverModalOpen(true)}
                            className="h-8 text-xs gap-1.5"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-primary" />
                            <span>Edit Academic Info</span>
                          </Button>

                          {/* Launch Canva Canvas Cover Editor */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsCanvasEditorOpen(true)}
                            className="h-8 text-xs gap-1.5 hover:text-primary"
                          >
                            <Sliders className="h-3.5 w-3.5 text-primary" />
                            <span>Canva Cover Editor</span>
                          </Button>
                        </div>

                        {/* Accent Swatches for Cover */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-muted-foreground uppercase mr-1">Accent:</span>
                          {ACCENT_PALETTE.map((swatch) => (
                            <button
                              key={swatch.hex}
                              type="button"
                              onClick={() => {
                                updateMetaField("accentColor", swatch.hex);
                                toast.success(`Accent color set to ${swatch.name}`);
                              }}
                              title={swatch.name}
                              style={{ backgroundColor: swatch.hex }}
                              className={`h-5 w-5 rounded-full border transition-transform ${
                                (metadata.accentColor || "#1E3A8A") === swatch.hex
                                  ? "ring-2 ring-primary ring-offset-2 scale-110"
                                  : "hover:scale-105 opacity-80"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Content Slides (Slide 2+) Rich Editor Toolbar */
                      <div className="flex flex-wrap items-center gap-2.5 w-full justify-between">
                        {/* Left Group: Text Formatting & Styling */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Bold Toggle */}
                          <button
                            type="button"
                            onClick={handleToggleBold}
                            className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                              curSlide.isTitleBold !== false
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:bg-surface-2"
                            }`}
                            title="Toggle Bold (B)"
                          >
                            <Bold className="h-3.5 w-3.5" />
                          </button>

                          {/* Italic Toggle */}
                          <button
                            type="button"
                            onClick={handleToggleItalic}
                            className={`p-1.5 rounded-lg border text-xs italic transition-all ${
                              curSlide.isSubtitleItalic !== false
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:bg-surface-2"
                            }`}
                            title="Toggle Italic (I)"
                          >
                            <Italic className="h-3.5 w-3.5" />
                          </button>

                          <div className="h-4 w-px bg-border mx-1" />

                          {/* Font Size A- / A+ Controls */}
                          <div className="flex items-center gap-1 bg-surface-2/60 p-0.5 rounded-lg border border-border">
                            <button
                              type="button"
                              onClick={() => handleAdjustFontSize(-2)}
                              className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-surface-2"
                              title="Decrease font size"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="font-mono text-[11px] font-bold px-1.5 text-foreground min-w-[42px] text-center">
                              {curSlide.titleFontSize || 26} pt
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdjustFontSize(2)}
                              className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-surface-2"
                              title="Increase font size"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="h-4 w-px bg-border mx-1" />

                          {/* Quick Color Swatches */}
                          <div className="flex items-center gap-1">
                            {[
                              { label: "Navy", hex: "#1E3A8A" },
                              { label: "Royal Blue", hex: "#2563EB" },
                              { label: "Emerald", hex: "#059669" },
                              { label: "Gold", hex: "#D97706" },
                              { label: "Crimson", hex: "#DC2626" },
                              { label: "Slate", hex: "#0F172A" },
                              { label: "White", hex: "#FFFFFF" },
                            ].map((sw) => (
                              <button
                                key={sw.hex}
                                type="button"
                                onClick={() => handleSelectTextColor(sw.hex)}
                                style={{ backgroundColor: sw.hex }}
                                title={sw.label}
                                className={`h-4.5 w-4.5 rounded-full border border-border/80 transition-transform ${
                                  curSlide.textColor === sw.hex
                                    ? "ring-2 ring-primary ring-offset-1 scale-110"
                                    : "hover:scale-105"
                                }`}
                              />
                            ))}
                          </div>

                          <div className="h-4 w-px bg-border mx-1" />

                          {/* Slide Layout Switcher */}
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-mono text-muted-foreground uppercase">Layout:</span>
                            <select
                              value={curSlide.layout}
                              onChange={(e) => handleSelectLayout(e.target.value as SlideLayoutType)}
                              className="h-7 text-xs px-2 rounded-lg border border-border bg-surface-2/40 text-foreground font-semibold outline-none focus:border-primary"
                            >
                              <option value="content">Executive Cards (Content)</option>
                              <option value="agenda">Agenda 2-Col Grid</option>
                              <option value="two-column">Two-Column Comparison</option>
                              <option value="quote">Quote / Key Takeaway</option>
                              <option value="conclusion">Synthesis Checklist</option>
                              <option value="metrics">Telemetry & Stats</option>
                            </select>
                          </div>
                        </div>

                        {/* Right Group: Slide Management Actions */}
                        <div className="flex items-center gap-1.5">
                          {/* Add Bullet */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddBullet}
                            className="h-7 text-xs gap-1 px-2.5"
                            title="Add bullet point to slide"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add Point</span>
                          </Button>

                          {/* Move Up */}
                          <button
                            type="button"
                            onClick={() => handleMoveSlide("up")}
                            disabled={currentSlideIdx <= 1}
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                            title="Move slide up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>

                          {/* Move Down */}
                          <button
                            type="button"
                            onClick={() => handleMoveSlide("down")}
                            disabled={currentSlideIdx >= presentationSession.slides.length - 1}
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                            title="Move slide down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>

                          {/* Duplicate */}
                          <button
                            type="button"
                            onClick={handleDuplicateCurrentSlide}
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground"
                            title="Duplicate slide"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={handleDeleteCurrentSlide}
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-red-500"
                            title="Delete slide"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Speaker Notes Toggle */}
                          <button
                            type="button"
                            onClick={() => setShowNotesDrawer(!showNotesDrawer)}
                            className={`p-1.5 rounded-lg border text-xs transition-colors ${
                              showNotesDrawer
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:bg-surface-2"
                            }`}
                            title="Toggle speaker notes"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Main Preview Area: Sidebar Thumbnails + 16:9 Slide Canvas */}
                  <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 items-start">
                    {/* Thumbnails Sidebar */}
                    <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto max-h-[580px] p-2.5 rounded-2xl border border-border bg-card shadow-xs">
                      <div className="flex items-center justify-between pb-1 px-1 border-b border-border/80">
                        <span className="text-[11px] font-mono font-bold uppercase text-muted-foreground">
                          Slides ({presentationSession.slides.length})
                        </span>
                        <button
                          type="button"
                          onClick={handleAddNewSlide}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                        >
                          <Plus className="h-3 w-3" /> Add Slide
                        </button>
                      </div>

                      {presentationSession.slides.map((s, idx) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setCurrentSlideIdx(idx)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            idx === currentSlideIdx
                              ? "border-primary bg-primary/10 shadow-xs font-bold ring-1 ring-primary/40"
                              : "border-border hover:bg-surface-2"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1">
                            <span className="font-bold flex items-center gap-1.5 text-foreground">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  idx === currentSlideIdx ? "bg-primary" : "bg-muted-foreground/40"
                                }`}
                              />
                              {idx === 0 ? "Cover Slide" : `Slide ${idx + 1}`}
                            </span>
                            <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-surface-2 font-mono">
                              {idx === 0 ? "cover" : s.layout}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-foreground truncate">
                            {idx === 0 ? metadata.assignmentTitle || "Assignment Cover" : s.title}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate italic mt-0.5">
                            {idx === 0 ? metadata.courseName || "Academic Submission" : s.subtitle || "Content slide"}
                          </div>
                        </button>
                      ))}

                      {/* Add Slide Bottom Action */}
                      <button
                        type="button"
                        onClick={handleAddNewSlide}
                        className="mt-1 flex items-center justify-center gap-1.5 p-2 rounded-xl border border-dashed border-border hover:border-primary text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add New Slide</span>
                      </button>
                    </div>

                    {/* Active 16:9 Slide Canvas (Interactive In-Canvas Direct Editing) */}
                    <div className="space-y-3">
                      <div
                        className="w-full aspect-[16/9] rounded-2xl border border-border shadow-lift flex flex-col justify-between overflow-hidden relative select-text transition-all"
                        style={{
                          backgroundColor: tokens.bg,
                          color: tokens.textPrimary,
                          fontFamily: tokens.fontBody,
                        }}
                      >
                        {/* Decorative Theme Accent Top Bar */}
                        <div
                          className="absolute top-0 left-0 right-0 h-1.5 z-10"
                          style={{ backgroundColor: tokens.accent }}
                        />

                        {currentSlideIdx === 0 ? (
                          /* Slide 1: Assignment Cover Page (16:9 Widescreen) */
                          <div className="h-full w-full">
                            <AssignmentCoverRenderer
                              metadata={metadata}
                              aspectRatio="16:9"
                            />
                          </div>
                        ) : (
                          /* Content Slides (Slide 2+) Interactive In-Canvas Direct Editing */
                          <div className="h-full w-full p-6 sm:p-8 flex flex-col justify-between">
                            {/* Slide Header: Category Tag, Editable Title & Subtitle */}
                            <div className="shrink-0 space-y-1">
                              <div
                                className="flex items-center justify-between text-[11px] font-mono tracking-wider uppercase pb-2 border-b"
                                style={{ borderColor: tokens.dividerColor }}
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: tokens.accent }}
                                  />
                                  <input
                                    type="text"
                                    value={curSlide.categoryTag || metadata.courseName || "ASSIGNMENT"}
                                    onChange={(e) => updateCurrentSlide({ categoryTag: e.target.value })}
                                    style={{ color: tokens.accent }}
                                    className="bg-transparent font-mono text-[10px] font-bold tracking-widest uppercase outline-none border-b border-transparent hover:border-primary/40 focus:border-primary"
                                    title="Click to edit category tag"
                                  />
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-mono" style={{ color: tokens.textMuted }}>
                                  <span
                                    className="uppercase px-1.5 py-0.5 rounded"
                                    style={{
                                      backgroundColor: tokens.cardBg,
                                      borderColor: tokens.cardBorder,
                                      borderWidth: "1px",
                                    }}
                                  >
                                    {curSlide.layout}
                                  </span>
                                  <span>Slide {currentSlideIdx + 1} of {presentationSession.slides.length}</span>
                                </div>
                              </div>

                              {/* Editable Slide Title */}
                              <input
                                type="text"
                                value={curSlide.title}
                                onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                                style={{
                                  fontSize: `${curSlide.titleFontSize || 26}px`,
                                  fontWeight: curSlide.isTitleBold !== false ? "bold" : "normal",
                                  color: curSlide.textColor || tokens.textPrimary,
                                  fontFamily: tokens.fontTitle,
                                }}
                                className="w-full bg-transparent outline-none border-b border-transparent hover:border-border/60 focus:border-primary/60 transition-colors mt-1.5"
                                placeholder="Slide Title..."
                              />

                              {/* Editable Subtitle */}
                              <input
                                type="text"
                                value={curSlide.subtitle || ""}
                                onChange={(e) => updateCurrentSlide({ subtitle: e.target.value })}
                                style={{
                                  fontStyle: curSlide.isSubtitleItalic !== false ? "italic" : "normal",
                                  color: tokens.textSecondary,
                                  fontFamily: tokens.fontBody,
                                }}
                                className="w-full bg-transparent text-xs sm:text-sm outline-none border-b border-transparent hover:border-border/60 focus:border-primary/60 transition-colors"
                                placeholder="Add subtitle or topic overview..."
                              />
                            </div>

                            {/* Dynamic Slide Body by Layout */}
                            <div className="flex-1 my-auto py-2 overflow-y-auto">
                              {/* 1. AGENDA LAYOUT */}
                              {curSlide.layout === "agenda" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-auto">
                                  {(curSlide.bullets || []).map((topic, bIdx) => (
                                    <div
                                      key={bIdx}
                                      className="group/topic flex items-center gap-3 rounded-xl border p-3 transition-all"
                                      style={{
                                        backgroundColor: tokens.cardBg,
                                        borderColor: tokens.cardBorder,
                                        color: tokens.cardText,
                                      }}
                                    >
                                      <span
                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold font-mono text-white"
                                        style={{ backgroundColor: tokens.accent }}
                                      >
                                        0{bIdx + 1}
                                      </span>
                                      <input
                                        type="text"
                                        value={topic}
                                        onChange={(e) => handleUpdateBullet(bIdx, e.target.value)}
                                        className="flex-1 bg-transparent text-xs sm:text-sm font-semibold outline-none border-b border-transparent hover:border-border/60 focus:border-primary/60"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveBullet(bIdx)}
                                        className="opacity-0 group-hover/topic:opacity-100 p-1 text-muted-foreground hover:text-red-500"
                                        title="Remove point"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={handleAddBullet}
                                    className="flex items-center justify-center gap-1.5 p-3 rounded-xl border border-dashed border-border hover:border-primary text-xs text-muted-foreground hover:text-primary transition-colors"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>Add Agenda Topic</span>
                                  </button>
                                </div>
                              )}

                              {/* 2. TWO-COLUMN COMPARATIVE LAYOUT */}
                              {curSlide.layout === "two-column" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-auto">
                                  {/* Left Column Card */}
                                  <div
                                    className="rounded-xl border p-4 space-y-2.5 shadow-2xs"
                                    style={{ backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder }}
                                  >
                                    <input
                                      type="text"
                                      value={curSlide.leftColumn?.title || "Primary Analysis"}
                                      onChange={(e) =>
                                        updateCurrentSlide({
                                          leftColumn: {
                                            title: e.target.value,
                                            bullets: curSlide.leftColumn?.bullets || curSlide.bullets?.slice(0, 3) || [],
                                          },
                                        })
                                      }
                                      className="w-full font-bold text-xs sm:text-sm bg-transparent border-b pb-1 outline-none"
                                      style={{ color: tokens.cardText, borderColor: tokens.dividerColor }}
                                    />
                                    {(curSlide.leftColumn?.bullets || curSlide.bullets?.slice(0, 3) || []).map((b, idx) => (
                                      <div key={idx} className="flex items-start gap-2 text-xs">
                                        <span
                                          className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0"
                                          style={{ backgroundColor: tokens.accent }}
                                        />
                                        <input
                                          type="text"
                                          value={b}
                                          onChange={(e) => {
                                            const bullets = [...(curSlide.leftColumn?.bullets || curSlide.bullets?.slice(0, 3) || [])];
                                            bullets[idx] = e.target.value;
                                            updateCurrentSlide({
                                              leftColumn: { title: curSlide.leftColumn?.title || "Primary Analysis", bullets },
                                            });
                                          }}
                                          className="flex-1 bg-transparent outline-none border-b border-transparent hover:border-border/60"
                                          style={{ color: tokens.cardText }}
                                        />
                                      </div>
                                    ))}
                                  </div>

                                  {/* Right Column Card */}
                                  <div
                                    className="rounded-xl border p-4 space-y-2.5 shadow-2xs"
                                    style={{ backgroundColor: tokens.cardBg, borderColor: tokens.accent }}
                                  >
                                    <input
                                      type="text"
                                      value={curSlide.rightColumn?.title || "Evaluation & Next Steps"}
                                      onChange={(e) =>
                                        updateCurrentSlide({
                                          rightColumn: {
                                            title: e.target.value,
                                            bullets: curSlide.rightColumn?.bullets || curSlide.bullets?.slice(3) || [],
                                          },
                                        })
                                      }
                                      className="w-full font-bold text-xs sm:text-sm bg-transparent border-b pb-1 outline-none"
                                      style={{ color: tokens.accent, borderColor: tokens.dividerColor }}
                                    />
                                    {(curSlide.rightColumn?.bullets || curSlide.bullets?.slice(3) || []).map((b, idx) => (
                                      <div key={idx} className="flex items-start gap-2 text-xs">
                                        <span
                                          className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0"
                                          style={{ backgroundColor: tokens.accent }}
                                        />
                                        <input
                                          type="text"
                                          value={b}
                                          onChange={(e) => {
                                            const bullets = [...(curSlide.rightColumn?.bullets || curSlide.bullets?.slice(3) || [])];
                                            bullets[idx] = e.target.value;
                                            updateCurrentSlide({
                                              rightColumn: { title: curSlide.rightColumn?.title || "Evaluation & Next Steps", bullets },
                                            });
                                          }}
                                          className="flex-1 bg-transparent outline-none border-b border-transparent hover:border-border/60"
                                          style={{ color: tokens.cardText }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 3. QUOTE / TAKEAWAY LAYOUT */}
                              {curSlide.layout === "quote" && (
                                <div
                                  className="rounded-2xl border p-6 my-auto space-y-3 relative overflow-hidden shadow-xs"
                                  style={{
                                    backgroundColor: tokens.cardBg,
                                    borderColor: tokens.accent,
                                    borderWidth: "1.5px",
                                  }}
                                >
                                  <span className="text-4xl font-serif font-bold leading-none block" style={{ color: tokens.accent }}>
                                    “
                                  </span>
                                  <textarea
                                    rows={2}
                                    value={
                                      curSlide.quote?.text ||
                                      curSlide.subtitle ||
                                      curSlide.bullets?.[0] ||
                                      "Decisive academic finding and core strategic insight."
                                    }
                                    onChange={(e) =>
                                      updateCurrentSlide({
                                        quote: {
                                          text: e.target.value,
                                          author: curSlide.quote?.author || "Author / Researcher",
                                          role: curSlide.quote?.role || "Academic Citation",
                                        },
                                      })
                                    }
                                    className="w-full text-base sm:text-lg italic font-serif bg-transparent outline-none resize-none border-b border-transparent hover:border-border/60"
                                    style={{ color: tokens.cardText }}
                                  />
                                  <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: tokens.dividerColor }}>
                                    <span className="text-xs font-bold" style={{ color: tokens.accent }}>—</span>
                                    <input
                                      type="text"
                                      value={curSlide.quote?.author || "Author / Researcher"}
                                      onChange={(e) =>
                                        updateCurrentSlide({
                                          quote: {
                                            text: curSlide.quote?.text || "Decisive academic finding.",
                                            author: e.target.value,
                                            role: curSlide.quote?.role || "Academic Citation",
                                          },
                                        })
                                      }
                                      className="text-xs font-bold bg-transparent outline-none border-b border-transparent hover:border-border/60"
                                      style={{ color: tokens.accent }}
                                      placeholder="Author"
                                    />
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <input
                                      type="text"
                                      value={curSlide.quote?.role || "Academic Citation"}
                                      onChange={(e) =>
                                        updateCurrentSlide({
                                          quote: {
                                            text: curSlide.quote?.text || "Decisive academic finding.",
                                            author: curSlide.quote?.author || "Author",
                                            role: e.target.value,
                                          },
                                        })
                                      }
                                      className="text-xs text-muted-foreground bg-transparent outline-none border-b border-transparent hover:border-border/60"
                                      placeholder="Role / Source"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* 4. CONCLUSION LAYOUT */}
                              {curSlide.layout === "conclusion" && (
                                <div
                                  className="rounded-2xl border p-5 my-auto space-y-3 shadow-xs"
                                  style={{ backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder }}
                                >
                                  <div className="text-[10px] font-mono font-bold tracking-wider uppercase" style={{ color: tokens.accent }}>
                                    FINAL SYNTHESIS & CHECKLIST
                                  </div>
                                  <div className="space-y-2">
                                    {(curSlide.bullets || []).map((b, idx) => (
                                      <div key={idx} className="group/concl flex items-center gap-3">
                                        <span
                                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                                          style={{ backgroundColor: tokens.accent }}
                                        >
                                          ✓
                                        </span>
                                        <input
                                          type="text"
                                          value={b}
                                          onChange={(e) => handleUpdateBullet(idx, e.target.value)}
                                          className="flex-1 bg-transparent text-xs sm:text-sm outline-none border-b border-transparent hover:border-border/60"
                                          style={{ color: tokens.cardText }}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveBullet(idx)}
                                          className="opacity-0 group-hover/concl:opacity-100 p-1 text-muted-foreground hover:text-red-500"
                                          title="Remove point"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleAddBullet}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg border border-dashed border-border hover:border-primary text-muted-foreground hover:text-primary transition-colors"
                                  >
                                    <Plus className="h-3 w-3" />
                                    <span>Add Conclusion Point</span>
                                  </button>
                                </div>
                              )}

                              {/* 5. METRICS / TELEMETRY LAYOUT */}
                              {curSlide.layout === "metrics" && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-auto">
                                  {(curSlide.metrics || [
                                    { value: "100%", label: "Accuracy", description: "Verified data" },
                                    { value: "4.5x", label: "Efficiency", description: "Speed improvement" },
                                    { value: "Zero", label: "Anomalies", description: "Error free" },
                                  ]).map((m, mIdx) => (
                                    <div
                                      key={mIdx}
                                      className="rounded-xl border p-4 flex flex-col justify-between space-y-1 shadow-xs"
                                      style={{ backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder }}
                                    >
                                      <div className="h-1 w-8 rounded-full mb-2" style={{ backgroundColor: tokens.accent }} />
                                      <input
                                        type="text"
                                        value={m.value}
                                        onChange={(e) => {
                                          const metrics = [...(curSlide.metrics || [
                                            { value: "100%", label: "Accuracy", description: "Verified data" },
                                            { value: "4.5x", label: "Efficiency", description: "Speed improvement" },
                                            { value: "Zero", label: "Anomalies", description: "Error free" },
                                          ])];
                                          metrics[mIdx] = { ...metrics[mIdx]!, value: e.target.value };
                                          updateCurrentSlide({ metrics });
                                        }}
                                        className="text-2xl sm:text-3xl font-mono font-bold bg-transparent outline-none"
                                        style={{ color: tokens.accent }}
                                      />
                                      <input
                                        type="text"
                                        value={m.label}
                                        onChange={(e) => {
                                          const metrics = [...(curSlide.metrics || [
                                            { value: "100%", label: "Accuracy", description: "Verified data" },
                                            { value: "4.5x", label: "Efficiency", description: "Speed improvement" },
                                            { value: "Zero", label: "Anomalies", description: "Error free" },
                                          ])];
                                          metrics[mIdx] = { ...metrics[mIdx]!, label: e.target.value };
                                          updateCurrentSlide({ metrics });
                                        }}
                                        className="text-xs sm:text-sm font-semibold bg-transparent outline-none"
                                        style={{ color: tokens.cardText }}
                                      />
                                      <input
                                        type="text"
                                        value={m.description || ""}
                                        onChange={(e) => {
                                          const metrics = [...(curSlide.metrics || [
                                            { value: "100%", label: "Accuracy", description: "Verified data" },
                                            { value: "4.5x", label: "Efficiency", description: "Speed improvement" },
                                            { value: "Zero", label: "Anomalies", description: "Error free" },
                                          ])];
                                          metrics[mIdx] = { ...metrics[mIdx]!, description: e.target.value };
                                          updateCurrentSlide({ metrics });
                                        }}
                                        className="text-[11px] bg-transparent outline-none"
                                        style={{ color: tokens.cardMuted }}
                                        placeholder="Description..."
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* 6. DEFAULT / CONTENT LAYOUT (Executive Bullet Cards) */}
                              {curSlide.layout !== "agenda" &&
                                curSlide.layout !== "two-column" &&
                                curSlide.layout !== "quote" &&
                                curSlide.layout !== "conclusion" &&
                                curSlide.layout !== "metrics" && (
                                  <div
                                    className="rounded-2xl border p-5 sm:p-6 my-auto space-y-3 relative overflow-hidden shadow-xs"
                                    style={{
                                      backgroundColor: tokens.cardBg,
                                      borderColor: tokens.cardBorder,
                                      borderLeftWidth: "4px",
                                      borderLeftColor: tokens.accent,
                                    }}
                                  >
                                    {(curSlide.bullets || []).map((b, bIdx) => (
                                      <div key={bIdx} className="group/bullet flex items-start gap-2.5">
                                        <span
                                          className="h-2 w-2 rounded-full shrink-0 mt-2"
                                          style={{ backgroundColor: tokens.accent }}
                                        />
                                        <textarea
                                          rows={1}
                                          value={b}
                                          onChange={(e) => handleUpdateBullet(bIdx, e.target.value)}
                                          style={{ color: tokens.cardText, fontFamily: tokens.fontBody }}
                                          className="flex-1 bg-transparent text-xs sm:text-sm outline-none resize-none border-b border-transparent hover:border-border/60 focus:border-primary/60 transition-colors leading-relaxed"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveBullet(bIdx)}
                                          className="opacity-0 group-hover/bullet:opacity-100 p-1 text-muted-foreground hover:text-red-500 transition-opacity"
                                          title="Remove point"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}

                                    <button
                                      type="button"
                                      onClick={handleAddBullet}
                                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg border border-dashed border-border hover:border-primary text-muted-foreground hover:text-primary transition-colors mt-2"
                                    >
                                      <Plus className="h-3 w-3" />
                                      <span>Add Bullet Point</span>
                                    </button>
                                  </div>
                                )}
                            </div>

                            {/* Running Footer */}
                            <div
                              className="pt-2 border-t flex items-center justify-between text-[10px] font-mono shrink-0"
                              style={{ borderColor: tokens.dividerColor, color: tokens.textMuted }}
                            >
                              <span>{metadata.universityName || metadata.courseName}</span>
                              <span>Slide {currentSlideIdx + 1} of {presentationSession.slides.length}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Presenter Notes Expandable Drawer */}
                      {showNotesDrawer && currentSlideIdx > 0 && (
                        <div className="p-3.5 rounded-xl border border-border bg-card space-y-1.5 shadow-xs">
                          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <MessageSquare className="h-3.5 w-3.5 text-primary" />
                              Presenter Speaker Notes for Slide {currentSlideIdx + 1}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground/80">
                              Exported to PowerPoint notes
                            </span>
                          </div>
                          <textarea
                            rows={2}
                            value={curSlide.notes || ""}
                            onChange={(e) => updateCurrentSlide({ notes: e.target.value })}
                            placeholder="Add speaker talking points, guidance, or research citations..."
                            className="w-full text-xs p-2 rounded-lg border border-border bg-surface-2/40 text-foreground outline-none resize-none focus:border-primary"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          )}

          {/* Navigation Controls */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStage(4)}
              className="text-xs"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span>Back to Content Upload</span>
            </Button>

            <Button
              type="button"
              variant="hero"
              onClick={() => setCurrentStage(7)}
              className="px-6 text-xs font-semibold gap-1.5 shadow-md"
            >
              <span>Proceed to Export & Download</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STAGE 7: EXPORT AND DOWNLOAD */}
      {/* ============================================================== */}
      {currentStage === 7 && (
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-paper space-y-6">
          <div className="border-b border-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-serif text-lg font-bold text-foreground flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Stage 7 — Export & Download Assignment
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your assignment is organized and formatted. Download your genuine document or presentation below.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <Check className="h-3 w-3" /> Ready for Submission
            </span>
          </div>

          {/* Download Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mode === "document" ? (
              <>
                {/* DOCX Download Card */}
                <div className="p-5 rounded-2xl border border-border bg-card flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all shadow-xs">
                  <div className="flex items-start gap-3.5">
                    <div className="h-11 w-11 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Microsoft Word (.docx)</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Reflowable native Word document with Page 1 Cover Page, heading styles, tables, and submission headers.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="hero"
                    disabled={isExportingDocx}
                    onClick={handleExportDocx}
                    className="w-full text-xs font-semibold gap-2 h-10 shadow-xs"
                  >
                    <Download className="h-4 w-4" />
                    <span>{isExportingDocx ? "Generating DOCX..." : "Download Word (.docx)"}</span>
                  </Button>
                </div>

                {/* PDF Download Card */}
                <div className="p-5 rounded-2xl border border-border bg-card flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all shadow-xs">
                  <div className="flex items-start gap-3.5">
                    <div className="h-11 w-11 rounded-xl bg-rose-600/10 text-rose-600 flex items-center justify-center shrink-0">
                      <FileDown className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Publication-Grade PDF (.pdf)</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Genuine ISO A4 vector PDF rendered with Page 1 Cover Page, crisp fonts, zero blank pages, and clean margins.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    disabled={isExportingPdf}
                    onClick={handleExportPdf}
                    className="w-full text-xs font-semibold gap-2 h-10 bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                  >
                    <FileDown className="h-4 w-4" />
                    <span>{isExportingPdf ? "Generating PDF..." : "Download PDF (.pdf)"}</span>
                  </Button>
                </div>
              </>
            ) : (
              /* Presentation PPTX Download Card */
              <div className="p-5 rounded-2xl border border-border bg-card flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all shadow-xs md:col-span-2">
                <div className="flex items-start gap-3.5">
                  <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <Presentation className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Microsoft PowerPoint (.pptx)</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Widescreen 16:9 presentation deck with Slide 1 Assignment Cover, typography, shapes, and speaker notes.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="hero"
                  disabled={isExportingPptx}
                  onClick={handleExportPptx}
                  className="w-full text-xs font-semibold gap-2 h-10 shadow-xs"
                >
                  <Download className="h-4 w-4" />
                  <span>{isExportingPptx ? "Exporting Deck..." : "Download Presentation (.pptx)"}</span>
                </Button>
              </div>
            )}
          </div>

          {/* Assignment Summary Card */}
          <div className="p-4 rounded-xl border border-border bg-surface-2/40 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Assignment Export Metadata
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Assignment Title:</span>
                <span className="font-semibold text-foreground truncate block">
                  {metadata.assignmentTitle || "Course Assignment"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Course & Instructor:</span>
                <span className="font-semibold text-foreground truncate block">
                  {metadata.courseName} ({metadata.instructorName})
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Submission Type:</span>
                <span className="font-semibold text-foreground">
                  {metadata.assignmentType === "individual" ? "Individual Student" : "Group Assignment"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Cover Template:</span>
                <span className="font-semibold text-foreground truncate block">
                  {COVER_TEMPLATES.find((t) => t.id === metadata.coverTemplateId)?.name}
                </span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentStage(6)}
              className="text-xs"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span>Back to Preview & Editor</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm("Start a new assignment? Your current progress will be reset.")) {
                  setMetadata(getDefaultAssignmentMetadata());
                  setUploadedFiles([]);
                  setRawContent("");
                  setCurrentStage(1);
                  toast.info("Started new assignment session.");
                }
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              <span>Create Another Assignment</span>
            </Button>
          </div>
        </div>
      )}

      {/* Canva Native Cover Canvas Editor Dialog */}
      {isCanvasEditorOpen && (
        <CoverCanvasEditor
          metadata={metadata}
          isOpen={isCanvasEditorOpen}
          onClose={() => setIsCanvasEditorOpen(false)}
          onApply={(updated) => {
            setMetadata(updated);
            setIsCanvasEditorOpen(false);
            toast.success("Applied custom cover canvas design!");
          }}
        />
      )}

      {/* Quick Edit Cover Metadata Modal */}
      {isEditCoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif font-bold text-base flex items-center gap-2 text-foreground">
                <Edit3 className="h-4 w-4 text-primary" />
                Quick Edit Assignment Cover Information
              </h3>
              <button
                type="button"
                onClick={() => setIsEditCoverModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground font-semibold mb-1">Assignment Title</label>
                <input
                  type="text"
                  value={metadata.assignmentTitle || ""}
                  onChange={(e) => updateMetaField("assignmentTitle", e.target.value)}
                  className="w-full p-2 rounded-lg border border-border bg-surface-2/40 text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">Course Name</label>
                  <input
                    type="text"
                    value={metadata.courseName || ""}
                    onChange={(e) => updateMetaField("courseName", e.target.value)}
                    className="w-full p-2 rounded-lg border border-border bg-surface-2/40 text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">Instructor (Submitted to)</label>
                  <input
                    type="text"
                    value={metadata.instructorName || ""}
                    onChange={(e) => updateMetaField("instructorName", e.target.value)}
                    className="w-full p-2 rounded-lg border border-border bg-surface-2/40 text-foreground"
                  />
                </div>
              </div>

              {metadata.assignmentType === "individual" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-muted-foreground font-semibold mb-1">Student Full Name</label>
                    <input
                      type="text"
                      value={metadata.studentName || ""}
                      onChange={(e) => updateMetaField("studentName", e.target.value)}
                      className="w-full p-2 rounded-lg border border-border bg-surface-2/40 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground font-semibold mb-1">Student ID</label>
                    <input
                      type="text"
                      value={metadata.studentId || ""}
                      onChange={(e) => updateMetaField("studentId", e.target.value)}
                      className="w-full p-2 rounded-lg border border-border bg-surface-2/40 text-foreground"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">Group Name</label>
                  <input
                    type="text"
                    value={metadata.groupName || ""}
                    onChange={(e) => updateMetaField("groupName", e.target.value)}
                    className="w-full p-2 rounded-lg border border-border bg-surface-2/40 text-foreground"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">University / College</label>
                  <input
                    type="text"
                    value={metadata.universityName || ""}
                    onChange={(e) => updateMetaField("universityName", e.target.value)}
                    className="w-full p-2 rounded-lg border border-border bg-surface-2/40 text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">Submission Date</label>
                  <input
                    type="text"
                    value={metadata.submissionDate || ""}
                    onChange={(e) => updateMetaField("submissionDate", e.target.value)}
                    className="w-full p-2 rounded-lg border border-border bg-surface-2/40 text-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <Button
                type="button"
                variant="hero"
                size="sm"
                onClick={() => {
                  setIsEditCoverModalOpen(false);
                  toast.success("Assignment cover information updated!");
                }}
                className="text-xs font-semibold"
              >
                Apply Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
