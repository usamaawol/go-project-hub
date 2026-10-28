import React, { useState, useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  Highlighter,
  Palette,
  Heading2,
  Heading3,
  RemoveFormatting,
  Wand2,
  FileText,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssignmentCoverRenderer } from "./AssignmentCoverRenderer";
import type { AssignmentMetadata } from "@/lib/assignment-types";
import type { FormattingConfig } from "./DocumentFormattingWorkflow";
import { AcademicIdentityHeader } from "./AcademicIdentityHeader";

export interface DocumentRichBodyEditorProps {
  initialHtml: string;
  onChange: (html: string) => void;
  config: FormattingConfig;
  paperMode?: "standard" | "dark";
  onOpenCanvasEditor?: () => void;
  effectiveCoverMetadata: AssignmentMetadata;
  zoomScale?: number;
}

export function DocumentRichBodyEditor({
  initialHtml,
  onChange,
  config,
  paperMode = "standard",
  onOpenCanvasEditor,
  effectiveCoverMetadata,
  zoomScale = 1.0,
}: DocumentRichBodyEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [bubblePosition, setBubblePosition] = useState<{ top: number; left: number } | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const isInternalUpdate = useRef(false);

  // Initialize editor HTML
  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== initialHtml) {
        editorRef.current.innerHTML = initialHtml;
      }
    }
    isInternalUpdate.current = false;
  }, [initialHtml]);

  // Floating bubble toolbar on text selection
  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !editorRef.current) {
        setBubblePosition(null);
        setHasSelection(false);
        return;
      }

      // Check if selection is within our editor
      if (!editorRef.current.contains(sel.anchorNode)) {
        setBubblePosition(null);
        setHasSelection(false);
        return;
      }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();

      if (rect.width > 0) {
        setBubblePosition({
          top: rect.top - editorRect.top - 46,
          left: Math.max(10, rect.left - editorRect.left + rect.width / 2 - 120),
        });
        setHasSelection(true);
      }
    };

    document.addEventListener("selectionchange", handleSelection);
    return () => {
      document.removeEventListener("selectionchange", handleSelection);
    };
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalUpdate.current = true;
      onChange(editorRef.current.innerHTML);
    }
  };

  const exec = (command: string, value: string | undefined = undefined) => {
    try {
      document.execCommand(command, false, value);
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    } catch (e) {
      console.warn("Editor exec command failed:", command, e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      exec("bold");
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      exec("italic");
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
      e.preventDefault();
      exec("underline");
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        exec("outdent");
      } else {
        exec("indent");
      }
    }
  };

  const marginPadding =
    config.margins === "narrow"
      ? "p-6 sm:p-8"
      : config.margins === "wide"
        ? "p-10 sm:p-14"
        : "p-8 sm:p-12";

  return (
    <div className="flex flex-col items-center space-y-10 w-full select-text">
      {/* PAGE 1: FULL A4 CANVA COVER TEMPLATE (WHEN ENABLED) */}
      {config.hasCoverPage && (
        <div className="flex flex-col items-center shrink-0">
          <div
            className="flex items-center justify-between text-[11px] font-mono text-muted-foreground/80 mb-2 px-1 select-none shrink-0"
            style={{ width: `${Math.round(794 * zoomScale)}px` }}
          >
            <span className="font-semibold tracking-wider uppercase text-emerald-600 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> A4 Sheet 1 of Document · Canva Cover
            </span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded px-2 py-0.5 font-sans font-medium">
              Page 1 of Document
            </span>
          </div>

          <div
            className="relative shrink-0 overflow-hidden rounded-xs shadow-paper group"
            style={{
              width: `${Math.round(794 * zoomScale)}px`,
              height: `${Math.round(1123 * zoomScale)}px`,
            }}
          >
            <div
              style={{
                width: "794px",
                height: "1123px",
                transform: `scale(${zoomScale})`,
                transformOrigin: "top left",
                position: "absolute",
                top: 0,
                left: 0,
              }}
            >
              <div className="w-[794px] h-[1123px] relative bg-white overflow-hidden">
                <AssignmentCoverRenderer
                  metadata={effectiveCoverMetadata}
                  aspectRatio="a4"
                />

                {/* Return to Cover Designer Overlay Button */}
                {onOpenCanvasEditor && (
                  <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur-md p-1.5 rounded-xl shadow-2xl flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-md cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCanvasEditor();
                      }}
                    >
                      <Wand2 className="h-3.5 w-3.5" /> Customize Cover
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAGE 2+: FULL RICH TEXT EDITABLE BODY */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className="flex items-center justify-between text-[11px] font-mono text-muted-foreground/80 mb-2 px-1 select-none shrink-0"
          style={{ width: `${Math.round(794 * zoomScale)}px` }}
        >
          <span className="font-semibold tracking-wider uppercase text-primary flex items-center gap-1.5">
            <FileText className="h-3 w-3" /> A4 Body Content · Interactive Rich Editor
          </span>
          <span className="text-[10px] bg-surface-2 border border-border/60 rounded px-2 py-0.5">
            Click anywhere to edit text & format selections
          </span>
        </div>

        <div
          className="relative shrink-0 rounded-xs shadow-paper"
          style={{
            width: `${Math.round(794 * zoomScale)}px`,
          }}
        >
          <div
            style={{
              width: "794px",
              transform: `scale(${zoomScale})`,
              transformOrigin: "top left",
            }}
          >
            <div
              className={`min-h-[1123px] w-[794px] border rounded-xs relative transition-all ${marginPadding} ${
                paperMode === "dark"
                  ? "bg-zinc-900 border-zinc-700/60 text-zinc-100 shadow-[0_12px_36px_rgba(0,0,0,0.6)]"
                  : "bg-white border-stone-200 text-stone-900 shadow-[0_12px_36px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)]"
              } ${
                config.fontFamily === "serif"
                  ? "font-serif"
                  : config.fontFamily === "mono"
                    ? "font-mono"
                    : "font-sans"
              }`}
              style={{
                boxSizing: "border-box",
                lineHeight: config.lineSpacing || "1.5",
              }}
            >
              {/* Floating Selection Mini Bubble Toolbar */}
              {hasSelection && bubblePosition && (
                <div
                  className="absolute z-40 flex items-center gap-0.5 p-1 rounded-lg bg-slate-900/95 text-white backdrop-blur-md shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-150 select-none"
                  style={{
                    top: `${bubblePosition.top}px`,
                    left: `${bubblePosition.left}px`,
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <button
                    type="button"
                    onClick={() => exec("bold")}
                    className="p-1 rounded hover:bg-slate-800 text-slate-200 hover:text-white cursor-pointer"
                    title="Bold"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => exec("italic")}
                    className="p-1 rounded hover:bg-slate-800 text-slate-200 hover:text-white cursor-pointer"
                    title="Italic"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => exec("underline")}
                    className="p-1 rounded hover:bg-slate-800 text-slate-200 hover:text-white cursor-pointer"
                    title="Underline"
                  >
                    <Underline className="h-3.5 w-3.5" />
                  </button>
                  <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => exec("formatBlock", "<h2>")}
                    className="p-1 rounded hover:bg-slate-800 text-slate-200 hover:text-white cursor-pointer"
                    title="H2 Subsection"
                  >
                    <Heading2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => exec("formatBlock", "<h3>")}
                    className="p-1 rounded hover:bg-slate-800 text-slate-200 hover:text-white cursor-pointer"
                    title="H3 Sub-clause"
                  >
                    <Heading3 className="h-3.5 w-3.5" />
                  </button>
                  <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => exec("foreColor", "#2563eb")}
                    className="p-1 rounded hover:bg-slate-800 text-blue-400 hover:text-blue-300 cursor-pointer"
                    title="Blue Text"
                  >
                    <Palette className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => exec("hiliteColor", "#fef08a")}
                    className="p-1 rounded hover:bg-slate-800 text-yellow-400 hover:text-yellow-300 cursor-pointer"
                    title="Highlight"
                  >
                    <Highlighter className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => exec("removeFormat")}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                    title="Clear Formatting"
                  >
                    <RemoveFormatting className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Running Header */}
              <div className="flex items-center justify-between text-[11px] font-sans text-muted-foreground pb-3 mb-6 border-b border-border/30 select-none">
                <span className="truncate max-w-[70%] font-medium">
                  {config.headerText || config.docTitle || "Document"}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">
                  {config.hasCoverPage ? "Page 2" : "Page 1"}
                </span>
              </div>

              {/* First Body Page Academic Identity Header */}
              <AcademicIdentityHeader
                metadata={config.assignmentMetadata}
                docTitle={config.docTitle}
                docSubtitle={config.docSubtitle}
                authorName={config.authorName}
                institution={config.institution}
                dateStr={config.dateStr}
              />

              {/* Editable Body Container */}
              <div
                ref={editorRef}
                contentEditable={true}
                suppressContentEditableWarning={true}
                onInput={handleInput}
                onBlur={handleInput}
                onKeyDown={handleKeyDown}
                className="prose max-w-none focus:outline-hidden min-h-[600px] leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1.5 [&_p]:mb-3.5 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-3"
                style={{
                  fontSize: config.baseFontSize === "10pt" ? "13.3px" : config.baseFontSize === "12pt" ? "16px" : "14.6px",
                  lineHeight: config.lineSpacing || "1.5",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
