import React, { useState, useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Undo2,
  Redo2,
  Highlighter,
  Palette,
  Type,
  RemoveFormatting,
  Quote,
  Minus,
  ChevronDown,
  Sparkles,
} from "lucide-react";

export interface DocumentWordToolbarProps {
  onCommand?: (command: string, value?: string) => void;
  editorRef?: React.RefObject<HTMLDivElement | null>;
  currentLineSpacing?: string;
  onLineSpacingChange?: (spacing: string) => void;
  className?: string;
}

const FONT_FAMILIES = [
  { label: "Modern Sans (Inter)", value: "sans-serif" },
  { label: "Editorial Serif (Georgia)", value: "Georgia, serif" },
  { label: "Classic Academic (Times)", value: "'Times New Roman', serif" },
  { label: "Tech Monospace", value: "monospace" },
  { label: "Elegant Display", value: "'Playfair Display', serif" },
];

const FONT_SIZES = [
  { label: "9 pt", value: "12px" },
  { label: "10 pt", value: "13.3px" },
  { label: "11 pt", value: "14.6px" },
  { label: "12 pt", value: "16px" },
  { label: "14 pt", value: "18.6px" },
  { label: "16 pt", value: "21.3px" },
  { label: "18 pt", value: "24px" },
  { label: "24 pt (H2)", value: "32px" },
  { label: "30 pt (H1)", value: "40px" },
];

const TEXT_COLORS = [
  { label: "Ink Black", value: "#0f172a" },
  { label: "Dark Slate", value: "#334155" },
  { label: "Muted Slate", value: "#64748b" },
  { label: "Royal Blue", value: "#2563eb" },
  { label: "Ocean Sky", value: "#0284c7" },
  { label: "Emerald Green", value: "#059669" },
  { label: "Forest Green", value: "#166534" },
  { label: "Crimson Red", value: "#dc2626" },
  { label: "Warm Amber", value: "#d97706" },
  { label: "Deep Purple", value: "#7c3aed" },
];

const HIGHLIGHT_COLORS = [
  { label: "No Highlight", value: "transparent" },
  { label: "Lemon Yellow", value: "#fef08a" },
  { label: "Mint Green", value: "#bbf7d0" },
  { label: "Soft Sky", value: "#bae6fd" },
  { label: "Warm Peach", value: "#fed7aa" },
  { label: "Rose Pink", value: "#fbcfe8" },
  { label: "Lavender", value: "#e9d5ff" },
];

const LINE_SPACINGS = [
  { label: "1.0 (Single)", value: "1.0" },
  { label: "1.15 (Compact)", value: "1.15" },
  { label: "1.3 (Modern)", value: "1.3" },
  { label: "1.5 (Standard Academic)", value: "1.5" },
  { label: "1.8 (Spacious)", value: "1.8" },
  { label: "2.0 (Double Spaced)", value: "2.0" },
];

