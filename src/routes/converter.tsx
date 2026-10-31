import {
  useState,
  useRef,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
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
  Minus,
  Plus,
  Bold,
  Italic,
  Underline,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import {
  convertDocument,
  generateClientDocx,
  generateClientPdf,
  type ConversionTarget,
} from "@/lib/document-converter";
import {
  parsePlainTextToBlocks,
  parseHtmlToBlocks,
  type DocSynthesizerBlock,
} from "@/lib/document-synthesizer";
import { DocumentWordToolbar } from "@/components/workspace/DocumentWordToolbar";
import { eraseWorkspaceJobsOnDownload } from "@/lib/workspace-history";


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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function convertBlocksToA4Html(blocks: DocSynthesizerBlock[]): string {
  if (!blocks || blocks.length === 0) {
    return "<p>Start reviewing and editing your converted document...</p>";
  }

  return blocks
    .filter((b) => b.type !== "divider") // Strictly remove all horizontal lines!
    .map((b) => {
      if (b.type === "title") {
        return `<h1 style="font-size: 1.85em; font-weight: 800; margin-bottom: 0.6em; line-height: 1.25; color: inherit;">${escapeHtml(b.text || "")}</h1>`;
      }
      if (b.type === "subtitle") {
        return `<p style="font-size: 1.1em; font-weight: 500; opacity: 0.85; margin-bottom: 0.8em; color: inherit;">${escapeHtml(b.text || "")}</p>`;
      }
      if (b.type === "heading1") {
        return `<h2 style="font-size: 1.4em; font-weight: 700; margin-top: 1.2em; margin-bottom: 0.45em; line-height: 1.3; color: inherit;">${escapeHtml(b.text || "")}</h2>`;
      }
      if (b.type === "heading2") {
        return `<h3 style="font-size: 1.2em; font-weight: 700; margin-top: 1em; margin-bottom: 0.35em; line-height: 1.35; color: inherit;">${escapeHtml(b.text || "")}</h3>`;
      }
      if (b.type === "heading3") {
        return `<h4 style="font-size: 1.05em; font-weight: 600; margin-top: 0.8em; margin-bottom: 0.3em; line-height: 1.4; color: inherit;">${escapeHtml(b.text || "")}</h4>`;
      }
      if (b.type === "list" && b.items) {
        return `<ul style="margin: 0.6em 0; padding-left: 1.6em; list-style-type: disc;">\n${b.items
          .map((item) => `  <li style="margin-bottom: 0.35em;">${escapeHtml(item)}</li>`)
          .join("\n")}\n</ul>`;
      }
      if (b.type === "table" && b.table) {
        const tbl = b.table;
        let html = '<table style="width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.9em;">\n';
        if (tbl.headers && tbl.headers.length > 0) {
          html += '<thead><tr style="background-color: rgba(241, 245, 249, 0.7); font-weight: 600;">\n';
          for (const h of tbl.headers) {
            html += `  <th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: left;">${escapeHtml(h)}</th>\n`;
          }
          html += '</tr></thead>\n';
        }
        html += '<tbody>\n';
        for (let rIdx = 0; rIdx < tbl.rows.length; rIdx++) {
          const row = tbl.rows[rIdx]!;
          const bg = rIdx % 2 === 1 ? ' style="background-color: rgba(248, 250, 252, 0.5);"' : '';
          html += `<tr${bg}>\n`;
          for (const c of row) {
            html += `  <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">${escapeHtml(c)}</td>\n`;
          }
          html += '</tr>\n';
        }
        html += '</tbody></table>';
        return html;
      }
      if (b.runs && b.runs.length > 0) {
        const runsHtml = b.runs
          .map((r) => {
            let t = escapeHtml(r.text);
            if (r.bold) t = `<strong>${t}</strong>`;
            if (r.italics) t = `<em>${t}</em>`;
            if (r.underline) t = `<u>${t}</u>`;
            if (r.strike) t = `<s>${t}</s>`;
            return t;
          })
          .join("");
        return `<p style="margin-bottom: 0.75em;">${runsHtml}</p>`;
      }
      return `<p style="margin-bottom: 0.75em;">${escapeHtml(b.text || "")}</p>`;
    })
    .join("\n");
}

export interface A4DocumentConverterEditorHandle {
  triggerDownload: (format?: string) => Promise<void>;
  getEditedHtml: () => string;
}

export interface A4DocumentConverterEditorProps {
  text: string;
  filename: string;
  fileExt: string;
  targetFormat: string;
  rawBlobUrl?: string;
  onDownload?: () => void;
  onEditedHtmlChange?: (html: string) => void;
}

export const A4DocumentConverterEditor = forwardRef<
  A4DocumentConverterEditorHandle,
  A4DocumentConverterEditorProps
>(function A4DocumentConverterEditor(
  {
    text,
    filename,
    fileExt,
    targetFormat,
    rawBlobUrl,
    onDownload,
    onEditedHtmlChange,
  },
  ref,
) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [currentLineSpacing, setCurrentLineSpacing] = useState<string>("1.5");
  const [baseFontSize, setBaseFontSize] = useState<number>(14);
  const [fontFamily, setFontFamily] = useState<string>("sans");
  const [isWide, setIsWide] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  // Parse authentic blocks from original extracted text
  const blocks = useMemo(() => parsePlainTextToBlocks(text), [text]);

  // Convert blocks to authentic semantic HTML with ZERO horizontal lines and ZERO fake avatars
  const initialHtml = useMemo(() => convertBlocksToA4Html(blocks), [blocks]);
  const [editedHtml, setEditedHtml] = useState<string>(initialHtml);

  const isLoadedRef = useRef(false);

  // Sync initial HTML when text changes (new document conversion)
  useEffect(() => {
    if (editorRef.current) {
      if (!isLoadedRef.current || editorRef.current.dataset.sourceText !== text) {
        editorRef.current.innerHTML = initialHtml;
        editorRef.current.dataset.sourceText = text;
        setEditedHtml(initialHtml);
        isLoadedRef.current = true;
      }
    }
  }, [initialHtml, text]);

  const handleAdjustFontSize = (delta: number) => {
    setBaseFontSize((prev) => Math.max(10, Math.min(28, prev + delta)));
  };

  const fontFamilyMap: Record<string, string> = {
    sans: "Inter, sans-serif",
    serif: "Georgia, serif",
    times: "'Times New Roman', serif",
    mono: "monospace",
  };

  const handleCopyFormattedA4 = () => {
    const rawFormatted = editorRef.current?.innerText || text;
    navigator.clipboard.writeText(rawFormatted);
    setCopied(true);
    toast.success("Copied formatted A4 text to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPlainText = () => {
    const plain = (editorRef.current?.innerText || text).replace(/\n\s*\n/g, "\n\n");
    navigator.clipboard.writeText(plain);
    setCopied(true);
    toast.success("Copied plain text to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetToOriginal = () => {
    setEditedHtml(initialHtml);
    if (editorRef.current) {
      editorRef.current.innerHTML = initialHtml;
      editorRef.current.dataset.sourceText = text;
    }
    toast.info("Reset document to original converted content.");
  };

  const handleDownloadDocument = async (format: string) => {
    setDownloadingFormat(format);
    try {
      const htmlToExport = editorRef.current?.innerHTML || editedHtml;
      const baseName = filename.replace(/\.(docx|doc|pdf|txt)$/i, "");
      const outputFilename = `${baseName}.${format.toLowerCase()}`;

      const numLineSpacing = parseFloat(currentLineSpacing) || 1.35;
      const ptFontSize = Math.round(baseFontSize * 0.75); // Convert px to pt

      let blob: Blob;
      if (format === "PDF") {
        blob = await generateClientPdf(htmlToExport, baseName, {
          lineSpacing: numLineSpacing,
          fontSize: ptFontSize,
          removeDividers: true,
        });
      } else if (format === "DOCX" || format === "DOC") {
        blob = await generateClientDocx(htmlToExport, baseName, {
          lineSpacing: numLineSpacing,
          fontSize: ptFontSize,
          removeDividers: true,
        });
      } else {
        // TXT
        const plainText = editorRef.current?.innerText || text;
        blob = new Blob([plainText], { type: "text/plain;charset=utf-8" });
      }

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = outputFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      eraseWorkspaceJobsOnDownload();
      toast.success(`Downloaded ${outputFilename}!`, {
        description: "Your edits, custom font size, line spacing, and styles are 100% preserved.",
      });
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Download failed", {
        description: err instanceof Error ? err.message : "Error generating document.",
      });
    } finally {
      setDownloadingFormat(null);
    }
  };

  useImperativeHandle(ref, () => ({
    triggerDownload: (fmt) => handleDownloadDocument(fmt || targetFormat),
    getEditedHtml: () => editorRef.current?.innerHTML || editedHtml,
  }));

  const wordCount = useMemo(() => {
    const raw = editorRef.current?.innerText || text;
    return raw.trim() ? raw.trim().split(/\s+/).length : 0;
  }, [editedHtml, text]);

  return (
    <div className="space-y-4">
      {/* 1. Complete Word Processing Formatting Toolbar */}
      <DocumentWordToolbar
        editorRef={editorRef}
        currentLineSpacing={currentLineSpacing}
        onLineSpacingChange={(sp) => setCurrentLineSpacing(sp)}
        onCommand={() => {
          if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            setEditedHtml(html);
            onEditedHtmlChange?.(html);
          }
        }}
      />

      {/* 2. Secondary Quick Controls Bar: Text Size, Inline Styling, Line Gap, Font Family, Width & Quick Downloads */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-surface-2/60 border border-border text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Base Font Size Adjustment */}
          <div className="flex items-center gap-1 bg-background px-2 py-1 rounded-lg border border-border/80">
            <span className="text-[11px] font-mono text-muted-foreground mr-1 uppercase font-semibold">
              Size:
            </span>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => handleAdjustFontSize(-1)}
              className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-surface-2 cursor-pointer"
              title="Decrease text size"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="font-mono text-[11px] font-bold px-1 min-w-[32px] text-center">
              {baseFontSize}px
            </span>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => handleAdjustFontSize(1)}
              className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-surface-2 cursor-pointer"
              title="Increase text size"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {/* Quick Bold / Italic / Underline Buttons */}
          <div className="flex items-center gap-0.5 bg-background p-1 rounded-lg border border-border/80">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => {
                if (editorRef.current) {
                  editorRef.current.focus();
                  document.execCommand("bold");
                  const html = editorRef.current.innerHTML;
                  setEditedHtml(html);
                  onEditedHtmlChange?.(html);
                }
              }}
              className="h-6 w-6 flex items-center justify-center rounded text-foreground hover:bg-surface-2 transition-colors cursor-pointer font-bold text-xs"
              title="Bold (Ctrl+B) — Makes Selected Text Bold"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => {
                if (editorRef.current) {
                  editorRef.current.focus();
                  document.execCommand("italic");
                  const html = editorRef.current.innerHTML;
                  setEditedHtml(html);
                  onEditedHtmlChange?.(html);
                }
              }}
              className="h-6 w-6 flex items-center justify-center rounded text-foreground hover:bg-surface-2 transition-colors cursor-pointer italic text-xs"
              title="Italic (Ctrl+I) — Makes Selected Text Italic"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => {
                if (editorRef.current) {
                  editorRef.current.focus();
                  document.execCommand("underline");
                  const html = editorRef.current.innerHTML;
                  setEditedHtml(html);
                  onEditedHtmlChange?.(html);
                }
              }}
              className="h-6 w-6 flex items-center justify-center rounded text-foreground hover:bg-surface-2 transition-colors cursor-pointer underline text-xs"
              title="Underline (Ctrl+U) — Makes Selected Text Underlined"
            >
              <Underline className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Quick Line Spacing Pills */}
          <div className="flex items-center gap-1 bg-background px-2 py-1 rounded-lg border border-border/80">
            <span className="text-[11px] font-mono text-muted-foreground mr-1 uppercase font-semibold">
              Gap:
            </span>
            {[
              { label: "1.0", value: "1.0" },
              { label: "1.15", value: "1.15" },
              { label: "1.3", value: "1.3" },
              { label: "1.5", value: "1.5" },
              { label: "1.8", value: "1.8" },
              { label: "2.0", value: "2.0" },
            ].map((sp) => (
              <button
                key={sp.value}
                type="button"
                onClick={() => setCurrentLineSpacing(sp.value)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-all cursor-pointer ${
                  currentLineSpacing === sp.value
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={`Line gap: ${sp.value}`}
              >
                {sp.label}
              </button>
            ))}
          </div>

          {/* Font Family Selector */}
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="h-7 text-xs px-2 rounded-lg border border-border bg-background text-foreground font-semibold outline-none focus:border-primary cursor-pointer"
          >
            <option value="sans">Modern Sans (Inter)</option>
            <option value="serif">Editorial Serif (Georgia)</option>
            <option value="times">Academic (Times New Roman)</option>
            <option value="mono">Tech Monospace</option>
          </select>

          {/* Expand / A4 Width Toggle */}
          <button
            type="button"
            onClick={() => setIsWide(!isWide)}
            className="h-7 px-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground bg-background border border-border rounded-lg transition-all cursor-pointer"
            title={isWide ? "Switch to standard A4 width (794px)" : "Expand canvas width"}
          >
            {isWide ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isWide ? "A4 Width" : "Widescreen"}</span>
          </button>
        </div>

        {/* Quick Format Downloads */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={() => handleDownloadDocument("DOCX")}
            disabled={downloadingFormat !== null}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Download edited document as Microsoft Word (.docx)"
          >
            <Download className="h-3 w-3" /> DOCX
          </button>
          <button
            type="button"
            onClick={() => handleDownloadDocument("PDF")}
            disabled={downloadingFormat !== null}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-red-600 hover:bg-red-700 text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Download edited document as Adobe PDF (.pdf)"
          >
            <Download className="h-3 w-3" /> PDF
          </button>
          <button
            type="button"
            onClick={() => handleDownloadDocument("TXT")}
            disabled={downloadingFormat !== null}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-surface-2 hover:bg-surface-3 text-foreground border border-border transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Download edited document as Plain Text (.txt)"
          >
            <Download className="h-3 w-3" /> TXT
          </button>
        </div>
      </div>

      {/* Realistic Executive A4 Sheet Container (Standard ISO A4: 210 × 297 mm, aspect ratio 1:1.414, ZERO horizontal lines) */}
      <div className="rounded-2xl border border-border bg-surface-2/40 p-4 sm:p-8 overflow-x-auto flex flex-col items-center">
        <div
          className={`w-full transition-all duration-300 ${
            isWide ? "max-w-4xl" : "max-w-[794px]"
          } min-h-[1123px] bg-white dark:bg-card text-slate-900 dark:text-foreground rounded-2xl border border-border/80 shadow-paper p-8 sm:p-14 flex flex-col justify-between`}
        >
          <div>
            {/* Running Sheet Header (Clean, ZERO horizontal border-b lines) */}
            <div className="flex flex-wrap items-center justify-between pb-4 mb-6 text-[10px] font-mono text-muted-foreground uppercase tracking-widest gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                  📄 Standard A4 (210 × 297 mm)
                </span>
                <span className="font-semibold text-foreground">
                  {targetFormat === "PDF"
                    ? "Adobe PDF Document"
                    : `Microsoft Word (.${targetFormat.toLowerCase()})`}
                </span>
                <span>· Converted from {fileExt}</span>
              </div>
              <div className="flex items-center gap-3">
                {rawBlobUrl && targetFormat === "PDF" && (
                  <a
                    href={rawBlobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 font-mono text-[10px] lowercase normal-case"
                    title="Open original compiled PDF file in new browser tab"
                  >
                    <ExternalLink className="h-3 w-3" /> View raw PDF
                  </a>
                )}
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-3 w-3" /> 100% Content Preserved & Editable
                </span>
              </div>
            </div>

            {/* Direct In-Place Interactive A4 Document Editor */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => {
                const html = e.currentTarget.innerHTML;
                setEditedHtml(html);
                onEditedHtmlChange?.(html);
              }}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B")) {
                  e.preventDefault();
                  document.execCommand("bold");
                  const html = e.currentTarget.innerHTML;
                  setEditedHtml(html);
                  onEditedHtmlChange?.(html);
                } else if ((e.ctrlKey || e.metaKey) && (e.key === "i" || e.key === "I")) {
                  e.preventDefault();
                  document.execCommand("italic");
                  const html = e.currentTarget.innerHTML;
                  setEditedHtml(html);
                  onEditedHtmlChange?.(html);
                } else if ((e.ctrlKey || e.metaKey) && (e.key === "u" || e.key === "U")) {
                  e.preventDefault();
                  document.execCommand("underline");
                  const html = e.currentTarget.innerHTML;
                  setEditedHtml(html);
                  onEditedHtmlChange?.(html);
                }
              }}
              className="w-full focus:outline-none select-text cursor-text min-h-[800px]"
              style={{
                fontFamily: fontFamilyMap[fontFamily] || "Inter, sans-serif",
                fontSize: `${baseFontSize}px`,
                lineHeight: currentLineSpacing,
              }}
            />
          </div>

          {/* Running Sheet Footer (Clean, ZERO horizontal border-t lines) */}
          <div className="mt-12 pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-muted-foreground gap-3">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>ISO Standard A4 Document · {wordCount} words</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetToOriginal}
                className="px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground bg-surface-2 hover:bg-surface-3 rounded-md border border-border transition-all cursor-pointer font-sans"
              >
                Reset Original
              </button>
              <button
                type="button"
                onClick={handleCopyFormattedA4}
                className="px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-md border border-primary/20 transition-all cursor-pointer inline-flex items-center gap-1 font-sans"
              >
                <Copy className="h-3 w-3" /> Copy Text
              </button>
              <button
                type="button"
                onClick={() => handleDownloadDocument(targetFormat)}
                disabled={downloadingFormat !== null}
                className="px-3.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5 font-sans disabled:opacity-50"
              >
                {downloadingFormat === targetFormat ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Download {targetFormat}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// Backward compatibility alias for any existing reference
export const EditorialDocumentViewer = A4DocumentConverterEditor;

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
  const a4EditorRef = useRef<A4DocumentConverterEditorHandle>(null);

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

  const handleCopyPlainText = () => {
    if (!convertedResult?.previewText) return;
    navigator.clipboard.writeText(convertedResult.previewText);
    setCopied(true);
    toast.success("Copied clean plain text to clipboard!", {
      description: "Unformatted plain text ready to paste anywhere.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!convertedResult) return;
    if (a4EditorRef.current) {
      await a4EditorRef.current.triggerDownload(convertedResult.targetFormat);
    } else {
      const a = document.createElement("a");
      a.href = convertedResult.blobUrl;
      a.download = convertedResult.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      eraseWorkspaceJobsOnDownload();
      toast.success(`Downloaded ${convertedResult.filename}! (Temporary data erased)`);
    }
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
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <span>
                        Format: <span className="font-bold text-primary">{convertedResult.targetFormat}</span>
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.2 rounded font-semibold">
                        📄 ISO A4
                      </span>
                      <span>·</span>
                      <span>{(convertedResult.sizeBytes / 1024).toFixed(1)} KB</span>
                      {convertedResult.wordCount ? (
                        <>
                          <span>·</span>
                          <span>{convertedResult.wordCount} words preserved</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {convertedResult.previewText && (
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={handleCopyPlainText}
                      className="text-xs gap-1.5 border-primary/25 hover:bg-primary/10"
                      title="Copy pure unformatted plain text to clipboard"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied Plain Text!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-primary" /> Copy Plain Text
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

              {/* View 1: Authentic Editable A4 Document View (Direct Editing, No Horizontal Lines) */}
              {viewMode === "document" && (
                <div className="space-y-4">
                  <A4DocumentConverterEditor
                    ref={a4EditorRef}
                    text={convertedResult.previewText || ""}
                    filename={convertedResult.filename}
                    fileExt={fileExt}
                    targetFormat={convertedResult.targetFormat}
                    rawBlobUrl={convertedResult.blobUrl}
                    onDownload={handleDownload}
                  />
                </div>
              )}

              {/* View 2: Raw / Plain Text Structure View */}
              {viewMode === "raw" && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-2">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary" /> Pure Plain Text Stream (Verbatim)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={handleCopyPlainText}
                        className="text-xs gap-1.5 h-7 border-primary/25 hover:bg-primary/10"
                        title="Copy pure unformatted plain text to clipboard"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" /> Copied Plain Text!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 text-primary" /> Copy Plain Text
                          </>
                        )}
                      </Button>
                      <span className="font-mono text-[11px]">
                        {convertedResult.wordCount} words · {convertedResult.previewText?.length || 0} characters
                      </span>
                    </div>
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
                <div className="space-y-0.5">
                  <p className="text-xs text-foreground font-semibold flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.2 rounded">
                      📄 ISO A4
                    </span>
                    <span>Document converted & formatting preserved.</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    All original topics, layout, and content are 100% preserved.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="glass"
                    size="lg"
                    onClick={handleCopyPlainText}
                    className="gap-1.5 text-xs font-semibold px-4 border-border"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-600" /> Copied Plain Text!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 text-primary" /> Copy Plain Text
                      </>
                    )}
                  </Button>

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

          {/* Persistent Floating Quick-Action Bar for easy 1-click download anywhere on page */}
          {convertedResult && (
            <div className="sticky bottom-4 z-30 mt-6 flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-card/95 backdrop-blur-md border-2 border-emerald-500/40 shadow-2xl max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-foreground flex items-center gap-1.5 flex-wrap">
                    <span>{convertedResult.filename}</span>
                    <span className="font-mono text-[10px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded font-semibold">
                      ISO A4 · {convertedResult.targetFormat}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {(convertedResult.sizeBytes / 1024).toFixed(1)} KB · 100% Content Preserved
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="glass"
                  size="sm"
                  onClick={handleCopyPlainText}
                  className="text-xs gap-1.5 border-primary/20 hover:bg-primary/10"
                  title="Copy document text"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-primary" />
                  )}
                  <span>{copied ? "Copied!" : "Copy A4 Text"}</span>
                </Button>
                <Button
                  variant="hero"
                  size="sm"
                  onClick={handleDownload}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md"
                  title={`Download ${convertedResult.filename}`}
                >
                  <Download className="h-4 w-4" /> Download {convertedResult.targetFormat}
                </Button>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
