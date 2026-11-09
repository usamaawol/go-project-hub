/**
 * DocuMind Presentation Slide Editor
 * 
 * A genuine, full-featured presentation slide editing environment:
 * - 16:9 widescreen canvas (1333 x 750 virtual px).
 * - Drag-and-drop element repositioning.
 * - 8-point corner & edge resize handles.
 * - Element selection outlines & quick actions.
 * - Title/Topic repositioning presets (Top, Center, Left, Right).
 * - Comprehensive formatting toolbar (Font family, size, bold, italic, underline, color, align, line height).
 * - Shape controls (Rectangle, Rounded Card, Circle, Divider line, fill, border).
 * - Image controls (Upload, replace, delete, resize).
 * - Add new text boxes, shapes, and images.
 * - Full Undo / Redo history with keyboard shortcuts (Ctrl+Z, Ctrl+Y).
 * - Slide navigation, duplicate, delete, and add new slides.
 * - AI Slide Assistant with targeted single-slide redesign preserving manual edits.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { SlidePreviewItem } from "@/lib/presentation-session-client";
import { type ThemeTokens, stripHex } from "@/lib/presentation-theme";
import {
  type SlideElement,
  SLIDE_CANVAS_WIDTH,
  SLIDE_CANVAS_HEIGHT,
  convertSlideToElements,
  syncElementsToSlide,
} from "@/lib/slide-element-model";
import { verifyAndSanitizeImage } from "@/lib/image-verifier";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Type,
  Square,
  Circle,
  Minus,
  Image as ImageIcon,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Trash2,
  Copy,
  Plus,
  ArrowUp,
  ArrowDown,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Palette,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  RefreshCw,
  Sliders,
  Check,
  Layers,
  Layout,
  Move,
  Loader2,
} from "lucide-react";

export interface PresentationSlideEditorProps {
  slide: SlidePreviewItem;
  slideIndex: number;
  totalSlides: number;
  tokens: ThemeTokens;
  theme: {
    id: string;
    name: string;
    category: string;
    kind: string;
    colors: { primary: string; accent: string; bg: string };
    fonts: string;
    tier: "free" | "pro";
  };
  onUpdateSlide: (updatedSlide: SlidePreviewItem) => void;
  onPrevSlide: () => void;
  onNextSlide: () => void;
  onAddNewSlide: () => void;
  onDuplicateSlide: () => void;
  onDeleteSlide: () => void;
  onMoveSlide: (direction: "up" | "down") => void;
  onRegenerateWithAI: (instruction: string) => Promise<void>;
  isRegeneratingAI: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  downloading: boolean;
  onDownloadPptx: () => void;
  onEditCoverMetadata?: () => void;
}

const FONT_OPTIONS = [
  { label: "Inter (Modern Sans)", value: "Inter" },
  { label: "Roboto (Technical Clean)", value: "Roboto" },
  { label: "Playfair Display (Editorial)", value: "Playfair Display" },
  { label: "Montserrat (Geometric Sans)", value: "Montserrat" },
  { label: "Merriweather (Academic Serif)", value: "Merriweather" },
  { label: "Calibri (Corporate Standard)", value: "Calibri" },
  { label: "Georgia (Collegiate Serif)", value: "Georgia" },
  { label: "JetBrains Mono (Code/STEM)", value: "JetBrains Mono" },
];

const PRESET_PALETTE = [
  "#0F172A", // Dark Slate
  "#1E293B", // Navy Slate
  "#2563EB", // Royal Blue
  "#06B6D4", // Cyan
  "#10B981", // Emerald
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#F59E0B", // Amber
  "#EF4444", // Crimson
  "#FFFFFF", // Pure White
  "#F8FAFC", // Off White
  "#64748B", // Muted Slate
];

export function PresentationSlideEditor({
  slide,
  slideIndex,
  totalSlides,
  tokens,
  theme,
  onUpdateSlide,
  onPrevSlide,
  onNextSlide,
  onAddNewSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onMoveSlide,
  onRegenerateWithAI,
  isRegeneratingAI,
  isFullscreen,
  onToggleFullscreen,
  downloading,
  onDownloadPptx,
  onEditCoverMetadata,
}: PresentationSlideEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageUploadInputRef = useRef<HTMLInputElement>(null);

  // Initialize Elements from slide
  const [elements, setElements] = useState<SlideElement[]>(() =>
    convertSlideToElements(slide, tokens),
  );

  // Undo / Redo Stacks
  const [history, setHistory] = useState<SlideElement[][]>([]);
  const [future, setFuture] = useState<SlideElement[][]>([]);

  // Selection & Active Tool
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // Zoom & View
  const [zoomLevel, setZoomLevel] = useState<number>(0.85);

  // Dragging & Resizing State
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    elementId: string;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
  } | null>(null);

  const [resizeState, setResizeState] = useState<{
    isResizing: boolean;
    elementId: string;
    handle: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    initW: number;
    initH: number;
  } | null>(null);

  // AI Prompt State
  const [aiPromptInput, setAiPromptInput] = useState("");

  // Slide Background Color
  const currentBg = slide.customBgColor || tokens.bg;

  // When active slide changes from outside (e.g. user clicked thumbnail or slide navigation)
  useEffect(() => {
    const freshElements = convertSlideToElements(slide, tokens);
    setElements(freshElements);
    setHistory([]);
    setFuture([]);
    setSelectedId(null);
    setEditingTextId(null);
  }, [slide.id, slideIndex]);

  // Push element changes to history & parent
  const commitElements = useCallback(
    (newElements: SlideElement[], recordHistory = true) => {
      if (recordHistory) {
        setHistory((prev) => [...prev.slice(-30), elements]);
        setFuture([]);
      }
      setElements(newElements);
      const synced = syncElementsToSlide(newElements, slide);
      onUpdateSlide(synced);
    },
    [elements, slide, onUpdateSlide],
  );

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1]!;
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setFuture((prev) => [elements, ...prev]);
    setElements(previous);
    const synced = syncElementsToSlide(previous, slide);
    onUpdateSlide(synced);
    toast.info("Undo change");
  }, [history, elements, slide, onUpdateSlide]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0]!;
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, elements]);
    setElements(next);
    const synced = syncElementsToSlide(next, slide);
    onUpdateSlide(synced);
    toast.info("Redo change");
  }, [future, elements, slide, onUpdateSlide]);

  // Keyboard Shortcuts: Ctrl+Z (Undo), Ctrl+Y (Redo), Delete (Delete Element), Esc (Deselect)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Z")
      ) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId && !editingTextId) {
          e.preventDefault();
          handleDeleteElement(selectedId);
        }
      } else if (e.key === "Escape") {
        setSelectedId(null);
        setEditingTextId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, selectedId, editingTextId]);

  // Selected Element
  const selectedElement = useMemo(
    () => elements.find((el) => el.id === selectedId) || null,
    [elements, selectedId],
  );

  // Update specific attributes of the selected element
  const updateSelectedElement = (updates: Partial<SlideElement>) => {
    if (!selectedId) return;
    const updated = elements.map((el) => (el.id === selectedId ? { ...el, ...updates } : el));
    commitElements(updated);
  };

  // -------------------------------------------------------------
  // ELEMENT ACTIONS: ADD, DUPLICATE, DELETE, LAYERING
  // -------------------------------------------------------------
  const handleAddTextBox = () => {
    const newEl: SlideElement = {
      id: `text-${Date.now()}`,
      type: "text",
      role: "custom",
      x: 350,
      y: 280,
      width: 450,
      height: 65,
      text: "New Text Box",
      fontFamily: tokens.fontTitle || "Inter",
      fontSize: 22,
      fontWeight: "bold",
      textColor: tokens.textPrimary,
      textAlign: "left",
      zIndex: elements.length + 10,
    };
    commitElements([...elements, newEl]);
    setSelectedId(newEl.id);
    toast.success("Text box added to slide");
  };

  const handleAddShape = (shapeType: "rect" | "roundRect" | "circle" | "line") => {
    const isLine = shapeType === "line";
    const newEl: SlideElement = {
      id: `shape-${Date.now()}`,
      type: isLine ? "line" : "shape",
      role: "shape",
      shapeType,
      x: 350,
      y: 280,
      width: isLine ? 400 : 250,
      height: isLine ? 4 : 160,
      fillColor: isLine ? tokens.accent : tokens.cardBg,
      borderColor: tokens.accent,
      borderWidth: isLine ? 0 : 2,
      borderRadius: shapeType === "roundRect" ? 16 : shapeType === "circle" ? 9999 : 0,
      zIndex: elements.length + 5,
    };
    commitElements([...elements, newEl]);
    setSelectedId(newEl.id);
    toast.success(`${shapeType === "roundRect" ? "Card" : isLine ? "Line" : "Shape"} added`);
  };

  const handleDuplicateElement = (id: string) => {
    const target = elements.find((el) => el.id === id);
    if (!target) return;
    const duplicated: SlideElement = {
      ...target,
      id: `${target.id}-copy-${Date.now()}`,
      x: Math.min(SLIDE_CANVAS_WIDTH - target.width, target.x + 30),
      y: Math.min(SLIDE_CANVAS_HEIGHT - target.height, target.y + 30),
      zIndex: elements.length + 10,
    };
    commitElements([...elements, duplicated]);
    setSelectedId(duplicated.id);
    toast.success("Element duplicated");
  };

  const handleDeleteElement = (id: string) => {
    const updated = elements.filter((el) => el.id !== id);
    commitElements(updated);
    setSelectedId(null);
    setEditingTextId(null);
    toast.info("Element deleted");
  };

  const handleBringToFront = (id: string) => {
    const maxZ = Math.max(...elements.map((e) => e.zIndex || 1), 1);
    const updated = elements.map((e) => (e.id === id ? { ...e, zIndex: maxZ + 1 } : e));
    commitElements(updated);
    toast.success("Brought to front");
  };

  const handleSendToBack = (id: string) => {
    const minZ = Math.min(...elements.map((e) => e.zIndex || 1), 1);
    const updated = elements.map((e) => (e.id === id ? { ...e, zIndex: Math.max(1, minZ - 1) } : e));
    commitElements(updated);
    toast.success("Sent to back");
  };

  const handleCenterElement = (axis: "x" | "y" | "both") => {
    if (!selectedId) return;
    const target = elements.find((el) => el.id === selectedId);
    if (!target) return;
    const updates: Partial<SlideElement> = {};
    if (axis === "x" || axis === "both") {
      updates.x = Math.round((SLIDE_CANVAS_WIDTH - target.width) / 2);
    }
    if (axis === "y" || axis === "both") {
      updates.y = Math.round((SLIDE_CANVAS_HEIGHT - target.height) / 2);
    }
    updateSelectedElement(updates);
    toast.success(`Centered ${axis === "both" ? "horizontally & vertically" : axis === "x" ? "horizontally" : "vertically"}`);
  };

  const handleAddDiagram = (type: "workflow" | "bento" | "comparison" | "stats") => {
    const timestamp = Date.now();
    const newElements: SlideElement[] = [];
    const baseZ = elements.length + 10;

    if (type === "workflow") {
      const steps = [
        { num: "01", title: "Discovery", desc: "Define parameters & system scope" },
        { num: "02", title: "Architecture", desc: "Design resilient modular layers" },
        { num: "03", title: "Deployment", desc: "Verify quality gates & launch" },
      ];
      const cardW = 340;
      const cardH = 220;
      const cardY = 320;
      const gap = 55;
      const startX = 100;

      steps.forEach((step, idx) => {
        const x = startX + idx * (cardW + gap);
        newElements.push({
          id: `diag-card-${timestamp}-${idx}`,
          type: "card",
          role: "card",
          shapeType: "roundRect",
          x,
          y: cardY,
          width: cardW,
          height: cardH,
          fillColor: tokens.cardBg,
          borderColor: tokens.cardBorder,
          borderWidth: 1.5,
          borderRadius: 16,
          zIndex: baseZ + idx * 3,
        });
        newElements.push({
          id: `diag-badge-${timestamp}-${idx}`,
          type: "text",
          role: "custom",
          x: x + 24,
          y: cardY + 20,
          width: 90,
          height: 30,
          text: `PHASE ${step.num}`,
          fontFamily: tokens.fontBody,
          fontSize: 12,
          fontWeight: "bold",
          textColor: tokens.accent,
          zIndex: baseZ + idx * 3 + 1,
        });
        newElements.push({
          id: `diag-text-${timestamp}-${idx}`,
          type: "text",
          role: "custom",
          x: x + 24,
          y: cardY + 60,
          width: cardW - 48,
          height: 130,
          text: `${step.title}\n\n${step.desc}`,
          fontFamily: tokens.fontBody,
          fontSize: 16,
          fontWeight: "bold",
          textColor: tokens.textPrimary,
          zIndex: baseZ + idx * 3 + 2,
        });
      });
    } else if (type === "bento") {
      const cards = [
        { tag: "FOUNDATION", title: "Core Platform", desc: "Resilient infrastructure and secure boundary layer." },
        { tag: "ANALYTICS", title: "Real-time Metrics", desc: "Telemetric dashboards and live performance alerts." },
        { tag: "WORKFLOW", title: "Automated Pipeline", desc: "End-to-end continuous validation gates." },
        { tag: "SCALE", title: "High-Availability", desc: "Multi-region redundancy and failover handling." },
      ];
      const cardW = 545;
      const cardH = 190;
      const positions = [
        { x: 100, y: 240 },
        { x: 685, y: 240 },
        { x: 100, y: 460 },
        { x: 685, y: 460 },
      ];
      cards.forEach((card, idx) => {
        const { x, y } = positions[idx]!;
        newElements.push({
          id: `bento-card-${timestamp}-${idx}`,
          type: "card",
          role: "card",
          shapeType: "roundRect",
          x,
          y,
          width: cardW,
          height: cardH,
          fillColor: tokens.cardBg,
          borderColor: tokens.cardBorder,
          borderWidth: 1.5,
          borderRadius: 16,
          zIndex: baseZ + idx * 2,
        });
        newElements.push({
          id: `bento-text-${timestamp}-${idx}`,
          type: "text",
          role: "custom",
          x: x + 24,
          y: y + 20,
          width: cardW - 48,
          height: cardH - 40,
          text: `[${card.tag}]  ${card.title}\n\n${card.desc}`,
          fontFamily: tokens.fontBody,
          fontSize: 16,
          fontWeight: "bold",
          textColor: tokens.textPrimary,
          zIndex: baseZ + idx * 2 + 1,
        });
      });
    } else if (type === "comparison") {
      const colW = 545;
      const colH = 430;
      const colY = 240;
      const cols = [
        { x: 100, title: "In-Scope & Strengths", content: "• Full manual and AI presentation design control\n• Scalable 16:9 widescreen canvas\n• Real PowerPoint shapes and text export\n• Zero broken or invisible placeholder graphics" },
        { x: 685, title: "Constraints & Guardrails", content: "• Ephemeral storage guarantees privacy\n• Zero persistent database footprints\n• Strict format validation for all visuals\n• Automated fallback to vector diagrams" },
      ];
      cols.forEach((col, idx) => {
        newElements.push({
          id: `comp-card-${timestamp}-${idx}`,
          type: "card",
          role: "card",
          shapeType: "roundRect",
          x: col.x,
          y: colY,
          width: colW,
          height: colH,
          fillColor: tokens.cardBg,
          borderColor: idx === 0 ? tokens.accent : tokens.cardBorder,
          borderWidth: 2,
          borderRadius: 16,
          zIndex: baseZ + idx * 2,
        });
        newElements.push({
          id: `comp-text-${timestamp}-${idx}`,
          type: "text",
          role: "custom",
          x: col.x + 28,
          y: colY + 28,
          width: colW - 56,
          height: colH - 56,
          text: `${col.title}\n\n${col.content}`,
          fontFamily: tokens.fontBody,
          fontSize: 16,
          fontWeight: "normal",
          textColor: tokens.textPrimary,
          zIndex: baseZ + idx * 2 + 1,
        });
      });
    } else if (type === "stats") {
      const stats = [
        { value: "99.9%", label: "Availability SLA", sub: "Production benchmark" },
        { value: "4.8x", label: "Speed Acceleration", sub: "Optimized pipeline" },
        { value: "0 ms", label: "Render Latency", sub: "Client-side preview" },
      ];
      const cardW = 340;
      const cardH = 260;
      const cardY = 300;
      const gap = 55;
      const startX = 100;
      stats.forEach((st, idx) => {
        const x = startX + idx * (cardW + gap);
        newElements.push({
          id: `stat-card-${timestamp}-${idx}`,
          type: "card",
          role: "card",
          shapeType: "roundRect",
          x,
          y: cardY,
          width: cardW,
          height: cardH,
          fillColor: tokens.cardBg,
          borderColor: tokens.cardBorder,
          borderWidth: 1.5,
          borderRadius: 16,
          zIndex: baseZ + idx * 3,
        });
        newElements.push({
          id: `stat-val-${timestamp}-${idx}`,
          type: "text",
          role: "custom",
          x: x + 20,
          y: cardY + 30,
          width: cardW - 40,
          height: 70,
          text: st.value,
          fontFamily: tokens.fontTitle,
          fontSize: 48,
          fontWeight: "bold",
          textColor: tokens.accent,
          textAlign: "center",
          zIndex: baseZ + idx * 3 + 1,
        });
        newElements.push({
          id: `stat-lbl-${timestamp}-${idx}`,
          type: "text",
          role: "custom",
          x: x + 20,
          y: cardY + 120,
          width: cardW - 40,
          height: 80,
          text: `${st.label}\n${st.sub}`,
          fontFamily: tokens.fontBody,
          fontSize: 16,
          fontWeight: "bold",
          textColor: tokens.textPrimary,
          textAlign: "center",
          zIndex: baseZ + idx * 3 + 2,
        });
      });
    }

    commitElements([...elements, ...newElements]);
    toast.success(`Added ${type.toUpperCase()} diagram elements`);
  };

  // -------------------------------------------------------------
  // TITLE POSITIONING PRESETS (Requirement 5)
  // "Let the user decide where the topic and other content appear"
  // -------------------------------------------------------------
  const handlePositionTitle = (preset: "top" | "center" | "left" | "right") => {
    const titleEl = elements.find((e) => e.role === "title" || e.id.includes("title"));
    if (!titleEl) {
      toast.error("No title element found on this slide.");
      return;
    }

    let updates: Partial<SlideElement> = {};
    if (preset === "top") {
      updates = {
        x: 100,
        y: 85,
        width: 1133,
        height: 60,
        textAlign: "left",
      };
    } else if (preset === "center") {
      updates = {
        x: 100,
        y: 280,
        width: 1133,
        height: 120,
        textAlign: "center",
      };
    } else if (preset === "left") {
      updates = {
        x: 100,
        y: 200,
        width: 550,
        height: 240,
        textAlign: "left",
      };
    } else if (preset === "right") {
      updates = {
        x: 680,
        y: 200,
        width: 550,
        height: 240,
        textAlign: "left",
      };
    }

    const updated = elements.map((el) => (el.id === titleEl.id ? { ...el, ...updates } : el));
    commitElements(updated);
    setSelectedId(titleEl.id);
    toast.success(`Title positioned: ${preset.toUpperCase()}`);
  };

  // -------------------------------------------------------------
  // IMAGE UPLOAD & VERIFICATION (Requirement 1)
  // -------------------------------------------------------------
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a PNG, JPG, or SVG image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;

      const verification = await verifyAndSanitizeImage(rawDataUrl);
      if (!verification.valid || !verification.dataUrl) {
        toast.error("Image verification failed", {
          description: verification.error || "Unsupported or corrupted image file.",
        });
        return;
      }

      // If an image element is currently selected, replace its image
      if (selectedElement && selectedElement.type === "image") {
        updateSelectedElement({ imageUrl: verification.dataUrl });
        toast.success("Image replaced with verified asset");
      } else {
        // Otherwise, add a new image element to canvas
        const newImg: SlideElement = {
          id: `image-${Date.now()}`,
          type: "image",
          role: "image",
          x: 400,
          y: 200,
          width: 480,
          height: 320,
          imageUrl: verification.dataUrl,
          borderRadius: 16,
          borderColor: `${tokens.accent}40`,
          borderWidth: 1.5,
          zIndex: elements.length + 10,
        };
        commitElements([...elements, newImg]);
        setSelectedId(newImg.id);
        toast.success("Verified image added to slide");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // -------------------------------------------------------------
  // DRAG & RESIZE ENGINE (Canvas Coordinate Projection)
  // -------------------------------------------------------------
  const handleMouseDownElement = (e: React.MouseEvent, element: SlideElement) => {
    if (editingTextId === element.id) return; // Allow text selection when inline editing
    e.stopPropagation();
    setSelectedId(element.id);

    setDragState({
      isDragging: true,
      elementId: element.id,
      startX: e.clientX,
      startY: e.clientY,
      initX: element.x,
      initY: element.y,
    });
  };

  const handleMouseDownResize = (
    e: React.MouseEvent,
    element: SlideElement,
    handle: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w",
  ) => {
    e.stopPropagation();
    setResizeState({
      isResizing: true,
      elementId: element.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initX: element.x,
      initY: element.y,
      initW: element.width,
      initH: element.height,
    });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // 1. Handling Drag Repositioning
      if (dragState && dragState.isDragging && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = SLIDE_CANVAS_WIDTH / rect.width;
        const scaleY = SLIDE_CANVAS_HEIGHT / rect.height;

        const deltaX = (e.clientX - dragState.startX) * scaleX;
        const deltaY = (e.clientY - dragState.startY) * scaleY;

        const targetEl = elements.find((el) => el.id === dragState.elementId);
        if (!targetEl) return;

        const nextX = Math.round(Math.max(0, Math.min(SLIDE_CANVAS_WIDTH - targetEl.width, dragState.initX + deltaX)));
        const nextY = Math.round(Math.max(0, Math.min(SLIDE_CANVAS_HEIGHT - targetEl.height, dragState.initY + deltaY)));

        setElements((prev) =>
          prev.map((el) => (el.id === dragState.elementId ? { ...el, x: nextX, y: nextY } : el)),
        );
      }

      // 2. Handling Resizing
      if (resizeState && resizeState.isResizing && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = SLIDE_CANVAS_WIDTH / rect.width;
        const scaleY = SLIDE_CANVAS_HEIGHT / rect.height;

        const deltaX = (e.clientX - resizeState.startX) * scaleX;
        const deltaY = (e.clientY - resizeState.startY) * scaleY;

        const { handle, initX, initY, initW, initH } = resizeState;
        let newX = initX;
        let newY = initY;
        let newW = initW;
        let newH = initH;

        if (handle.includes("e")) newW = Math.max(40, initW + deltaX);
        if (handle.includes("s")) newH = Math.max(20, initH + deltaY);
        if (handle.includes("w")) {
          const possibleW = Math.max(40, initW - deltaX);
          newX = initX + (initW - possibleW);
          newW = possibleW;
        }
        if (handle.includes("n")) {
          const possibleH = Math.max(20, initH - deltaY);
          newY = initY + (initH - possibleH);
          newH = possibleH;
        }

        setElements((prev) =>
          prev.map((el) =>
            el.id === resizeState.elementId
              ? {
                  ...el,
                  x: Math.round(newX),
                  y: Math.round(newY),
                  width: Math.round(newW),
                  height: Math.round(newH),
                }
              : el,
          ),
        );
      }
    },
    [dragState, resizeState, elements],
  );

  const handleMouseUp = useCallback(() => {
    if (dragState) {
      setDragState(null);
      commitElements(elements);
    }
    if (resizeState) {
      setResizeState(null);
      commitElements(elements);
    }
  }, [dragState, resizeState, elements, commitElements]);

  return (
    <div
      className="flex flex-col gap-3 w-full select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* ----------------------------------------------------------- */}
      {/* 1. TOP FORMATTING TOOLBAR & EDITOR CONTROLS                 */}
      {/* ----------------------------------------------------------- */}
      <div className="rounded-2xl border border-border bg-card p-3 shadow-xs space-y-2.5">
        {/* Row A: Primary Tools (Add Text, Shape, Image, Presets, Undo/Redo) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2.5">
          {/* Left: Add Elements Group */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-mono uppercase font-bold text-muted-foreground mr-1">
              Add:
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddTextBox}
              className="h-8 text-xs font-semibold gap-1.5 rounded-lg border-primary/30 hover:bg-primary/5"
              title="Add a new text box"
            >
              <Type className="h-3.5 w-3.5 text-primary" /> Text Box
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddShape("roundRect")}
              className="h-8 text-xs font-semibold gap-1.5 rounded-lg hover:bg-surface-2"
              title="Add a card container"
            >
              <Square className="h-3.5 w-3.5 text-primary" /> Card
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddShape("circle")}
              className="h-8 text-xs font-semibold gap-1.5 rounded-lg hover:bg-surface-2"
              title="Add circle shape"
            >
              <Circle className="h-3.5 w-3.5 text-primary" /> Circle
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddShape("line")}
              className="h-8 text-xs font-semibold gap-1.5 rounded-lg hover:bg-surface-2"
              title="Add accent line divider"
            >
              <Minus className="h-3.5 w-3.5 text-primary" /> Line
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => imageUploadInputRef.current?.click()}
              className="h-8 text-xs font-semibold gap-1.5 rounded-lg hover:bg-surface-2"
              title="Upload verified PNG/JPG image"
            >
              <ImageIcon className="h-3.5 w-3.5 text-primary" /> Image
            </Button>
            <input
              type="file"
              ref={imageUploadInputRef}
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={handleImageFileChange}
              className="hidden"
            />

            <div className="h-4 w-px bg-border mx-1" />
            <span className="text-[11px] font-mono uppercase font-bold text-muted-foreground mr-0.5">
              Diagram:
            </span>
            <div className="flex items-center gap-1 bg-surface-2/60 p-0.5 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => handleAddDiagram("workflow")}
                className="px-2 py-1 text-[11px] font-semibold rounded hover:bg-background text-foreground transition-all cursor-pointer"
                title="Add 3-Step Process Workflow Diagram"
              >
                Workflow
              </button>
              <button
                type="button"
                onClick={() => handleAddDiagram("bento")}
                className="px-2 py-1 text-[11px] font-semibold rounded hover:bg-background text-foreground transition-all cursor-pointer"
                title="Add 4-Card Bento Grid"
              >
                Bento
              </button>
              <button
                type="button"
                onClick={() => handleAddDiagram("comparison")}
                className="px-2 py-1 text-[11px] font-semibold rounded hover:bg-background text-foreground transition-all cursor-pointer"
                title="Add 2-Column Comparison"
              >
                Compare
              </button>
              <button
                type="button"
                onClick={() => handleAddDiagram("stats")}
                className="px-2 py-1 text-[11px] font-semibold rounded hover:bg-background text-foreground transition-all cursor-pointer"
                title="Add Key Metrics / KPI Callouts"
              >
                Metrics
              </button>
            </div>

            {/* Academic Cover Metadata Action */}
            {slide.layout === "assignment-cover" && onEditCoverMetadata && (
              <Button
                size="sm"
                variant="outline"
                onClick={onEditCoverMetadata}
                className="h-8 text-xs font-semibold gap-1.5 rounded-lg bg-primary/10 border-primary/40 text-primary hover:bg-primary/20"
                title="Edit Academic Assignment Information & Change Template"
              >
                <Sparkles className="h-3.5 w-3.5" /> Cover Details &amp; Template
              </Button>
            )}
          </div>

          {/* Center: Title Placement Quick Action Presets (Requirement 5) */}
          <div className="flex items-center gap-1 bg-surface-2/60 p-1 rounded-xl border border-border">
            <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground px-2">
              Title Position:
            </span>
            {(["top", "center", "left", "right"] as const).map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => handlePositionTitle(pos)}
                className="px-2 py-1 text-[11px] font-semibold capitalize rounded-lg text-foreground hover:bg-background border border-transparent hover:border-border transition-all cursor-pointer"
                title={`Move slide topic / title to ${pos}`}
              >
                {pos}
              </button>
            ))}
          </div>

          {/* Right: History & Slide Management Actions */}
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="h-8 px-2 text-xs"
              title="Undo change (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRedo}
              disabled={future.length === 0}
              className="h-8 px-2 text-xs"
              title="Redo change (Ctrl+Y)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <div className="h-4 w-px bg-border mx-1" />
            <Button
              size="sm"
              variant="outline"
              onClick={onDuplicateSlide}
              className="h-8 text-xs font-semibold gap-1 rounded-lg"
              title="Duplicate this slide"
            >
              <Copy className="h-3.5 w-3.5" /> Duplicate Slide
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onAddNewSlide}
              className="h-8 text-xs font-semibold gap-1 rounded-lg text-primary border-primary/30"
              title="Add a new slide"
            >
              <Plus className="h-3.5 w-3.5" /> Add Slide
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDeleteSlide}
              disabled={totalSlides <= 2}
              className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
              title="Delete this slide"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Row B: Contextual Element Styling Controls (Font Family, Size, Colors, Alignment) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5 text-xs">
          {selectedElement ? (
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <span className="text-[10px] font-mono uppercase bg-primary/10 text-primary font-bold px-2 py-0.5 rounded">
                {selectedElement.role?.toUpperCase() || selectedElement.type.toUpperCase()}
              </span>

              {/* Text-Specific Controls */}
              {selectedElement.type === "text" && (
                <>
                  {/* Font Family */}
                  <select
                    value={selectedElement.fontFamily || "Inter"}
                    onChange={(e) => updateSelectedElement({ fontFamily: e.target.value })}
                    className="h-7 text-xs rounded-lg border border-border bg-background px-2 font-medium"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>

                  {/* Font Size */}
                  <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 bg-background">
                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedElement({
                          fontSize: Math.max(10, (selectedElement.fontSize || 16) - 2),
                        })
                      }
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-surface-2 font-bold cursor-pointer"
                      title="Decrease font size"
                    >
                      -
                    </button>
                    <span className="font-mono text-xs px-1 min-w-[28px] text-center font-bold">
                      {selectedElement.fontSize || 16}pt
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedElement({
                          fontSize: Math.min(72, (selectedElement.fontSize || 16) + 2),
                        })
                      }
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-surface-2 font-bold cursor-pointer"
                      title="Increase font size"
                    >
                      +
                    </button>
                  </div>

                  {/* Bold, Italic, Underline */}
                  <div className="flex items-center border border-border rounded-lg p-0.5 bg-background">
                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedElement({
                          fontWeight:
                            selectedElement.fontWeight === "bold" || selectedElement.fontWeight === "700"
                              ? "normal"
                              : "bold",
                        })
                      }
                      className={`h-6 w-6 flex items-center justify-center rounded cursor-pointer ${
                        selectedElement.fontWeight === "bold" || selectedElement.fontWeight === "700"
                          ? "bg-primary text-primary-foreground font-bold"
                          : "hover:bg-surface-2 text-foreground"
                      }`}
                      title="Toggle Bold"
                    >
                      <Bold className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedElement({
                          fontStyle: selectedElement.fontStyle === "italic" ? "normal" : "italic",
                        })
                      }
                      className={`h-6 w-6 flex items-center justify-center rounded cursor-pointer ${
                        selectedElement.fontStyle === "italic"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-surface-2 text-foreground"
                      }`}
                      title="Toggle Italic"
                    >
                      <Italic className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSelectedElement({ underline: !selectedElement.underline })}
                      className={`h-6 w-6 flex items-center justify-center rounded cursor-pointer ${
                        selectedElement.underline
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-surface-2 text-foreground"
                      }`}
                      title="Toggle Underline"
                    >
                      <Underline className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Text Alignment */}
                  <div className="flex items-center border border-border rounded-lg p-0.5 bg-background">
                    {(["left", "center", "right"] as const).map((align) => (
                      <button
                        key={align}
                        type="button"
                        onClick={() => updateSelectedElement({ textAlign: align })}
                        className={`h-6 w-6 flex items-center justify-center rounded cursor-pointer ${
                          (selectedElement.textAlign || "left") === align
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-surface-2 text-foreground"
                        }`}
                        title={`Align ${align}`}
                      >
                        {align === "left" && <AlignLeft className="h-3 w-3" />}
                        {align === "center" && <AlignCenter className="h-3 w-3" />}
                        {align === "right" && <AlignRight className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>

                  {/* Text Color Picker */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-muted-foreground">Color:</span>
                    <input
                      type="color"
                      value={selectedElement.textColor || tokens.textPrimary}
                      onChange={(e) => updateSelectedElement({ textColor: e.target.value })}
                      className="h-6 w-6 rounded border border-border cursor-pointer bg-transparent"
                      title="Change text color"
                    />
                  </div>

                  {/* Letter Spacing (Tracking) */}
                  <div className="flex items-center gap-0.5 border border-border rounded-lg p-0.5 bg-background">
                    <span className="text-[9px] font-mono text-muted-foreground px-1">Track:</span>
                    {[0, 1, 2, 4].map((sp) => (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => updateSelectedElement({ letterSpacing: sp })}
                        className={`h-5 px-1 text-[10px] rounded cursor-pointer ${
                          (selectedElement.letterSpacing || 0) === sp
                            ? "bg-primary text-primary-foreground font-bold"
                            : "hover:bg-surface-2 text-foreground"
                        }`}
                        title={`Letter spacing ${sp}px`}
                      >
                        {sp}px
                      </button>
                    ))}
                  </div>

                  {/* Line Height */}
                  <div className="flex items-center gap-0.5 border border-border rounded-lg p-0.5 bg-background">
                    <span className="text-[9px] font-mono text-muted-foreground px-1">Line:</span>
                    {[1.1, 1.25, 1.5, 1.8].map((lh) => (
                      <button
                        key={lh}
                        type="button"
                        onClick={() => updateSelectedElement({ lineHeight: lh })}
                        className={`h-5 px-1 text-[10px] rounded cursor-pointer ${
                          (selectedElement.lineHeight || 1.25) === lh
                            ? "bg-primary text-primary-foreground font-bold"
                            : "hover:bg-surface-2 text-foreground"
                        }`}
                        title={`Line height ${lh}`}
                      >
                        {lh}
                      </button>
                    ))}
                  </div>

                  {/* Quick Text Content Edit Box */}
                  <input
                    type="text"
                    value={selectedElement.text || ""}
                    onChange={(e) => updateSelectedElement({ text: e.target.value })}
                    placeholder="Quick edit text..."
                    className="h-7 w-44 sm:w-56 rounded-lg border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    title="Directly edit text content"
                  />
                </>
              )}

              {/* Element Canvas Centering Alignment */}
              <div className="flex items-center gap-0.5 border border-border rounded-lg p-0.5 bg-background">
                <button
                  type="button"
                  onClick={() => handleCenterElement("x")}
                  className="h-5 px-1.5 text-[10px] font-bold rounded hover:bg-surface-2 text-foreground cursor-pointer"
                  title="Center element horizontally"
                >
                  Center X
                </button>
                <button
                  type="button"
                  onClick={() => handleCenterElement("y")}
                  className="h-5 px-1.5 text-[10px] font-bold rounded hover:bg-surface-2 text-foreground cursor-pointer"
                  title="Center element vertically"
                >
                  Center Y
                </button>
              </div>

              {/* Shape-Specific Controls */}
              {(selectedElement.type === "shape" || selectedElement.type === "card") && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-muted-foreground">Fill:</span>
                    <input
                      type="color"
                      value={selectedElement.fillColor || tokens.cardBg}
                      onChange={(e) => updateSelectedElement({ fillColor: e.target.value })}
                      className="h-6 w-6 rounded border border-border cursor-pointer bg-transparent"
                      title="Change fill color"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-muted-foreground">Border:</span>
                    <input
                      type="color"
                      value={selectedElement.borderColor || tokens.cardBorder}
                      onChange={(e) => updateSelectedElement({ borderColor: e.target.value })}
                      className="h-6 w-6 rounded border border-border cursor-pointer bg-transparent"
                      title="Change border color"
                    />
                  </div>
                </>
              )}

              {/* Image Controls */}
              {selectedElement.type === "image" && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => imageUploadInputRef.current?.click()}
                    className="h-7 text-xs gap-1"
                  >
                    <Upload className="h-3 w-3" /> Replace Image
                  </Button>
                </div>
              )}

              {/* Layering & Duplicate / Delete */}
              <div className="flex items-center gap-1 ml-auto">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleBringToFront(selectedElement.id)}
                  className="h-7 px-2 text-[11px]"
                  title="Bring to front"
                >
                  Forward
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSendToBack(selectedElement.id)}
                  className="h-7 px-2 text-[11px]"
                  title="Send to back"
                >
                  Backward
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDuplicateElement(selectedElement.id)}
                  className="h-7 px-2 text-[11px]"
                  title="Duplicate element"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteElement(selectedElement.id)}
                  className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10"
                  title="Delete element"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            /* No Element Selected: Slide Canvas Controls */
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-muted-foreground">
                  Slide Canvas //
                </span>
                <span className="text-xs font-semibold text-foreground">
                  Click any text or shape to drag, resize, restyle, or edit.
                </span>
              </div>

              {/* Slide Background Color Picker */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">Background:</span>
                {PRESET_PALETTE.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onUpdateSlide({ ...slide, customBgColor: c })}
                    className={`h-5 w-5 rounded-full border transition-all cursor-pointer ${
                      currentBg === c ? "ring-2 ring-primary scale-110" : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={currentBg}
                  onChange={(e) => onUpdateSlide({ ...slide, customBgColor: e.target.value })}
                  className="h-6 w-6 rounded border border-border cursor-pointer bg-transparent"
                  title="Custom slide background"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* 2. AI SLIDE ASSISTANT (Requirement 7)                        */}
      {/* ----------------------------------------------------------- */}
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shadow-2xs">
        <div className="flex items-center gap-2 shrink-0">
          <span className="h-6 w-6 rounded-md bg-primary/20 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-bold text-foreground">AI Slide Assistant:</span>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          {[
            { label: "✨ More Professional", prompt: "Make this slide more visually polished, professional, and modern" },
            { label: "📍 Move Title Center", prompt: "Move the presentation title to the center of the slide" },
            { label: "🎨 Blue Executive Theme", prompt: "Restyle this slide with a modern executive blue theme" },
            { label: "📐 4-Card Bento Grid", prompt: "Convert this slide into a modern 4-card bento grid" },
            { label: "⚡ Hero Split Screen", prompt: "Format this slide as a high-impact editorial split screen" },
            { label: "📊 Architecture Diagram", prompt: "Add a conceptual architecture diagram explaining this topic" },
            { label: "📝 Reduce Text", prompt: "Reduce the amount of text and highlight key takeaways" },
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isRegeneratingAI}
              onClick={() => onRegenerateWithAI(item.prompt)}
              className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-background border border-border hover:border-primary/50 text-foreground transition-all disabled:opacity-50 cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Freeform Prompt Input */}
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="text"
            value={aiPromptInput}
            onChange={(e) => setAiPromptInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && aiPromptInput.trim() && !isRegeneratingAI) {
                onRegenerateWithAI(aiPromptInput);
                setAiPromptInput("");
              }
            }}
            placeholder="Ask AI: 'Move title to center'..."
            disabled={isRegeneratingAI}
            className="h-7 w-48 sm:w-60 rounded-lg border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button
            size="sm"
            variant="default"
            disabled={isRegeneratingAI || !aiPromptInput.trim()}
            onClick={() => {
              onRegenerateWithAI(aiPromptInput);
              setAiPromptInput("");
            }}
            className="h-7 px-3 text-xs font-semibold"
          >
            {isRegeneratingAI ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
          </Button>
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* 3. CENTRAL 16:9 SLIDE CANVAS (ACCURATE 1333 x 750 GEOMETRY) */}
      {/* ----------------------------------------------------------- */}
      <div
        className={`relative w-full rounded-2xl border border-border bg-card/60 p-3 sm:p-5 flex flex-col items-center justify-center overflow-hidden shadow-inner ${
          isFullscreen ? "fixed inset-0 z-50 h-screen w-screen bg-black/95 p-6" : ""
        }`}
      >
        <div
          ref={canvasRef}
          onClick={() => {
            setSelectedId(null);
            setEditingTextId(null);
          }}
          className="relative aspect-video w-full max-w-[1200px] rounded-xl overflow-hidden shadow-2xl border border-border/80 transition-all select-none"
          style={{
            backgroundColor: currentBg,
            fontFamily: tokens.fontBody,
            color: tokens.textPrimary,
          }}
        >
          {/* Elements Stacked on Canvas */}
          {[...elements]
            .sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1))
            .map((el) => {
              const isSelected = el.id === selectedId;
              const leftPct = (el.x / SLIDE_CANVAS_WIDTH) * 100;
              const topPct = (el.y / SLIDE_CANVAS_HEIGHT) * 100;
              const widthPct = (el.width / SLIDE_CANVAS_WIDTH) * 100;
              const heightPct = (el.height / SLIDE_CANVAS_HEIGHT) * 100;

              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleMouseDownElement(e, el)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (el.type === "text") {
                      setEditingTextId(el.id);
                    }
                  }}
                  className={`absolute group cursor-move transition-[box-shadow,border-color] ${
                    isSelected
                      ? "ring-2 ring-primary ring-offset-1 z-30 shadow-md"
                      : "hover:ring-1 hover:ring-primary/40"
                  }`}
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    width: `${widthPct}%`,
                    height: `${heightPct}%`,
                    zIndex: isSelected ? 40 : el.zIndex || 1,
                  }}
                >
                  {/* Element Content Rendering */}
                  {el.type === "shape" || el.type === "card" ? (
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundColor: el.fillColor || "transparent",
                        borderColor: el.borderColor || "transparent",
                        borderWidth: el.borderWidth ? `${el.borderWidth}px` : "0px",
                        borderStyle: el.borderWidth ? "solid" : "none",
                        borderRadius:
                          el.shapeType === "circle"
                            ? "9999px"
                            : el.borderRadius
                              ? `${el.borderRadius}px`
                              : "0px",
                        opacity: el.opacity ?? 1,
                      }}
                    />
                  ) : el.type === "line" ? (
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundColor: el.fillColor || tokens.accent,
                      }}
                    />
                  ) : el.type === "image" ? (
                    <div className="w-full h-full overflow-hidden rounded-xl border border-border/40 relative flex items-center justify-center bg-surface-2/40">
                      {el.imageUrl ? (
                        <img
                          src={el.imageUrl}
                          alt={el.altText || "Slide visual"}
                          className="w-full h-full object-cover object-center"
                          onError={(e) => {
                            // If image fails, replace with clean conceptual fallback
                            const target = e.currentTarget;
                            target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          <ImageIcon className="h-8 w-8 text-primary/40 mb-1" />
                          <span className="text-xs text-muted-foreground font-medium">
                            Click to upload image
                          </span>
                        </div>
                      )}
                    </div>
                  ) : el.type === "text" ? (
                    editingTextId === el.id ? (
                      <textarea
                        autoFocus
                        value={el.text || ""}
                        onChange={(e) => updateSelectedElement({ text: e.target.value })}
                        onBlur={() => setEditingTextId(null)}
                        className="w-full h-full bg-background/90 text-foreground p-1 border border-primary rounded resize-none focus:outline-none"
                        style={{
                          fontFamily: el.fontFamily || tokens.fontBody,
                          fontSize: `${(el.fontSize || 14) * 0.9}px`,
                          fontWeight: el.fontWeight || "normal",
                          fontStyle: el.fontStyle || "normal",
                          textAlign: el.textAlign || "left",
                          color: el.textColor || tokens.textPrimary,
                        }}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex flex-col justify-start overflow-hidden pointer-events-none"
                        style={{
                          fontFamily: el.fontFamily || tokens.fontBody,
                          fontSize: `${(el.fontSize || 14) * 0.9}px`,
                          fontWeight: el.fontWeight || "normal",
                          fontStyle: el.fontStyle || "normal",
                          textDecoration: el.underline ? "underline" : "none",
                          color: el.textColor || tokens.textPrimary,
                          textAlign: el.textAlign || "left",
                          letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : "normal",
                          lineHeight: el.lineHeight || 1.25,
                        }}
                      >
                        {el.text}
                      </div>
                    )
                  ) : null}

                  {/* Active Selection Handles & Resize Grips (8 Handles) */}
                  {isSelected && (
                    <>
                      {/* Top-Left */}
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, el, "nw")}
                        className="absolute -top-1.5 -left-1.5 h-3 w-3 rounded-full bg-primary border-2 border-white shadow-xs cursor-nwse-resize z-50"
                      />
                      {/* Top-Center */}
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, el, "n")}
                        className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-primary border-2 border-white shadow-xs cursor-ns-resize z-50"
                      />
                      {/* Top-Right */}
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, el, "ne")}
                        className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-primary border-2 border-white shadow-xs cursor-nesw-resize z-50"
                      />
                      {/* Right-Center */}
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, el, "e")}
                        className="absolute top-1/2 -right-1.5 -translate-y-1/2 h-3 w-3 rounded-full bg-primary border-2 border-white shadow-xs cursor-ew-resize z-50"
                      />
                      {/* Bottom-Right */}
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, el, "se")}
                        className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-full bg-primary border-2 border-white shadow-xs cursor-nwse-resize z-50"
                      />
                      {/* Bottom-Center */}
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, el, "s")}
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-primary border-2 border-white shadow-xs cursor-ns-resize z-50"
                      />
                      {/* Bottom-Left */}
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, el, "sw")}
                        className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-full bg-primary border-2 border-white shadow-xs cursor-nesw-resize z-50"
                      />
                      {/* Left-Center */}
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, el, "w")}
                        className="absolute top-1/2 -left-1.5 -translate-y-1/2 h-3 w-3 rounded-full bg-primary border-2 border-white shadow-xs cursor-ew-resize z-50"
                      />
                    </>
                  )}
                </div>
              );
            })}
        </div>

        {/* Canvas Bottom Viewport Controller */}
        <div className="mt-3 flex items-center justify-between w-full max-w-[1200px] text-xs pt-2 border-t border-border/60">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevSlide}
              disabled={slideIndex === 0}
              className="h-8 text-xs font-semibold"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <span className="font-mono text-xs text-muted-foreground px-2">
              Slide {slideIndex + 1} of {totalSlides}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onNextSlide}
              disabled={slideIndex === totalSlides - 1}
              className="h-8 text-xs font-semibold"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFullscreen}
              className="h-8 text-xs"
              title="Fullscreen view (press 'F')"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5 mr-1" /> Exit
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 mr-1" /> Fullscreen
                </>
              )}
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={downloading}
              onClick={onDownloadPptx}
              className="h-8 px-4 text-xs font-semibold gap-1.5"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Exporting...
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" /> Download PPTX
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
