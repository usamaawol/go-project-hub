/**
 * DocuMind Native Cover Page Canvas Editor
 * A full Canva-like design editor built directly inside DocuMind:
 * - Central scalable WYSIWYG canvas (A4 portrait default 794x1123, Letter, Landscape)
 * - Drag-and-drop element repositioning & corner resize handles
 * - Left sidebar for 52+ Templates, Text elements, Shapes, and Image/Logo upload
 * - Right properties panel for live typography, colors, opacity, dimensions, and layering
 * - Top toolbar with Undo/Redo, Zoom (50%-150%, fit), Reset, and "Adjust & Apply"
 * - Mobile responsive with touch controls and contextual drawers
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import type {
  AssignmentMetadata,
  CanvasCoverElement,
  CoverElementType,
} from "@/lib/assignment-types";
import {
  COVER_TEMPLATES_REGISTRY,
  CANVAS_A4_WIDTH,
  CANVAS_A4_HEIGHT,
  CANVAS_LETTER_WIDTH,
  CANVAS_LETTER_HEIGHT,
  generateDefaultCoverElements,
  getCoverTemplateById,
  type ExtendedCoverTemplateDefinition,
} from "@/lib/cover-templates-registry";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Sparkles,
  Check,
  X,
  Type,
  Square,
  Circle,
  Image as ImageIcon,
  Layout,
  Sliders,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Upload,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  AlertTriangle,
  Move,
  Search,
  Palette,
  FileCheck,
} from "lucide-react";

interface CoverCanvasEditorProps {
  metadata: AssignmentMetadata;
  isOpen: boolean;
  onClose: () => void;
  onApply: (updatedMetadata: AssignmentMetadata) => void;
}

const FONT_OPTIONS = [
  { label: "Inter (Modern Sans)", value: "Inter, sans-serif" },
  { label: "Georgia (Collegiate Serif)", value: "Georgia, serif" },
  { label: "Playfair Display (Display Serif)", value: "'Playfair Display', Georgia, serif" },
  { label: "Merriweather (Editorial Serif)", value: "Merriweather, serif" },
  { label: "Newsreader (Academic Serif)", value: "'Newsreader', Georgia, serif" },
  { label: "Roboto (Technical Clean)", value: "Roboto, sans-serif" },
  { label: "Montserrat (Geometric Sans)", value: "Montserrat, sans-serif" },
  { label: "JetBrains Mono (STEM / Code)", value: "'JetBrains Mono', monospace" },
  { label: "Times New Roman (Formal)", value: "'Times New Roman', Times, serif" },
];

const PRESET_COLORS = [
  "#1E3A8A", // Oxford Navy
  "#2563EB", // Royal Blue
  "#0F766E", // Deep Teal
  "#B91C1C", // Crimson
  "#0F172A", // Dark Slate
  "#000000", // Pure Black
  "#7C3AED", // Violet
  "#0284C7", // Ocean Sky
  "#15803D", // Forest Green
  "#D97706", // Amber
  "#EA580C", // Orange
  "#F8FAFC", // Off White
  "#E2E8F0", // Slate Border
  "#FFFFFF", // White
];

export function CoverCanvasEditor({
  metadata,
  isOpen,
  onClose,
  onApply,
}: CoverCanvasEditorProps) {
  if (!isOpen) return null;

  const currentTemplate = getCoverTemplateById(metadata.coverTemplateId || "classic-university");

  // Page dimensions
  const isLetter = metadata.pageFormat === "Letter";
  const isLandscape = metadata.pageOrientation === "landscape";
  const baseW = isLetter ? CANVAS_LETTER_WIDTH : CANVAS_A4_WIDTH;
  const baseH = isLetter ? CANVAS_LETTER_HEIGHT : CANVAS_A4_HEIGHT;
  const pageW = isLandscape ? baseH : baseW;
  const pageH = isLandscape ? baseW : baseH;

  // Editor Elements & History
  const [elements, setElements] = useState<CanvasCoverElement[]>(() => {
    if (metadata.customCoverElements && metadata.customCoverElements.length > 0) {
      return metadata.customCoverElements;
    }
    return generateDefaultCoverElements(currentTemplate, metadata, pageW, pageH);
  });

  const [history, setHistory] = useState<CanvasCoverElement[][]>([]);
  const [future, setFuture] = useState<CanvasCoverElement[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<"templates" | "text" | "elements" | "images" | "setup">("templates");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategory, setTemplateCategory] = useState("All");
  const [zoom, setZoom] = useState<number>(0.72);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Interactive Drag & Resize tracking
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    elementId: string;
    startX: number;
    startY: number;
    initialElemX: number;
    initialElemY: number;
  } | null>(null);

  const [resizeState, setResizeState] = useState<{
    isResizing: boolean;
    elementId: string;
    handle: "nw" | "ne" | "sw" | "se";
    startX: number;
    startY: number;
    initialBounds: { x: number; y: number; width: number; height: number };
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Commit state to history stack for undo
  const pushState = useCallback((newElements: CanvasCoverElement[]) => {
    setHistory((prev) => [...prev.slice(-25), elements]);
    setFuture([]);
    setElements(newElements);
  }, [elements]);

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1]!;
    setFuture((f) => [elements, ...f]);
    setHistory((h) => h.slice(0, -1));
    setElements(prev);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0]!;
    setHistory((h) => [...h, elements]);
    setFuture((f) => f.slice(1));
    setElements(next);
  };

  // Keyboard shortcuts for Delete and Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId && selectedId !== "canvas-bg") {
          e.preventDefault();
          handleDeleteElement(selectedId);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [elements, history, future, selectedId]);

  // Selected element helper
  const selectedElement = elements.find((el) => el.id === selectedId);

  // Update selected element property
  const updateElementProp = (id: string, updates: Partial<CanvasCoverElement>) => {
    const next = elements.map((el) => (el.id === id ? { ...el, ...updates } : el));
    pushState(next);
  };

  // Delete element
  const handleDeleteElement = (id: string) => {
    if (id === "canvas-bg") {
      toast.error("Cannot delete the canvas background");
      return;
    }
    const next = elements.filter((el) => el.id !== id);
    pushState(next);
    setSelectedId(null);
    toast.info("Element removed");
  };

  // Duplicate element
  const handleDuplicateElement = (id: string) => {
    const target = elements.find((el) => el.id === id);
    if (!target || target.id === "canvas-bg") return;
    const newId = `elem-${Date.now()}`;
    const clone: CanvasCoverElement = {
      ...target,
      id: newId,
      name: `${target.name || "Element"} Copy`,
      x: Math.min(pageW - target.width, target.x + 20),
      y: Math.min(pageH - target.height, target.y + 20),
      zIndex: Math.max(...elements.map((e) => e.zIndex), 1) + 1,
    };
    pushState([...elements, clone]);
    setSelectedId(newId);
    toast.success("Element duplicated");
  };

  // Bring forward / Send backward
  const handleBringForward = (id: string) => {
    const target = elements.find((e) => e.id === id);
    if (!target) return;
    const maxZ = Math.max(...elements.map((e) => e.zIndex));
    updateElementProp(id, { zIndex: maxZ + 1 });
  };

  const handleSendBackward = (id: string) => {
    const target = elements.find((e) => e.id === id);
    if (!target || target.id === "canvas-bg") return;
    const minZ = Math.max(2, Math.min(...elements.filter((e) => e.id !== "canvas-bg").map((e) => e.zIndex)) - 1);
    updateElementProp(id, { zIndex: minZ });
  };

  // Switch Template
  const handleSelectTemplate = (tpl: ExtendedCoverTemplateDefinition) => {
    const newElements = generateDefaultCoverElements(tpl, {
      ...metadata,
      coverTemplateId: tpl.id,
      accentColor: tpl.defaultAccent,
    }, pageW, pageH);
    pushState(newElements);
    setSelectedId(null);
    toast.success(`Loaded "${tpl.name}" Template`, {
      description: "Custom editable canvas populated with template visual tokens.",
    });
  };

  // Reset to original template default
  const handleResetToTemplate = () => {
    const reset = generateDefaultCoverElements(currentTemplate, metadata, pageW, pageH);
    pushState(reset);
    setSelectedId(null);
    toast.info("Reset to default template layout");
  };

  // Add New Elements
  const handleAddText = (variant: "title" | "subtitle" | "body" | "badge") => {
    const newId = `text-${Date.now()}`;
    const maxZ = Math.max(...elements.map((e) => e.zIndex), 1) + 1;
    let newEl: CanvasCoverElement;

    if (variant === "title") {
      newEl = {
        id: newId,
        type: "text",
        name: "Custom Heading",
        x: pageW / 2 - 200,
        y: pageH / 2 - 40,
        width: 400,
        height: 60,
        text: "Add Heading Title",
        fontFamily: currentTemplate.fontFamily || "Inter, sans-serif",
        fontSize: 28,
        fontWeight: "800",
        textAlign: "center",
        textColor: "#0F172A",
        zIndex: maxZ,
      };
    } else if (variant === "subtitle") {
      newEl = {
        id: newId,
        type: "text",
        name: "Custom Subheading",
        x: pageW / 2 - 180,
        y: pageH / 2 + 20,
        width: 360,
        height: 36,
        text: "Secondary Subheading or Topic Description",
        fontFamily: currentTemplate.fontFamily || "Inter, sans-serif",
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center",
        textColor: currentTemplate.defaultAccent || "#2563EB",
        zIndex: maxZ,
      };
    } else if (variant === "badge") {
      newEl = {
        id: newId,
        type: "text",
        name: "Tag / Badge",
        x: pageW / 2 - 80,
        y: 280,
        width: 160,
        height: 28,
        text: "ACADEMIC VERIFIED",
        fontFamily: "monospace",
        fontSize: 10,
        fontWeight: "700",
        textAlign: "center",
        textColor: "#FFFFFF",
        fillColor: currentTemplate.defaultAccent || "#1E3A8A",
        borderRadius: 14,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        zIndex: maxZ,
      };
    } else {
      newEl = {
        id: newId,
        type: "text",
        name: "Body Text Box",
        x: pageW / 2 - 160,
        y: pageH / 2 + 60,
        width: 320,
        height: 48,
        text: "Enter your custom academic description, institutional notes, or submission statement here.",
        fontFamily: "Inter, sans-serif",
        fontSize: 11,
        fontWeight: "normal",
        textAlign: "center",
        textColor: "#475569",
        zIndex: maxZ,
      };
    }

    pushState([...elements, newEl]);
    setSelectedId(newId);
    toast.success("Text block added to canvas");
  };

  const handleAddShape = (
    shapeType: "rectangle" | "rounded-card" | "circle" | "accent-bar" | "divider" | "wedge" | "chevron" | "dots" | "stripe",
  ) => {
    const newId = `shape-${Date.now()}`;
    const maxZ = Math.max(...elements.map((e) => e.zIndex), 1) + 1;
    let newEl: CanvasCoverElement;

    const accent = currentTemplate.defaultAccent || "#1B365D";

    if (shapeType === "wedge") {
      newEl = {
        id: newId,
        type: "shape",
        name: "Geometric Corner Wedge",
        shapeType: "svg",
        x: pageW - 160,
        y: 0,
        width: 160,
        height: 160,
        fillColor: accent,
        svgContent: `<svg viewBox="0 0 160 160" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 160,0 160,160 0,0" fill="${accent}"/></svg>`,
        zIndex: maxZ,
      };
    } else if (shapeType === "chevron") {
      newEl = {
        id: newId,
        type: "shape",
        name: "Geometric Chevron",
        shapeType: "svg",
        x: pageW - 100,
        y: pageH / 2 - 80,
        width: 100,
        height: 160,
        fillColor: accent,
        svgContent: `<svg viewBox="0 0 100 160" width="100%" height="100%" preserveAspectRatio="none"><polygon points="100,0 100,160 0,160 60,80" fill="${accent}"/></svg>`,
        zIndex: maxZ,
      };
    } else if (shapeType === "dots") {
      newEl = {
        id: newId,
        type: "shape",
        name: "Dot Matrix Grid",
        shapeType: "svg",
        x: pageW - 70,
        y: 80,
        width: 32,
        height: 80,
        fillColor: "#3B82F6",
        svgContent: `<svg viewBox="0 0 32 80" width="100%" height="100%">
          <circle cx="8" cy="10" r="3" fill="#3B82F6" opacity="0.8"/>
          <circle cx="24" cy="10" r="3" fill="#3B82F6" opacity="0.8"/>
          <circle cx="8" cy="30" r="3" fill="#3B82F6" opacity="0.8"/>
          <circle cx="24" cy="30" r="3" fill="#3B82F6" opacity="0.8"/>
          <circle cx="8" cy="50" r="3" fill="#3B82F6" opacity="0.8"/>
          <circle cx="24" cy="50" r="3" fill="#3B82F6" opacity="0.8"/>
          <circle cx="8" cy="70" r="3" fill="#3B82F6" opacity="0.8"/>
          <circle cx="24" cy="70" r="3" fill="#3B82F6" opacity="0.8"/>
        </svg>`,
        zIndex: maxZ,
      };
    } else if (shapeType === "stripe") {
      newEl = {
        id: newId,
        type: "shape",
        name: "Diagonal Speed Stripe",
        shapeType: "svg",
        x: 0,
        y: 0,
        width: 220,
        height: 110,
        fillColor: "#F59E0B",
        svgContent: `<svg viewBox="0 0 220 110" width="100%" height="100%" preserveAspectRatio="none"><polygon points="0,0 220,0 110,110 0,110" fill="#F59E0B"/></svg>`,
        zIndex: maxZ,
      };
    } else if (shapeType === "divider") {
      newEl = {
        id: newId,
        type: "divider",
        name: "Divider Line",
        shapeType: "rectangle",
        x: pageW / 2 - 120,
        y: pageH / 2,
        width: 240,
        height: 2,
        fillColor: accent,
        zIndex: maxZ,
      };
    } else if (shapeType === "circle") {
      newEl = {
        id: newId,
        type: "shape",
        name: "Circle Ornament",
        shapeType: "circle",
        x: pageW / 2 - 45,
        y: pageH / 2 - 45,
        width: 90,
        height: 90,
        fillColor: `${accent}22`,
        borderColor: accent,
        borderWidth: 2,
        borderRadius: 45,
        zIndex: maxZ,
      };
    } else if (shapeType === "accent-bar") {
      newEl = {
        id: newId,
        type: "shape",
        name: "Accent Ribbon",
        shapeType: "accent-bar",
        x: 40,
        y: pageH / 2 - 80,
        width: 6,
        height: 160,
        fillColor: accent,
        borderRadius: 3,
        zIndex: maxZ,
      };
    } else {
      newEl = {
        id: newId,
        type: "shape",
        name: "Card Container",
        shapeType: "rounded-card",
        x: pageW / 2 - 150,
        y: pageH / 2 - 50,
        width: 300,
        height: 100,
        fillColor: "#F8FAFC",
        borderColor: "#E2E8F0",
        borderWidth: 1,
        borderRadius: 8,
        zIndex: maxZ,
      };
    }

    pushState([...elements, newEl]);
    setSelectedId(newId);
    toast.success("Design element added");
  };

  // Logo / Image Upload
  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
      toast.error("Please select a PNG, JPG, or WebP image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file must be smaller than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      const newId = `image-${Date.now()}`;
      const maxZ = Math.max(...elements.map((e) => e.zIndex), 1) + 1;
      const newEl: CanvasCoverElement = {
        id: newId,
        type: "image",
        name: file.name.slice(0, 20),
        x: pageW / 2 - 75,
        y: 80,
        width: 150,
        height: 80,
        imageUrl: dataUrl,
        imageFit: "contain",
        zIndex: maxZ,
      };
      pushState([...elements, newEl]);
      setSelectedId(newId);
      toast.success("Logo inserted onto canvas", {
        description: `Native aspect ratio and transparency preserved (${file.name}).`,
      });
    };
    reader.readAsDataURL(file);
  };

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    if (id === "canvas-bg") {
      setSelectedId(null);
      return;
    }
    e.stopPropagation();
    setSelectedId(id);
    const target = elements.find((el) => el.id === id);
    if (!target) return;

    setDragState({
      isDragging: true,
      elementId: id,
      startX: e.clientX,
      startY: e.clientY,
      initialElemX: target.x,
      initialElemY: target.y,
    });
  };

  const handleResizeStart = (e: React.MouseEvent, id: string, handle: "nw" | "ne" | "sw" | "se") => {
    e.stopPropagation();
    const target = elements.find((el) => el.id === id);
    if (!target) return;

    setResizeState({
      isResizing: true,
      elementId: id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialBounds: { x: target.x, y: target.y, width: target.width, height: target.height },
    });
  };

  // Canvas Mouse Move (Drag & Resize)
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (dragState?.isDragging) {
      const dx = (e.clientX - dragState.startX) / zoom;
      const dy = (e.clientY - dragState.startY) / zoom;
      const nextX = Math.round(dragState.initialElemX + dx);
      const nextY = Math.round(dragState.initialElemY + dy);

      setElements((prev) =>
        prev.map((el) => (el.id === dragState.elementId ? { ...el, x: nextX, y: nextY } : el)),
      );
    } else if (resizeState?.isResizing) {
      const dx = (e.clientX - resizeState.startX) / zoom;
      const dy = (e.clientY - resizeState.startY) / zoom;
      const { x, y, width, height } = resizeState.initialBounds;

      let nextX = x;
      let nextY = y;
      let nextW = width;
      let nextH = height;

      if (resizeState.handle === "se") {
        nextW = Math.max(30, Math.round(width + dx));
        nextH = Math.max(15, Math.round(height + dy));
      } else if (resizeState.handle === "sw") {
        nextW = Math.max(30, Math.round(width - dx));
        nextX = Math.round(x + (width - nextW));
        nextH = Math.max(15, Math.round(height + dy));
      } else if (resizeState.handle === "ne") {
        nextW = Math.max(30, Math.round(width + dx));
        nextH = Math.max(15, Math.round(height - dy));
        nextY = Math.round(y + (height - nextH));
      } else if (resizeState.handle === "nw") {
        nextW = Math.max(30, Math.round(width - dx));
        nextX = Math.round(x + (width - nextW));
        nextH = Math.max(15, Math.round(height - dy));
        nextY = Math.round(y + (height - nextH));
      }

      setElements((prev) =>
        prev.map((el) =>
          el.id === resizeState.elementId
            ? { ...el, x: nextX, y: nextY, width: nextW, height: nextH }
            : el,
        ),
      );
    }
  };

  const handleCanvasMouseUp = () => {
    if (dragState?.isDragging) {
      pushState(elements);
      setDragState(null);
    }
    if (resizeState?.isResizing) {
      pushState(elements);
      setResizeState(null);
    }
  };

  // Validation & Adjust & Apply
  const validateBeforeApply = (): boolean => {
    const warnings: string[] = [];

    // 1. Title verification
    const titleEl = elements.find((e) => e.isMetadataField === "assignmentTitle" || e.name?.includes("Title"));
    if (!titleEl || !titleEl.text?.trim()) {
      warnings.push("Document / Assignment title is missing or blank.");
    }

    // 2. Student credentials check
    const isGroup = metadata.assignmentType === "group";
    if (!isGroup) {
      const studentEl = elements.find((e) => e.isMetadataField === "studentName" || e.name?.includes("Student"));
      if (!studentEl || !studentEl.text?.trim()) {
        warnings.push("Student identification text is missing.");
      }
    }

    // 3. Page boundaries overflow detection
    const overflowing = elements.filter(
      (e) =>
        e.id !== "canvas-bg" &&
        (e.x < -10 || e.y < -10 || e.x + e.width > pageW + 10 || e.y + e.height > pageH + 10),
    );
    if (overflowing.length > 0) {
      warnings.push(
        `${overflowing.length} element(s) appear to extend beyond the page print margins.`,
      );
    }

    setValidationWarnings(warnings);
    return warnings.length === 0;
  };

  const handleAdjustAndApplyClick = () => {
    const isValid = validateBeforeApply();
    if (!isValid) {
      setShowApplyConfirm(true);
      return;
    }
    executeApply();
  };

  const executeApply = () => {
    // Synchronize elements back to metadata
    const updatedMeta: AssignmentMetadata = {
      ...metadata,
      customCoverElements: elements,
      accentColor: currentTemplate.defaultAccent,
      pageFormat: isLetter ? "Letter" : "A4",
      pageOrientation: isLandscape ? "landscape" : "portrait",
    };

    onApply(updatedMeta);
    toast.success("Cover Design Adjusted & Applied Successfully!", {
      description: "Custom layout, typography, and styling applied to your active document.",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 text-slate-100 select-none animate-in fade-in duration-200">
      {/* Top Application Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-950 px-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 gap-1.5 text-xs"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Close</span>
          </Button>

          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-sm text-white">DocuMind Canvas Studio</span>
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full">
              {currentTemplate.name}
            </span>
          </div>
        </div>

        {/* Center Canvas Tools: Undo, Redo, Zoom */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1">
          <button
            type="button"
            disabled={history.length === 0}
            onClick={handleUndo}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={future.length === 0}
            onClick={handleRedo}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="font-mono text-[11px] text-slate-300 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(0.72)}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors text-[10px]"
            title="Fit to Screen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Right Action: Reset & Adjust and Apply */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetToTemplate}
            className="text-xs text-slate-400 hover:text-white hover:bg-slate-800 h-8 gap-1.5"
            title="Reset to default template positions"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleAdjustAndApplyClick}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 px-4 gap-1.5 shadow-lg shadow-emerald-950"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Adjust & Apply</span>
          </Button>
        </div>
      </header>

      {/* Main Workspace Body: Left Sidebar, Canvas Center, Right Properties */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT TOOLBOX NAVIGATION */}
        <aside className="w-16 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-3 gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={`flex flex-col items-center justify-center h-12 w-12 rounded-xl transition-all ${
              activeTab === "templates"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Cover Templates (52+ Layouts)"
          >
            <Layout className="h-5 w-5" />
            <span className="text-[9px] mt-0.5 font-medium">Templates</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("text")}
            className={`flex flex-col items-center justify-center h-12 w-12 rounded-xl transition-all ${
              activeTab === "text"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Add Text Elements"
          >
            <Type className="h-5 w-5" />
            <span className="text-[9px] mt-0.5 font-medium">Text</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("elements")}
            className={`flex flex-col items-center justify-center h-12 w-12 rounded-xl transition-all ${
              activeTab === "elements"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Shapes & Borders"
          >
            <Square className="h-5 w-5" />
            <span className="text-[9px] mt-0.5 font-medium">Shapes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("images")}
            className={`flex flex-col items-center justify-center h-12 w-12 rounded-xl transition-all ${
              activeTab === "images"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Upload Logo & Media"
          >
            <ImageIcon className="h-5 w-5" />
            <span className="text-[9px] mt-0.5 font-medium">Logos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("setup")}
            className={`flex flex-col items-center justify-center h-12 w-12 rounded-xl transition-all ${
              activeTab === "setup"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Page Size & Layout"
          >
            <Sliders className="h-5 w-5" />
            <span className="text-[9px] mt-0.5 font-medium">Page</span>
          </button>
        </aside>

        {/* LEFT TOOLBOX FLYOUT CONTENT PANEL */}
        <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col overflow-y-auto shrink-0 p-4 space-y-4">
          {/* TAB 1: TEMPLATES */}
          {activeTab === "templates" && (
            <div className="space-y-3.5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Cover Templates ({COVER_TEMPLATES_REGISTRY.length})
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click any template to adapt its visual geometry and styling.
                </p>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search 50+ templates..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-1">
                {[
                  "All",
                  "Academic",
                  "Modern",
                  "Formal",
                  "Research",
                  "Business",
                  "Minimalist",
                  "Geometric",
                  "Creative",
                ].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTemplateCategory(cat)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                      templateCategory === cat
                        ? "bg-primary text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Template List */}
              <div className="space-y-2 pt-1 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
                {COVER_TEMPLATES_REGISTRY.filter((t) => {
                  const matchCat =
                    templateCategory === "All" ||
                    t.category.toLowerCase() === templateCategory.toLowerCase();
                  const matchQ =
                    !templateSearch ||
                    t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
                    t.tagline.toLowerCase().includes(templateSearch.toLowerCase());
                  return matchCat && matchQ;
                }).map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      currentTemplate.id === tpl.id
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white">{tpl.name}</h4>
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: tpl.defaultAccent }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{tpl.tagline}</p>
                    <div className="mt-2 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                      <span>{tpl.category}</span>
                      <span>{tpl.borderStyle}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: TEXT */}
          {activeTab === "text" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Add Text Elements
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Insert editable typography onto your canvas.
                </p>
              </div>

              <div className="space-y-2.5">
                <Button
                  onClick={() => handleAddText("title")}
                  variant="outline"
                  className="w-full justify-start text-xs h-12 bg-slate-950 border-slate-800 hover:bg-slate-800 text-white font-bold"
                >
                  <Type className="h-5 w-5 mr-3 text-primary" />
                  <div className="text-left">
                    <div>Add Heading</div>
                    <div className="text-[10px] text-slate-400 font-normal">Title font 28pt bold</div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleAddText("subtitle")}
                  variant="outline"
                  className="w-full justify-start text-xs h-12 bg-slate-950 border-slate-800 hover:bg-slate-800 text-white font-medium"
                >
                  <Type className="h-4 w-4 mr-3 text-sky-400" />
                  <div className="text-left">
                    <div>Add Subheading</div>
                    <div className="text-[10px] text-slate-400 font-normal">Subtitle font 14pt medium</div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleAddText("body")}
                  variant="outline"
                  className="w-full justify-start text-xs h-12 bg-slate-950 border-slate-800 hover:bg-slate-800 text-white"
                >
                  <Type className="h-3.5 w-3.5 mr-3 text-slate-400" />
                  <div className="text-left">
                    <div>Add Body Text</div>
                    <div className="text-[10px] text-slate-400 font-normal">Paragraph font 11pt regular</div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleAddText("badge")}
                  variant="outline"
                  className="w-full justify-start text-xs h-12 bg-slate-950 border-slate-800 hover:bg-slate-800 text-white"
                >
                  <span className="h-4 w-4 rounded-full bg-primary/40 border border-primary mr-3 flex items-center justify-center text-[8px] font-mono">
                    #
                  </span>
                  <div className="text-left">
                    <div>Add Pill Badge</div>
                    <div className="text-[10px] text-slate-400 font-normal">Course code or category tag</div>
                  </div>
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: SHAPES & ELEMENTS */}
          {activeTab === "elements" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Shapes & Dividers
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Add containers, accent ribbons, and borders.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleAddShape("wedge")}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-primary flex flex-col items-center justify-center gap-1.5 transition-all text-xs"
                >
                  <div className="h-8 w-8 bg-primary rounded-xs [clip-path:polygon(0_0,100%_0,100%_100%)]" />
                  <span className="text-[11px] text-slate-300">Corner Wedge</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddShape("chevron")}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-primary flex flex-col items-center justify-center gap-1.5 transition-all text-xs"
                >
                  <div className="h-8 w-6 bg-primary rounded-xs [clip-path:polygon(100%_0,100%_100%,0_100%,60%_50%)]" />
                  <span className="text-[11px] text-slate-300">Edge Chevron</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddShape("dots")}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-primary flex flex-col items-center justify-center gap-1.5 transition-all text-xs"
                >
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  </div>
                  <span className="text-[11px] text-slate-300">Dot Grid Matrix</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddShape("stripe")}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-primary flex flex-col items-center justify-center gap-1.5 transition-all text-xs"
                >
                  <div className="h-6 w-12 bg-amber-500 rounded-xs [clip-path:polygon(0_0,100%_0,60%_100%,0_100%)]" />
                  <span className="text-[11px] text-slate-300">Diagonal Stripe</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddShape("divider")}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-primary flex flex-col items-center justify-center gap-1.5 transition-all text-xs"
                >
                  <div className="h-1 w-12 bg-primary my-3.5" />
                  <span className="text-[11px] text-slate-300">Divider Rule</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddShape("accent-bar")}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-primary flex flex-col items-center justify-center gap-1.5 transition-all text-xs"
                >
                  <div className="h-10 w-2.5 bg-primary rounded" />
                  <span className="text-[11px] text-slate-300">Accent Ribbon</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddShape("circle")}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-primary flex flex-col items-center justify-center gap-1.5 transition-all text-xs"
                >
                  <div className="h-8 w-8 rounded-full border-2 border-primary bg-primary/10" />
                  <span className="text-[11px] text-slate-300">Circle Frame</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddShape("rounded-card")}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-primary flex flex-col items-center justify-center gap-1.5 transition-all text-xs"
                >
                  <div className="h-8 w-12 rounded border-2 border-primary bg-primary/10" />
                  <span className="text-[11px] text-slate-300">Card Frame</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: LOGO & IMAGES */}
          {activeTab === "images" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Logo & Image Upload
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Upload your university seal, college emblem, department crest, or business logo (PNG, SVG, JPG up to 5MB).
                </p>
              </div>

              <div
                onClick={() => logoInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-500/50 hover:border-emerald-400 rounded-xl p-5 text-center cursor-pointer transition-colors bg-emerald-950/20 group"
              >
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-2 text-emerald-400 group-hover:scale-110 transition-transform">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-slate-100">
                  Click to upload University or Business Logo
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Supports PNG, SVG, JPG • Background transparency preserved
                </p>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleUploadImage}
                className="hidden"
              />

              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Quick Sample Logos (1-Click Insert)
                </span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const svgUri = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="%231E3A8A" stroke="%23F59E0B" stroke-width="4"/><polygon points="50,18 78,78 22,78" fill="none" stroke="%23FFFFFF" stroke-width="3"/><text x="50" y="62" font-family="serif" font-size="28" font-weight="bold" fill="%23F59E0B" text-anchor="middle">U</text></svg>`;
                      const newId = `sample-uni-${Date.now()}`;
                      const maxZ = Math.max(...elements.map((e) => e.zIndex), 1) + 1;
                      const newEl: CanvasCoverElement = {
                        id: newId,
                        type: "image",
                        name: "University Crest",
                        x: pageW / 2 - 50,
                        y: 75,
                        width: 100,
                        height: 100,
                        imageUrl: svgUri,
                        imageFit: "contain",
                        zIndex: maxZ,
                      };
                      pushState([...elements, newEl]);
                      setSelectedId(newId);
                      toast.success("University Crest added to canvas");
                    }}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500/50 flex flex-col items-center gap-1.5 transition-all text-xs group"
                  >
                    <div className="h-8 w-8 rounded-full bg-blue-900 border-2 border-amber-500 flex items-center justify-center font-serif text-amber-400 font-bold text-xs">
                      U
                    </div>
                    <span className="text-[10px] text-slate-300 font-medium">University Crest</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const svgUri = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40"><rect width="120" height="40" rx="8" fill="%230F172A"/><text x="60" y="26" font-family="sans-serif" font-size="16" font-weight="900" fill="%2310B981" letter-spacing="2" text-anchor="middle">CORP</text></svg>`;
                      const newId = `sample-corp-${Date.now()}`;
                      const maxZ = Math.max(...elements.map((e) => e.zIndex), 1) + 1;
                      const newEl: CanvasCoverElement = {
                        id: newId,
                        type: "image",
                        name: "Business Logo",
                        x: pageW / 2 - 60,
                        y: 80,
                        width: 120,
                        height: 40,
                        imageUrl: svgUri,
                        imageFit: "contain",
                        zIndex: maxZ,
                      };
                      pushState([...elements, newEl]);
                      setSelectedId(newId);
                      toast.success("Corporate Logo added to canvas");
                    }}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500/50 flex flex-col items-center gap-1.5 transition-all text-xs group"
                  >
                    <div className="h-8 w-14 rounded bg-slate-800 border border-emerald-500 flex items-center justify-center font-sans text-emerald-400 font-black text-[9px] tracking-wider">
                      CORP
                    </div>
                    <span className="text-[10px] text-slate-300 font-medium">Business Logo</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PAGE SETUP */}
          {activeTab === "setup" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Page Geometry & Canvas
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Configure output print dimensions and canvas styling.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Page Dimension Standard
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        toast.info("A4 (210 × 297 mm) selected");
                      }}
                      className="p-2.5 rounded-lg border border-primary bg-primary/10 text-white font-semibold text-center"
                    >
                      ISO A4
                      <span className="block text-[10px] text-slate-400 font-normal">210 × 297 mm</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        toast.info("US Letter selected");
                      }}
                      className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-white text-center"
                    >
                      US Letter
                      <span className="block text-[10px] text-slate-400 font-normal">8.5 × 11 in</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Primary Accent Theme
                  </label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {PRESET_COLORS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => {
                          const bg = elements.find((e) => e.id === "canvas-bg");
                          if (bg) updateElementProp("canvas-bg", { borderColor: hex });
                        }}
                        className="h-6 w-6 rounded-full border border-slate-700 hover:scale-110 transition-transform"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* CENTER VIEWPORT: SCALABLE CANVAS */}
        <main
          className="flex-1 bg-slate-950 overflow-auto p-8 flex items-center justify-center relative cursor-default"
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onClick={() => setSelectedId(null)}
        >
          {/* Virtual Canvas Container */}
          <div
            ref={canvasRef}
            className="relative bg-white shadow-2xl transition-transform duration-75 origin-center"
            style={{
              width: pageW,
              height: pageH,
              transform: `scale(${zoom})`,
              minWidth: pageW,
              minHeight: pageH,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Elements Layer */}
            {elements
              .slice()
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((el) => {
                const isSelected = selectedId === el.id;

                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleMouseDown(e, el.id)}
                    style={{
                      position: "absolute",
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height,
                      zIndex: el.zIndex,
                      cursor: el.id === "canvas-bg" ? "default" : "move",
                      transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                    }}
                    className={`group ${
                      isSelected && el.id !== "canvas-bg"
                        ? "ring-2 ring-blue-500 ring-offset-1"
                        : "hover:outline hover:outline-1 hover:outline-blue-300"
                    }`}
                  >
                    {/* 1. TEXT ELEMENT */}
                    {el.type === "text" && (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          fontFamily: el.fontFamily,
                          fontSize: `${el.fontSize || 14}px`,
                          fontWeight: el.fontWeight || "normal",
                          fontStyle: el.fontStyle || "normal",
                          textAlign: el.textAlign || "left",
                          color: el.textColor || "#0F172A",
                          textTransform: el.textTransform || "none",
                          letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
                          lineHeight: el.lineHeight || 1.3,
                          backgroundColor: el.fillColor || "transparent",
                          borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
                          padding: el.fillColor ? "4px 10px" : undefined,
                          boxSizing: "border-box",
                          wordBreak: "break-word",
                          display: "flex",
                          alignItems: "center",
                          justifyContent:
                            el.textAlign === "center"
                              ? "center"
                              : el.textAlign === "right"
                                ? "flex-end"
                                : "flex-start",
                        }}
                      >
                        {el.text}
                      </div>
                    )}

                    {/* 2. SHAPE ELEMENT */}
                    {el.type === "shape" && (
                      el.svgContent ? (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            opacity: el.opacity ?? 1,
                            pointerEvents: "none",
                          }}
                          dangerouslySetInnerHTML={{ __html: el.svgContent }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            backgroundColor: el.fillColor || "transparent",
                            borderColor: el.borderColor || "transparent",
                            borderWidth: el.borderWidth ? `${el.borderWidth}px` : 0,
                            borderStyle: el.borderWidth ? "solid" : "none",
                            borderRadius:
                              el.shapeType === "circle"
                                ? "50%"
                                : el.borderRadius
                                  ? `${el.borderRadius}px`
                                  : 0,
                            opacity: el.opacity ?? 1,
                          }}
                        />
                      )
                    )}

                    {/* 3. DIVIDER ELEMENT */}
                    {el.type === "divider" && (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          backgroundColor: el.fillColor || "#CBD5E1",
                        }}
                      />
                    )}

                    {/* 4. IMAGE ELEMENT */}
                    {el.type === "image" && el.imageUrl && (
                      <img
                        src={el.imageUrl}
                        alt={el.name || "Cover Image"}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: el.imageFit || "contain",
                          opacity: el.opacity ?? 1,
                          pointerEvents: "none",
                        }}
                      />
                    )}

                    {/* Selection Handles (Resize) */}
                    {isSelected && el.id !== "canvas-bg" && (
                      <>
                        <div
                          onMouseDown={(e) => handleResizeStart(e, el.id, "nw")}
                          className="absolute -top-1.5 -left-1.5 h-3 w-3 rounded-full bg-white border-2 border-blue-600 cursor-nwse-resize z-30"
                        />
                        <div
                          onMouseDown={(e) => handleResizeStart(e, el.id, "ne")}
                          className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-white border-2 border-blue-600 cursor-nesw-resize z-30"
                        />
                        <div
                          onMouseDown={(e) => handleResizeStart(e, el.id, "sw")}
                          className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-full bg-white border-2 border-blue-600 cursor-nesw-resize z-30"
                        />
                        <div
                          onMouseDown={(e) => handleResizeStart(e, el.id, "se")}
                          className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-full bg-white border-2 border-blue-600 cursor-nwse-resize z-30"
                        />
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        </main>

        {/* RIGHT PROPERTIES PANEL */}
        <aside className="w-72 bg-slate-950 border-l border-slate-800 flex flex-col overflow-y-auto shrink-0 p-4 space-y-4">
          {selectedElement && selectedElement.id !== "canvas-bg" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {selectedElement.name || selectedElement.type}
                  </h4>
                  <span className="font-mono text-[9px] text-slate-400">
                    ID: {selectedElement.id.slice(0, 14)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDuplicateElement(selectedElement.id)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                    title="Duplicate Element"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteElement(selectedElement.id)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400"
                    title="Delete Element"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* TEXT PROPERTIES */}
              {selectedElement.type === "text" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Text Value
                    </label>
                    <textarea
                      rows={2}
                      value={selectedElement.text || ""}
                      onChange={(e) => updateElementProp(selectedElement.id, { text: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded bg-slate-900 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Font Family
                    </label>
                    <select
                      value={selectedElement.fontFamily || FONT_OPTIONS[0]!.value}
                      onChange={(e) => updateElementProp(selectedElement.id, { fontFamily: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded bg-slate-900 border border-slate-800 text-white focus:outline-none"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        Font Size ({selectedElement.fontSize || 14}px)
                      </label>
                      <input
                        type="range"
                        min={9}
                        max={48}
                        value={selectedElement.fontSize || 14}
                        onChange={(e) => updateElementProp(selectedElement.id, { fontSize: Number(e.target.value) })}
                        className="w-full accent-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        Weight
                      </label>
                      <select
                        value={selectedElement.fontWeight || "normal"}
                        onChange={(e) => updateElementProp(selectedElement.id, { fontWeight: e.target.value as any })}
                        className="w-full px-2 py-1 text-xs rounded bg-slate-900 border border-slate-800 text-white"
                      >
                        <option value="normal">Regular</option>
                        <option value="500">Medium</option>
                        <option value="600">Semibold</option>
                        <option value="700">Bold</option>
                        <option value="800">Black</option>
                      </select>
                    </div>
                  </div>

                  {/* Alignment & Style Buttons */}
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Alignment & Case
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateElementProp(selectedElement.id, { textAlign: "left" })}
                        className={`p-1.5 rounded ${selectedElement.textAlign === "left" ? "bg-primary text-white" : "bg-slate-900 text-slate-400 hover:text-white"}`}
                      >
                        <AlignLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateElementProp(selectedElement.id, { textAlign: "center" })}
                        className={`p-1.5 rounded ${selectedElement.textAlign === "center" ? "bg-primary text-white" : "bg-slate-900 text-slate-400 hover:text-white"}`}
                      >
                        <AlignCenter className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateElementProp(selectedElement.id, { textAlign: "right" })}
                        className={`p-1.5 rounded ${selectedElement.textAlign === "right" ? "bg-primary text-white" : "bg-slate-900 text-slate-400 hover:text-white"}`}
                      >
                        <AlignRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateElementProp(selectedElement.id, {
                            textTransform: selectedElement.textTransform === "uppercase" ? "none" : "uppercase",
                          })
                        }
                        className={`px-2 py-1 rounded text-[10px] font-bold ${selectedElement.textTransform === "uppercase" ? "bg-primary text-white" : "bg-slate-900 text-slate-400"}`}
                      >
                        AA
                      </button>
                    </div>
                  </div>

                  {/* Color Palettes */}
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Text Color
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {PRESET_COLORS.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => updateElementProp(selectedElement.id, { textColor: hex })}
                          className={`h-5 w-5 rounded-full border ${selectedElement.textColor === hex ? "ring-2 ring-white" : "border-slate-800"}`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SHAPE PROPERTIES */}
              {selectedElement.type === "shape" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Fill Color
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {PRESET_COLORS.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => updateElementProp(selectedElement.id, { fillColor: hex })}
                          className={`h-5 w-5 rounded-full border ${selectedElement.fillColor === hex ? "ring-2 ring-white" : "border-slate-800"}`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Border Color
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {PRESET_COLORS.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => updateElementProp(selectedElement.id, { borderColor: hex })}
                          className={`h-5 w-5 rounded-full border ${selectedElement.borderColor === hex ? "ring-2 ring-white" : "border-slate-800"}`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* POSITION & DIMENSIONS */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">
                  Position & Size (Pixels)
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500">X:</span>
                    <input
                      type="number"
                      value={selectedElement.x}
                      onChange={(e) => updateElementProp(selectedElement.id, { x: Number(e.target.value) })}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">Y:</span>
                    <input
                      type="number"
                      value={selectedElement.y}
                      onChange={(e) => updateElementProp(selectedElement.id, { y: Number(e.target.value) })}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">W:</span>
                    <input
                      type="number"
                      value={selectedElement.width}
                      onChange={(e) => updateElementProp(selectedElement.id, { width: Number(e.target.value) })}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">H:</span>
                    <input
                      type="number"
                      value={selectedElement.height}
                      onChange={(e) => updateElementProp(selectedElement.id, { height: Number(e.target.value) })}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-white"
                    />
                  </div>
                </div>

                {/* Stacking layer controls */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBringForward(selectedElement.id)}
                    className="flex-1 text-[10px] h-7 bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300"
                  >
                    <ChevronUp className="h-3 w-3 mr-1" /> Bring Forward
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendBackward(selectedElement.id)}
                    className="flex-1 text-[10px] h-7 bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300"
                  >
                    <ChevronDown className="h-3 w-3 mr-1" /> Send Back
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Canvas Overview (When no element selected) */
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-800">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Page Overview
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click any element on the canvas to edit typography, shapes, and positions.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Dimensions:</span>
                  <span className="font-mono text-slate-200">
                    {pageW} × {pageH} px (ISO A4)
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Active Template:</span>
                  <span className="font-medium text-emerald-400">{currentTemplate.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Elements Count:</span>
                  <span className="font-mono text-slate-200">{elements.length}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Mode:</span>
                  <span className="text-slate-200 capitalize">
                    {metadata.assignmentType || "Individual"} Assignment
                  </span>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* VALIDATION CONFIRMATION MODAL */}
      {showApplyConfirm && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Cover Validation Notice</h3>
                <p className="text-xs text-slate-400">Please review before applying to your document.</p>
              </div>
            </div>

            <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-amber-300">
              {validationWarnings.map((w, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span>{w}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowApplyConfirm(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Back to Edit
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setShowApplyConfirm(false);
                  executeApply();
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Proceed & Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
