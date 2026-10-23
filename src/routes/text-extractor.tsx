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
} from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { extractDocumentText } from "@/lib/api-client";

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
      const text = result.text || "";
      const wordCount = result.wordCount || text.split(/\s+/).filter(Boolean).length;
      const lineCount = result.lineCount || (text ? text.split("\n").length : 0);
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

      toast.success(isImageFile ? "Screenshot OCR Complete!" : "Text Extracted!", {
        description: `Successfully extracted ${wordCount} words verbatim. You can review and edit below before downloading.`,
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
    const wordCount = extractedData.originalText.split(/\s+/).filter(Boolean).length;
    const lineCount = extractedData.originalText ? extractedData.originalText.split("\n").length : 0;
    const charCount = extractedData.originalText.length;

    setExtractedData({
      ...extractedData,
      text: extractedData.originalText,
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

  const handleDownload = () => {
    if (!extractedData) return;
    const blob = new Blob([extractedData.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${extractedData.filename.replace(/\.[^/.]+$/, "")}_extracted.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded text file!", {
      description: "File saved with your verified content and edits.",
    });
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
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Step 2: Review & Edit Extracted Text on Website (Before Download)</span>
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

              {/* View Switcher Tabs & In-Page Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-2/60 border border-border self-start">
                  <button
                    type="button"
                    onClick={() => setActiveTab("editor")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      activeTab === "editor"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Live Editor
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      activeTab === "preview"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" /> Formatted View
                  </button>

                  {imagePreviewUrl && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("compare")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        activeTab === "compare"
                          ? "bg-background text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Columns2 className="h-3.5 w-3.5" /> Side-by-Side Compare
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
                    Step 3: Export & Download Verified Text
                  </span>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    The downloaded file will include all of your live edits and corrections made above.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="glass"
                    size="lg"
                    onClick={handleCopy}
                    className="text-xs gap-1.5 font-medium"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-600" /> Copied to Clipboard
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copy Text
                      </>
                    )}
                  </Button>

                  <Button
                    variant="hero"
                    size="lg"
                    onClick={handleDownload}
                    className="text-xs gap-2 px-6 font-semibold shadow-md"
                  >
                    <Download className="h-4 w-4" /> Download Verified Text (.txt)
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
