import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Upload,
  FileText,
  Type,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders,
  Layers,
  Palette,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Info,
  Lock,
  Search,
  X,
  Play,
  RotateCcw,
  Key,
  Cpu,
  Bot,
  EyeOff,
  Save,
  ShieldCheck,
  Languages,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ThemeThumb, type SlideType, SLIDE_LABELS } from "../landing/ThemeThumb";
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  type TemplateItem,
  type TemplateCategory,
} from "@/data/templates";
import {
  extractDocumentText,
  requestAiGuidance,
  createPresentationSessionApi,
  fetchAdminSettings,
  updateAdminSettings,
  testAdminGeminiConnection,
  testAdminOpenAIConnection,
} from "@/lib/api-client";
import { detectTitleFromText } from "@/lib/presentation-session-client";
import { recommendThemeFromCatalog } from "@/lib/presentation-theme";
import { detectUnreadableExtraction } from "@/lib/presentation-pipeline";
import {
  estimateOptimalSlideCount,
  recommendNaturalSlideCount,
  SLIDE_COUNT_PRESETS,
  type SlideCountOption,
} from "@/lib/slide-count-estimator";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GraduationCap, BookOpen as BookIcon, ShieldAlert } from "lucide-react";
import {
  type AssignmentMetadata,
  type AssignmentType,
  getDefaultAssignmentMetadata,
  COVER_TEMPLATES,
} from "@/lib/assignment-types";
import {
  extractAssignmentMetadataFromText,
  type ExtractedAssignmentSuggestions,
} from "@/lib/assignment-metadata-extractor";
import { AssignmentInformationForm } from "./AssignmentInformationForm";
import { CoverTemplateGallery } from "./CoverTemplateGallery";
import { AssignmentCoverRenderer } from "./AssignmentCoverRenderer";
import { UnifiedAssignmentWorkflow } from "./UnifiedAssignmentWorkflow";
import {
  calculateSourceCoverage,
  type SourceCoverageReport,
  buildSlideDeckContent,
} from "@/lib/presentation-session-client";

const MAX_FREE_SLIDES = 20;

export const FONT_OPTIONS = [
  { id: "Inter", name: "Inter", style: "Clean & Modern", preview: "The quick brown fox jumps" },
  {
    id: "Roboto",
    name: "Roboto",
    style: "Technical & Crisp",
    preview: "The quick brown fox jumps",
  },
  {
    id: "Playfair Display",
    name: "Playfair Display",
    style: "Editorial & Elegant",
    preview: "The quick brown fox jumps",
  },
  {
    id: "Montserrat",
    name: "Montserrat",
    style: "Bold & Contemporary",
    preview: "The quick brown fox jumps",
  },
  {
    id: "Merriweather",
    name: "Merriweather",
    style: "Academic & Readable",
    preview: "The quick brown fox jumps",
  },
  {
    id: "Calibri",
    name: "Calibri",
    style: "Corporate Standard",
    preview: "The quick brown fox jumps",
  },
];

export const FONT_SIZE_PRESETS = [
  {
    id: "compact" as const,
    label: "Compact",
    desc: "Dense data, detailed briefs & technical reports",
    scale: "Title: 28pt • Body: 13pt",
  },
  {
    id: "standard" as const,
    label: "Standard",
    desc: "Balanced clarity for meetings & university presentations",
    scale: "Title: 34pt • Body: 15pt",
  },
  {
    id: "large" as const,
    label: "Large",
    desc: "Executive readability for boardroom & client decks",
    scale: "Title: 40pt • Body: 17pt",
  },
  {
    id: "extra-large" as const,
    label: "Extra Large",
    desc: "Keynotes, conferences & auditorium projection",
    scale: "Title: 46pt • Body: 19pt",
  },
];

export const PURPOSES = [
  "Business Strategy & Operations",
  "Education & Academic Lecture",
  "Research Findings & Thesis",
  "Project Proposal & Pitch Deck",
  "Executive Review & Synthesis",
  "General Topic Overview",
];

const sampleOutlineText = `Quarterly Strategic Growth & Operations Review
Executive Summary:
DocuMind has expanded its document workspace to support high-velocity presentation creation and lossless file compression. Over 140,000 active creators have utilized the platform across university campuses and enterprise teams.

Key Performance Indicators:
- Annual Recurring Velocity: +340% YoY expansion
- Core Processing Latency: Reduced to 18ms through WebAssembly
- Free Template Access: Exactly 50 full themes available with zero paywalls
- Enterprise Retention: 98.2% gross revenue retention

Strategic Objectives:
1. Scale client-side document reconstruction pipelines.
2. Expand multilingual text recognition and presentation formatting.
3. Maintain non-profit accessible tier for global educators and researchers.`;

