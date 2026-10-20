import { useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
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
} from "lucide-react";
import { toast } from "sonner";
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
} from "@/lib/api-client";
import { UpgradeModal } from "./UpgradeModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [title, setTitle] = useState("Strategic Operations & Knowledge Review");
  const [purpose, setPurpose] = useState(PURPOSES[0]!);
  const [density, setDensity] = useState<"concise" | "balanced" | "detailed">("balanced");
  const [inputMode, setInputMode] = useState<"paste" | "upload">("paste");
  const [pastedText, setPastedText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step B: Settings State
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem>(
    TEMPLATES.find((t) => t.isFree) || TEMPLATES[0]!,
  );
  const [selectedFont, setSelectedFont] = useState("Inter");
  const [selectedFontSize, setSelectedFontSize] = useState<
    "compact" | "standard" | "large" | "extra-large"
  >("standard");
  const [slideCount, setSlideCount] = useState(8);

  // Theme Search & Filter
  const [themeSearch, setThemeSearch] = useState("");
  const [themeCategory, setThemeCategory] = useState<TemplateCategory>("All");
  const [themeTierFilter, setThemeTierFilter] = useState<"all" | "free" | "pro">("all");
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);
  const [previewSlideIdx, setPreviewSlideIdx] = useState<SlideType>(0);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedProTheme, setSelectedProTheme] = useState<TemplateItem | null>(null);

  // Step C: Generation State
  const [generating, setGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

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
    // Auto populate title from file name
    const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    setTitle(cleanName);

    toast.success(`Loaded ${file.name}`, {
      description: `${(file.size / 1024 / 1024).toFixed(1)} MB ready for in-memory extraction.`,
    });
  };

  // Step A -> Step B Transition
  const handleProceedToSettings = async () => {
    if (inputMode === "paste" && !pastedText.trim()) {
      toast.error("Please supply your presentation content", {
        description: "Paste notes or outline into the editor, or click 'Load Sample Outline'.",
      });
      return;
    }
    if (inputMode === "upload" && !uploadedFile) {
      toast.error("Please select a file to upload", {
        description: "Drop a PDF, DOCX, or TXT file into the upload box.",
      });
      return;
    }

    // If uploading, extract text in memory now
    if (inputMode === "upload" && uploadedFile && !pastedText) {
      try {
        toast.info("Extracting document contents...", {
          description: "Processing locally in memory.",
        });
        const extraction = await extractDocumentText(uploadedFile);
        setPastedText(extraction.text);
      } catch (err) {
        console.warn("Extraction fallback:", err);
      }
    }

    setCurrentStep("settings");
  };

  // Step B Theme Selection
  const handleSelectTheme = (t: TemplateItem) => {
    if (!t.isFree) {
      setSelectedProTheme(t);
      setUpgradeModalOpen(true);
      return;
    }
    setSelectedTemplate(t);
    toast.success(`Theme Applied: ${t.name}`, {
      description: "Visual palette and font pairings configured.",
    });
  };

  // Step B -> Step C Generation
  const handleStartGeneration = async () => {
    if (generating) return; // Prevent duplicate clicks

    setGenerating(true);
    setCurrentStep("generating");
    abortControllerRef.current = new AbortController();

    try {
      setGenerationPhase("Extracting and analyzing semantic structure...");
      await new Promise((r) => setTimeout(r, 600));

      setGenerationPhase(
        `Applying ${selectedTemplate.name} theme and ${selectedFont} typography...`,
      );
      await new Promise((r) => setTimeout(r, 700));

      setGenerationPhase("Compiling vector PowerPoint file and initializing 10-minute preview...");

      const contentToUse = pastedText.trim() || sampleOutlineText;

      const session = await createPresentationSessionApi({
        title: title.trim() || "Untitled Presentation",
        content: contentToUse,
        purpose,
        density,
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
    if (themeTierFilter === "free" && !t.isFree) return false;
    if (themeTierFilter === "pro" && t.isFree) return false;
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

  return (
    <div className="w-full">
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
                  "Synthesizing slides and creating 10-minute temporary preview session"}
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
              disabled={generating || (!pastedText && !uploadedFile)}
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
      {/* STEP A — ADD CONTENT & TOPIC                                      */}
      {/* ================================================================= */}
      {currentStep === "content" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-paper space-y-6">
            {/* Topic Input */}
            <div data-tour="tour-topic" className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold block">
                Presentation Topic or Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Artificial Intelligence in Clinical Medicine"
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
                  onChange={(e) => setPurpose(e.target.value)}
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
                    onChange={(e) => setPastedText(e.target.value)}
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
                      onClick={() => setPastedText(sampleOutlineText)}
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
                      Never stored in MongoDB or persistent storage.
                    </span>
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

              {/* Theme Tier Tabs */}
              <div className="flex rounded-xl border border-border bg-surface-2 p-1">
                <button
                  type="button"
                  onClick={() => setThemeTierFilter("all")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    themeTierFilter === "all"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All (110)
                </button>
                <button
                  type="button"
                  onClick={() => setThemeTierFilter("free")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    themeTierFilter === "free"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Free (50)
                </button>
                <button
                  type="button"
                  onClick={() => setThemeTierFilter("pro")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    themeTierFilter === "pro"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Pro (60)
                </button>
              </div>
            </div>

            {/* Category Pills & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 max-h-24">
                {TEMPLATE_CATEGORIES.slice(0, 7).map((c) => (
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

              <div className="relative w-full sm:w-60 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={themeSearch}
                  onChange={(e) => setThemeSearch(e.target.value)}
                  placeholder="Filter themes..."
                  className="w-full rounded-xl border border-border bg-surface-2 py-1.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
                />
              </div>
            </div>

            {/* Theme Card Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[380px] overflow-y-auto p-1">
              {filteredTemplates.slice(0, 16).map((t) => {
                const isSelected = selectedTemplate.id === t.id;
                const isPro = !t.isFree;

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
                      <div className="relative aspect-16/10 w-full rounded-lg overflow-hidden border border-border/80">
                        <ThemeThumb kind={t.kind} slide={0} />
                        <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                          {isPro ? (
                            <span className="rounded-full bg-amber-500/90 px-1.5 py-0.2 font-mono text-[9px] font-bold text-black uppercase">
                              Pro
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-600/90 px-1.5 py-0.2 font-mono text-[9px] font-bold text-white uppercase">
                              Free
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-foreground truncate">{t.name}</p>
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{t.category}</p>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{t.slidesCount} slides</span>
                      <div className="flex items-center gap-1">
                        <span
                          className="h-2 w-2 rounded-full border border-black/10"
                          style={{ backgroundColor: t.colors.primary }}
                        />
                        <span
                          className="h-2 w-2 rounded-full border border-black/10"
                          style={{ backgroundColor: t.colors.accent }}
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

          {/* Section B.3: Slide Count & Free vs Pro Limit */}
          <div
            data-tour="tour-slides"
            className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-paper space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                  Slide Count
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-foreground mt-0.5">
                  Target Length: {slideCount} Slides
                </h3>
                <p className="text-xs text-muted-foreground">
                  Free tier supports up to 20 slides per generated deck.
                </p>
              </div>

              {/* Slide Count Buttons */}
              <div className="flex flex-wrap gap-2">
                {[5, 8, 10, 12, 15, 20].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setSlideCount(count)}
                    className={`rounded-xl border px-4 py-2 text-xs font-bold transition-all min-h-[44px] ${
                      slideCount === count
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {count} Slides
                  </button>
                ))}
              </div>
            </div>
          </div>

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

      {/* Upgrade Modal for Pro Themes */}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        proThemeName={selectedProTheme?.name}
        onSelectFreeAlternative={() => {
          setUpgradeModalOpen(false);
          const freeAlt = TEMPLATES.find((t) => t.isFree) || TEMPLATES[0]!;
          setSelectedTemplate(freeAlt);
          toast.info(`Switched to Free Theme: ${freeAlt.name}`);
        }}
      />
    </div>
  );
}
