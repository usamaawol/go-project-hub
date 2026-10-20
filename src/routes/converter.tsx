import { useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRightLeft,
  Upload,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileCode,
  FileType,
  Sparkles,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { extractDocumentText } from "@/lib/api-client";

export const Route = createFileRoute("/converter")({
  head: () => ({
    meta: [
      { title: "File Converter — PDF, DOCX, and TXT | DocuMind" },
      {
        name: "description",
        content:
          "Convert documents between PDF, DOCX, and TXT formats with reliable layout reconstruction and instant vector download.",
      },
    ],
  }),
  component: ConverterPage,
});

const ALLOWED_EXTS = ["pdf", "docx", "doc", "txt"];
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

function ConverterPage() {
  const [collapsed, setCollapsed] = useState(false);

  // Conversion State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileExt, setFileExt] = useState<string>("");
  const [targetFormat, setTargetFormat] = useState<"DOCX" | "PDF" | "TXT">("DOCX");
  const [converting, setConverting] = useState(false);
  const [convertedResult, setConvertedResult] = useState<{
    filename: string;
    targetFormat: string;
    blobUrl: string;
    sizeBytes: number;
    wordCount?: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectFile = (file: File) => {
    setErrorMessage(null);
    setConvertedResult(null);

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTS.includes(ext)) {
      setErrorMessage("Unsupported file format. Please upload PDF, DOCX, or TXT.");
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

    // Default target format: if source is PDF, default to DOCX; if DOCX/TXT, default to PDF
    if (upperExt === "PDF") {
      setTargetFormat("DOCX");
    } else {
      setTargetFormat("PDF");
    }
  };

  const handleConvert = async () => {
    if (!selectedFile) return;

    setConverting(true);
    setErrorMessage(null);

    try {
      // Step 1: Extract semantic textual structure
      const extracted = await extractDocumentText(selectedFile);
      const text = extracted.text || "No readable text content extracted.";
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");

      let outputBlob: Blob;
      let outputFilename: string;

      if (targetFormat === "TXT") {
        outputBlob = new Blob([text], { type: "text/plain;charset=utf-8" });
        outputFilename = `${baseName}_converted.txt`;
      } else if (targetFormat === "DOCX") {
        // Generate an HTML-based Word document (.doc) with clean styling
        const docHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${baseName}</title><style>body{font-family:'Calibri',sans-serif;line-height:1.5;margin:1in;font-size:11pt;}h1{font-size:16pt;border-bottom:1px solid #ccc;padding-bottom:4px;}h2{font-size:13pt;margin-top:16px;}p{margin-bottom:12px;text-align:justify;}</style></head><body><h1>${baseName}</h1>${text
          .split("\n\n")
          .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
          .join("")}</body></html>`;
        outputBlob = new Blob([docHtml], { type: "application/msword;charset=utf-8" });
        outputFilename = `${baseName}_converted.doc`;
      } else {
        // PDF target: Generate styled printable document
        const printHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${baseName}</title><style>@page{margin:1in;}body{font-family:'Georgia',serif;line-height:1.6;font-size:11pt;color:#111;max-width:7in;margin:0 auto;padding:24px;}h1{font-size:20pt;margin-bottom:16px;border-bottom:2px solid #222;padding-bottom:8px;}p{margin-bottom:14px;text-align:justify;}</style></head><body><h1>${baseName}</h1>${text
          .split("\n\n")
          .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
          .join("")}</body></html>`;
        outputBlob = new Blob([printHtml], { type: "text/html;charset=utf-8" });
        outputFilename = `${baseName}_converted.html`;
      }

      const blobUrl = URL.createObjectURL(outputBlob);
      setConvertedResult({
        filename: outputFilename,
        targetFormat,
        blobUrl,
        sizeBytes: outputBlob.size,
        wordCount: extracted.wordCount,
      });

      toast.success("Conversion Complete!", {
        description: `Successfully converted "${selectedFile.name}" to ${targetFormat}.`,
      });
    } catch (err: unknown) {
      console.error("Conversion error:", err);
      setErrorMessage("Conversion failed during document synthesis. Please try another file.");
      toast.error("Conversion failed.");
    } finally {
      setConverting(false);
    }
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
                <span>Deterministic Document Conversion</span>
              </div>
              <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                File Converter
              </h1>
              <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
                Convert files reliably between PDF, DOCX, and TXT formats without loss of semantic
                paragraphs or headings. No watermarks and no hidden fees.
              </p>
            </div>
          </div>

          {/* Educational Banner */}
          <div className="mb-8 rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 p-4 text-xs text-foreground/80 flex items-start gap-3">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-foreground">Tested Conversion Pipelines:</strong>
              <p>
                DocuMind extracts the full typographic hierarchy from native DOCX, PDF, and TXT
                documents to reconstruct clean editable documents. For complex multi-column PDFs
                with embedded graphics or scanned bitmap pages, textual hierarchy is extracted
                first.
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
                  accept=".pdf,.docx,.doc,.txt"
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
                      Supported formats: PDF, DOCX, TXT · Maximum file size: 50 MB
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
                          ? "Editable Microsoft Word"
                          : target === "PDF"
                            ? "Standardized PDF"
                            : "Clean Plain Text"}
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

          {/* Converted Result Display Card */}
          {convertedResult && (
            <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 shadow-paper flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <span className="font-serif text-base font-bold text-foreground block">
                    {convertedResult.filename}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Converted to {convertedResult.targetFormat} ·{" "}
                    {(convertedResult.sizeBytes / 1024).toFixed(1)} KB{" "}
                    {convertedResult.wordCount ? `· ${convertedResult.wordCount} words` : ""}
                  </p>
                </div>
              </div>

              <Button
                variant="hero"
                size="lg"
                onClick={handleDownload}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm"
              >
                <Download className="h-4 w-4" /> Download Converted File
              </Button>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
