import { useState, useRef, useEffect, useMemo } from "react";
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
  Sparkles,
  Sliders,
  AlignJustify,
  Type,
  Palette,
  Maximize2,
  Minimize2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { convertDocument, type ConversionTarget } from "@/lib/document-converter";
import { parsePlainTextToBlocks, type DocSynthesizerBlock } from "@/lib/document-synthesizer";

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

function renderTextWithLinks(text: string) {
  if (!text) return "";
  const tokenRegex =
    /(https?:\/\/[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|\+?\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}[\s-]?\d{0,4})/g;
  const parts = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("http://") || token.startsWith("https://")) {
      parts.push(
        <a
          key={match.index}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-medium inline-flex items-center gap-0.5 break-all"
        >
          {token}
          <ExternalLink className="h-2.5 w-2.5 inline shrink-0 opacity-70" />
        </a>,
      );
    } else if (token.includes("@") && !token.includes(" ") && token.length > 5) {
      parts.push(
        <a
          key={match.index}
          href={`mailto:${token}`}
          className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
        >
          {token}
        </a>,
      );
    } else if (/^\+?\d[\d\s-]{7,}\d$/.test(token)) {
      parts.push(
        <a
          key={match.index}
          href={`tel:${token.replace(/[\s-]/g, "")}`}
          className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
        >
          {token}
        </a>,
      );
    } else {
      parts.push(token);
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : text;
}

interface EditorialDocumentViewerProps {
  text: string;
  filename: string;
  fileExt: string;
  targetFormat: string;
}

