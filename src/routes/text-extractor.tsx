import { useState, useRef, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ScanText,
  Upload,
  Copy,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
  Search,
  Check,
  ImageIcon,
  Sparkles,
  RotateCcw,
  Edit3,
  Eye,
  Columns2,
  Undo2,
  Eraser,
  AlignLeft,
  ArrowRight,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { extractDocumentText } from "@/lib/api-client";
import { cleanOcrArtifacts, mergeSentenceWraps } from "@/lib/ocr-cleaner";

export const Route = createFileRoute("/text-extractor")({
  head: () => ({
    meta: [
      { title: "Text Extractor & Screenshot OCR — PDF, DOCX, TXT & Images | DocuMind" },
      {
        name: "description",
        content:
          "Extract clean, readable text from documents and image screenshots with high-accuracy OCR. Review and edit extracted text on the website before downloading.",
      },
    ],
  }),
  component: TextExtractorPage,
});

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_EXTS = ["pdf", "docx", "doc", "txt", "png", "jpg", "jpeg", "webp", "bmp", "tiff"];

interface ExtractedTextState {
  text: string;
  originalText: string;
  rawOcrText?: string;
  wordCount: number;
  lineCount: number;
  charCount: number;
  filename: string;
  format: string;
}

function TextExtractorPage() {
  const [collapsed, setCollapsed] = useState(false);

  // File & extraction state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedTextState | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "preview" | "compare">("editor");
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const extractedSectionRef = useRef<HTMLDivElement>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleSelectFile = async (file: File) => {
    setWarningMessage(null);
    setExtractedData(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTS.includes(ext)) {
      toast.error("Unsupported format. Please upload PDF, DOCX, TXT, or images (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > MAX_BYTES) {
      toast.error("File exceeds 50 MB maximum size limit.");
      return;
    }

    setSelectedFile(file);

    const isImageFile = ["png", "jpg", "jpeg", "webp", "bmp", "tiff"].includes(ext);
    if (isImageFile) {
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    }

    // Run extraction & OCR immediately
    await executeExtraction(file, isImageFile, ext);
  };

  const executeExtraction = async (file: File, isImageFile: boolean, ext: string) => {
    setExtracting(true);
    setWarningMessage(null);

    try {
      const result = await extractDocumentText(file);
      const rawText = result.text || "";
      // If image OCR, clean stray symbols and icon artifacts automatically
      const cleaned = isImageFile ? cleanOcrArtifacts(rawText) : rawText;
      const text = cleaned || rawText;

      const wordCount = text.split(/\s+/).filter(Boolean).length;
      const lineCount = text ? text.split("\n").length : 0;
      const charCount = text.length;

      if (!text || text.trim().length === 0) {
        setWarningMessage(
          result.warning ||
            "No readable text could be recognized in this file. Please verify that the image or document contains clear, readable text.",
        );
        return;
      }

      setExtractedData({
        text,
        originalText: text,
        rawOcrText: rawText,
        wordCount,
        lineCount,
        charCount,
        filename: file.name,
        format: isImageFile ? "IMAGE OCR" : result.format || ext.toUpperCase(),
      });

      // Default to compare tab if it's an image, or editor for documents
      if (isImageFile) {
        setActiveTab("compare");
      } else {
        setActiveTab("editor");
      }

      toast.success(isImageFile ? "High-Accuracy OCR Complete!" : "Text Extracted!", {
        description: `Successfully extracted ${wordCount} words verbatim with OCR noise cleaned.`,
      });

      // Automatically scroll smoothly to the extracted text viewer
      setTimeout(() => {
        extractedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    } catch (err: unknown) {
      console.error("Extraction error:", err);
      const msg = err instanceof Error ? err.message : "Error extracting text from file.";
      toast.error("Extraction Failed", { description: msg });
      setWarningMessage(msg);
    } finally {
      setExtracting(false);
    }
  };

  const handleCleanOcrNoise = () => {
    if (!extractedData) return;
    const cleaned = cleanOcrArtifacts(extractedData.text);
    if (cleaned === extractedData.text) {
      toast.info("Text is already clean — no noise symbols detected!");
      return;
    }
    const diff = extractedData.text.length - cleaned.length;
    handleTextChange(cleaned);
    toast.success("Stripped OCR noise & unnecessary symbols!", {
      description: `Removed approximately ${diff} artifact characters and lines.`,
    });
  };

  const handleMergeParagraphs = () => {
    if (!extractedData) return;
    const merged = mergeSentenceWraps(extractedData.text);
    if (merged === extractedData.text) {
      toast.info("Paragraph lines are already formatted!");
      return;
    }
    handleTextChange(merged);
    toast.success("Merged wrapped lines into smooth paragraphs!");
  };

  const handleTextChange = (newText: string) => {
    if (!extractedData) return;
    const wordCount = newText.split(/\s+/).filter(Boolean).length;
    const lineCount = newText ? newText.split("\n").length : 0;
    const charCount = newText.length;

    setExtractedData({
      ...extractedData,
      text: newText,
      wordCount,
      lineCount,
      charCount,
    });
  };

  const handleRevert = () => {
    if (!extractedData) return;
    const revertTarget = extractedData.originalText;
    const wordCount = revertTarget.split(/\s+/).filter(Boolean).length;
    const lineCount = revertTarget ? revertTarget.split("\n").length : 0;
    const charCount = revertTarget.length;

    setExtractedData({
      ...extractedData,
      text: revertTarget,
      wordCount,
      lineCount,
      charCount,
    });
    toast.info("Reverted text back to initial extracted version.");
  };

  const handleReset = () => {
    setSelectedFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    setExtractedData(null);
    setWarningMessage(null);
    setSearchTerm("");
    setActiveTab("editor");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCopy = () => {
    if (!extractedData) return;
    navigator.clipboard.writeText(extractedData.text);
    setCopied(true);
    toast.success("Copied to clipboard!", {
      description: `${extractedData.wordCount} words copied with all your current edits.`,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!extractedData) return;
    const blob = new Blob([extractedData.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${extractedData.filename.replace(/\.[^/.]+$/, "")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded verified text file (.txt)!");
  };

  const handleDownloadDocx = async () => {
    if (!extractedData) return;
    setExportingFormat("DOCX");
    try {
      const { convertDocument } = await import("@/lib/document-converter");
      const base = extractedData.filename.replace(/\.[^/.]+$/, "");
      const fakeFile = new File([extractedData.text], `${base}.txt`, { type: "text/plain" });
      const res = await convertDocument(fakeFile, "DOCX");
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${base}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Exported Word document (.docx)!");
    } catch (e) {
      toast.error("Failed to export Word document");
    } finally {
      setExportingFormat(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!extractedData) return;
    setExportingFormat("PDF");
    try {
      const { convertDocument } = await import("@/lib/document-converter");
      const base = extractedData.filename.replace(/\.[^/.]+$/, "");
      const fakeFile = new File([extractedData.text], `${base}.txt`, { type: "text/plain" });
      const res = await convertDocument(fakeFile, "PDF");
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${base}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Exported Adobe PDF (.pdf)!");
    } catch (e) {
      toast.error("Failed to export PDF document");
    } finally {
      setExportingFormat(null);
    }
  };

  const isCurrentFileImage =
    selectedFile &&
    ["png", "jpg", "jpeg", "webp", "bmp", "tiff"].includes(
      selectedFile.name.split(".").pop()?.toLowerCase() || "",
    );

  const isEdited = extractedData ? extractedData.text !== extractedData.originalText : false;

  const filteredLines = extractedData
    ? searchTerm.trim()
      ? extractedData.text
          .split("\n")
          .filter((line) => line.toLowerCase().includes(searchTerm.toLowerCase()))
      : extractedData.text.split("\n")
    : [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />

      <div
        className={`flex-1 transition-all duration-300 ${
          collapsed ? "lg:pl-20" : "lg:pl-64"
        } flex flex-col justify-between pb-24 lg:pb-0`}
      >
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 w-full flex-1">
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                <ScanText className="h-3.5 w-3.5" />
                <span>Deterministic Text & Screenshot OCR Extraction</span>
              </div>
              <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Text Extractor & OCR
              </h1>
              <p className="mt-1 text-xs text-muted-foreground max-w-2xl leading-relaxed">
                Extract verbatim text from PDF, Word documents (.docx), plain text (.txt), and any
                picture or screenshot (PNG, JPG, WEBP). Review and edit what the system generates
                directly on the website before downloading.
              </p>
            </div>

            {selectedFile && (
              <Button
                variant="glass"
                size="sm"
                onClick={handleReset}
                className="text-xs self-start sm:self-auto gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Extract Another File
              </Button>
            )}
          </div>

          {/* Educational Callout */}
          <div className="mb-8 rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 p-4 text-xs text-foreground/80 flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-foreground">Screenshot OCR & In-Browser Review:</strong>
              <p className="leading-relaxed">
                Upload a document or snapshot of any text. DocuMind extracts the exact text verbatim,
                displays it directly on the website for you to inspect and edit any typos or
                mistakes, and lets you download the verified text file.
              </p>
            </div>
          </div>

          {/* Step 1: Upload Card */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-paper space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step 1: Upload Document, Picture, or Screenshot
                </label>
                {selectedFile && (
                  <span className="text-[11px] font-mono text-emerald-600 font-medium">
                    ✓ File Loaded
                  </span>
                )}
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-2/40 p-8 text-center transition-all hover:border-primary hover:bg-surface-2 cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp,.bmp,.tiff"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleSelectFile(f);
                  }}
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
                  {isCurrentFileImage ? (
                    <ImageIcon className="h-6 w-6" />
                  ) : (
                    <Upload className="h-6 w-6" />
                  )}
                </div>

                {selectedFile ? (
                  <div>
                    <span className="font-serif text-lg font-bold text-foreground">
                      {selectedFile.name}
                    </span>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Click to choose a
                      different file
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Click to upload or drag & drop document or screenshot
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Supports PDF, DOCX, TXT, and Pictures/Screenshots (PNG, JPG, WEBP) · Max: 50 MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Image Preview Thumbnail if user uploaded screenshot / picture */}
            {imagePreviewUrl && (
              <div className="rounded-xl border border-border bg-surface-2/30 p-4 flex flex-col sm:flex-row items-center gap-4">
                <img
                  src={imagePreviewUrl}
                  alt="Uploaded Source Screenshot"
                  className="max-h-40 rounded-lg border border-border/80 object-contain shadow-xs bg-black/5"
                />
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="inline-flex items-center gap-1.5 font-semibold text-primary font-mono text-[11px] uppercase">
                    <Sparkles className="h-3 w-3" />
                    <span>Visual OCR Source Active</span>
                  </div>
                  <p className="font-medium text-foreground">
                    Analyzing screenshot typography and extracting text layer...
                  </p>
                  <p className="text-[11px]">
                    Preserving exact capitalization, line breaks, and punctuation from your picture.
                  </p>
                </div>
              </div>
            )}

            {extracting && (
              <div className="flex items-center justify-center gap-2.5 text-xs font-medium text-primary py-4 bg-primary/5 rounded-xl border border-primary/20 animate-pulse">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>
                  {isCurrentFileImage
                    ? "Analyzing image with high-precision OCR engine..."
                    : "Reading byte streams and reconstructing text lines..."}
                </span>
              </div>
            )}

            {warningMessage && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{warningMessage}</span>
              </div>
            )}

            {/* Action Bar for Step 1 when file is selected */}
            {selectedFile && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{selectedFile.name}</span>
                  <span className="ml-2 font-mono text-[11px] text-primary">
                    ({isCurrentFileImage ? "Picture / Screenshot" : (selectedFile.name.split(".").pop()?.toUpperCase() || "")} · {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>

                <Button
                  variant="hero"
                  size="lg"
                  disabled={extracting}
                  onClick={() => executeExtraction(selectedFile, Boolean(isCurrentFileImage), selectedFile.name.split(".").pop()?.toLowerCase() || "")}
                  className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-lg hover:shadow-primary/25 transition-all text-xs gap-2 cursor-pointer"
                >
                  {extracting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Extracting Clean Text...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                      <span>{extractedData ? "Re-Extract & Clean Text" : "Extract Text Now"}</span>
                      <ArrowRight className="h-4 w-4 ml-0.5 opacity-80" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Step 2: Extracted Text Review & Live In-Browser Editor (Before Download) */}
          {extractedData && (
            <div
              ref={extractedSectionRef}
              className="mt-8 rounded-2xl border-2 border-primary/30 bg-card p-6 sm:p-8 shadow-paper space-y-6 animate-in fade-in duration-300"
            >
              {/* Telemetry Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Step 2: Review & Edit Extracted Text on Website</span>
                    </span>
                    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-md text-[11px] font-semibold">
                      <Sparkles className="h-3 w-3" /> High-Accuracy OCR
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2.5">
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 className="font-serif text-xl font-bold text-foreground">
                      {extractedData.filename}
                    </h2>
                    <span className="rounded bg-surface-2 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-primary border border-primary/20">
                      {extractedData.format}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="bg-surface-2 border border-border px-3 py-1 rounded-lg text-foreground font-semibold">
                    {extractedData.wordCount.toLocaleString()} words
                  </span>
                  <span className="bg-surface-2 border border-border px-3 py-1 rounded-lg text-muted-foreground">
                    {extractedData.charCount.toLocaleString()} chars
                  </span>
                  <span className="bg-surface-2 border border-border px-3 py-1 rounded-lg text-muted-foreground">
                    {extractedData.lineCount.toLocaleString()} lines
                  </span>
                  {isEdited && (
                    <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1">
                      <Edit3 className="h-3 w-3" /> Edited
                    </span>
                  )}
                </div>
              </div>

              {/* View Switcher Tabs & Quick Smart Tools Toolbar */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Segmented Tab Controls */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-2/80 border border-border self-start shadow-inner">
                    <button
                      type="button"
                      onClick={() => setActiveTab("editor")}
                      className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        activeTab === "editor"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Live Editor</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("preview")}
                      className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        activeTab === "preview"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Formatted View</span>
                    </button>

                    {imagePreviewUrl && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("compare")}
                        className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          activeTab === "compare"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Columns2 className="h-3.5 w-3.5" />
                        <span>Side-by-Side Compare</span>
                        <span className="rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 text-[10px] font-mono">
                          Active
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Search in text */}
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search keywords in text..."
                      className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Quick Smart Tools Bar */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
                  <span className="text-[11px] font-mono uppercase text-muted-foreground font-semibold flex items-center gap-1 mr-1">
                    <Wand2 className="h-3.5 w-3.5 text-primary" /> Smart Tools:
                  </span>

                  <button
                    type="button"
                    onClick={handleCleanOcrNoise}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-all shadow-xs cursor-pointer active:scale-95"
                    title="Strip unnecessary OCR symbols, brackets, and icon debris"
                  >
                    <Eraser className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Strip OCR Noise & Symbols</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleMergeParagraphs}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 transition-all shadow-xs cursor-pointer active:scale-95"
                    title="Join wrapped lines into smooth, readable paragraphs"
                  >
                    <AlignLeft className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Merge Paragraph Lines</span>
                  </button>

                  {isEdited && (
                    <button
                      type="button"
                      onClick={handleRevert}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground border border-border transition-all cursor-pointer active:scale-95 ml-auto"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      <span>Revert Changes</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tab 1: Live Interactive Text Editor */}
              {activeTab === "editor" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Edit text directly below to fix typos, refine wording, or add notes:
                    </span>
                    {isEdited && (
                      <button
                        type="button"
                        onClick={handleRevert}
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        <Undo2 className="h-3 w-3" /> Revert to Original OCR
                      </button>
                    )}
                  </div>

                  <textarea
                    value={extractedData.text}
                    onChange={(e) => handleTextChange(e.target.value)}
                    rows={16}
                    spellCheck={true}
                    className="w-full rounded-xl border border-border bg-surface-2/30 p-4 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-hidden transition-all shadow-inner resize-y"
                    placeholder="Extracted text will appear here..."
                  />

                  {searchTerm.trim() && (
                    <div className="text-[11px] text-muted-foreground">
                      Found {filteredLines.length} lines matching &ldquo;{searchTerm}&rdquo;.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Formatted Typography View */}
              {activeTab === "preview" && (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Formatted document layout with paragraphs and headings:
                  </div>

                  <div className="max-h-[500px] overflow-y-auto rounded-xl border border-border bg-surface-2/30 p-6 space-y-4 font-sans text-xs leading-relaxed text-foreground select-text">
                    {filteredLines.length > 0 ? (
                      filteredLines.map((line, idx) => {
                        const trimmed = line.trim();
                        if (!trimmed) return <div key={idx} className="h-2" />;
                        const isHeading =
                          /^#+\s+/.test(trimmed) ||
                          (trimmed.length < 60 &&
                            !trimmed.endsWith(".") &&
                            !/^[-*•]/.test(trimmed) &&
                            /^[A-Z0-9]/.test(trimmed));
                        const isBullet = /^[-*•\d.]\s+/.test(trimmed);

                        if (isHeading) {
                          return (
                            <h3
                              key={idx}
                              className="font-serif font-bold text-sm text-foreground pt-2 border-b border-border/40 pb-1"
                            >
                              {trimmed.replace(/^#+\s*/, "")}
                            </h3>
                          );
                        }

                        if (isBullet) {
                          return (
                            <div key={idx} className="flex items-start gap-2 pl-2">
                              <span className="text-primary font-bold">•</span>
                              <span>{trimmed.replace(/^[-*•\d.]\s+/, "")}</span>
                            </div>
                          );
                        }

                        return <p key={idx}>{line}</p>;
                      })
                    ) : (
                      <span className="text-muted-foreground italic">No matching lines found.</span>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Side-by-Side Comparison (Source Image vs Extracted Text) */}
              {activeTab === "compare" && imagePreviewUrl && (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Compare your uploaded image on the left with the extracted editable text on the right:
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Source Image */}
                    <div className="flex flex-col rounded-xl border border-border bg-surface-2/40 p-4">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5 text-primary" /> Source Image / Screenshot
                      </span>
                      <div className="flex-1 flex items-center justify-center overflow-hidden rounded-lg bg-black/5 dark:bg-black/20 p-2 min-h-[300px]">
                        <img
                          src={imagePreviewUrl}
                          alt="Source Screenshot"
                          className="max-h-[420px] w-full object-contain rounded"
                        />
                      </div>
                    </div>

                    {/* Editable Extracted Text */}
                    <div className="flex flex-col rounded-xl border border-border bg-surface-2/40 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Edit3 className="h-3.5 w-3.5 text-primary" /> Extracted Text (Editable)
                        </span>
                        {isEdited && (
                          <button
                            type="button"
                            onClick={handleRevert}
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                          >
                            <Undo2 className="h-3 w-3" /> Revert
                          </button>
                        )}
                      </div>
                      <textarea
                        value={extractedData.text}
                        onChange={(e) => handleTextChange(e.target.value)}
                        rows={16}
                        spellCheck={true}
                        className="w-full flex-1 rounded-lg border border-border bg-background p-3.5 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden min-h-[350px] resize-y"
                        placeholder="Extracted text..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Export & Download Action Bar */}
              <div className="border-t border-border pt-6 mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-2/20 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-6 sm:p-8 rounded-b-2xl">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Step 3: Export & Download Verified Content
                  </span>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Exports retain all your verified text, line breaks, and live corrections made above.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={handleCopy}
                    className="text-xs gap-1.5 font-medium border-border hover:bg-surface-2 shadow-xs cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy Clean Text
                      </>
                    )}
                  </Button>

                  <Button
                    variant="hero"
                    size="sm"
                    onClick={handleDownloadTxt}
                    className="text-xs gap-1.5 px-4 font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-primary/25 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Text (.txt)
                  </Button>

                  <Button
                    variant="hero"
                    size="sm"
                    onClick={handleDownloadDocx}
                    disabled={exportingFormat === "DOCX"}
                    className="text-xs gap-1.5 px-4 font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md hover:shadow-indigo-500/25 cursor-pointer"
                  >
                    {exportingFormat === "DOCX" ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                    <span>Word (.docx)</span>
                  </Button>

                  <Button
                    variant="hero"
                    size="sm"
                    onClick={handleDownloadPdf}
                    disabled={exportingFormat === "PDF"}
                    className="text-xs gap-1.5 px-4 font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-md hover:shadow-violet-500/25 cursor-pointer"
                  >
                    {exportingFormat === "PDF" ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    <span>PDF (.pdf)</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