export function DocumentWordToolbar({
  onCommand,
  editorRef,
  currentLineSpacing = "1.5",
  onLineSpacingChange,
  className = "",
}: DocumentWordToolbarProps) {
  // Active states
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrike, setIsStrike] = useState(false);
  const [currentBlock, setCurrentBlock] = useState("p");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showSpacingMenu, setShowSpacingMenu] = useState(false);
  const [selectedWordCount, setSelectedWordCount] = useState<number>(0);
  const savedRangeRef = useRef<Range | null>(null);

  // Monitor selection state
  useEffect(() => {
    const handleSelectionChange = () => {
      if (typeof document === "undefined") return;
      try {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          if (editorRef?.current) {
            if (editorRef.current.contains(range.commonAncestorContainer)) {
              savedRangeRef.current = range.cloneRange();
            }
          } else {
            savedRangeRef.current = range.cloneRange();
          }
        }

        setIsBold(document.queryCommandState("bold"));
        setIsItalic(document.queryCommandState("italic"));
        setIsUnderline(document.queryCommandState("underline"));
        setIsStrike(document.queryCommandState("strikeThrough"));

        const block = (document.queryCommandValue("formatBlock") || "p").toLowerCase();
        setCurrentBlock(block);

        if (sel && !sel.isCollapsed) {
          const txt = sel.toString().trim();
          setSelectedWordCount(txt ? txt.split(/\s+/).length : 0);
        } else {
          setSelectedWordCount(0);
        }
      } catch {
        // Fallback for non-execCommand environments
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [editorRef]);

  const preventBlur = (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const restoreSelection = () => {
    if (editorRef?.current) {
      editorRef.current.focus();
    }
    const sel = window.getSelection();
    if (sel && savedRangeRef.current && (!sel.rangeCount || sel.isCollapsed)) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const exec = (command: string, value: string | undefined = undefined) => {
    if (typeof document === "undefined") return;
    try {
      restoreSelection();
      document.execCommand(command, false, value);

      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      }

      if (editorRef?.current) {
        editorRef.current.dispatchEvent(new Event("input", { bubbles: true }));
      }
      onCommand?.(command, value);

      try {
        setIsBold(document.queryCommandState("bold"));
        setIsItalic(document.queryCommandState("italic"));
        setIsUnderline(document.queryCommandState("underline"));
        setIsStrike(document.queryCommandState("strikeThrough"));
      } catch {}
    } catch (e) {
      console.warn("Editor command failed:", command, e);
    }
  };

  const applySpanStyle = (styleKey: string, styleValue: string) => {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);

    const span = document.createElement("span");
    (span.style as any)[styleKey] = styleValue;

    try {
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);

      // Re-select formatted contents
      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      sel.addRange(newRange);
      savedRangeRef.current = newRange.cloneRange();

      if (editorRef?.current) {
        editorRef.current.dispatchEvent(new Event("input", { bubbles: true }));
      }
      onCommand?.("customSpan", `${styleKey}:${styleValue}`);
    } catch (e) {
      console.warn("Failed to apply span style:", e);
    }
  };

  return (
    <div
      className={`sticky top-0 z-30 flex flex-wrap items-center gap-1 p-2 rounded-xl border border-border/80 bg-card/95 backdrop-blur-md shadow-md text-foreground select-none transition-all ${className}`}
      onMouseDown={(e) => {
        // Prevent clicking toolbar buttons from blurring the contentEditable editor
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "SELECT") {
          e.preventDefault();
        }
      }}
    >
      {/* 1. HISTORY / UNDO / REDO */}
      <div className="flex items-center gap-0.5 border-r border-border/60 pr-1.5 mr-0.5">
        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => exec("undo")}
          className="p-1.5 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => exec("redo")}
          className="p-1.5 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>

      {/* 2. BLOCK STYLE & HEADINGS */}
      <div className="flex items-center gap-1 border-r border-border/60 pr-1.5 mr-0.5">
        <select
          value={currentBlock}
          onChange={(e) => {
            const val = e.target.value;
            setCurrentBlock(val);
            exec("formatBlock", `<${val}>`);
          }}
          className="h-8 rounded-lg bg-surface-2 border border-border px-2 text-xs font-medium text-foreground focus:outline-hidden cursor-pointer"
          title="Paragraph Style or Heading Level"
        >
          <option value="p">Normal Paragraph</option>
          <option value="h1">Heading 1 (Main Section)</option>
          <option value="h2">Heading 2 (Subsection)</option>
          <option value="h3">Heading 3 (Sub-clause)</option>
          <option value="blockquote">Blockquote / Citation</option>
          <option value="pre">Code / Monospace</option>
        </select>
      </div>

      {/* 3. FONT FAMILY & SIZE */}
      <div className="flex items-center gap-1 border-r border-border/60 pr-1.5 mr-0.5">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowFontMenu(!showFontMenu);
              setShowSizeMenu(false);
              setShowColorPicker(false);
              setShowHighlightPicker(false);
            }}
            className="flex items-center gap-1 h-8 rounded-lg bg-surface-2 border border-border px-2 text-xs font-medium text-foreground hover:bg-surface-3 transition-colors cursor-pointer"
            title="Font Family"
          >
            <Type className="h-3.5 w-3.5 text-muted-foreground mr-0.5" />
            <span className="truncate max-w-[90px]">Font</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {showFontMenu && (
            <div className="absolute top-9 left-0 z-50 w-48 rounded-xl border border-border bg-card p-1 shadow-xl space-y-0.5">
              {FONT_FAMILIES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => {
                    exec("fontName", f.value);
                    setShowFontMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs rounded-md hover:bg-surface-2 text-foreground transition-colors cursor-pointer"
                  style={{ fontFamily: f.value }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowSizeMenu(!showSizeMenu);
              setShowFontMenu(false);
              setShowColorPicker(false);
              setShowHighlightPicker(false);
            }}
            className="flex items-center gap-1 h-8 rounded-lg bg-surface-2 border border-border px-2 text-xs font-medium text-foreground hover:bg-surface-3 transition-colors cursor-pointer"
            title="Font Size for Selected Text"
          >
            <span>Size</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {showSizeMenu && (
            <div className="absolute top-9 left-0 z-50 w-36 rounded-xl border border-border bg-card p-1 shadow-xl space-y-0.5 max-h-56 overflow-y-auto">
              {FONT_SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => {
                    applySpanStyle("fontSize", s.value);
                    setShowSizeMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs rounded-md hover:bg-surface-2 text-foreground transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span>{s.label}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{s.value}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. INLINE STYLES: BOLD, ITALIC, UNDERLINE, STRIKE */}
      <div className="flex items-center gap-0.5 border-r border-border/60 pr-1.5 mr-0.5">
        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => exec("bold")}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isBold
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "hover:bg-surface-2 text-foreground"
          }`}
          title="Bold (Ctrl+B) — Formats Selected Words"
        >
          <Bold className="h-4 w-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => exec("italic")}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isItalic
              ? "bg-primary text-primary-foreground italic shadow-xs"
              : "hover:bg-surface-2 text-foreground"
          }`}
          title="Italic (Ctrl+I) — Formats Selected Words"
        >
          <Italic className="h-4 w-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => exec("underline")}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isUnderline
              ? "bg-primary text-primary-foreground underline shadow-xs"
              : "hover:bg-surface-2 text-foreground"
          }`}
          title="Underline (Ctrl+U) — Formats Selected Words"
        >
          <Underline className="h-4 w-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => exec("strikeThrough")}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isStrike
              ? "bg-primary text-primary-foreground line-through shadow-xs"
              : "hover:bg-surface-2 text-foreground"
          }`}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </button>
      </div>

      {/* 5. TEXT COLOR & HIGHLIGHT */}
      <div className="flex items-center gap-1 border-r border-border/60 pr-1.5 mr-0.5">
        {/* Text Color Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowHighlightPicker(false);
              setShowFontMenu(false);
              setShowSizeMenu(false);
            }}
            className="flex items-center gap-1 p-1.5 rounded-md hover:bg-surface-2 text-foreground transition-colors cursor-pointer"
            title="Text Color for Selected Words"
          >
            <Palette className="h-4 w-4 text-primary" />
            <span className="w-2.5 h-2.5 rounded-full bg-primary border border-white/40" />
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {showColorPicker && (
            <div className="absolute top-9 left-0 z-50 w-44 rounded-xl border border-border bg-card p-2 shadow-xl space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-1">
                Font Color
              </p>
              <div className="grid grid-cols-5 gap-1.5 p-1">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => {
                      exec("foreColor", c.value);
                      setShowColorPicker(false);
                    }}
                    title={c.label}
                    className="h-6 w-6 rounded-md border border-border shadow-xs hover:scale-110 transition-transform cursor-pointer"
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Highlight Color Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowHighlightPicker(!showHighlightPicker);
              setShowColorPicker(false);
              setShowFontMenu(false);
              setShowSizeMenu(false);
            }}
            className="flex items-center gap-1 p-1.5 rounded-md hover:bg-surface-2 text-foreground transition-colors cursor-pointer"
            title="Highlight Color for Selected Text"
          >
            <Highlighter className="h-4 w-4 text-amber-500" />
            <span className="w-2.5 h-2.5 rounded-sm bg-yellow-300 border border-border" />
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {showHighlightPicker && (
            <div className="absolute top-9 left-0 z-50 w-44 rounded-xl border border-border bg-card p-2 shadow-xl space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-1">
                Text Highlight
              </p>
              <div className="grid grid-cols-4 gap-1.5 p-1">
                {HIGHLIGHT_COLORS.map((h) => (
                  <button
                    key={h.value}
                    type="button"
                    onClick={() => {
                      if (h.value === "transparent") {
                        exec("removeFormat");
                      } else {
                        exec("hiliteColor", h.value);
                      }
                      setShowHighlightPicker(false);
                    }}
                    title={h.label}
                    className="h-6 w-6 rounded-md border border-border shadow-xs hover:scale-110 transition-transform cursor-pointer flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: h.value }}
                  >
                    {h.value === "transparent" ? "✕" : ""}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. ALIGNMENT */}
      <div className="flex items-center gap-0.5 border-r border-border/60 pr-1.5 mr-0.5">
        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => exec("justifyLeft")}
          className="p-1.5 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => exec("justifyCenter")}
          className="p-1.5 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => exec("justifyRight")}
          className="p-1.5 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => exec("justifyFull")}
          className="p-1.5 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Justify Text Evenly"
        >
          <AlignJustify className="h-4 w-4" />
        </button>
      </div>

      {/* 7. LISTS & INDENTATION */}
      <div className="flex items-center gap-0.5 border-r border-border/60 pr-1.5 mr-0.5">
        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => exec("insertUnorderedList")}
          className="p-1.5 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Bulleted List"
        >
          <List className="h-4 w-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => exec("insertOrderedList")}
          className="p-1.5 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => exec("outdent")}
          className="p-1.5 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Decrease Indent"
        >
          <Outdent className="h-4 w-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => exec("indent")}
          className="p-1.5 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Increase Indent"
        >
          <Indent className="h-4 w-4" />
        </button>
      </div>

      {/* 8. LINE SPACING */}
      <div className="flex items-center gap-1 border-r border-border/60 pr-1.5 mr-0.5">
        <div className="relative">
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => setShowSpacingMenu(!showSpacingMenu)}
            className="flex items-center gap-1 h-8 rounded-lg bg-surface-2 border border-border px-2 text-xs font-mono font-medium text-foreground hover:bg-surface-3 transition-colors cursor-pointer"
            title="Line Spacing (e.g., 1.5x, 2.0x)"
          >
            <span>{currentLineSpacing}x</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {showSpacingMenu && (
            <div className="absolute top-9 left-0 z-50 w-44 rounded-xl border border-border bg-card p-1 shadow-xl space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
                Line Spacing
              </p>
              {LINE_SPACINGS.map((sp) => (
                <button
                  key={sp.value}
                  type="button"
                  onMouseDown={preventBlur}
                  onClick={() => {
                    onLineSpacingChange?.(sp.value);
                    setShowSpacingMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md transition-colors cursor-pointer flex items-center justify-between ${
                    currentLineSpacing === sp.value
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "hover:bg-surface-2 text-foreground"
                  }`}
                >
                  <span>{sp.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 9. CLEAR FORMATTING */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={() => exec("removeFormat")}
          className="p-1.5 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Clear Formatting for Selected Words"
        >
          <RemoveFormatting className="h-4 w-4" />
        </button>
      </div>

      {/* 10. WORD COUNT STATUS BADGE */}
      {selectedWordCount > 0 && (
        <div className="ml-auto flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-2.5 py-0.5 text-[11px] font-medium text-primary">
          <Sparkles className="h-3 w-3" />
          <span>Selected: {selectedWordCount} {selectedWordCount === 1 ? "word" : "words"}</span>
        </div>
      )}
    </div>
  );
}
