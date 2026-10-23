import { useState, useRef, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRightLeft,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileType,
  Info,
  Copy,
  Check,
  FileText,
  RotateCcw,
  Eye,
  ExternalLink,
  BookOpen,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { convertDocument, type ConversionTarget } from "@/lib/document-converter";

export const Route = createFileRoute("/converter")({
  head: () => ({
    meta: [
      { title: "File Converter — PDF, DOCX, and TXT | DocuMind" },
      {
        name: "description",
        content:
          "Convert documents bidirectionally between PDF, DOCX, and TXT formats with 100% preservation of actual content, topics, and structure. Review converted content on the website before downloading.",
      },
    ],
  }),
  component: ConverterPage,
});

const ALLOWED_EXTS = ["pdf", "docx", "doc", "txt", "png", "jpg", "jpeg", "webp"];
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

function ConverterPage() {
  const [collapsed, setCollapsed] = useState(false);

  // Conversion State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileExt, setFileExt] = useState<string>("");
  const [targetFormat, setTargetFormat] = useState<ConversionTarget>("DOCX");
  const [converting, setConverting] = useState(false);
  const [convertedResult, setConvertedResult] = useState<{
    filename: string;
    targetFormat: string;
    blobUrl: string;
    sizeBytes: number;
    wordCount?: number;
    previewText?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"document" | "raw">("document");
  const [searchTerm, setSearchTerm] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const convertedResultRef = useRef<HTMLDivElement>(null);

  // Revoke blob URL on unmount or reset
  useEffect(() => {
    return () => {
      if (convertedResult?.blobUrl) {
        URL.revokeObjectURL(convertedResult.blobUrl);
      }
    };
  }, [convertedResult]);

  const handleSelectFile = (file: File) => {
    setErrorMessage(null);
    if (convertedResult?.blobUrl) {
      URL.revokeObjectURL(convertedResult.blobUrl);
    }
    setConvertedResult(null);

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTS.includes(ext)) {
      setErrorMessage("Unsupported file format. Please upload PDF, DOCX, TXT, or images.");
      toast.error("Unsupported file format");
      return;
    }

    if (file.size > MAX_BYTES) {
      setErrorMessage("File exceeds the 50 MB maximum size limit.");
      toast.error("File size limit exceeded");
      return;
    }

    setSelectedFile(file);
    const upperExt = ext === "doc" ? "DOCX" : ext.toUpperCase();
    setFileExt(upperExt);

    // Default target format:
    // If source is PDF -> default to DOCX
    // If source is DOCX -> default to PDF
    // If source is TXT or Image -> default to PDF
    if (upperExt === "PDF") {
      setTargetFormat("DOCX");
    } else if (upperExt === "DOCX") {
      setTargetFormat("PDF");
    } else {
      setTargetFormat("PDF");
    }
  };

  const handleReset = () => {
    if (convertedResult?.blobUrl) {
      URL.revokeObjectURL(convertedResult.blobUrl);
    }
    setSelectedFile(null);
    setConvertedResult(null);
    setErrorMessage(null);
    setSearchTerm("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleConvert = async () => {
    if (!selectedFile) return;

    setConverting(true);
    setErrorMessage(null);

    try {
      // Execute genuine conversion preserving 100% content and topics
      const result = await convertDocument(selectedFile, targetFormat);
      const blobUrl = URL.createObjectURL(result.blob);

      setConvertedResult({
        filename: result.filename,
        targetFormat: result.targetFormat,
        blobUrl,
        sizeBytes: result.sizeBytes,
        wordCount: result.wordCount,
        previewText: result.previewText,
      });

      toast.success("Conversion Complete!", {
        description: `Successfully converted "${selectedFile.name}" to ${targetFormat}. You can review the converted content below on the website before downloading.`,
      });

      // Smooth scroll to the converted content preview
      setTimeout(() => {
        convertedResultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    } catch (err: unknown) {
      console.error("Conversion error:", err);
      const msg = err instanceof Error ? err.message : "Conversion failed during document synthesis.";
      setErrorMessage(msg);
      toast.error("Conversion failed", { description: msg });
    } finally {
      setConverting(false);
    }
  };

  const handleCopy = () => {
    if (!convertedResult?.previewText) return;
    navigator.clipboard.writeText(convertedResult.previewText);
    setCopied(true);
    toast.success("Copied converted text to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!convertedResult) return;
    const a = document.createElement("a");
    a.href = convertedResult.blobUrl;
    a.download = convertedResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloaded ${convertedResult.filename}!`);
  };

  const availableTargets = (["DOCX", "PDF", "TXT"] as const).filter((f) => f !== fileExt);

  const filteredLines = convertedResult?.previewText
    ? searchTerm.trim()
      ? convertedResult.previewText
          .split("\n")
          .filter((line) => line.toLowerCase().includes(searchTerm.toLowerCase()))
      : convertedResult.previewText.split("\n")
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
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <span>Deterministic Document & Content Converter</span>
              </div>
              <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                File Converter
              </h1>
              <p className="mt-1 text-xs text-muted-foreground max-w-2xl leading-relaxed">
                Convert files reliably across PDF, DOCX, and TXT with complete preservation of your
                actual content, paragraphs, headings, and main topics. Preview converted documents
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
                <RotateCcw className="h-3.5 w-3.5" /> Convert Another Document
              </Button>
            )}
          </div>

          {/* Educational Banner */}
          <div className="mb-8 rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 p-4 text-xs text-foreground/80 flex items-start gap-3">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-foreground">Full Content Preservation Guarantee:</strong>
              <p className="leading-relaxed">
                DocuMind extracts the full typographic hierarchy, paragraphs, and lists from your
                uploaded document. When converting between PDF, Word (.docx), and plain text (.txt),
                all of your original content, topics, and ideas are preserved verbatim and displayed
                on the website for your verification before download.
              </p>
            </div>
          </div>

          {/* Main Converter Card */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-paper space-y-6">
            {/* Upload Zone */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                1. Select Document to Convert
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-2/40 p-8 text-center transition-all hover:border-primary hover:bg-surface-2 cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleSelectFile(f);
                  }}
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
                  <Upload className="h-6 w-6" />
                </div>

                {selectedFile ? (
                  <div>
                    <span className="font-serif text-lg font-bold text-foreground">
                      {selectedFile.name}
                    </span>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Detected Format:{" "}
                      <span className="font-bold text-primary">{fileExt}</span>
                    </p>
                    <span className="mt-2 inline-block text-[11px] text-primary underline">
                      Click to choose a different file
                    </span>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Click to upload or drag & drop file
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Supported formats: PDF, DOCX, TXT, and Image Scans · Maximum file size: 50 MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Target Format Selector */}
            {selectedFile && (
              <div className="space-y-2 border-t border-border pt-5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  2. Choose Target Output Format
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableTargets.map((target) => (
                    <button
                      key={target}
                      type="button"
                      onClick={() => setTargetFormat(target)}
                      className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                        targetFormat === target
                          ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/20 text-foreground"
                          : "border-border bg-surface-2/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileType className="h-4 w-4 text-primary" />
                        <span className="font-bold text-xs">{target}</span>
                      </div>
                      <span className="mt-1 text-[10px] text-muted-foreground">
                        {target === "DOCX"
                          ? "Genuine Office OpenXML (.docx)"
                          : target === "PDF"
                            ? "Standard Adobe PDF (.pdf)"
                            : "Clean Plain Text (.txt)"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error Display */}
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Button */}
            <div className="flex items-center justify-between border-t border-border pt-5">
              <span className="text-xs text-muted-foreground">
                {selectedFile
                  ? `Ready to convert ${fileExt} → ${targetFormat}`
                  : "Upload a document to begin"}
              </span>

              <Button
                variant="hero"
                size="lg"
                disabled={!selectedFile || converting}
                onClick={handleConvert}
                className="gap-2 px-8"
              >
                {converting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Converting Document...
                  </>
                ) : (
                  <>
                    Convert to {targetFormat} <ArrowRightLeft className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Step 2: Converted Document In-Browser Preview & Results Card (Before Download) */}
          {convertedResult && (
            <div
              ref={convertedResultRef}
              className="mt-8 rounded-2xl border-2 border-emerald-500/30 bg-card p-6 sm:p-8 shadow-paper space-y-6 animate-in fade-in duration-300"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-md">
                      <Eye className="h-3.5 w-3.5" />
                      <span>Review Converted Content on Website Before Download</span>
                    </div>
                    <h2 className="font-serif text-lg font-bold text-foreground mt-1">
                      {convertedResult.filename}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Format:{" "}
                      <span className="font-bold text-primary">{convertedResult.targetFormat}</span> ·{" "}
                      {(convertedResult.sizeBytes / 1024).toFixed(1)} KB{" "}
                      {convertedResult.wordCount ? `· ${convertedResult.wordCount} words preserved` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {convertedResult.previewText && (
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={handleCopy}
                      className="text-xs gap-1.5"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied Text
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy Text
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={handleDownload}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm text-xs"
                  >
                    <Download className="h-4 w-4" /> Download Converted {convertedResult.targetFormat}
                  </Button>
                </div>
              </div>

              {/* View Switcher Tabs & Search Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-2/60 border border-border self-start">
                  <button
                    type="button"
                    onClick={() => setViewMode("document")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      viewMode === "document"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {convertedResult.targetFormat === "PDF"
                      ? "In-Browser PDF Document"
                      : convertedResult.targetFormat === "DOCX"
                        ? "Word Editorial Layout"
                        : "Formatted View"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode("raw")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      viewMode === "raw"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" /> Plain Text Structure
                  </button>
                </div>

                {viewMode === "raw" && (
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search within converted text..."
                      className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
                    />
                  </div>
                )}
              </div>

              {/* View 1: Document View */}
              {viewMode === "document" && (
                <div className="space-y-2">
                  {/* If PDF target: Render genuine in-browser PDF viewer */}
                  {convertedResult.targetFormat === "PDF" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5 text-primary" /> Live PDF Preview (Inspect Pages Directly Below)
                        </span>
                        <a
                          href={convertedResult.blobUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 font-mono text-[11px]"
                        >
                          <ExternalLink className="h-3 w-3" /> Open in Fullscreen / New Tab
                        </a>
                      </div>

                      <div className="rounded-xl border border-border overflow-hidden bg-slate-900/5 shadow-inner">
                        <iframe
                          src={convertedResult.blobUrl}
                          title="Converted PDF Document"
                          className="w-full h-[520px] border-none bg-white dark:bg-slate-950"
                        />
                      </div>
                    </div>
                  )}

                  {/* If DOCX target: Render authentic Word document layout preview */}
                  {convertedResult.targetFormat === "DOCX" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-primary" /> Word Document (.docx) Editorial Page Preview
                        </span>
                        <span className="font-mono text-[11px]">
                          Office OpenXML Structure Verified
                        </span>
                      </div>

                      <div className="rounded-xl border border-border bg-surface-2/40 p-4 sm:p-6 overflow-hidden">
                        <div className="mx-auto max-w-2xl bg-card rounded-lg border border-border/80 shadow-md p-8 sm:p-12 space-y-4 font-sans text-xs leading-relaxed text-foreground select-text min-h-[380px]">
                          <div className="border-b border-border/60 pb-3 mb-4">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-semibold block">
                              Microsoft Word Document · Converted from {fileExt}
                            </span>
                            <h2 className="font-serif font-bold text-xl text-foreground mt-1">
                              {convertedResult.filename.replace(/\.docx$/i, "")}
                            </h2>
                          </div>

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
                                    className="font-serif font-bold text-sm text-foreground pt-3 border-b border-border/40 pb-1"
                                  >
                                    {trimmed.replace(/^#+\s*/, "")}
                                  </h3>
                                );
                              }

                              if (isBullet) {
                                return (
                                  <div key={idx} className="flex items-start gap-2 pl-3">
                                    <span className="text-primary font-bold">•</span>
                                    <span>{trimmed.replace(/^[-*•\d.]\s+/, "")}</span>
                                  </div>
                                );
                              }

                              return <p key={idx} className="leading-relaxed">{line}</p>;
                            })
                          ) : (
                            <span className="text-muted-foreground italic">No content available to preview.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* If TXT target: Plaintext format */}
                  {convertedResult.targetFormat === "TXT" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-primary" /> Plain Text Preview (.txt)
                        </span>
                        <span className="font-mono text-[11px]">
                          {convertedResult.wordCount} words
                        </span>
                      </div>

                      <div className="max-h-96 overflow-y-auto rounded-xl border border-border bg-surface-2/30 p-4 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap select-text">
                        {convertedResult.previewText || "No text available."}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* View 2: Raw / Plain Text Structure View */}
              {viewMode === "raw" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary" /> Preserved Text Content (Verbatim Stream)
                    </span>
                    <span className="font-mono text-[11px]">
                      {convertedResult.wordCount} words · {convertedResult.previewText?.length || 0} characters
                    </span>
                  </div>

                  <div className="max-h-96 overflow-y-auto rounded-xl border border-border bg-surface-2/30 p-4 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap select-text">
                    {filteredLines.join("\n") || (
                      <span className="text-muted-foreground italic">No matching lines found.</span>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Download Footer */}
              <div className="border-t border-border pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">
                  Content previewed and verified on DocuMind. Click download to save your genuine {convertedResult.targetFormat} file.
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="hero"
                    size="lg"
                    onClick={handleDownload}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md text-xs font-semibold px-6"
                  >
                    <Download className="h-4 w-4" /> Download Converted {convertedResult.targetFormat}
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
