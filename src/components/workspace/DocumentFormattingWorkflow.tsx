import { useState, useRef } from "react";
import {
  FileText,
  Upload,
  Type,
  AlignLeft,
  BookOpen,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Hash,
  ListOrdered,
  FileSpreadsheet,
  Printer,
  Copy,
  RefreshCw,
  Eye,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { extractDocumentText } from "@/lib/api-client";
import { addWorkspaceJob } from "@/lib/workspace-history";

export interface FormattingConfig {
  // Cover Page
  hasCoverPage: boolean;
  coverStyle: "academic" | "modern" | "corporate" | "minimal";
  docTitle: string;
  docSubtitle: string;
  authorName: string;
  institution: string;
  dateStr: string;

  // Typography
  fontFamily: "serif" | "sans" | "mono";
  baseFontSize: "10pt" | "11pt" | "12pt";
  lineSpacing: "1.0" | "1.15" | "1.5" | "2.0";
  paragraphSpacing: "compact" | "normal" | "relaxed";

  // Headings Hierarchy
  headingNumbering: "decimal" | "roman" | "none"; // 1.0, 1.1 or I., II. or none
  headingCase: "title" | "sentence" | "upper";
  headingDivider: boolean;

  // Margins
  margins: "normal" | "narrow" | "academic" | "wide"; // 1 in, 0.5 in, 1.25 in gutter, 1.5 in

  // Headers & Footers
  headerText: string;
  headerAlign: "left" | "right" | "split";
  headerRule: boolean;

  // Page Numbering
  pageNumberPosition: "bottom-center" | "bottom-right" | "top-right";
  pageNumberFormat: "page-x-of-y" | "number-only" | "roman-prelim";
  firstPageUnnumbered: boolean;

  // Table of Contents
  includeToc: boolean;
  tocLevels: 2 | 3;
  tocDotLeaders: boolean;
}

const sampleDocumentText = `The Role of Generative Computation in Modern Document Workflows
A Comprehensive Analysis of Semantic Parsing and Automated Formatting

1. Executive Summary
Modern enterprise operations generate billions of digital documents weekly, ranging from brief memoranda to comprehensive technical specifications. However, an estimated 68% of knowledge worker time spent in document production is consumed not by ideation or analytical synthesis, but rather by repetitive typographic adjustments, margin correction, and formatting reconciliation.

2. Background and Problem Statement
The proliferation of competing digital formats—principally Portable Document Format (PDF) and Office Open XML (DOCX)—has produced an acute divergence in workflow mechanics:
- DOCX provides dynamic reflowability and native structural hierarchy, yet exhibits formatting instability across differing renderer engines.
- PDF delivers precise visual reproduction across platforms, but fundamentally treats textual content as unanchored absolute coordinate glyphs, impeding programmatic reflow.

3. Methodological Framework
To bridge this divergence, DocuMind employs a dual-stage heuristic pipeline:
3.1 Semantic Boundary Identification
Input documents are scanned using AST tokenization to identify syntactic breaks, header candidates, and numbered bullet sequences.
3.2 Typographic Hierarchy Normalization
Heading levels are deterministically mapped to predefined typographic scales (H1 at 1.75x base, H2 at 1.4x base, H3 at 1.15x base) enforcing uniform vertical rhythm.

4. Results and Operational Efficiency
Implementation benchmarks across 12,000 academic and enterprise documents indicate an 84% reduction in manual formatting time when automated styling rules are applied upfront.

5. Recommendations and Conclusion
Organizations should mandate standardized typographic blueprints for all external technical submissions to ensure cross-platform accessibility and archival longevity.`;

export interface DocSection {
  level: 1 | 2 | 3;
  numberStr: string;
  title: string;
  paragraphs: string[];
}

export function parseDocumentSections(
  text: string,
  headingNumbering: "decimal" | "roman" | "none",
): DocSection[] {
  if (!text || !text.trim()) {
    return [
      {
        level: 1,
        numberStr:
          headingNumbering === "decimal" ? "1.0 " : headingNumbering === "roman" ? "I. " : "",
        title: "Overview",
        paragraphs: ["Paste or upload your source text to preview formatted document sections."],
      },
    ];
  }

  const lines = text.split("\n").map((l) => l.trim());
  const sections: DocSection[] = [];
  let currentSec: DocSection | null = null;
  let sectionCounter = 0;
  let subSectionCounter = 0;

  const isHeader = (line: string): { isHeader: boolean; level: 1 | 2 | 3; cleanTitle: string } => {
    if (!line || line.length > 90) return { isHeader: false, level: 1, cleanTitle: "" };
    if (line.startsWith("###")) {
      return { isHeader: true, level: 3, cleanTitle: line.replace(/^###\s*/, "") };
    }
    if (line.startsWith("##")) {
      return { isHeader: true, level: 2, cleanTitle: line.replace(/^##\s*/, "") };
    }
    if (line.startsWith("#")) {
      return { isHeader: true, level: 1, cleanTitle: line.replace(/^#\s*/, "") };
    }
    const numMatch = line.match(/^(\d+(?:\.\d+)?)\s*[:.]?\s+(.*)$/);
    if (numMatch && numMatch[2] && numMatch[2].length > 2 && !numMatch[2].endsWith(".")) {
      const hasDot = numMatch[1]?.includes(".");
      return { isHeader: true, level: hasDot ? 2 : 1, cleanTitle: numMatch[2] };
    }
    if (line.endsWith(":") && line.length < 60) {
      return { isHeader: true, level: 1, cleanTitle: line.replace(/:$/, "") };
    }
    return { isHeader: false, level: 1, cleanTitle: "" };
  };

  for (const line of lines) {
    if (!line) continue;
    const check = isHeader(line);
    if (check.isHeader) {
      if (currentSec) {
        sections.push(currentSec);
      }
      if (check.level === 1) {
        sectionCounter++;
        subSectionCounter = 0;
      } else {
        subSectionCounter++;
      }

      const numStr =
        headingNumbering === "decimal"
          ? check.level === 1
            ? `${sectionCounter}.0 `
            : `${sectionCounter}.${subSectionCounter} `
          : headingNumbering === "roman"
            ? check.level === 1
              ? `${["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][sectionCounter - 1] || sectionCounter}. `
              : `${String.fromCharCode(64 + subSectionCounter)}. `
            : "";

      currentSec = {
        level: check.level,
        numberStr: numStr,
        title: check.cleanTitle,
        paragraphs: [],
      };
    } else {
      if (!currentSec) {
        sectionCounter = 1;
        const numStr =
          headingNumbering === "decimal" ? "1.0 " : headingNumbering === "roman" ? "I. " : "";
        currentSec = {
          level: 1,
          numberStr: numStr,
          title: "Introduction & Context",
          paragraphs: [],
        };
      }
      currentSec.paragraphs.push(line);
    }
  }

  if (currentSec) {
    sections.push(currentSec);
  }

  return sections;
}

export function DocumentFormattingWorkflow({
  onSwitchToPresentation,
}: {
  onSwitchToPresentation?: () => void;
}) {
  // Step navigation: 1: Source Content, 2: Style & Layout Rules, 3: Preview & Download
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Content state
  const [inputMode, setInputMode] = useState<"paste" | "upload">("paste");
  const [rawText, setRawText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuration state
  const [config, setConfig] = useState<FormattingConfig>({
    hasCoverPage: true,
    coverStyle: "academic",
    docTitle: "Document Title",
    docSubtitle: "Executive Analysis and Implementation Report",
    authorName: "Author / Researcher",
    institution: "Academic / Professional Department",
    dateStr: "October 2026",

    fontFamily: "serif",
    baseFontSize: "11pt",
    lineSpacing: "1.5",
    paragraphSpacing: "normal",

    headingNumbering: "decimal",
    headingCase: "title",
    headingDivider: true,

    margins: "academic",

    headerText: "DocuMind Research · Technical Report Series",
    headerAlign: "right",
    headerRule: true,

    pageNumberPosition: "bottom-center",
    pageNumberFormat: "page-x-of-y",
    firstPageUnnumbered: true,

    includeToc: true,
    tocLevels: 2,
    tocDotLeaders: true,
  });

  // Active preview tab in Step 3
  const [previewPage, setPreviewPage] = useState<"cover" | "toc" | "body">("body");
  const [paperMode, setPaperMode] = useState<"standard" | "dark">("standard");

  // File handling
  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    const ext = file.name.split(".").pop()?.toLowerCase();
    setDetectedFormat(ext?.toUpperCase() || "UNKNOWN");

    if (ext === "txt") {
      const text = await file.text();
      setRawText(text);
      deriveTitleFromContent(text);
      toast.success(`Loaded "${file.name}" successfully.`);
      return;
    }

    if (ext === "pdf" || ext === "docx") {
      setExtracting(true);
      try {
        const res = await extractDocumentText(file);
        if (res.text) {
          setRawText(res.text);
          deriveTitleFromContent(res.text);
          toast.success(`Extracted ${res.wordCount || "text"} words from "${file.name}".`);
        } else {
          toast.info("Document loaded. You can refine the text before formatting.");
        }
      } catch (err) {
        console.warn("Extraction fallback:", err);
        toast.error("Could not extract full text. You can paste the content directly.");
      } finally {
        setExtracting(false);
      }
    } else {
      toast.error("Unsupported file format. Please upload PDF, DOCX, or TXT.");
    }
  };

  const deriveTitleFromContent = (text: string) => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const firstLine = lines[0];
    const secondLine = lines[1];
    if (firstLine && firstLine.length < 120) {
      setConfig((prev) => ({
        ...prev,
        docTitle: firstLine,
        docSubtitle: secondLine && secondLine.length < 160 ? secondLine : prev.docSubtitle,
      }));
    }
  };

  // Export handlers
  const handleExportDocx = () => {
    // Generate styled HTML/text payload packaged as clean downloadable HTML-based doc / rich text
    const htmlContent = generateFormattedHtml(rawText, config);
    const blob = new Blob([htmlContent], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const docName = `${config.docTitle.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 32) || "formatted_document"}.doc`;
    const a = document.createElement("a");
    a.href = url;
    a.download = docName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addWorkspaceJob({
      name: docName,
      tool: "Document Studio",
      format: "DOCX",
      originalSize: `${rawText.split("\n\n").length} Sections`,
      resultSize: `${(blob.size / 1024).toFixed(1)} KB`,
    });

    toast.success("Document downloaded in editable Word-compatible format!");
  };

  const handlePrintPreview = () => {
    const htmlContent = generateFormattedHtml(rawText, config);
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups to print/save as PDF.");
      return;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();

    addWorkspaceJob({
      name: `${config.docTitle.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 32) || "formatted_document"}.pdf`,
      tool: "Document Studio",
      format: "PDF",
      originalSize: `${rawText.split("\n\n").length} Sections`,
      resultSize: "Print/PDF Export",
    });

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleCopyFormattedText = () => {
    navigator.clipboard.writeText(rawText);
    toast.success("Document text copied to clipboard!");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Workflow Header Banner */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Document Styling & Academic Typography</span>
          </div>
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Document Formatting Studio
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Format written documents with professional cover pages, precise heading hierarchies,
            standardized margins, running headers, and clean page numbers. Completely separate from
            PowerPoint slide decks.
          </p>
        </div>

        {onSwitchToPresentation && (
          <Button
            variant="glass"
            size="sm"
            onClick={onSwitchToPresentation}
            className="self-start md:self-auto gap-2 text-xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Switch to Presentation Maker
          </Button>
        )}
      </div>

      {/* Step Indicator Bar */}
      <div className="mb-8 grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { num: 1, label: "1. Source Document", desc: "Paste or upload DOCX/PDF/TXT" },
          { num: 2, label: "2. Style & Typography", desc: "Cover, margins, fonts, headers" },
          { num: 3, label: "3. Preview & Export", desc: "Inspect pages & download doc" },
        ].map((s) => {
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <button
              key={s.num}
              onClick={() => {
                // allow navigating to previous steps
                if (s.num <= step || (step === 1 && rawText.trim())) {
                  setStep(s.num as 1 | 2 | 3);
                }
              }}
              className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                isActive
                  ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20"
                  : isDone
                    ? "border-border bg-card hover:border-primary/40"
                    : "border-border/60 bg-surface-2/40 opacity-70 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                    isDone
                      ? "bg-emerald-600 text-white"
                      : isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.num}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    isActive ? "text-primary" : "text-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              <p className="mt-1 hidden sm:block text-[11px] text-muted-foreground">{s.desc}</p>
            </button>
          );
        })}
      </div>

      {/* IMPORTANT EDUCATIONAL BANNER: PDF Reconstruction Limits vs DOCX */}
      <div className="mb-8 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/20 p-4 sm:p-5 text-foreground">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 shrink-0 text-primary mt-0.5" />
          <div className="text-xs space-y-1.5 leading-relaxed">
            <p className="font-semibold text-foreground text-sm">
              Understanding Document Formats: Native DOCX vs. Static PDF
            </p>
            <p className="text-foreground/80">
              <strong className="text-foreground">Editable Word (DOCX) & Plain Text (TXT):</strong>{" "}
              Provide complete reflowable structural styling. You can freely change margins, fonts,
              heading hierarchies, running headers, and page numbering with 100% typographic
              fidelity.
            </p>
            <p className="text-foreground/80">
              <strong className="text-foreground">Adobe PDF Documents:</strong> PDFs are
              fixed-coordinate visual files. DocuMind extracts the textual semantic structure to
              apply standardized rules. For complex multi-column brochures or scanned graphics,
              verify page boundaries in the live preview before exporting.
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* STEP 1: SOURCE DOCUMENT INPUT */}
      {/* ============================================================== */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
            {/* Input Mode Selector */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
              <h2 className="font-serif text-lg font-bold text-foreground">
                Provide Document Content
              </h2>
              <div className="flex rounded-lg border border-border bg-surface-2 p-0.5">
                <button
                  type="button"
                  onClick={() => setInputMode("paste")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                    inputMode === "paste"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Type className="h-3.5 w-3.5" />
                  Paste Text Editor
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("upload")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                    inputMode === "upload"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload Document
                </button>
              </div>
            </div>

            {inputMode === "paste" ? (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">
                    Document Text (paste draft, thesis chapter, report, or essay)
                  </label>
                  <Button
                    variant="glass"
                    size="sm"
                    className="text-[11px] h-7"
                    onClick={() => {
                      setRawText(sampleDocumentText);
                      deriveTitleFromContent(sampleDocumentText);
                      toast.info("Loaded sample academic report.");
                    }}
                  >
                    Load Sample Report
                  </Button>
                </div>
                <textarea
                  rows={12}
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    deriveTitleFromContent(e.target.value);
                  }}
                  placeholder="Paste your unformatted report, manuscript, or research notes here..."
                  className="w-full rounded-xl border border-border bg-background p-4 text-sm font-sans leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{rawText.trim().split(/\s+/).filter(Boolean).length} words</span>
                  <span>Supports markdown headings (`#`, `##`) or standard numbered outlines</span>
                </div>
              </div>
            ) : (
              <div>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-2/50 p-8 text-center transition-colors hover:border-primary hover:bg-surface-2 cursor-pointer"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Upload className="h-6 w-6" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">
                    {uploadedFile ? uploadedFile.name : "Click to select or drag & drop document"}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Supported formats: PDF, DOCX, TXT · Maximum file size: 50 MB
                  </p>
                  {detectedFormat && (
                    <span className="mt-3 rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                      Detected: {detectedFormat}
                    </span>
                  )}
                </div>

                {extracting && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-primary">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Extracting document text and detecting heading structure...</span>
                  </div>
                )}

                {rawText && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-foreground mb-1.5">
                      Extracted Text Preview:
                    </p>
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-background p-3 text-xs font-mono text-foreground/80">
                      {rawText.slice(0, 500)}...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              variant="hero"
              size="lg"
              disabled={!rawText.trim() || extracting}
              onClick={() => setStep(2)}
              className="gap-2 px-6"
            >
              Continue to Styling & Typography <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 2: STYLING & TYPOGRAPHY CONFIGURATION */}
      {/* ============================================================== */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Column A: Cover Page & Metadata */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h2 className="font-serif text-base font-bold text-foreground">
                      Cover Page & Metadata
                    </h2>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.hasCoverPage}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, hasCoverPage: e.target.checked }))
                      }
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    Generate Cover Page
                  </label>
                </div>

                {config.hasCoverPage ? (
                  <div className="space-y-3.5">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Cover Page Style
                      </label>
                      <div className="mt-1.5 grid grid-cols-2 gap-2 text-xs">
                        {[
                          {
                            id: "academic",
                            label: "Academic Classic",
                            sub: "Institutional / Formal",
                          },
                          { id: "modern", label: "Modern Minimal", sub: "Clean Sans-Serif" },
                          { id: "corporate", label: "Corporate Formal", sub: "Executive Report" },
                          {
                            id: "minimal",
                            label: "Editorial Creative",
                            sub: "Distinctive Typography",
                          },
                        ].map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() =>
                              setConfig((prev) => ({
                                ...prev,
                                coverStyle: c.id as FormattingConfig["coverStyle"],
                              }))
                            }
                            className={`rounded-lg border p-2.5 text-left transition-all ${
                              config.coverStyle === c.id
                                ? "border-primary bg-primary/5 text-foreground font-semibold"
                                : "border-border bg-surface-2/40 text-muted-foreground hover:border-border/80"
                            }`}
                          >
                            <p className="text-xs">{c.label}</p>
                            <p className="text-[10px] text-muted-foreground">{c.sub}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-foreground">Document Title</label>
                      <input
                        type="text"
                        value={config.docTitle}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, docTitle: e.target.value }))
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-foreground">
                        Subtitle / Purpose
                      </label>
                      <input
                        type="text"
                        value={config.docSubtitle}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, docSubtitle: e.target.value }))
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-foreground">Author / By</label>
                        <input
                          type="text"
                          value={config.authorName}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, authorName: e.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-foreground">
                          Institution / Org
                        </label>
                        <input
                          type="text"
                          value={config.institution}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, institution: e.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-foreground">Date String</label>
                      <input
                        type="text"
                        value={config.dateStr}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, dateStr: e.target.value }))
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-4">
                    Cover page disabled. The document will begin directly with the first heading and
                    running header.
                  </p>
                )}
              </div>

              {/* Headings Hierarchy & Table of Contents */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
                <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
                  <ListOrdered className="h-4 w-4 text-primary" />
                  <h2 className="font-serif text-base font-bold text-foreground">
                    Headings Hierarchy & Table of Contents
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-foreground">
                      Section Numbering Style
                    </label>
                    <div className="mt-1.5 grid grid-cols-3 gap-2">
                      {[
                        { id: "decimal", label: "1.0, 1.1, 1.2", sub: "Scientific / IEEE" },
                        { id: "roman", label: "I., II., III.", sub: "Classic / Legal" },
                        { id: "none", label: "Unnumbered", sub: "Editorial / Essay" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              headingNumbering: item.id as FormattingConfig["headingNumbering"],
                            }))
                          }
                          className={`rounded-lg border p-2 text-center transition-all ${
                            config.headingNumbering === item.id
                              ? "border-primary bg-primary/5 text-foreground font-semibold"
                              : "border-border bg-surface-2/40 text-muted-foreground"
                          }`}
                        >
                          <p className="text-xs">{item.label}</p>
                          <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        Automatic Table of Contents
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Extracts headings into preliminary TOC with page references
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.includeToc}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, includeToc: e.target.checked }))
                      }
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                  </div>

                  {config.includeToc && (
                    <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface-2/30 p-3 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.tocDotLeaders}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, tocDotLeaders: e.target.checked }))
                          }
                          className="rounded border-border text-primary"
                        />
                        <span>Dot leaders (....... 1)</span>
                      </label>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-muted-foreground">Depth:</span>
                        <button
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, tocLevels: 2 }))}
                          className={`rounded px-2 py-0.5 font-mono text-[11px] ${
                            config.tocLevels === 2 ? "bg-primary text-white font-bold" : "bg-muted"
                          }`}
                        >
                          H1-H2
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, tocLevels: 3 }))}
                          className={`rounded px-2 py-0.5 font-mono text-[11px] ${
                            config.tocLevels === 3 ? "bg-primary text-white font-bold" : "bg-muted"
                          }`}
                        >
                          H1-H3
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Column B: Typography, Margins, Headers/Footers, Page Numbers */}
            <div className="space-y-6">
              {/* Typography & Spacing */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
                <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
                  <Type className="h-4 w-4 text-primary" />
                  <h2 className="font-serif text-base font-bold text-foreground">
                    Typography & Layout Rules
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-foreground">
                      Primary Font Family
                    </label>
                    <div className="mt-1.5 grid grid-cols-3 gap-2 text-xs">
                      {[
                        { id: "serif", label: "Academic Serif", font: "Newsreader / Georgia" },
                        { id: "sans", label: "Modern Sans", font: "Manrope / Helvetica" },
                        { id: "mono", label: "Technical Mono", font: "JetBrains Mono" },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              fontFamily: f.id as FormattingConfig["fontFamily"],
                            }))
                          }
                          className={`rounded-lg border p-2 text-left transition-all ${
                            config.fontFamily === f.id
                              ? "border-primary bg-primary/5 text-foreground font-semibold"
                              : "border-border bg-surface-2/40 text-muted-foreground"
                          }`}
                        >
                          <p className="text-xs">{f.label}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{f.font}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-foreground">Base Font Size</label>
                      <select
                        value={config.baseFontSize}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            baseFontSize: e.target.value as FormattingConfig["baseFontSize"],
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                      >
                        <option value="10pt">10 pt (Compact / Multi-column)</option>
                        <option value="11pt">11 pt (Standard Journal / Report)</option>
                        <option value="12pt">12 pt (Academic Manuscript / MLA)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-foreground">Line Spacing</label>
                      <select
                        value={config.lineSpacing}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            lineSpacing: e.target.value as FormattingConfig["lineSpacing"],
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                      >
                        <option value="1.0">1.0 (Single Spaced)</option>
                        <option value="1.15">1.15 (Contemporary Business)</option>
                        <option value="1.5">1.5 (Academic Standard)</option>
                        <option value="2.0">2.0 (Double Spaced / Review)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground">Page Margins</label>
                    <div className="mt-1.5 grid grid-cols-4 gap-2 text-center text-xs">
                      {[
                        { id: "normal", label: "Normal", dim: "1.0 in (2.54cm)" },
                        { id: "narrow", label: "Narrow", dim: "0.5 in" },
                        { id: "academic", label: "Academic", dim: "1.25 in gutter" },
                        { id: "wide", label: "Wide", dim: "1.5 in" },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              margins: m.id as FormattingConfig["margins"],
                            }))
                          }
                          className={`rounded-lg border p-2 transition-all ${
                            config.margins === m.id
                              ? "border-primary bg-primary/5 text-foreground font-semibold"
                              : "border-border bg-surface-2/40 text-muted-foreground"
                          }`}
                        >
                          <p className="text-xs">{m.label}</p>
                          <p className="text-[9px] text-muted-foreground">{m.dim}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Running Headers, Footers & Page Numbers */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
                <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
                  <Hash className="h-4 w-4 text-primary" />
                  <h2 className="font-serif text-base font-bold text-foreground">
                    Headers, Footers & Page Numbers
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-foreground">
                      Running Header Text
                    </label>
                    <input
                      type="text"
                      value={config.headerText}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, headerText: e.target.value }))
                      }
                      placeholder="e.g. DocuMind Technical Report Series"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-foreground">
                        Header Alignment
                      </label>
                      <select
                        value={config.headerAlign}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            headerAlign: e.target.value as FormattingConfig["headerAlign"],
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                      >
                        <option value="right">Right Aligned</option>
                        <option value="left">Left Aligned</option>
                        <option value="split">Split Title / Chapter</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-foreground">
                        Page Number Position
                      </label>
                      <select
                        value={config.pageNumberPosition}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            pageNumberPosition: e.target
                              .value as FormattingConfig["pageNumberPosition"],
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                      >
                        <option value="bottom-center">Bottom Center (Standard)</option>
                        <option value="bottom-right">Bottom Right</option>
                        <option value="top-right">Top Right (MLA)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border pt-3 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.firstPageUnnumbered}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            firstPageUnnumbered: e.target.checked,
                          }))
                        }
                        className="rounded border-border text-primary"
                      />
                      <span>First page / cover unnumbered</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.headerRule}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, headerRule: e.target.checked }))
                        }
                        className="rounded border-border text-primary"
                      />
                      <span>Subtle divider rule</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between border-t border-border pt-6">
            <Button variant="glass" onClick={() => setStep(1)} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Back to Content
            </Button>
            <Button variant="hero" size="lg" onClick={() => setStep(3)} className="gap-2 px-6">
              Generate Live Document Preview <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 3: PREVIEW & DOWNLOAD */}
      {/* ============================================================== */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Top Control Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-paper">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <FileCheck className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-serif text-sm font-bold text-foreground">
                  Formatted Document Stage
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Typography applied: {config.fontFamily.toUpperCase()} · {config.baseFontSize} ·{" "}
                  {config.lineSpacing}x spacing · {config.margins} margins
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="glass" size="sm" onClick={() => setStep(2)} className="text-xs">
                <Sliders className="h-3.5 w-3.5 mr-1" /> Adjust Styles
              </Button>
              <Button variant="glass" size="sm" onClick={handlePrintPreview} className="text-xs">
                <Printer className="h-3.5 w-3.5 mr-1" /> Print / Save PDF
              </Button>
              <Button
                variant="hero"
                size="sm"
                onClick={handleExportDocx}
                className="text-xs gap-1.5"
              >
                <Download className="h-3.5 w-3.5" /> Download Editable (.DOC)
              </Button>
            </div>
          </div>

          {/* Preview Viewport Switcher & Paper Mode */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex rounded-lg border border-border bg-surface-2 p-1 text-xs font-medium">
              {config.hasCoverPage && (
                <button
                  type="button"
                  onClick={() => setPreviewPage("cover")}
                  className={`rounded-md px-3 py-1 transition-all ${
                    previewPage === "cover"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Page 1: Cover Page
                </button>
              )}
              {config.includeToc && (
                <button
                  type="button"
                  onClick={() => setPreviewPage("toc")}
                  className={`rounded-md px-3 py-1 transition-all ${
                    previewPage === "toc"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Page 2: Table of Contents
                </button>
              )}
              <button
                type="button"
                onClick={() => setPreviewPage("body")}
                className={`rounded-md px-3 py-1 transition-all ${
                  previewPage === "body"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Page {config.hasCoverPage && config.includeToc ? "3" : "2"}: Body & Headings
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-border bg-surface-2 p-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setPaperMode("standard")}
                  className={`rounded-md px-2.5 py-1 transition-all ${
                    paperMode === "standard"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Print White Paper
                </button>
                <button
                  type="button"
                  onClick={() => setPaperMode("dark")}
                  className={`rounded-md px-2.5 py-1 transition-all ${
                    paperMode === "dark"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Dark Canvas
                </button>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground pl-2">
                <Eye className="h-3.5 w-3.5" />
                <span>A4 Page Preview</span>
              </div>
            </div>
          </div>

          {/* Realistic A4 Document Sheet Display */}
          <div className="flex justify-center py-4 bg-muted/40 dark:bg-zinc-950/80 rounded-2xl border border-border/80 p-4 sm:p-8">
            <div
              className={`w-full max-w-[760px] min-h-[960px] shadow-2xl rounded-sm border p-10 sm:p-14 flex flex-col justify-between transition-all ${
                paperMode === "dark"
                  ? "bg-zinc-900 border-zinc-700/60 text-zinc-100 shadow-black/50"
                  : "bg-white border-stone-200 text-stone-900 shadow-2xl"
              } ${
                config.fontFamily === "serif"
                  ? "font-serif"
                  : config.fontFamily === "mono"
                    ? "font-mono"
                    : "font-sans"
              }`}
              style={{
                lineHeight: config.lineSpacing,
              }}
            >
              {/* ================= COVER PAGE PREVIEW ================= */}
              {previewPage === "cover" && (
                <div className="flex-1 flex flex-col justify-between py-12 text-center sm:text-left">
                  <div
                    className={`space-y-2 border-b-2 pb-8 ${
                      paperMode === "dark" ? "border-zinc-700" : "border-stone-900"
                    }`}
                  >
                    <p
                      className={`text-xs uppercase tracking-widest font-sans font-semibold ${
                        paperMode === "dark" ? "text-zinc-400" : "text-stone-500"
                      }`}
                    >
                      {config.institution || "ACADEMIC PUBLICATION"}
                    </p>
                    <h1
                      className={`text-3xl sm:text-4xl font-bold tracking-tight leading-tight ${
                        paperMode === "dark" ? "text-zinc-50" : "text-stone-900"
                      }`}
                    >
                      {config.docTitle}
                    </h1>
                    {config.docSubtitle && (
                      <p
                        className={`text-base sm:text-lg font-normal italic mt-2 ${
                          paperMode === "dark" ? "text-zinc-300" : "text-stone-600"
                        }`}
                      >
                        {config.docSubtitle}
                      </p>
                    )}
                  </div>

                  <div className="my-16 space-y-4">
                    <div
                      className={`inline-block rounded border px-4 py-2 font-mono text-xs ${
                        paperMode === "dark"
                          ? "bg-zinc-800 text-zinc-300 border-zinc-700"
                          : "bg-stone-50 text-stone-700 border-stone-300"
                      }`}
                    >
                      Standardized Format Blueprint · {config.coverStyle.toUpperCase()} SPEC
                    </div>
                  </div>

                  <div
                    className={`border-t pt-6 text-xs space-y-1 font-sans ${
                      paperMode === "dark"
                        ? "border-zinc-700 text-zinc-300"
                        : "border-stone-300 text-stone-700"
                    }`}
                  >
                    <p>
                      <strong>Author:</strong> {config.authorName}
                    </p>
                    <p>
                      <strong>Institution:</strong> {config.institution}
                    </p>
                    <p>
                      <strong>Date of Submission:</strong> {config.dateStr}
                    </p>
                  </div>
                </div>
              )}

              {/* ================= TABLE OF CONTENTS PREVIEW ================= */}
              {previewPage === "toc" && (
                <div className="flex-1 flex flex-col">
                  {/* Running Header */}
                  <div
                    className={`flex items-center justify-between text-[11px] border-b pb-2 mb-8 font-sans ${
                      paperMode === "dark"
                        ? "border-zinc-800 text-zinc-400"
                        : "border-stone-200 text-stone-500"
                    }`}
                  >
                    <span>{config.headerText}</span>
                    <span>Preliminary Section</span>
                  </div>

                  <h2
                    className={`text-2xl font-bold mb-6 tracking-tight ${
                      paperMode === "dark" ? "text-zinc-50" : "text-stone-900"
                    }`}
                  >
                    Table of Contents
                  </h2>

                  <div className="space-y-3 text-sm">
                    {parseDocumentSections(rawText, config.headingNumbering)
                      .slice(0, 10)
                      .map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex items-baseline justify-between ${
                            item.level > 1
                              ? paperMode === "dark"
                                ? "pl-6 text-xs text-zinc-400"
                                : "pl-6 text-xs text-stone-600"
                              : "font-semibold"
                          }`}
                        >
                          <div className="flex items-baseline gap-2 max-w-[80%] truncate">
                            <span
                              className={`font-mono text-xs ${
                                paperMode === "dark" ? "text-zinc-500" : "text-stone-500"
                              }`}
                            >
                              {item.numberStr.trim() || `0${idx + 1}`}
                            </span>
                            <span
                              className={paperMode === "dark" ? "text-zinc-100" : "text-stone-800"}
                            >
                              {item.title}
                            </span>
                          </div>
                          {config.tocDotLeaders && (
                            <div
                              className={`flex-1 mx-3 border-b border-dotted ${
                                paperMode === "dark" ? "border-zinc-700" : "border-stone-400"
                              }`}
                            />
                          )}
                          <span
                            className={`font-mono text-xs ${
                              paperMode === "dark" ? "text-zinc-400" : "text-stone-600"
                            }`}
                          >
                            {3 + idx}
                          </span>
                        </div>
                      ))}
                  </div>

                  <div
                    className={`mt-auto pt-8 border-t text-center font-mono text-xs ${
                      paperMode === "dark"
                        ? "border-zinc-800 text-zinc-400"
                        : "border-stone-200 text-stone-500"
                    }`}
                  >
                    ii
                  </div>
                </div>
              )}

              {/* ================= BODY & HEADINGS PREVIEW ================= */}
              {previewPage === "body" && (
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    {/* Running Header */}
                    <div
                      className={`flex items-center justify-between text-[11px] mb-6 font-sans ${
                        config.headerRule
                          ? paperMode === "dark"
                            ? "border-b border-zinc-800 pb-2 text-zinc-400"
                            : "border-b border-stone-200 pb-2 text-stone-500"
                          : paperMode === "dark"
                            ? "text-zinc-400"
                            : "text-stone-500"
                      }`}
                    >
                      <span className="truncate max-w-[60%]">{config.headerText}</span>
                      <span className={paperMode === "dark" ? "text-zinc-500" : "text-stone-400"}>
                        Section 1
                      </span>
                    </div>

                    {/* Body content with heading hierarchy applied directly from user resource */}
                    <div className="space-y-5">
                      {parseDocumentSections(rawText, config.headingNumbering).map((sec, sIdx) => (
                        <div key={sIdx} className="space-y-2">
                          {sec.level === 1 && (
                            <h1
                              className={`text-2xl font-bold tracking-tight pb-2 ${
                                config.headingDivider
                                  ? paperMode === "dark"
                                    ? "border-b border-zinc-800"
                                    : "border-b border-stone-300"
                                  : ""
                              } ${paperMode === "dark" ? "text-zinc-50" : "text-stone-900"}`}
                            >
                              {sec.numberStr}
                              {sec.title}
                            </h1>
                          )}
                          {sec.level === 2 && (
                            <h2
                              className={`text-lg font-semibold tracking-tight pt-3 ${
                                paperMode === "dark" ? "text-zinc-100" : "text-stone-900"
                              }`}
                            >
                              {sec.numberStr}
                              {sec.title}
                            </h2>
                          )}
                          {sec.level === 3 && (
                            <h3
                              className={`text-sm font-semibold pt-2 italic ${
                                paperMode === "dark" ? "text-zinc-300" : "text-stone-800"
                              }`}
                            >
                              {sec.numberStr}
                              {sec.title}
                            </h3>
                          )}
                          {sec.paragraphs.map((p, pIdx) => (
                            <p
                              key={pIdx}
                              className={`text-sm leading-relaxed text-justify ${
                                paperMode === "dark" ? "text-zinc-200" : "text-stone-800"
                              }`}
                            >
                              {p}
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Page Footer */}
                  <div
                    className={`mt-10 pt-4 border-t font-mono text-xs ${
                      paperMode === "dark"
                        ? "border-zinc-800 text-zinc-400"
                        : "border-stone-200 text-stone-500"
                    } ${
                      config.pageNumberPosition === "bottom-center"
                        ? "text-center"
                        : config.pageNumberPosition === "bottom-right"
                          ? "text-right"
                          : "text-left"
                    }`}
                  >
                    {config.pageNumberFormat === "page-x-of-y" ? "Page 3 of 12" : "3"}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Export Action Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-paper flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-serif text-base font-bold text-foreground">
                Ready to download your formatted document?
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Export directly to editable Word (.doc) or invoke print-to-PDF with clean vector
                styling.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="glass" onClick={handleCopyFormattedText} className="gap-1.5 text-xs">
                <Copy className="h-3.5 w-3.5" /> Copy Text
              </Button>
              <Button variant="hero" onClick={handleExportDocx} className="gap-2 text-xs">
                <Download className="h-4 w-4" /> Download Editable Document
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Generates clean, standalone styled HTML document suitable for Word or Print-to-PDF
 */
function generateFormattedHtml(rawText: string, config: FormattingConfig): string {
  const fontCss =
    config.fontFamily === "serif"
      ? "'Newsreader', 'Georgia', serif"
      : config.fontFamily === "mono"
        ? "'JetBrains Mono', monospace"
        : "'Manrope', 'Helvetica Neue', sans-serif";

  const paragraphs = rawText
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  const bodyHtml = paragraphs
    .map((p) => {
      if (p.startsWith("# ") || /^[0-9]+\.\s+[A-Z]/.test(p)) {
        return `<h1 style="font-size: 1.5rem; margin-top: 1.8rem; margin-bottom: 0.6rem; border-bottom: 1px solid #ccc; padding-bottom: 0.3rem;">${escapeHtml(p.replace(/^#\s*/, ""))}</h1>`;
      }
      if (p.startsWith("## ") || /^[0-9]+\.[0-9]+\s+[A-Z]/.test(p)) {
        return `<h2 style="font-size: 1.2rem; margin-top: 1.4rem; margin-bottom: 0.4rem;">${escapeHtml(p.replace(/^##\s*/, ""))}</h2>`;
      }
      return `<p style="margin-bottom: 0.9rem; text-align: justify;">${escapeHtml(p)}</p>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(config.docTitle)}</title>
<style>
  @page {
    margin: 1in;
    @top-right { content: "${escapeHtml(config.headerText)}"; font-size: 9pt; }
    @bottom-center { content: counter(page); font-size: 9pt; }
  }
  body {
    font-family: ${fontCss};
    font-size: ${config.baseFontSize};
    line-height: ${config.lineSpacing};
    color: #1a1a1a;
    max-width: 7.5in;
    margin: 0 auto;
    padding: 2rem 1rem;
  }
  .cover {
    page-break-after: always;
    min-height: 80vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    text-align: left;
    border-bottom: 2px solid #333;
    padding-bottom: 3rem;
  }
  .title { font-size: 2.4rem; font-weight: bold; margin-bottom: 0.5rem; }
  .subtitle { font-size: 1.2rem; color: #555; font-style: italic; margin-bottom: 2rem; }
  .meta { font-size: 0.9rem; color: #444; }
  .toc { page-break-after: always; margin-top: 2rem; }
  .header-rule { border-bottom: 1px solid #eee; padding-bottom: 6px; margin-bottom: 24px; font-size: 9pt; color: #777; display: flex; justify-content: space-between; }
</style>
</head>
<body>
  ${
    config.hasCoverPage
      ? `<div class="cover">
    <div>
      <p style="text-transform: uppercase; letter-spacing: 2px; font-size: 10pt; color: #666;">${escapeHtml(config.institution)}</p>
      <h1 class="title">${escapeHtml(config.docTitle)}</h1>
      <p class="subtitle">${escapeHtml(config.docSubtitle)}</p>
    </div>
    <div class="meta">
      <p><strong>Author:</strong> ${escapeHtml(config.authorName)}</p>
      <p><strong>Date:</strong> ${escapeHtml(config.dateStr)}</p>
      <p><strong>Institution:</strong> ${escapeHtml(config.institution)}</p>
    </div>
  </div>`
      : ""
  }

  <div class="header-rule">
    <span>${escapeHtml(config.headerText)}</span>
    <span>DocuMind Standard Output</span>
  </div>

  <div class="body-content">
    ${bodyHtml}
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
