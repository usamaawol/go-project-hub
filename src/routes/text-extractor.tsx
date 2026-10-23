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
  Info,
  Search,
  Check,
  ImageIcon,
  Sparkles,
  RotateCcw,
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
          "Extract clean, readable text from documents and image screenshots with high-accuracy OCR. 100% free with instant copy and text export.",
      },
    ],
  }),
  component: TextExtractorPage,
});

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_EXTS = ["pdf", "docx", "doc", "txt", "png", "jpg", "jpeg", "webp", "bmp", "tiff"];

function TextExtractorPage() {
  const [collapsed, setCollapsed] = useState(false);

  // File & extraction state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<{
    text: string;
    wordCount: number;
    lineCount: number;
    charCount: number;
    filename: string;
    format: string;
  } | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Run extraction & OCR
    setExtracting(true);
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
        wordCount,
        lineCount,
        charCount,
        filename: file.name,
        format: isImageFile ? "IMAGE OCR" : result.format || ext.toUpperCase(),
      });

      toast.success(isImageFile ? "Screenshot OCR Complete!" : "Text Extracted!", {
        description: `Successfully extracted ${wordCount} words verbatim from "${file.name}".`,
      });
    } catch (err: unknown) {
      console.error("Extraction error:", err);
      const msg = err instanceof Error ? err.message : "Error extracting text from file.";
      toast.error("Extraction Failed", { description: msg });
      setWarningMessage(msg);
    } finally {
      setExtracting(false);
    }
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCopy = () => {
    if (!extractedData) return;
    navigator.clipboard.writeText(extractedData.text);
    setCopied(true);
    toast.success("Copied to clipboard!");
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
    toast.success("Downloaded text file!");
  };

  const filteredText = extractedData
    ? searchTerm.trim()
      ? extractedData.text
          .split("\n")
          .filter((line) => line.toLowerCase().includes(searchTerm.toLowerCase()))
          .join("\n")
      : extractedData.text
    : "";

  const isCurrentFileImage =
    selectedFile &&
    ["png", "jpg", "jpeg", "webp", "bmp", "tiff"].includes(
      selectedFile.name.split(".").pop()?.toLowerCase() || "",
    );

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
                Text Extractor
              </h1>
              <p className="mt-1 text-xs text-muted-foreground max-w-2xl leading-relaxed">
                Extract verbatim text from PDF, Word documents (.docx), plain text (.txt), and any
                picture or screenshot (PNG, JPG, WEBP). Copy the clean text instantly or download it
                as an editable file.
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
              <strong className="text-foreground">Supports Screenshots & Pictures:</strong>
              <p className="leading-relaxed">
                Took a picture of a document, book page, white paper, or captured a screen snippet?
                Upload your picture or screenshot directly. DocuMind analyzes the image using
                optical character recognition (OCR) and extracts the exact text verbatim, preserving
                spelling, numbers, and paragraphs.
              </p>
            </div>
          </div>

          {/* Upload Card */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-paper space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Upload Document, Picture, or Screenshot to Extract
              </label>

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
              <div className="flex items-center justify-center gap-2.5 text-xs font-medium text-primary py-4">
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

          {/* Extracted Text Viewer Card */}
          {extractedData && (
            <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-paper space-y-4 animate-in fade-in duration-300">
              {/* Telemetry Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm text-foreground">
                    {extractedData.filename}
                  </span>
                  <span className="rounded bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-muted-foreground border border-border">
                    {extractedData.format}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground">
                  <span className="text-foreground font-semibold">
                    {extractedData.wordCount} words
                  </span>
                  <span>·</span>
                  <span>{extractedData.lineCount} lines</span>
                  <span>·</span>
                  <span>{extractedData.charCount} characters</span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search within extracted text..."
                    className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-2">
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
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={handleDownload}
                    className="text-xs gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" /> Download (.txt)
                  </Button>
                </div>
              </div>

              {/* Text Area */}
              <div className="max-h-96 overflow-y-auto rounded-xl border border-border bg-surface-2/30 p-4 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap select-text">
                {filteredText || (
                  <span className="text-muted-foreground italic">No matching lines found.</span>
                )}
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