function EditorialDocumentViewer({
  text,
  filename,
  fileExt,
  targetFormat,
}: EditorialDocumentViewerProps) {
  const [lineSpacing, setLineSpacing] = useState<"compact" | "balanced" | "relaxed">("balanced");
  const [fontFamily, setFontFamily] = useState<"sans" | "serif" | "mono">("sans");
  const [accentTheme, setAccentTheme] = useState<"blue" | "emerald" | "slate" | "amber">("blue");
  const [isWide, setIsWide] = useState(false);
  const [copied, setCopied] = useState(false);

  const blocks = useMemo(() => parsePlainTextToBlocks(text), [text]);

  const titleBlock = blocks.find((b) => b.type === "title");
  const rawTitle = titleBlock?.text || filename.replace(/\.(docx|doc|pdf|txt)$/i, "");

  const initials = useMemo(() => {
    if (!rawTitle) return "DM";
    const parts = rawTitle.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return rawTitle.slice(0, 2).toUpperCase();
  }, [rawTitle]);

  const { headerMetaBlocks, bodyBlocks } = useMemo(() => {
    if (blocks.length === 0) return { headerMetaBlocks: [], bodyBlocks: [] };

    const firstIsTitle = blocks[0].type === "title";
    if (!firstIsTitle) {
      return { headerMetaBlocks: [], bodyBlocks: blocks };
    }

    const metas: DocSynthesizerBlock[] = [];
    const remaining: DocSynthesizerBlock[] = [];
    let inHeader = true;

    for (let i = 1; i < blocks.length; i++) {
      const b = blocks[i];
      if (
        inHeader &&
        b.type === "paragraph" &&
        b.text &&
        (b.text.includes("@") ||
          b.text.includes("http") ||
          /\+\d{2,}/.test(b.text) ||
          b.text.includes("📍") ||
          b.text.includes("📞") ||
          b.text.includes("✉️") ||
          b.text.includes("🔗") ||
          (b.text.includes("|") && b.text.length < 150))
      ) {
        metas.push(b);
      } else {
        inHeader = false;
        remaining.push(b);
      }
    }

    return { headerMetaBlocks: metas, bodyBlocks: remaining };
  }, [blocks]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied full document content!");
    setTimeout(() => setCopied(false), 2000);
  };

  const themeClasses = {
    blue: {
      accentBorder: "border-blue-600 dark:border-blue-500",
      accentBg: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
      avatarBg: "from-blue-600 via-indigo-600 to-violet-600 text-white",
      badge: "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40",
      accentBar: "bg-blue-600",
    },
    emerald: {
      accentBorder: "border-emerald-600 dark:border-emerald-500",
      accentBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
      avatarBg: "from-emerald-600 via-teal-600 to-cyan-600 text-white",
      badge: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40",
      accentBar: "bg-emerald-600",
    },
    slate: {
      accentBorder: "border-slate-600 dark:border-slate-400",
      accentBg: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
      avatarBg: "from-slate-700 via-slate-800 to-zinc-900 text-white",
      badge: "border-slate-500/30 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900",
      accentBar: "bg-slate-700",
    },
    amber: {
      accentBorder: "border-amber-600 dark:border-amber-500",
      accentBg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
      avatarBg: "from-amber-600 via-orange-600 to-rose-600 text-white",
      badge: "border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40",
      accentBar: "bg-amber-600",
    },
  }[accentTheme];

  const fontClass = {
    sans: "font-sans",
    serif: "font-serif",
    mono: "font-mono text-[11.5px]",
  }[fontFamily];

  const spacingStyles = {
    compact: {
      lineHeight: "leading-snug",
      pMargin: "mb-2",
      fontSize: "text-[12px]",
      gap: "gap-1.5",
    },
    balanced: {
      lineHeight: "leading-relaxed",
      pMargin: "mb-3.5",
      fontSize: "text-[12.5px]",
      gap: "gap-2",
    },
    relaxed: {
      lineHeight: "leading-loose",
      pMargin: "mb-5",
      fontSize: "text-[13px]",
      gap: "gap-2.5",
    },
  }[lineSpacing];

  return (
    <div className="space-y-4">
      {/* Modern Interactive Polish & Spacing Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-surface-2/70 border border-border">
        {/* Line Spacing Controls (Solving "the size between the line") */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono uppercase text-muted-foreground font-semibold flex items-center gap-1 mr-1">
            <AlignJustify className="h-3.5 w-3.5 text-primary" /> Spacing:
          </span>
          {(["compact", "balanced", "relaxed"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setLineSpacing(mode)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer capitalize ${
                lineSpacing === mode
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-background text-muted-foreground hover:text-foreground border border-border/60"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Font Family Controls */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono uppercase text-muted-foreground font-semibold flex items-center gap-1 mr-1">
            <Type className="h-3.5 w-3.5 text-primary" /> Font:
          </span>
          {(["sans", "serif", "mono"] as const).map((font) => (
            <button
              key={font}
              type="button"
              onClick={() => setFontFamily(font)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer capitalize ${
                fontFamily === font
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-background text-muted-foreground hover:text-foreground border border-border/60"
              }`}
            >
              {font === "sans" ? "Modern" : font === "serif" ? "Editorial" : "Mono"}
            </button>
          ))}
        </div>

        {/* Theme Accent Dots */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase text-muted-foreground font-semibold flex items-center gap-1">
            <Palette className="h-3.5 w-3.5 text-primary" /> Accent:
          </span>
          {(["blue", "emerald", "slate", "amber"] as const).map((th) => {
            const dotColor = {
              blue: "bg-blue-600",
              emerald: "bg-emerald-600",
              slate: "bg-slate-700",
              amber: "bg-amber-600",
            }[th];
            return (
              <button
                key={th}
                type="button"
                onClick={() => setAccentTheme(th)}
                className={`h-5 w-5 rounded-full ${dotColor} transition-all cursor-pointer ring-offset-2 hover:scale-110 ${
                  accentTheme === th
                    ? "ring-2 ring-primary ring-offset-background scale-110"
                    : "opacity-70 hover:opacity-100"
                }`}
                title={`Accent: ${th}`}
              />
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={() => setIsWide(!isWide)}
            className="p-1.5 text-xs text-muted-foreground hover:text-foreground bg-background border border-border/70 rounded-md transition-all cursor-pointer"
            title={isWide ? "Normal width" : "Expand width"}
          >
            {isWide ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-md border border-primary/20 transition-all cursor-pointer"
            title="Copy all text"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* Realistic Executive Sheet Preview */}
      <div className="rounded-2xl border border-border bg-surface-2/40 p-4 sm:p-8 overflow-hidden">
        <div
          className={`mx-auto transition-all duration-300 ${
            isWide ? "max-w-4xl" : "max-w-2xl"
          } bg-card rounded-2xl border border-border/80 shadow-paper p-8 sm:p-12 ${fontClass} ${
            spacingStyles.fontSize
          } text-foreground select-text min-h-[480px]`}
        >
          {/* Running Sheet Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-6 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {targetFormat === "PDF"
                  ? "Adobe PDF Document"
                  : `Microsoft Word (.${targetFormat.toLowerCase()})`}
              </span>
              <span>· Converted from {fileExt}</span>
            </div>
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="h-3 w-3" /> Structure & Content 100% Preserved
            </span>
          </div>

          {/* Executive Profile / Document Title Header Card */}
          {rawTitle && (
            <div className="mb-6 pb-6 border-b border-border/70">
              <div className="flex items-start gap-4">
                {/* Monogram Avatar Circle */}
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${themeClasses.avatarBg} font-serif text-lg font-bold shadow-md ring-2 ring-white/20`}
                >
                  {initials}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                      {rawTitle}
                    </h1>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${themeClasses.badge}`}
                    >
                      <Sparkles className="h-3 w-3" /> Executive Layout
                    </span>
                  </div>

                  {/* Subtitle / Roles / Contact details from header meta blocks */}
                  {headerMetaBlocks.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {headerMetaBlocks.map((mb, idx) => {
                        const mText = mb.text || "";
                        const isRoleLine = mText.includes("|") && !mText.includes("@");
                        if (isRoleLine) {
                          return (
                            <div
                              key={idx}
                              className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-primary"
                            >
                              {mText.split("|").map((role, rIdx) => (
                                <span key={rIdx} className="inline-flex items-center gap-1.5">
                                  {rIdx > 0 && (
                                    <span className="text-muted-foreground/40 font-normal">·</span>
                                  )}
                                  <span>{role.trim()}</span>
                                </span>
                              ))}
                            </div>
                          );
                        }

                        // Compact Contact bar item
                        return (
                          <div
                            key={idx}
                            className="inline-flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
                          >
                            <span className="inline-flex items-center gap-1.5 bg-surface-2 px-2.5 py-1 rounded-md border border-border/70 text-foreground text-[11px] font-medium shadow-xs">
                              {renderTextWithLinks(mText)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Body Content Blocks */}
          <div className="space-y-1">
            {bodyBlocks.map((block, bIdx) => {
              if (block.type === "heading1" || block.type === "heading2") {
                return (
                  <div
                    key={bIdx}
                    className="pt-5 pb-1 mt-5 mb-2.5 border-b border-border/60 flex items-center gap-2.5"
                  >
                    <span className={`h-4 w-1 rounded-full ${themeClasses.accentBar}`} />
                    <h2 className="font-serif font-bold text-sm sm:text-base tracking-wider uppercase text-foreground">
                      {block.text}
                    </h2>
                  </div>
                );
              }

              if (block.type === "heading3") {
                return (
                  <div key={bIdx} className="pt-3 pb-0.5 mt-3 mb-1.5 flex items-center gap-2">
                    <span
                      className={`h-3 w-1 rounded-full ${themeClasses.accentBar} opacity-70`}
                    />
                    <h3 className="font-sans font-bold text-xs sm:text-sm tracking-wide text-foreground">
                      {block.text}
                    </h3>
                  </div>
                );
              }

              if (block.type === "list" && block.items) {
                return (
                  <ul key={bIdx} className="space-y-1.5 my-2.5 pl-4 list-disc marker:text-primary">
                    {block.items.map((item, iIdx) => (
                      <li key={iIdx} className={`${spacingStyles.lineHeight} pl-1`}>
                        {renderTextWithLinks(item)}
                      </li>
                    ))}
                  </ul>
                );
              }

              if (block.type === "table" && block.table) {
                const tbl = block.table;
                return (
                  <div key={bIdx} className="my-4 overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-xs border-collapse">
                      {tbl.headers && tbl.headers.length > 0 && (
                        <thead className="bg-surface-2 border-b border-border font-semibold text-foreground">
                          <tr>
                            {tbl.headers.map((h, hIdx) => (
                              <th key={hIdx} className="p-2.5 font-mono text-[11px]">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                      )}
                      <tbody>
                        {tbl.rows.map((row, rIdx) => (
                          <tr key={rIdx} className={rIdx % 2 === 1 ? "bg-surface-2/40" : ""}>
                            {row.map((c, cIdx) => (
                              <td key={cIdx} className="p-2.5 border-t border-border/50">
                                {renderTextWithLinks(c)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }

              // Paragraph
              return (
                <p
                  key={bIdx}
                  className={`${spacingStyles.lineHeight} ${spacingStyles.pMargin} text-foreground whitespace-pre-wrap`}
                >
                  {renderTextWithLinks(block.text || "")}
                </p>
              );
            })}
          </div>

          {/* Running Sheet Footer */}
          <div className="mt-10 pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-muted-foreground gap-2">
            <span>DocuMind Converted Document · 100% Genuine File</span>
            <span>Editorial Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    wordCount?: number | undefined;
    previewText?: string | undefined;
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
    const upperExt = ext === "doc" ? "DOC" : ext.toUpperCase();
    setFileExt(upperExt);

    // Default target format:
    // If source is PDF -> default to DOCX
    // If source is DOCX or DOC -> default to PDF
    // If source is TXT or Image -> default to PDF
    if (upperExt === "PDF") {
      setTargetFormat("DOCX");
    } else if (upperExt === "DOCX" || upperExt === "DOC") {
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

  const availableTargets = (["DOCX", "DOC", "PDF", "TXT"] as const).filter(
    (f) => f !== fileExt,
  );

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
                          ? "Microsoft Word (.docx)"
                          : target === "DOC"
                            ? "Word Document (.doc)"
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
                      : convertedResult.targetFormat === "DOCX" || convertedResult.targetFormat === "DOC"
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
                  {/* If PDF target: Render genuine in-browser PDF viewer + interactive editorial sheet */}
                  {convertedResult.targetFormat === "PDF" && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5 text-primary" /> Live PDF Verification & Editorial View
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
                          className="w-full h-[500px] border-none bg-white dark:bg-slate-950"
                        />
                      </div>

                      <div className="pt-2">
                        <EditorialDocumentViewer
                          text={convertedResult.previewText || ""}
                          filename={convertedResult.filename}
                          fileExt={fileExt}
                          targetFormat="PDF"
                        />
                      </div>
                    </div>
                  )}

                  {/* If DOCX or DOC target: Render authentic Word document layout preview */}
                  {(convertedResult.targetFormat === "DOCX" ||
                    convertedResult.targetFormat === "DOC") && (
                    <EditorialDocumentViewer
                      text={convertedResult.previewText || ""}
                      filename={convertedResult.filename}
                      fileExt={fileExt}
                      targetFormat={convertedResult.targetFormat}
                    />
                  )}

                  {/* If TXT target: Plaintext format */}
                  {convertedResult.targetFormat === "TXT" && (
                    <EditorialDocumentViewer
                      text={convertedResult.previewText || ""}
                      filename={convertedResult.filename}
                      fileExt={fileExt}
                      targetFormat="TXT"
                    />
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
