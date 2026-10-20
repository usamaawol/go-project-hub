import { useState, useRef } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { extractDocumentText } from "@/lib/api-client";

export const Route = createFileRoute("/text-extractor")({
  head: () => ({
    meta: [
      { title: "Text Extractor — Extract Text from PDF, DOCX, and TXT | DocuMind" },
      {
        name: "description",
        content:
          "Extract clean, readable text from digital documents and manuscripts with instant copying and TXT file export.",
      },
    ],
  }),
  component: TextExtractorPage,
});

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_EXTS = ["pdf", "docx", "doc", "txt", "png", "jpg", "jpeg"];

function TextExtractorPage() {
  const [collapsed, setCollapsed] = useState(false);

  // File & extraction state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<{
    text: string;
    wordCount: number;
    lineCount: number;
    charCount: number;
    filename: string;
    format: string;
  } | null>(null);
  const [ocrWarning, setOcrWarning] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectFile = async (file: File) => {
    setOcrWarning(null);
    setExtractedData(null);

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTS.includes(ext)) {
      toast.error("Unsupported format. Please upload PDF, DOCX, TXT, or images.");
      return;
    }

    if (file.size > MAX_BYTES) {
      toast.error("File exceeds 50 MB maximum size limit.");
      return;
    }

    setSelectedFile(file);

    // If image file, report honest OCR requirement
    if (["png", "jpg", "jpeg"].includes(ext)) {
      setOcrWarning(
        "Optical Character Recognition (OCR) for raster image scans is currently in private preview. For instant deterministic extraction, please provide vector PDFs, DOCX, or TXT documents.",
      );
      return;
    }

    // Run real extraction
    setExtracting(true);
    try {
      const result = await extractDocumentText(file);
      const text = result.text || "";
      const wordCount = result.wordCount || text.split(/\s+/).filter(Boolean).length;
      const lineCount = result.lineCount || text.split("\n").length;
      const charCount = text.length;

      setExtractedData({
        text,
        wordCount,
        lineCount,
        charCount,
        filename: file.name,
        format: result.format || ext.toUpperCase(),
      });

      toast.success("Text Extracted!", {
        description: `Successfully extracted ${wordCount} words from "${file.name}".`,
      });
    } catch (err: unknown) {
      console.error("Extraction error:", err);
      toast.error("Extraction encountered an error parsing the document streams.");
    } finally {
      setExtracting(false);
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
                <span>Deterministic Text & Outline Extraction</span>
              </div>
              <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Text Extractor
              </h1>
              <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
                Extract unformatted body text, section headings, and outline notes from digital
                documents. Copy to clipboard or export directly as clean plain text.
              </p>
            </div>
          </div>

          {/* Upload Card */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-paper space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Upload Document to Extract
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-2/40 p-8 text-center transition-all hover:border-primary hover:bg-surface-2 cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
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
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Click to choose another
                      document
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Click to upload or drag & drop document
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Supports PDF, DOCX, TXT · Maximum size: 50 MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {extracting && (
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-primary py-4">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Reading byte streams and reconstructing text lines...</span>
              </div>
            )}

            {ocrWarning && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{ocrWarning}</span>
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
                  <span>{extractedData.wordCount} words</span>
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
                    className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
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
                        <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
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