export function PresentationWorkflow({
  onSwitchToFormatting,
}: {
  onSwitchToFormatting?: () => void;
}) {
  const navigate = useNavigate();

  // Workflow Step: A = Content, B = Settings, C = Generating
  const [currentStep, setCurrentStep] = useState<"content" | "settings" | "generating">("content");

  // Step A: Content State
  const [title, setTitle] = useState(() => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        const stored = window.sessionStorage.getItem("documind_template_title");
        if (stored) return stored;
      }
    } catch {
      // ignore
    }
    return "";
  });
  const [userEditedTitle, setUserEditedTitle] = useState(false);
  const [purpose, setPurpose] = useState(PURPOSES[0]!);
  const [userSelectedPurpose, setUserSelectedPurpose] = useState(false);
  const [density, setDensity] = useState<"concise" | "balanced" | "detailed">("balanced");
  const [audience, setAudience] = useState("Executive Leadership & Stakeholders");
  const [language, setLanguage] = useState("English");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [inputMode, setInputMode] = useState<"paste" | "upload">("paste");
  const [pastedText, setPastedText] = useState(() => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        const stored = window.sessionStorage.getItem("documind_template_content");
        if (stored) return stored;
      }
    } catch {
      // ignore
    }
    return "";
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedExtractedText, setUploadedExtractedText] = useState("");
  const [isExtractingFile, setIsExtractingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSourceText = inputMode === "upload" ? uploadedExtractedText : pastedText;

  // Step B: Settings State — Never default to generic grayscale; prefer vibrant domain-aligned themes
  const [userLockedTheme, setUserLockedTheme] = useState<boolean>(() => {
    try {
      return Boolean(typeof window !== "undefined" && window.sessionStorage?.getItem("documind_selected_theme_id"));
    } catch {
      return false;
    }
  });
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem>(() => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        const storedId = window.sessionStorage.getItem("documind_selected_theme_id");
        if (storedId) {
          const found = TEMPLATES.find((t) => t.id === storedId && t.isFree);
          if (found) return found;
        }
      }
    } catch {
      // ignore
    }
    return (
      TEMPLATES.find((t) => t.id === "executive-brief") ||
      recommendThemeFromCatalog("", TEMPLATES) ||
      TEMPLATES[0]!
    );
  });
  const [selectedFont, setSelectedFont] = useState("Inter");
  const [selectedFontSize, setSelectedFontSize] = useState<
    "compact" | "standard" | "large" | "extra-large"
  >("standard");
  const [slideCount, setSlideCount] = useState<number>(() => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        const stored = window.sessionStorage.getItem("documind_template_slides_count");
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && (SLIDE_COUNT_PRESETS as readonly number[]).includes(parsed)) return parsed;
        }
      }
    } catch {
      // ignore
    }
    return 8;
  });
  const [userLockedSlideCount, setUserLockedSlideCount] = useState<boolean>(() => {
    try {
      return Boolean(typeof window !== "undefined" && window.sessionStorage?.getItem("documind_template_slides_count"));
    } catch {
      return false;
    }
  });

  // Natural topic-driven recommendation & preset advisory
  const naturalRecommendation = useMemo(() => {
    return recommendNaturalSlideCount(activeSourceText);
  }, [activeSourceText]);

  const slideRecommendation = useMemo(() => {
    return estimateOptimalSlideCount(activeSourceText, slideCount);
  }, [activeSourceText, slideCount]);

  useEffect(() => {
    if (!userLockedSlideCount && activeSourceText.trim().length >= 30) {
      setSlideCount(naturalRecommendation.recommendedCount);
    }
    if (!userLockedTheme && activeSourceText.trim().length >= 40) {
      const matched = recommendThemeFromCatalog(activeSourceText, TEMPLATES);
      if (matched && matched.id !== selectedTemplate.id) {
        setSelectedTemplate(matched);
      }
    }
  }, [activeSourceText, userLockedSlideCount, naturalRecommendation.recommendedCount, userLockedTheme]);
  const [visualPreference, setVisualPreference] = useState<"diagrams" | "text-only">("diagrams");

  // Assignment Mode State
  const [assignmentMode, setAssignmentMode] = useState(false);
  const [assignmentMetadata, setAssignmentMetadata] = useState<AssignmentMetadata>(() =>
    getDefaultAssignmentMetadata(),
  );
  const [extractedSuggestions, setExtractedSuggestions] =
    useState<ExtractedAssignmentSuggestions | null>(null);
  const [outlineReviewOpen, setOutlineReviewOpen] = useState(false);

  // Initialize assignment mode from URL query parameters (?mode=assignment or ?type=assignment)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const modeParam = searchParams.get("mode") || searchParams.get("type");
      if (modeParam === "assignment") {
        setAssignmentMode(true);
      }
    }
  }, []);

  const handleApplySuggestions = (s: ExtractedAssignmentSuggestions) => {
    setAssignmentMetadata((prev) => ({
      ...prev,
      ...(s.courseName && /lab/i.test(s.courseName) ? { assignmentType: "lab-report" as const } : {}),
      ...(s.studentName ? { studentName: s.studentName } : {}),
      ...(s.studentId ? { studentId: s.studentId } : {}),
      groupMembers:
        s.groupMembers && s.groupMembers.length > 0
          ? s.groupMembers.map((m, i) => ({
              id: `m-${i}-${Date.now()}`,
              fullName: m.fullName,
              studentId: m.studentId,
            }))
          : prev.groupMembers,
      ...(s.courseName ? { courseName: s.courseName } : {}),
      ...(s.courseCode ? { courseCode: s.courseCode } : {}),
      ...(s.instructorName ? { instructorName: s.instructorName } : {}),
      ...(s.universityName ? { universityName: s.universityName } : {}),
      ...(s.department ? { department: s.department } : {}),
      ...(s.collegeOrFaculty ? { collegeOrFaculty: s.collegeOrFaculty } : {}),
      ...(s.academicYear ? { academicYear: s.academicYear } : {}),
      ...(s.semester ? { semester: s.semester } : {}),
      ...(s.submissionDate ? { submissionDate: s.submissionDate } : {}),
      ...(s.assignmentTitle ? { assignmentTitle: s.assignmentTitle } : {}),
    }));
    toast.success("Assignment details applied from document!");
    setExtractedSuggestions(null);
  };

  // Lifecycle check for incoming template injection
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        const templateTitle = window.sessionStorage.getItem("documind_template_title");
        if (templateTitle) {
          toast.success(`Template loaded: "${templateTitle}"`, {
            description: "Structure and design tokens loaded. Ready to customize or generate.",
          });
          window.sessionStorage.removeItem("documind_template_title");
          window.sessionStorage.removeItem("documind_template_content");
          window.sessionStorage.removeItem("documind_template_slides_count");
          window.sessionStorage.removeItem("documind_selected_theme_id");
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Theme Search & Filter
  const [themeSearch, setThemeSearch] = useState("");
  const [themeCategory, setThemeCategory] = useState<TemplateCategory>("All");
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);
  const [previewSlideIdx, setPreviewSlideIdx] = useState<SlideType>(0);

  const { user } = useAuth();
  const isAdminOrSuperAdmin =
    user?.role === "admin" ||
    user?.role === "super_admin" ||
    user?.role === "superadmin" ||
    (typeof window !== "undefined" &&
      (window.location.search.includes("adminKey") || window.location.pathname.includes("admin")));

  // Admin Gemini & Multi-Provider Key Modal State
  const [showAdminKeyModal, setShowAdminKeyModal] = useState(false);
  const [adminGeminiKeyInput, setAdminGeminiKeyInput] = useState("");
  const [adminOpenAiKeyInput, setAdminOpenAiKeyInput] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<"gemini" | "openai" | "offline">("gemini");
  const [hasServerKey, setHasServerKey] = useState(false);
  const [testingAdminKey, setTestingAdminKey] = useState(false);
  const [testAdminKeyResult, setTestAdminKeyResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string;
  } | null>(null);
  const [savingAdminKey, setSavingAdminKey] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const handleOpenAdminKeyModal = async () => {
    setShowAdminKeyModal(true);
    setTestAdminKeyResult(null);
    try {
      const s = await fetchAdminSettings();
      if (s?.backendUnavailable) {
        setTestAdminKeyResult({
          success: false,
          latencyMs: 0,
          message:
            s?.error?.message ||
            "Backend API server (/api) is unreachable; server-side keys cannot be loaded or saved.",
        });
        return;
      }
      if (s?.data) {
        setAdminGeminiKeyInput("");
        setAdminOpenAiKeyInput("");
        setSelectedProvider(s.data.activeProvider === "openai" && !s.data.allowPaidProviders ? "gemini" : (s.data.activeProvider || "gemini") as any);
        setHasServerKey(Boolean(s.data.hasKeyConfigured));
      }
    } catch {
      // ignore
    }
  };

  const handleSaveAdminKey = async () => {
    setSavingAdminKey(true);
    try {
      const payload: Record<string, unknown> = {
        activeProvider: selectedProvider,
      };
      if (adminGeminiKeyInput.trim() && !adminGeminiKeyInput.includes("••••")) {
        payload["geminiApiKey"] = adminGeminiKeyInput.trim();
      }
      if (adminOpenAiKeyInput.trim() && !adminOpenAiKeyInput.includes("••••")) {
        payload["openaiApiKey"] = adminOpenAiKeyInput.trim();
      }
      const res = await updateAdminSettings(payload);
      if (res && res.success === false) {
        toast.error(res?.error?.message || "Blocked by Free-First policy.");
        return;
      }
      if (res?.data) {
        setHasServerKey(Boolean(res.data.hasKeyConfigured));
      }
      toast.success("AI Engine Settings Applied Server-Side", {
        description: `Active Engine: ${selectedProvider.toUpperCase()}. Keys stored securely on the backend.`,
      });
      setShowAdminKeyModal(false);
    } catch (err: any) {
      toast.error("Failed to save: " + (err?.message || "Unknown error"));
    } finally {
      setSavingAdminKey(false);
    }
  };

  const handleTestAdminGemini = async () => {
    setTestingAdminKey(true);
    setTestAdminKeyResult(null);
    try {
      const keyToTest = adminGeminiKeyInput.includes("••••") ? undefined : adminGeminiKeyInput.trim() || undefined;
      const res = await testAdminGeminiConnection(keyToTest);
      if (res?.data) {
        setTestAdminKeyResult(res.data);
        if (res.data.success) {
          toast.success("Gemini API Operational", { description: res.data.message });
        } else {
          toast.error("Gemini Connection Failed", { description: res.data.message });
        }
      }
    } catch (err: any) {
      setTestAdminKeyResult({ success: false, latencyMs: 0, message: err?.message || "Failed to reach endpoint." });
    } finally {
      setTestingAdminKey(false);
    }
  };

  // Step C: Generation State
  const [generating, setGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper to sync pasted text, auto-extract title, and estimate slide count
  const handlePastedTextChange = (text: string) => {
    setPastedText(text);
    if (!userEditedTitle || title === "Strategic Operations & Knowledge Review") {
      const detected = detectTitleFromText(text);
      if (detected) setTitle(detected);
    }
    if (!userLockedSlideCount && text.trim().length > 30) {
      setSlideCount(recommendNaturalSlideCount(text).recommendedCount);
    }
  };

  const handleLoadSampleOutline = () => {
    setTitle("Strategic Operations & Knowledge Review");
    setPastedText(sampleOutlineText);
    if (!userLockedSlideCount) {
      const est = estimateOptimalSlideCount(sampleOutlineText);
      setSlideCount(est.optimalCount);
    }
    toast.info("Loaded sample strategic review outline.");
  };

  // File Upload Handlers (in-memory processing only, never permanently stored)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExts = ["pdf", "docx", "doc", "txt"];

    if (!validExts.includes(ext || "")) {
      setFileError(
        `Unsupported file format (.${ext || "unknown"}). DocuMind accepts PDF, Word (DOCX), and plain text (TXT).`,
      );
      setUploadedFile(null);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setFileError("File exceeds the 50 MB fair technical limit.");
      setUploadedFile(null);
      return;
    }

    setUploadedFile(file);
    setUploadedExtractedText("");
    setIsExtractingFile(true);
    const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    if (!userEditedTitle) {
      setTitle(cleanName);
    }

    // Extract uploaded file in isolation (never mix with pastedText)
    extractDocumentText(file)
      .then((res) => {
        const unreadable = res.text ? detectUnreadableExtraction(res.text) : "No readable text found.";
        if (res.isScannedOrEmpty || !res.text || res.text.trim().length === 0 || unreadable) {
          setFileError(
            res.warning ||
              unreadable ||
              "Could not extract selectable text from this file. It may be an image-only scan. Please use a text-based document or paste your notes.",
          );
          setUploadedFile(null);
          setUploadedExtractedText("");
        } else {
          setUploadedExtractedText(res.text);
          if (!userLockedSlideCount && res.text.trim().length > 30) {
            setSlideCount(recommendNaturalSlideCount(res.text).recommendedCount);
          }
          if (!userEditedTitle) {
            const detected = detectTitleFromText(res.text);
            if (detected && detected.length > 3) {
              setTitle(detected);
            }
          }
          const suggestions = extractAssignmentMetadataFromText(res.text);
          if (suggestions.hasSuggestions) {
            setExtractedSuggestions(suggestions);
          }
          toast.success(`Extracted ${res.wordCount} words`, {
            description: `${(file.size / 1024 / 1024).toFixed(1)} MB processed cleanly in memory.`,
          });
        }
      })
      .catch((err) => {
        setFileError(err instanceof Error ? err.message : "Failed to extract text from file.");
        setUploadedFile(null);
        setUploadedExtractedText("");
      })
      .finally(() => {
        setIsExtractingFile(false);
      });
  };

  // Step A -> Step B Transition
  const handleProceedToSettings = async () => {
    if (inputMode === "paste" && pastedText.trim().length < 15) {
      toast.error("Please supply your presentation content", {
        description:
          "Enter at least 15 characters of notes or outline, or click 'Load Sample Outline'.",
      });
      return;
    }
    if (inputMode === "upload" && !uploadedFile) {
      toast.error("Please select a file to upload", {
        description: "Drop a PDF, DOCX, or TXT file into the upload box.",
      });
      return;
    }
    if (inputMode === "upload" && isExtractingFile) {
      toast.info("Still reading your uploaded document — please wait a moment.");
      return;
    }

    // If uploading and text hasn't finished extracting, extract strictly from uploadedFile
    let latestSource = activeSourceText;
    if (inputMode === "upload" && uploadedFile && !uploadedExtractedText.trim()) {
      try {
        toast.info("Extracting document contents...", {
          description: "Processing locally in memory.",
        });
        const extraction = await extractDocumentText(uploadedFile);
        const unreadable = extraction.text ? detectUnreadableExtraction(extraction.text) : null;
        if (
          extraction.isScannedOrEmpty ||
          !extraction.text ||
          extraction.text.trim().length === 0 ||
          unreadable
        ) {
          const msg =
            extraction.warning ||
            unreadable ||
            "Could not extract text. Please ensure the document is not an image-only scan.";
          setFileError(msg);
          toast.error("Document Extraction Failed", { description: msg });
          return;
        }
        latestSource = extraction.text;
        setUploadedExtractedText(extraction.text);
        if (!userEditedTitle && !title.trim()) {
          const detected = detectTitleFromText(extraction.text);
          if (detected) setTitle(detected);
        }
        const suggestions = extractAssignmentMetadataFromText(extraction.text);
        if (suggestions.hasSuggestions) {
          setExtractedSuggestions(suggestions);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Document extraction failed.";
        setFileError(msg);
        toast.error("Extraction Failed", { description: msg });
        return;
      }
    }

    if (assignmentMode) {
      // In assignment mode, all metadata fields (student name, student ID, course, instructor, university, group members) are optional.
      if (!assignmentMetadata.assignmentTitle?.trim()) {
        const detectedTitle = title.trim() || detectTitleFromText(latestSource) || "Academic Assignment";
        setAssignmentMetadata((prev) => ({
          ...prev,
          assignmentTitle: detectedTitle,
        }));
      }
    }

    setCurrentStep("settings");
  };

  // Step B Theme Selection
  const handleSelectTheme = (t: TemplateItem) => {
    setSelectedTemplate(t);
    setUserLockedTheme(true);
    const fontCandidate = t.fonts.split("+")[0]?.trim() || t.fonts.split("/")[0]?.trim();
    if (fontCandidate) {
      setSelectedFont(fontCandidate);
    }
    toast.success(`Theme Applied: ${t.name}`, {
      description: `Visual palette & typography preset configured from template.`,
    });
  };

  // Step B -> Step C Generation
  const handleStartGeneration = async () => {
    if (generating) return; // Prevent duplicate clicks

    // Strictly isolate uploaded document text vs pasted text (never leak pasted drafts when uploading)
    let contentToUse = inputMode === "upload" ? uploadedExtractedText.trim() : pastedText.trim();
    if (inputMode === "upload" && !contentToUse && uploadedFile) {
      try {
        setGenerating(true);
        setCurrentStep("generating");
        setGenerationPhase("1/5: Extracting text from uploaded document...");
        const extraction = await extractDocumentText(uploadedFile);
        const unreadable = extraction.text ? detectUnreadableExtraction(extraction.text) : null;
        if (
          extraction.isScannedOrEmpty ||
          !extraction.text ||
          extraction.text.trim().length === 0 ||
          unreadable
        ) {
          throw new Error(
            extraction.warning ||
              unreadable ||
              "Could not extract selectable text from this file. It may be an image-only scan.",
          );
        }
        contentToUse = extraction.text;
        setUploadedExtractedText(contentToUse);
      } catch (err) {
        setGenerating(false);
        setCurrentStep("settings");
        const msg = err instanceof Error ? err.message : "Document extraction failed.";
        toast.error("Generation Halted", { description: msg });
        return;
      }
    }

    if (!contentToUse || contentToUse.length < 15) {
      toast.error("Content is too short or empty", {
        description: "Please supply presentation notes or an upload with readable text.",
      });
      return;
    }
    const unreadableCheck = detectUnreadableExtraction(contentToUse);
    if (unreadableCheck) {
      setFileError(unreadableCheck);
      toast.error("Unreadable Source Document", { description: unreadableCheck });
      return;
    }

    setGenerating(true);
    setCurrentStep("generating");
    abortControllerRef.current = new AbortController();

    try {
      setGenerationPhase("2/5: Understanding source subject, themes & key facts...");
      await new Promise((r) => setTimeout(r, 350));

      setGenerationPhase("3/5: Composing varied visual storytelling layouts...");
      await new Promise((r) => setTimeout(r, 400));

      setGenerationPhase(
        `4/5: Applying ${selectedTemplate.name} design tokens & diagrams...`,
      );
      await new Promise((r) => setTimeout(r, 400));

      setGenerationPhase(
        "5/5: Running quality control inspection & compiling PPTX...",
      );

      const detected = detectTitleFromText(contentToUse);
      const finalTitle =
        userEditedTitle && title.trim()
          ? title.trim()
          : detected || title.trim() || "Presentation Deck";

      const session = await createPresentationSessionApi({
        title: finalTitle,
        content: contentToUse,
        ...(userSelectedPurpose ? { purpose } : {}),
        density,
        ...(!assignmentMode && audience ? { audience } : {}),
        ...(!assignmentMode && language ? { language } : {}),
        ...(!assignmentMode && additionalInstructions ? { additionalInstructions } : {}),
        presentationType: assignmentMode ? "assignment" : "standard",
        ...(assignmentMode ? { assignmentMetadata: { ...assignmentMetadata, isAssignment: true } } : {}),
        theme: {
          id: selectedTemplate.id,
          name: selectedTemplate.name,
          category: selectedTemplate.category,
          kind: selectedTemplate.kind,
          colors: selectedTemplate.colors,
          fonts: selectedTemplate.fonts,
          tier: selectedTemplate.tier,
        },
        typography: {
          fontFamily: selectedFont,
          fontSizePreset: selectedFontSize,
        },
        slideCount,
        autoSlideCount: !userLockedSlideCount,
        visualPreference,
      });

      toast.success("Presentation Generated!", {
        description: `Opening 16:9 preview for "${session.title}".`,
      });

      // Navigate to dedicated preview route
      navigate({
        to: "/presentation-preview/$id",
        params: { id: session.sessionId },
      });
    } catch (err: unknown) {
      console.error("Presentation generation error:", err);
      const msg = err instanceof Error ? err.message : "Failed to compile presentation.";
      toast.error("Generation Failed", { description: msg });
      setCurrentStep("settings");
    } finally {
      setGenerating(false);
    }
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setGenerating(false);
    setCurrentStep("settings");
    toast.info("Generation Cancelled");
  };

  // Filter templates for theme picker
  const filteredTemplates = TEMPLATES.filter((t) => {
    if (themeCategory !== "All" && t.category.toLowerCase() !== themeCategory.toLowerCase()) {
      return false;
    }
    if (!themeSearch.trim()) return true;
    const q = themeSearch.toLowerCase().trim();
    return (
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.bestFor.toLowerCase().includes(q)
    );
  });

  if (assignmentMode) {
    return (
      <div className="w-full">
        {/* Primary Mode Selector: Standard Presentation vs Academic Assignment Mode */}
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setAssignmentMode(false);
                setAssignmentMetadata((prev) => ({ ...prev, isAssignment: false }));
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-muted-foreground hover:text-foreground hover:bg-surface-2"
            >
              <Layers className="h-4 w-4" />
              <span>Standard Presentation</span>
            </button>

            <button
              type="button"
              data-testid="assignment-mode-button"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/30"
            >
              <GraduationCap className="h-4 w-4 text-amber-400" />
              <span>Assignment Mode</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold">
                Active
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-primary/5 rounded-xl border border-primary/20">
            <span className="font-semibold text-primary">Mode:</span>
            <span>
              {assignmentMetadata.assignmentType === "group"
                ? "Group Project"
                : "Individual Submission"}
            </span>
            <span>•</span>
            <span className="font-mono text-[11px] font-bold text-foreground">
              {COVER_TEMPLATES.find((t) => t.id === assignmentMetadata.coverTemplateId)?.name ||
                assignmentMetadata.coverTemplateId}
            </span>
          </div>
        </div>

        {/* 7-Stage Unified AI Assignment Creation Workflow */}
        <UnifiedAssignmentWorkflow
          mode="presentation"
          onExitAssignmentMode={() => {
            setAssignmentMode(false);
            setAssignmentMetadata((prev) => ({ ...prev, isAssignment: false }));
          }}
          initialMetadata={assignmentMetadata}
          initialContent={activeSourceText}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Primary Mode Selector: Standard Presentation vs Academic Assignment Mode */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 rounded-2xl border border-border bg-card shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAssignmentMode(false);
              setAssignmentMetadata((prev) => ({ ...prev, isAssignment: false }));
            }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              !assignmentMode
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Standard Presentation</span>
          </button>

          <button
            type="button"
            data-testid="assignment-mode-button"
            onClick={() => {
              setAssignmentMode(true);
              setAssignmentMetadata((prev) => ({ ...prev, isAssignment: true }));
              toast.info("Academic Assignment Mode Activated", {
                description:
                  "Enter student/group details, university emblem, and select your cover template.",
              });
            }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              assignmentMode
                ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            <span>Assignment Mode</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold">
              Academic
            </span>
          </button>
        </div>

        {assignmentMode && (
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-primary/5 rounded-xl border border-primary/20">
            <span className="font-semibold text-primary">Mode:</span>
            <span>
              {assignmentMetadata.assignmentType === "group"
                ? "Group Project"
                : "Individual Submission"}
            </span>
            <span>•</span>
            <span className="font-mono text-[11px] font-bold text-foreground">
              {COVER_TEMPLATES.find((t) => t.id === assignmentMetadata.coverTemplateId)?.name ||
                assignmentMetadata.coverTemplateId}
            </span>
          </div>
        )}
      </div>

      {/* Workflow Step Tracker */}
      <div className="mb-8 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-mono font-bold text-sm shadow-xs">
              {currentStep === "content" ? "A" : currentStep === "settings" ? "B" : "C"}
            </span>
            <div>
              <p className="font-serif font-bold text-base text-foreground">
                {currentStep === "content" && "Step A — Add Content & Topic"}
                {currentStep === "settings" && "Step B — Choose Presentation Settings"}
                {currentStep === "generating" && "Step C — Generating Vector Presentation"}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentStep === "content" &&
                  "Enter a topic, paste notes, or upload a source document"}
                {currentStep === "settings" &&
                  "Select theme, font family, typography scale, and slide count"}
                {currentStep === "generating" &&
                  "Synthesizing slides and creating 15-minute temporary preview session"}
              </p>
            </div>
          </div>

          {/* Step Navigation Pill Indicator */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentStep("content")}
              disabled={generating}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                currentStep === "content"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-2 text-muted-foreground hover:text-foreground"
              }`}
            >
              Content
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep("settings")}
              disabled={generating || (!activeSourceText.trim() && !(inputMode === "upload" && uploadedFile))}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                currentStep === "settings"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-2 text-muted-foreground hover:text-foreground"
              }`}
            >
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* STEP A — CHOOSE TYPE & PROVIDE CONTENT                            */}
      {/* ================================================================= */}
      {currentStep === "content" && (
        <div className="space-y-6">
          {/* Step 1: Presentation Type Selector */}
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-paper space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-primary font-bold">
                Step 1 — Choose Presentation Type
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {assignmentMode ? "Academic Mode" : "Standard AI Mode"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => setAssignmentMode(false)}
                className={`rounded-2xl border p-4 sm:p-5 text-left transition-all relative overflow-hidden flex items-start gap-4 cursor-pointer ${
                  !assignmentMode
                    ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                    : "border-border bg-surface-2 hover:border-border/80 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                    !assignmentMode
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Sparkles className="h-5 w-5" />
                </span>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    Standard Presentation
                    {!assignmentMode && (
                      <span className="text-[9px] font-mono uppercase bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">
                        Selected
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    AI analyzes your topic, documents, or notes and creates a modern, visually rich presentation deck with tailored diagrams and layouts.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAssignmentMode(true)}
                className={`rounded-2xl border p-4 sm:p-5 text-left transition-all relative overflow-hidden flex items-start gap-4 cursor-pointer ${
                  assignmentMode
                    ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                    : "border-border bg-surface-2 hover:border-border/80 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                    assignmentMode
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <GraduationCap className="h-5 w-5" />
                </span>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    Assignment Presentation
                    {assignmentMode && (
                      <span className="text-[9px] font-mono uppercase bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">
                        Selected
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Academic presentation with official student & course details, verified university cover styles, and department branding.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Academic Assignment Form & Cover Gallery (Shown when Assignment Mode is Active) */}
          {assignmentMode && (
            <div className="space-y-6">
              <AssignmentInformationForm
                metadata={assignmentMetadata}
                onChange={setAssignmentMetadata}
                extractedSuggestions={extractedSuggestions}
                onApplySuggestions={handleApplySuggestions}
                onDismissSuggestions={() => setExtractedSuggestions(null)}
              />

              <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-paper">
                <CoverTemplateGallery
                  metadata={assignmentMetadata}
                  mode="presentation"
                  onSelectTemplate={(tplId, defaultAccent) =>
                    setAssignmentMetadata((prev) => ({
                      ...prev,
                      coverTemplateId: tplId,
                      accentColor: defaultAccent || prev.accentColor,
                    }))
                  }
                  onUpdateAccentColor={(accent) =>
                    setAssignmentMetadata((prev) => ({ ...prev, accentColor: accent }))
                  }
                />
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-paper space-y-6">
            <span className="text-xs font-mono uppercase tracking-wider text-primary font-bold block">
              Step 2 — Provide Content & Presentation Directives
            </span>

            {/* Topic Input */}
            <div data-tour="tour-topic" className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold block">
                  Presentation Topic or Title
                </label>
                {activeSourceText.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      const detected = detectTitleFromText(activeSourceText);
                      if (detected) {
                        setTitle(detected);
                        setUserEditedTitle(false);
                        toast.success(`Title detected: "${detected}"`);
                      }
                    }}
                    className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" /> Auto-detect title from text
                  </button>
                )}
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setUserEditedTitle(e.target.value.trim().length > 0);
                }}
                placeholder="e.g. Photosynthesis and Plant Biology (or leave blank to auto-detect)"
                className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm font-medium text-foreground focus:border-primary focus:outline-hidden min-h-[46px]"
              />
            </div>

            {/* Purpose & Content Density Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div data-tour="tour-purpose" className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold block">
                  Intended Purpose
                </label>
                <select
                  value={purpose}
                  onChange={(e) => {
                    setPurpose(e.target.value);
                    setUserSelectedPurpose(true);
                  }}
                  className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-xs sm:text-sm font-medium text-foreground focus:border-primary focus:outline-hidden min-h-[46px]"
                >
                  {PURPOSES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold block">
                  Slide Content Density
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["concise", "balanced", "detailed"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDensity(d)}
                      className={`rounded-xl border py-2.5 px-2 text-xs font-semibold capitalize transition-all min-h-[46px] ${
                        density === d
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Target Audience & Presentation Language (For Standard Mode) */}
            {!assignmentMode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" /> Target Audience (Optional)
                  </label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-xs sm:text-sm font-medium text-foreground focus:border-primary focus:outline-hidden min-h-[46px]"
                  >
                    <option value="Executive Leadership & Stakeholders">Executive Leadership & Stakeholders</option>
                    <option value="Technical Developers & Engineers">Technical Developers & Engineers</option>
                    <option value="Clients, Investors & Partners">Clients, Investors & Partners</option>
                    <option value="Students, Faculty & Academics">Students, Faculty & Academics</option>
                    <option value="General Public & Consumers">General Public & Consumers</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                    <Languages className="h-3.5 w-3.5 text-primary" /> Presentation Language (Optional)
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-xs sm:text-sm font-medium text-foreground focus:border-primary focus:outline-hidden min-h-[46px]"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish (Español)</option>
                    <option value="French">French (Français)</option>
                    <option value="German">German (Deutsch)</option>
                    <option value="Arabic">Arabic (العربية)</option>
                    <option value="Portuguese">Portuguese (Português)</option>
                    <option value="Chinese">Chinese (中文)</option>
                    <option value="Japanese">Japanese (日本語)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Additional AI Directives (Optional) */}
            {!assignmentMode && (
              <div className="space-y-2 pt-1">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center justify-between">
                  <span>Additional AI Instructions / Design Directives (Optional)</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Custom styling & focal points</span>
                </label>
                <textarea
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="e.g. Focus on technical architecture, highlight distributed telemetry benchmarks, use a high-contrast style, include process diagrams..."
                  rows={2}
                  className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden resize-none"
                />
              </div>
            )}

            {/* Content Input Mode Switcher (Paste vs Upload) */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold">
                  Source Material
                </span>
                <div className="flex rounded-lg border border-border bg-surface-2 p-1">
                  <button
                    type="button"
                    onClick={() => setInputMode("paste")}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                      inputMode === "paste"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Paste Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("upload")}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                      inputMode === "upload"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Upload Document
                  </button>
                </div>
              </div>

              {/* Paste Text Editor */}
              {inputMode === "paste" && (
                <div data-tour="tour-paste" className="space-y-2">
                  <textarea
                    rows={8}
                    value={pastedText}
                    onChange={(e) => handlePastedTextChange(e.target.value)}
                    placeholder="Paste notes, article excerpts, meeting takeaways, or an outline here..."
                    className="w-full rounded-2xl border border-border bg-surface-2 p-4 text-xs sm:text-sm font-sans leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {pastedText.split(/\s+/).filter(Boolean).length} words • Memory-only
                      processing
                    </span>
                    <button
                      type="button"
                      onClick={handleLoadSampleOutline}
                      className="font-medium text-primary hover:underline"
                    >
                      Load Sample Outline
                    </button>
                  </div>
                </div>
              )}

              {/* File Upload Box */}
              {inputMode === "upload" && (
                <div data-tour="tour-upload" className="space-y-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                      uploadedFile
                        ? "border-emerald-500 bg-emerald-500/5"
                        : "border-border hover:border-primary/50 bg-surface-2/40"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc,.txt"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <Upload
                      className={`mx-auto h-10 w-10 ${
                        uploadedFile ? "text-emerald-600" : "text-muted-foreground"
                      }`}
                    />

                    {uploadedFile ? (
                      <div className="mt-3">
                        <p className="text-sm font-semibold text-foreground">{uploadedFile.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • File verified
                        </p>
                        <span className="mt-2 inline-block rounded-full bg-emerald-500/10 px-3 py-0.5 font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                          Ready for Extraction
                        </span>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <p className="text-sm font-semibold text-foreground">
                          Drop your PDF, Word (DOCX), or Text file here
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Supported formats: PDF, DOCX, TXT (Maximum file size: 50 MB)
                        </p>
                      </div>
                    )}
                  </div>

                  {fileError && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-600 dark:text-red-400">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{fileError}</span>
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" />
                    <span>
                      Original files are processed in ephemeral memory and discarded immediately.
                      Never stored in database or cloud storage.
                    </span>
                  </p>
                </div>
              )}

              {/* Intelligent Slide Length Guidance & Quick Presets */}
              {(activeSourceText.trim().length > 30 || (inputMode === "upload" && uploadedFile)) && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-3.5 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary shrink-0 mt-0.5">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-foreground flex flex-wrap items-center gap-2">
                          DocuMind Deck Length Guidance
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                            Auto-Recommended: {naturalRecommendation.recommendedCount} Slides
                          </span>
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {naturalRecommendation.wordCount} words detected • {naturalRecommendation.topicCount} semantic themes • {naturalRecommendation.reason}
                        </p>
                      </div>
                    </div>

                    {/* Presets selector buttons: 5, 8, 10, 15, 20 */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono text-muted-foreground mr-1 hidden sm:inline">
                        Target:
                      </span>
                      {SLIDE_COUNT_PRESETS.map((cnt) => {
                        const isOptimal = cnt === slideRecommendation.optimalCount;
                        const isSelected = slideCount === cnt;
                        return (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => {
                              setSlideCount(cnt);
                              setUserLockedSlideCount(true);
                            }}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
                                : isOptimal
                                  ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 font-bold"
                                  : "bg-surface-2 border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {cnt} Slides {isOptimal && !isSelected ? "★" : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed bg-background/60 rounded-xl p-3 border border-border/60">
                    {slideRecommendation.reason}
                  </p>
                </div>
              )}
            </div>

            {/* Step A Bottom Bar: Next Button */}
            <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                Next: Select visual theme, typography, and slide count
              </span>
              <Button
                variant="hero"
                onClick={handleProceedToSettings}
                className="w-full sm:w-auto min-h-[48px] px-8 text-xs font-semibold shadow-xs"
              >
                Continue to Presentation Settings <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* STEP B — CHOOSE PRESENTATION SETTINGS                              */}
      {/* ================================================================= */}
      {currentStep === "settings" && (
        <div className="space-y-8">
          {/* Section B.1: Theme Picker */}
          <div
            data-tour="tour-theme"
            className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-paper space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                  Presentation Aesthetics
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-foreground mt-0.5">
                  Choose a Theme
                </h3>
                <p className="text-xs text-muted-foreground">
                  Selected Theme:{" "}
                  <strong className="text-foreground">{selectedTemplate.name}</strong> (
                  {selectedTemplate.category})
                </p>
              </div>

              {/* 100% Free Themes Policy */}
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3.5 py-1.5 font-mono text-xs font-semibold border border-emerald-500/25 shadow-xs">
                <Check className="h-3.5 w-3.5" />
                <span>{TEMPLATES.length}+ Modern Themes 100% Free</span>
              </div>
            </div>

            {/* Category Pills & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 max-h-28">
                {TEMPLATE_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setThemeCategory(c)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-all ${
                      themeCategory === c
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                  {filteredTemplates.length} themes
                </span>
                <div className="relative w-full sm:w-60 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={themeSearch}
                    onChange={(e) => setThemeSearch(e.target.value)}
                    placeholder="Filter by name, tag, or topic..."
                    className="w-full rounded-xl border border-border bg-surface-2 py-1.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Theme Card Grid - Displays all filtered Free and Pro themes with real preview triggers */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[460px] overflow-y-auto p-1">
              {filteredTemplates.map((t) => {
                const isSelected = selectedTemplate.id === t.id;

                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTheme(t)}
                    className={`group cursor-pointer rounded-2xl border p-3 transition-all flex flex-col justify-between ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary shadow-md"
                        : "border-border bg-surface-2/40 hover:bg-surface-2 hover:border-primary/40"
                    }`}
                  >
                    <div>
                      {/* Mini Thumbnail */}
                      <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border/80">
                        <ThemeThumb template={t} kind={t.kind} slide={0} />
                        <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                          <span className="rounded-full bg-emerald-600/90 px-1.5 py-0.2 font-mono text-[9px] font-bold text-white uppercase">
                            Free
                          </span>
                        </div>

                        {/* Theme Slide Preview Trigger Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewTemplate(t);
                            setPreviewSlideIdx(0);
                          }}
                          className="absolute bottom-1.5 right-1.5 p-1 rounded-md bg-background/90 text-foreground hover:text-primary transition shadow-xs"
                          title="Preview all 4 theme slide styles"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-foreground truncate">{t.name}</p>
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {t.category} • {t.kind}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="font-mono">{t.slidesCount} slides</span>
                      <div
                        className="flex items-center gap-1.5"
                        title={`Palette: ${t.colors.primary}, ${t.colors.accent}, ${t.colors.bg}`}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-black/20"
                          style={{ backgroundColor: t.colors.primary }}
                        />
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-black/20"
                          style={{ backgroundColor: t.colors.accent }}
                        />
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-black/20"
                          style={{ backgroundColor: t.colors.bg }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section B.2: Typography (Font Family & Font Size Presets) */}
          <div
            data-tour="tour-typography"
            className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-paper space-y-6"
          >
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
              Typography Controls
            </span>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-foreground">
              Font Family & Size Scaling
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Font Family Selector */}
              <div className="space-y-3">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold block">
                  Select Presentation Font
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFont(f.id)}
                      className={`text-left rounded-xl border p-3 transition-all min-h-[58px] ${
                        selectedFont === f.id
                          ? "border-primary bg-primary/10 ring-1 ring-primary shadow-xs"
                          : "border-border bg-surface-2 hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{f.name}</span>
                        {selectedFont === f.id && <Check className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        {f.style}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size Presets */}
              <div className="space-y-3">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold block">
                  Font Sizing Preset (Maintains Hierarchy)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {FONT_SIZE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedFontSize(p.id)}
                      className={`text-left rounded-xl border p-3 transition-all min-h-[58px] ${
                        selectedFontSize === p.id
                          ? "border-primary bg-primary/10 ring-1 ring-primary shadow-xs"
                          : "border-border bg-surface-2 hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{p.label}</span>
                        {selectedFontSize === p.id && (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground block mt-0.5 line-clamp-1">
                        {p.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section B.3: Slide Count & Intelligent Estimation */}
          <div
            data-tour="tour-slides"
            className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-paper space-y-6"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                  Slide Count & Deck Length
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-foreground mt-0.5">
                  Target Length: {slideCount} Slides {!userLockedSlideCount && "(Auto)"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {naturalRecommendation.reason}
                </p>
              </div>

              {/* Slide Count Buttons: Auto + Presets */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUserLockedSlideCount(false);
                    setSlideCount(naturalRecommendation.recommendedCount);
                  }}
                  className={`relative rounded-xl border px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold transition-all min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
                    !userLockedSlideCount
                      ? "border-primary bg-primary text-primary-foreground shadow-xs ring-1 ring-primary"
                      : "border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="text-[8px] font-mono uppercase tracking-wider font-extrabold opacity-90">
                    Content-Driven
                  </span>
                  <span>Auto ({naturalRecommendation.recommendedCount})</span>
                </button>
                {SLIDE_COUNT_PRESETS.map((count) => {
                  const isOptimal = count === slideRecommendation.optimalCount;
                  const isSelected = userLockedSlideCount && slideCount === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        setSlideCount(count);
                        setUserLockedSlideCount(true);
                      }}
                      className={`relative rounded-xl border px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold transition-all min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-xs ring-1 ring-primary"
                          : "border-border bg-surface-2 text-muted-foreground hover:text-foreground hover:border-border/80"
                      }`}
                    >
                      {isOptimal && (
                        <span
                          className={`text-[8px] font-mono uppercase tracking-wider px-1 py-0.1 rounded font-extrabold ${
                            isSelected
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          Recommended
                        </span>
                      )}
                      <span>{count} Slides</span>
                    </button>
                  );
                })}

                {/* Custom Fine-Tuning Stepper (3-50) */}
                <div className="flex items-center gap-1.5 bg-surface-2 border border-border rounded-xl px-2.5 py-1 min-h-[44px]">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase mr-1">Custom:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSlideCount((prev) => Math.max(3, prev - 1));
                      setUserLockedSlideCount(true);
                    }}
                    disabled={slideCount <= 3}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-background border border-border text-foreground hover:bg-muted font-bold text-xs disabled:opacity-40"
                    title="Decrease slides"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={3}
                    max={50}
                    value={slideCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setSlideCount(Math.max(3, Math.min(50, val)));
                        setUserLockedSlideCount(true);
                      }
                    }}
                    className="w-12 h-7 text-center rounded-lg bg-background border border-border text-xs font-mono font-bold text-foreground focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSlideCount((prev) => Math.min(50, prev + 1));
                      setUserLockedSlideCount(true);
                    }}
                    disabled={slideCount >= 50}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-background border border-border text-foreground hover:bg-muted font-bold text-xs disabled:opacity-40"
                    title="Increase slides"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Advisory / Guidance callout */}
            {(() => {
              const advisory = slideRecommendation.getAdvisory(slideCount);
              const isOptimal = advisory.level === "optimal";
              const isWarning = advisory.level === "warning";
              return (
                <div
                  className={`rounded-2xl border p-4 text-xs flex items-start gap-3 transition-colors ${
                    isOptimal
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-200"
                      : isWarning
                        ? "border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200"
                        : "border-primary/20 bg-primary/5 text-foreground"
                  }`}
                >
                  <Sparkles
                    className={`h-4 w-4 shrink-0 mt-0.5 ${
                      isOptimal
                        ? "text-emerald-600 dark:text-emerald-400"
                        : isWarning
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-primary"
                    }`}
                  />
                  <div className="space-y-0.5">
                    <p className="font-semibold">
                      {isOptimal
                        ? "Optimal Deck Pacing"
                        : isWarning
                          ? "Pacing Warning"
                          : "Slide Distribution Note"}
                    </p>
                    <p className="leading-relaxed opacity-90">{advisory.message}</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Section B.4: Visual Treatment & Layout Preferences */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-paper space-y-4">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
              Visual Assets & Diagrams
            </span>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-foreground">
              Visual Treatment
            </h3>
            <p className="text-xs text-muted-foreground">
              Configure how conceptual diagrams, telemetry cards, and multi-column comparison
              structures are arranged.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setVisualPreference("diagrams")}
                className={`text-left rounded-2xl border p-4 transition-all min-h-[64px] ${
                  visualPreference === "diagrams"
                    ? "border-primary bg-primary/10 ring-1 ring-primary shadow-xs"
                    : "border-border bg-surface-2 hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    Smart Diagrams & Visual Layouts (Recommended)
                  </span>
                  {visualPreference === "diagrams" && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Incorporates architecture flows, KPI telemetry cards, workflow steps, and timeline
                  roadmaps.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setVisualPreference("text-only")}
                className={`text-left rounded-2xl border p-4 transition-all min-h-[64px] ${
                  visualPreference === "text-only"
                    ? "border-primary bg-primary/10 ring-1 ring-primary shadow-xs"
                    : "border-border bg-surface-2 hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    Text & Bullet Hierarchy Only
                  </span>
                  {visualPreference === "text-only" && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Generates clean, dense textual slides focused strictly on headings, bullet points,
                  and key takeaways.
                </p>
              </button>
            </div>
          </div>

          {/* Section B.5: Platform AI Picture & Graph Engine */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-paper space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                    AI Vision & Imagery Engine
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Platform Active (Gemini 3.8 Flash)
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-foreground mt-0.5">
                  Contextual Pictures & Vector Diagrams
                </h3>
              </div>
              {isAdminOrSuperAdmin && (
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenAdminKeyModal}
                    className="text-xs h-8 font-semibold border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary flex items-center gap-1.5 shadow-xs"
                  >
                    <Key className="h-3.5 w-3.5" />
                    <span>Admin: AI Credentials</span>
                  </Button>
                  <Link
                    to="/admin"
                    className="text-xs font-semibold text-muted-foreground hover:text-primary transition flex items-center gap-1 bg-surface-2 px-3 py-1.5 rounded-lg border border-border h-8"
                  >
                    <span>Admin Center</span>
                    <span className="text-[10px] text-primary">→</span>
                  </Link>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              DocuMind illustrates slides with contextual 16:9 visuals, editable architecture diagrams, and KPI charts using Google Gemini 3.8 Flash (Free Tier) and our programmatic vector engine. Paid Imagen 3 / paid APIs stay disabled unless explicitly enabled by an administrator—and all server credentials stay securely off the browser.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 bg-surface-2/80 px-2.5 py-1 rounded-md border border-border">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Auto-Selected Layouts
              </span>
              <span className="inline-flex items-center gap-1.5 bg-surface-2/80 px-2.5 py-1 rounded-md border border-border">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Adaptive Vector Synthesizer
              </span>
              <span className="inline-flex items-center gap-1.5 bg-surface-2/80 px-2.5 py-1 rounded-md border border-border">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Native 16:9 PPTX Embed
              </span>
            </div>
          </div>

          {/* Review Screen: Assignment & Content Outline Summary */}
          {(() => {
            const contentForReview = activeSourceText.trim();
            let previewDeck: ReturnType<typeof buildSlideDeckContent> = [];
            try {
              previewDeck = contentForReview
                ? buildSlideDeckContent(
                    title.trim() || detectTitleFromText(contentForReview) || "Presentation Preview",
                    contentForReview,
                    slideCount,
                    density,
                    userSelectedPurpose ? purpose : "",
                    assignmentMode ? { ...assignmentMetadata, isAssignment: true } : undefined,
                    {
                      visualPreference,
                      theme: selectedTemplate,
                      autoSlideCount: !userLockedSlideCount,
                    },
                  )
                : [];
            } catch {
              previewDeck = [];
            }
            const coverageReport = calculateSourceCoverage(contentForReview, previewDeck);

            return (
              <div className="rounded-3xl border border-border bg-card p-6 shadow-paper space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Generation Blueprint Review (Step 7)</span>
                    </div>
                    <h3 className="text-xl font-serif font-bold text-foreground mt-1">
                      {assignmentMode ? "Academic Assignment & Outline Synthesis" : "Presentation Blueprint Review"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Verify your academic credentials, cover slide layout, and source topic coverage before compilation.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                      {coverageReport.coveragePercentage}% Source Coverage
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setOutlineReviewOpen(true)}
                      className="text-xs h-8 gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" /> Inspect Outline ({previewDeck.length} slides)
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Left Column: Academic Cover Summary */}
                  {assignmentMode ? (
                    <div className="p-4 rounded-2xl bg-surface-2/60 border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <GraduationCap className="h-4 w-4 text-primary" />
                          Cover Slide: {COVER_TEMPLATES.find((t) => t.id === assignmentMetadata.coverTemplateId)?.name}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-primary text-primary-foreground">
                          {assignmentMetadata.assignmentType}
                        </span>
                      </div>

                      <div className="aspect-video w-full rounded-lg overflow-hidden border border-border/80 shadow-2xs bg-white">
                        <AssignmentCoverRenderer
                          metadata={assignmentMetadata}
                          aspectRatio="16:9"
                          isThumbnail={true}
                        />
                      </div>

                      <div className="space-y-1 text-[11px] text-muted-foreground pt-1">
                        <p>
                          <strong className="text-foreground">Course:</strong> {assignmentMetadata.courseName || "Not set"}
                        </p>
                        <p>
                          <strong className="text-foreground">Instructor:</strong> {assignmentMetadata.instructorName || "Not set"}
                        </p>
                        {assignmentMetadata.assignmentType === "individual" ? (
                          <p>
                            <strong className="text-foreground">Candidate:</strong> {assignmentMetadata.studentName} ({assignmentMetadata.studentId})
                          </p>
                        ) : (
                          <p>
                            <strong className="text-foreground">Group:</strong> {assignmentMetadata.groupMembers.filter((m) => m.fullName.trim()).length} Members
                          </p>
                        )}
                        {assignmentMetadata.logoDataUrl && (
                          <p className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                            <Check className="h-3 w-3" /> University emblem attached
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-surface-2/60 border border-border space-y-2">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-primary" />
                        Selected Deck Theme: {selectedTemplate.name}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Category: {selectedTemplate.category} • Kind: {selectedTemplate.kind}
                      </p>
                      <div className="flex items-center gap-2 pt-2">
                        <span
                          className="h-4 w-4 rounded-full border"
                          style={{ backgroundColor: selectedTemplate.colors.primary }}
                        />
                        <span
                          className="h-4 w-4 rounded-full border"
                          style={{ backgroundColor: selectedTemplate.colors.accent }}
                        />
                        <span
                          className="h-4 w-4 rounded-full border"
                          style={{ backgroundColor: selectedTemplate.colors.bg }}
                        />
                        <span className="text-[11px] font-mono text-muted-foreground ml-1">
                          Typography: {selectedFont}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Right Column: Outline & Content Breakdown */}
                  <div className="p-4 rounded-2xl bg-surface-2/60 border border-border space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-foreground flex items-center gap-1.5 mb-2">
                        <BookIcon className="h-4 w-4 text-primary" />
                        Slide Deck Architecture ({previewDeck.length} slides)
                      </span>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {previewDeck.map((sl, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-[11px]"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-mono text-muted-foreground">0{idx + 1}</span>
                              <span className="font-medium text-foreground truncate">
                                {sl.title}
                              </span>
                            </div>
                            <span className="px-1.5 py-0.2 rounded font-mono text-[9px] uppercase bg-surface-2 text-muted-foreground shrink-0">
                              {sl.layout}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/80 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                      <span>Total Words: {contentForReview.split(/\s+/).filter(Boolean).length}</span>
                      <span>Target: {slideCount} slides</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Bottom Action Bar: Back & Generate Presentation */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-paper flex flex-col sm:flex-row items-center justify-between gap-4">
            <Button
              variant="glass"
              onClick={() => setCurrentStep("content")}
              className="w-full sm:w-auto min-h-[48px] px-6 text-xs font-semibold"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Content
            </Button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                data-tour="tour-generate"
                variant="hero"
                disabled={generating}
                onClick={handleStartGeneration}
                className="w-full sm:w-auto min-h-[48px] px-8 text-xs font-bold shadow-md flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" /> Generate Presentation & Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* STEP C — GENERATION PROGRESS STATE                                */}
      {/* ================================================================= */}
      {currentStep === "generating" && (
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-12 shadow-paper text-center max-w-xl mx-auto space-y-6 animate-in fade-in duration-300">
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>

          <div>
            <h3 className="font-serif text-2xl font-bold text-foreground">
              Generating Your Presentation
            </h3>
            <p className="mt-2 text-sm text-primary font-medium font-mono animate-pulse">
              {generationPhase}
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-surface-2/40 p-4 text-left text-xs space-y-2 text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Theme: {selectedTemplate.name} ({selectedTemplate.category})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Typography: {selectedFont} ({selectedFontSize})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Length: {slideCount} vector PowerPoint slides</span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="glass"
              size="sm"
              onClick={handleCancelGeneration}
              className="min-h-[44px] text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel Generation
            </Button>
          </div>
        </div>
      )}

      {/* Theme Slide Preview Modal */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={(o) => !o && setPreviewTemplate(null)}>
          <DialogContent className="max-w-3xl p-6 sm:p-8">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase font-bold text-primary">
                  Theme Slide Inspector • {previewTemplate.category}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  100% Free Theme
                </span>
              </div>
              <DialogTitle className="font-serif text-2xl font-bold mt-1">
                {previewTemplate.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {previewTemplate.description}
              </DialogDescription>
            </DialogHeader>

            {/* Slide Preview Viewer */}
            <div className="mt-4 space-y-4">
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-border shadow-inner">
                <ThemeThumb template={previewTemplate} kind={previewTemplate.kind} slide={previewSlideIdx} />
              </div>

              {/* Slide Type Switcher Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([0, 1, 2, 3] as SlideType[]).map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPreviewSlideIdx(idx)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      previewSlideIdx === idx
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {SLIDE_LABELS[idx]}
                  </button>
                ))}
              </div>

              {/* Theme Metadata & Color Swatches */}
              <div className="rounded-xl border border-border/80 bg-surface-2/40 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">
                    Typography Pairing
                  </span>
                  <p className="font-semibold text-foreground">{previewTemplate.fonts}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">
                    Best For
                  </span>
                  <p className="font-semibold text-foreground">{previewTemplate.bestFor}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">
                    Palette
                  </span>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span
                      className="h-4 w-4 rounded-full border border-black/20"
                      style={{ backgroundColor: previewTemplate.colors.primary }}
                      title="Primary Color"
                    />
                    <span
                      className="h-4 w-4 rounded-full border border-black/20"
                      style={{ backgroundColor: previewTemplate.colors.accent }}
                      title="Accent Color"
                    />
                    <span
                      className="h-4 w-4 rounded-full border border-black/20"
                      style={{ backgroundColor: previewTemplate.colors.bg }}
                      title="Background Color"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button variant="glass" size="sm" onClick={() => setPreviewTemplate(null)}>
                Close Preview
              </Button>
              <Button
                variant="hero"
                size="sm"
                onClick={() => {
                  handleSelectTheme(previewTemplate);
                  setPreviewTemplate(null);
                }}
              >
                Apply This Theme
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ADMIN GEMINI & MULTI-PROVIDER KEY MODAL */}
      <Dialog open={showAdminKeyModal} onOpenChange={setShowAdminKeyModal}>
        <DialogContent className="max-w-lg p-6 bg-card border-border rounded-2xl shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Key className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Admin AI Engine & Key Configuration
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Enter, test, or update AI credentials whenever needed. (Admin & Super Admin privileges are identical)
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 space-y-4 text-xs">
            {/* Multi-Engine Provider Selection (Don't strict system to only Gemini!) */}
            <div className="space-y-2">
              <label className="font-mono text-[11px] text-muted-foreground uppercase font-bold block">
                Select Active Synthesis Engine
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: "gemini",
                    name: "Google Gemini",
                    tag: "3.8 Flash (Free Tier)",
                    icon: Cpu,
                  },
                  {
                    id: "openai",
                    name: "OpenAI (Paid)",
                    tag: "Requires Billing",
                    icon: Bot,
                  },
                  {
                    id: "offline",
                    name: "Native Offline",
                    tag: "Zero-API Engine",
                    icon: ShieldCheck,
                  },
                ].map((p) => {
                  const Icon = p.icon;
                  const isSelected = selectedProvider === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProvider(p.id as any)}
                      className={`rounded-xl border p-2.5 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 text-primary font-bold shadow-xs"
                          : "border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                        {isSelected && <Check className="h-3 w-3 text-primary" />}
                      </div>
                      <p className="text-xs font-semibold text-foreground leading-tight">{p.name}</p>
                      <span className="text-[10px] opacity-75 font-mono">{p.tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Provider-specific Key Inputs */}
            {selectedProvider === "gemini" && (
              <div className="space-y-2 rounded-xl border border-border bg-surface-2/40 p-3.5">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[11px] text-muted-foreground uppercase font-bold">
                    Google Gemini API Key
                  </label>
                  <a
                    href="https://aistudio.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-primary hover:underline"
                  >
                    Get Free Key ↗
                  </a>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showAdminPassword ? "text" : "password"}
                      value={adminGeminiKeyInput}
                      onChange={(e) => setAdminGeminiKeyInput(e.target.value)}
                      placeholder={hasServerKey ? "Configured securely on server — enter new key to rotate" : "AIza... (Stored server-side only)"}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-hidden pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      title="Toggle new input visibility (stored keys are never revealed)"
                    >
                      {showAdminPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestAdminGemini}
                    disabled={testingAdminKey}
                    className="text-xs h-9"
                  >
                    {testingAdminKey ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Test Key"
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Powers Gemini 3.8 Flash structured presentation synthesis & free-tier vector diagrams (Imagen 3 remains disabled unless paid billing is approved).
                </p>
              </div>
            )}

            {selectedProvider === "openai" && (
              <div className="space-y-2 rounded-xl border border-border bg-surface-2/40 p-3.5">
                <label className="font-mono text-[11px] text-muted-foreground uppercase font-bold block">
                  OpenAI API Key
                </label>
                <div className="relative">
                  <input
                    type={showAdminPassword ? "text" : "password"}
                    value={adminOpenAiKeyInput}
                    onChange={(e) => setAdminOpenAiKeyInput(e.target.value)}
                    placeholder="sk-proj-... (Paste OpenAI Key)"
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Uses OpenAI GPT-4o-mini structured JSON outputs for slide generation.
                </p>
              </div>
            )}

            {selectedProvider === "offline" && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-1 text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>100% Native Offline Engine Active</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Zero external API requests. Runs DocuMind's high-fidelity deterministic semantic parser and vector graphics synthesizer. Completely free and private.
                </p>
              </div>
            )}

            {testAdminKeyResult && (
              <div
                className={`rounded-xl border p-3 text-xs font-mono flex items-start gap-2.5 ${
                  testAdminKeyResult.success
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    : "bg-destructive/10 border-destructive/30 text-destructive"
                }`}
              >
                {testAdminKeyResult.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{testAdminKeyResult.message}</p>
                  {testAdminKeyResult.latencyMs > 0 && (
                    <p className="text-[10px] opacity-75">Response latency: {testAdminKeyResult.latencyMs}ms</p>
                  )}
                </div>
              </div>
            )}

            {/* Zero-Restriction Guarantee notice */}
            <div className="rounded-xl border border-border bg-card p-3 text-[11px] text-muted-foreground space-y-1">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Multi-Engine Flexibility
              </span>
              <p className="leading-relaxed">
                DocuMind is not restricted to Gemini. If an external API is unavailable, the platform automatically engages the high-fidelity offline vector synthesizer and semantic parser with zero failure.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="glass"
              size="sm"
              onClick={() => setShowAdminKeyModal(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="hero"
              size="sm"
              disabled={savingAdminKey}
              onClick={handleSaveAdminKey}
              className="text-xs"
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              {savingAdminKey ? "Applying..." : "Save & Apply Globally"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Slide Outline & Content Traceability Inspection Dialog */}
      <Dialog open={outlineReviewOpen} onOpenChange={setOutlineReviewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-bold text-foreground">
              Proposed Slide Deck Structure &amp; Source Coverage
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review how your source content is mapped across each slide before generation. Every fact and topic is derived directly from your supplied text.
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const contentForReview = activeSourceText.trim();
            let deck: ReturnType<typeof buildSlideDeckContent> = [];
            try {
              deck = contentForReview
                ? buildSlideDeckContent(
                    title.trim() || detectTitleFromText(contentForReview) || "Presentation Preview",
                    contentForReview,
                    slideCount,
                    density,
                    userSelectedPurpose ? purpose : "",
                    assignmentMode ? { ...assignmentMetadata, isAssignment: true } : undefined,
                    {
                      visualPreference,
                      theme: selectedTemplate,
                      autoSlideCount: !userLockedSlideCount,
                    },
                  )
                : [];
            } catch {
              deck = [];
            }
            const cov = calculateSourceCoverage(contentForReview, deck);

            return (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-border text-xs">
                  <div>
                    <span className="font-bold text-foreground">
                      Source Coverage Metric:
                    </span>{" "}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {cov.coveragePercentage}% of detected topics covered
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {cov.coveredSections} of {cov.totalSections} sections mapped • Zero filler text injected
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-primary text-primary-foreground">
                    {deck.length} Slides Total
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {deck.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-border bg-card space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded bg-primary/10 text-primary font-mono text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <h4 className="font-bold text-xs text-foreground">{s.title}</h4>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-surface-2 text-muted-foreground">
                          {s.layout}
                        </span>
                      </div>

                      {s.subtitle && (
                        <p className="text-[11px] text-muted-foreground italic pl-7">
                          {s.subtitle}
                        </p>
                      )}

                      {s.bullets && s.bullets.length > 0 && (
                        <ul className="pl-11 list-disc text-xs text-foreground/80 space-y-0.5">
                          {s.bullets.map((b, bIdx) => (
                            <li key={bIdx}>{b}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOutlineReviewOpen(false)}
                    className="text-xs"
                  >
                    Close Outline
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      setOutlineReviewOpen(false);
                      handleStartGeneration();
                    }}
                    className="text-xs gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Confirm &amp; Generate Deck
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
