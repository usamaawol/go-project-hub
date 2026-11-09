import { useState, useEffect, useCallback, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Sparkles,
  Maximize2,
  Minimize2,
  Clock,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Shield,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize,
  AlertTriangle,
  Info,
  Loader2,
  FileText,
  Pencil,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Check,
  Upload,
  Image as ImageIcon,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Footer } from "@/components/landing/Footer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchPresentationPreviewApi,
  updatePresentationSlideApi,
  regeneratePresentationSlideVisualApi,
  regeneratePresentationSlideAIApi,
  reorderPresentationSlidesApi,
  addPresentationSlideApi,
  deletePresentationSlideApi,
  type PresentationSessionData,
  type SlidePreviewItem,
} from "@/lib/api-client";
import { generateAndDownloadClientPptx, saveClientSession } from "@/lib/presentation-session-client";
import { computeThemeTokens } from "@/lib/presentation-theme";
import { buildContextualVisual, generateGamma3DMeshSvg } from "@/lib/presentation-visual-generator";
import { AssignmentCoverRenderer } from "@/components/workspace/AssignmentCoverRenderer";
import { AssignmentInformationForm } from "@/components/workspace/AssignmentInformationForm";
import { CoverTemplateGallery } from "@/components/workspace/CoverTemplateGallery";
import { getDefaultAssignmentMetadata, type AssignmentMetadata } from "@/lib/assignment-types";
import { eraseWorkspaceJobsOnDownload } from "@/lib/workspace-history";
import { PresentationSlideEditor } from "@/components/workspace/PresentationSlideEditor";


export const Route = createFileRoute("/presentation-preview/$id")({
  head: () => ({
    meta: [
      { title: "Presentation Preview — DocuMind" },
      {
        name: "description",
        content:
          "Review your generated presentation in full 16:9 layout with real slide content before downloading.",
      },
    ],
  }),
  component: PresentationPreviewPage,
  errorComponent: PresentationPreviewErrorFallback,
});

function PresentationPreviewErrorFallback({ error, reset }: { error: any; reset: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const errMsg =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Failed to load presentation preview.";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />

      <div
        className={`flex-1 transition-all duration-300 ${
          collapsed ? "lg:pl-20" : "lg:pl-64"
        } flex flex-col items-center justify-center p-6 sm:p-12`}
      >
        <div className="max-w-lg rounded-3xl border border-border bg-card p-8 sm:p-10 text-center shadow-lift">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="h-7 w-7" />
          </div>

          <span className="mt-4 inline-block rounded-full bg-surface-2 px-3 py-1 font-mono text-[10px] uppercase font-bold text-muted-foreground">
            Slide Deck Session
          </span>

          <h1 className="mt-3 font-serif text-2xl sm:text-3xl font-bold text-foreground">
            Presentation Preview Unavailable
          </h1>

          <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            This temporary presentation session has expired or the browser storage was reset. DocuMind keeps sessions active for a 10-minute temporary lifespan for privacy.
          </p>

          {errMsg && (
            <div className="mt-4 p-3 rounded-xl border border-border bg-muted/40 text-[11px] font-mono text-muted-foreground text-left max-h-24 overflow-auto">
              {errMsg}
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="hero" className="w-full sm:w-auto min-h-[46px] px-6 text-xs" asChild>
              <Link to="/presentation-maker">
                <RotateCcw className="h-4 w-4 mr-2" /> Create a New Presentation
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto min-h-[46px] px-6 text-xs"
              onClick={() => {
                reset();
                window.location.reload();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Reload Page
            </Button>
            <Button
              variant="glass"
              className="w-full sm:w-auto min-h-[46px] px-6 text-xs"
              asChild
            >
              <Link to="/">Return to Home</Link>
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export function PresentationPreviewPage() {
  const { id: sessionId } = Route.useParams();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<PresentationSessionData | null>(null);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900);
  const [isExpired, setIsExpired] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<"fit" | 75 | 100 | 125>("fit");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [viewMode, setViewMode] = useState<"editor" | "preview">("editor");

  // Active Presentation Preview Tokens & Mesh (Unconditionally declared for React Hooks rule compliance)
  const tokens = computeThemeTokens(
    session?.theme || {
      id: "modern",
      name: "Modern",
      category: "General",
      kind: "business",
      colors: { primary: "#0F172A", accent: "#2563EB", bg: "#FFFFFF" },
      fonts: "Inter",
      tier: "free",
    },
    session?.typography,
  );

  const meshDataUrl = useMemo(() => {
    return generateGamma3DMeshSvg({
      isDark: tokens.isDark,
      accentColor: tokens.accent,
    }).dataUrl;
  }, [tokens.isDark, tokens.accent]);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSlideCanvasUpdate = useCallback(
    (updatedSlide: SlidePreviewItem) => {
      if (!session) return;
      const updatedSlides = [...session.slides];
      updatedSlides[currentSlideIdx] = updatedSlide;
      const updatedSession: PresentationSessionData = {
        ...session,
        slides: updatedSlides,
        title: currentSlideIdx === 0 && updatedSlide.title ? updatedSlide.title : session.title,
      };
      setSession(updatedSession);
      saveClientSession(updatedSession);

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await updatePresentationSlideApi(sessionId, currentSlideIdx, updatedSlide);
        } catch (e) {
          console.warn("Backend slide sync warning:", e);
        }
      }, 400);
    },
    [session, currentSlideIdx, sessionId],
  );

  const handleDuplicateCurrentSlide = async () => {
    if (!session || !session.slides[currentSlideIdx]) return;
    const current = session.slides[currentSlideIdx]!;
    const duplicated: SlidePreviewItem = {
      ...current,
      id: `slide-${Date.now()}`,
      slideNumber: currentSlideIdx + 2,
      title: `${current.title} (Copy)`,
    };
    const updatedSlides = [...session.slides];
    updatedSlides.splice(currentSlideIdx + 1, 0, duplicated);
    const renumbered = updatedSlides.map((s, idx) => ({ ...s, slideNumber: idx + 1 }));
    const updatedSession = { ...session, slides: renumbered, slideCount: renumbered.length };
    setSession(updatedSession);
    saveClientSession(updatedSession);
    setCurrentSlideIdx(currentSlideIdx + 1);
    toast.success(`Slide ${currentSlideIdx + 1} duplicated!`);
  };

  // Interactive Slide Editor State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [coverEditModalOpen, setCoverEditModalOpen] = useState(false);
  const [tempCoverMeta, setTempCoverMeta] = useState<AssignmentMetadata | null>(null);
  const [editingSlideIdx, setEditingSlideIdx] = useState(0);
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editLayout, setEditLayout] = useState<string>("content");
  const [editBullets, setEditBullets] = useState<string[]>([""]);
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const openEditSlideModal = (idx: number) => {
    if (!session || !session.slides[idx]) return;
    const target = session.slides[idx]!;
    if (target.layout === "assignment-cover") {
      setTempCoverMeta(
        target.assignmentMetadata || session.assignmentMetadata || getDefaultAssignmentMetadata(),
      );
      setCoverEditModalOpen(true);
      return;
    }
    setEditingSlideIdx(idx);
    setEditTitle(target.title || "");
    setEditSubtitle(target.subtitle || "");
    setEditLayout(target.layout || "content");
    setEditBullets(target.bullets && target.bullets.length > 0 ? [...target.bullets] : [""]);
    setEditNotes(target.notes || "");
    setEditModalOpen(true);
  };

  const handleSaveCoverMetadata = async () => {
    if (!session || !tempCoverMeta) return;
    setSavingEdit(true);
    try {
      const isGroup = tempCoverMeta.assignmentType === "group";
      const updatedTitle = tempCoverMeta.assignmentTitle?.trim() || session.title;
      const updatedSubtitle = `${tempCoverMeta.courseName || session.purpose} — ${
        isGroup ? "Group Assignment" : "Individual Assignment"
      }`;

      const updatedSlide: SlidePreviewItem = {
        ...session.slides[0]!,
        title: updatedTitle,
        subtitle: updatedSubtitle,
        assignmentMetadata: tempCoverMeta,
      };

      const updatedSlides = [...session.slides];
      updatedSlides[0] = updatedSlide;

      const updatedSession: PresentationSessionData = {
        ...session,
        title: updatedTitle,
        assignmentMetadata: tempCoverMeta,
        slides: updatedSlides,
      };

      setSession(updatedSession);
      saveClientSession(updatedSession);

      try {
        await updatePresentationSlideApi(session.id, 0, {
          title: updatedTitle,
          subtitle: updatedSubtitle,
          assignmentMetadata: tempCoverMeta,
        });
      } catch {
        // client storage updated
      }

      toast.success("Assignment Cover Updated", {
        description: `Applied ${tempCoverMeta.coverTemplateId} template with your updated details.`,
      });
      setCoverEditModalOpen(false);
    } catch (err) {
      toast.error("Failed to update cover");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddBullet = () => {
    setEditBullets((prev) => [...prev, ""]);
  };

  const handleUpdateBullet = (bIdx: number, val: string) => {
    setEditBullets((prev) => {
      const next = [...prev];
      next[bIdx] = val;
      return next;
    });
  };

  const handleRemoveBullet = (bIdx: number) => {
    setEditBullets((prev) => {
      const next = prev.filter((_, i) => i !== bIdx);
      return next.length > 0 ? next : [""];
    });
  };

  const handleMoveBullet = (bIdx: number, direction: "up" | "down") => {
    setEditBullets((prev) => {
      const targetIdx = direction === "up" ? bIdx - 1 : bIdx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const temp = next[bIdx]!;
      next[bIdx] = next[targetIdx]!;
      next[targetIdx] = temp;
      return next;
    });
  };

  const handleSaveSlide = async () => {
    if (!session || editingSlideIdx < 0 || !session.slides[editingSlideIdx]) return;
    const target = session.slides[editingSlideIdx]!;

    setSavingEdit(true);
    try {
      const cleanedBullets = editBullets.map((b) => b.trim()).filter(Boolean);
      const updatedSlideData: Partial<SlidePreviewItem> = {
        title: editTitle.trim() || target.title,
        subtitle: editSubtitle.trim(),
        layout: editLayout as any,
        bullets: cleanedBullets.length > 0 ? cleanedBullets : [`Key analysis for ${editTitle.trim()}`],
        notes: editNotes.trim(),
      };

      // If text-visual or image-led layout, regenerate contextual visual with clean safe XML
      if (editLayout === "text-visual" || editLayout === "image-led") {
        const tokens = computeThemeTokens(session.theme, session.typography);
        const newVis = buildContextualVisual({
          title: updatedSlideData.title!,
          subtitle: updatedSlideData.subtitle,
          bullets: updatedSlideData.bullets,
          concept: updatedSlideData.title!,
          accentColor: tokens.accent,
          isDark: tokens.isDark,
        });
        updatedSlideData.visual = {
          type: newVis.type,
          concept: newVis.concept,
          caption: newVis.caption,
          imageUrl: newVis.imageUrl,
          svgContent: newVis.svgContent,
        };
      }

      // Update local state immediately for instant preview and client export
      const updatedSlides = [...session.slides];
      updatedSlides[editingSlideIdx] = {
        ...updatedSlides[editingSlideIdx],
        ...updatedSlideData,
      };

      setSession({
        ...session,
        slides: updatedSlides,
        title:
          editingSlideIdx === 0 && updatedSlideData.title ? updatedSlideData.title : session.title,
      });

      // Synchronize with backend API (updates file on disk for PPTX download)
      await updatePresentationSlideApi(sessionId, editingSlideIdx, updatedSlideData);

      toast.success(`Slide ${editingSlideIdx + 1} Updated!`, {
        description: "Your edits are saved and applied to live preview and PPTX export.",
      });
      setEditModalOpen(false);
    } catch (err) {
      console.error("Failed to save slide edits:", err);
      toast.error("Could not save slide edits", {
        description: "Please check your inputs and try again.",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const [isRegeneratingVisual, setIsRegeneratingVisual] = useState(false);
  const visualUploadInputRef = useRef<HTMLInputElement>(null);

  const handleRegenerateVisual = async (slideIdx: number) => {
    if (!session || !session.slides[slideIdx]) return;
    setIsRegeneratingVisual(true);
    toast.loading("Generating contextual visual with active AI provider...", { id: "regen-visual" });
    try {
      const res = await regeneratePresentationSlideVisualApi(session.id, slideIdx);
      if (res && res.success && res.data) {
        setSession(res.data);
        saveClientSession(res.data);
        toast.success("Slide visual regenerated successfully!", { id: "regen-visual" });
      } else {
        // Fallback in-browser visual regeneration
        const target = session.slides[slideIdx]!;
        const tokens = computeThemeTokens(session.theme, session.typography);
        const newVis = buildContextualVisual({
          title: target.title,
          subtitle: target.subtitle,
          bullets: target.bullets,
          concept: target.title,
          accentColor: tokens.accent,
          isDark: tokens.isDark,
        });
        const updatedSlides = [...session.slides];
        updatedSlides[slideIdx] = {
          ...updatedSlides[slideIdx]!,
          visual: {
            type: newVis.type,
            concept: newVis.concept,
            caption: newVis.caption,
            imageUrl: newVis.imageUrl,
            svgContent: newVis.svgContent,
          },
        };
        const updated = { ...session, slides: updatedSlides };
        setSession(updated);
        saveClientSession(updated);
        toast.success("Visual refreshed via contextual engine!", { id: "regen-visual" });
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to regenerate visual", { id: "regen-visual" });
    } finally {
      setIsRegeneratingVisual(false);
    }
  };

  const handleUploadCustomVisual = (slideIdx: number, file: File) => {
    if (!session || !session.slides[slideIdx]) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, or SVG).");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        const updatedSlides = [...session.slides];
        const target = updatedSlides[slideIdx]!;
        const updatedVisual = {
          type: "picture" as const,
          concept: target.title,
          caption: `Custom visual for ${target.title}`,
          imageUrl: dataUrl,
        };
        updatedSlides[slideIdx] = {
          ...target,
          visual: updatedVisual,
        };
        const updated = { ...session, slides: updatedSlides };
        setSession(updated);
        saveClientSession(updated);
        try {
          await updatePresentationSlideApi(sessionId, slideIdx, { visual: updatedVisual });
        } catch {}
        toast.success("Custom image applied to slide!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveVisual = async (slideIdx: number) => {
    if (!session || !session.slides[slideIdx]) return;
    const updatedSlides = [...session.slides];
    const target = updatedSlides[slideIdx]!;
    updatedSlides[slideIdx] = {
      ...target,
      layout: "content",
      visual: undefined,
    };
    const updated = { ...session, slides: updatedSlides };
    setSession(updated);
    saveClientSession(updated);
    try {
      await updatePresentationSlideApi(sessionId, slideIdx, { layout: "content" });
    } catch {}
    toast.success("Visual removed and layout converted to standard content.");
  };

  const [isRegeneratingWithAI, setIsRegeneratingWithAI] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [showAiAssistant, setShowAiAssistant] = useState(true);

  const handleRegenerateSlideWithAI = async (customInstruction?: string) => {
    if (!session || !session.slides[currentSlideIdx]) return;
    const instruction = (customInstruction || aiInstruction).trim();
    if (!instruction) {
      toast.info("Please enter a design prompt or click a suggested AI action.");
      return;
    }

    setIsRegeneratingWithAI(true);
    toast.loading(`AI is redesigning Slide ${currentSlideIdx + 1}...`, { id: "ai-redesign" });
    try {
      const res = await regeneratePresentationSlideAIApi(session.id, currentSlideIdx, instruction);
      if (res && res.success && res.data) {
        setSession(res.data);
        saveClientSession(res.data);
        toast.success(`Slide ${currentSlideIdx + 1} redesigned successfully!`, { id: "ai-redesign" });
        setAiInstruction("");
      } else {
        toast.error("Could not redesign slide with AI", { id: "ai-redesign" });
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to redesign slide", { id: "ai-redesign" });
    } finally {
      setIsRegeneratingWithAI(false);
    }
  };

  const handleMoveSlide = async (direction: "up" | "down") => {
    if (!session || session.slides.length <= 1) return;
    const targetIdx = direction === "up" ? currentSlideIdx - 1 : currentSlideIdx + 1;
    if (targetIdx < 0 || targetIdx >= session.slides.length) return;

    const order = session.slides.map((_, i) => i);
    const temp = order[currentSlideIdx]!;
    order[currentSlideIdx] = order[targetIdx]!;
    order[targetIdx] = temp;

    toast.loading("Reordering presentation slides...", { id: "reorder" });
    try {
      const res = await reorderPresentationSlidesApi(session.id, order);
      if (res && res.success && res.data) {
        setSession(res.data);
        saveClientSession(res.data);
        setCurrentSlideIdx(targetIdx);
        toast.success("Slides reordered successfully!", { id: "reorder" });
      }
    } catch {
      toast.error("Failed to reorder slides", { id: "reorder" });
    }
  };

  const handleAddNewSlide = async () => {
    if (!session) return;
    toast.loading("Adding new slide to deck...", { id: "add-slide" });
    try {
      const res = await addPresentationSlideApi(session.id, currentSlideIdx);
      if (res && res.success && res.data) {
        setSession(res.data);
        saveClientSession(res.data);
        setCurrentSlideIdx(currentSlideIdx + 1);
        toast.success("New slide added!", { id: "add-slide" });
      }
    } catch {
      toast.error("Failed to add slide", { id: "add-slide" });
    }
  };

  const handleDeleteCurrentSlide = async () => {
    if (!session || session.slides.length <= 2) {
      toast.warning("Presentations must contain at least 2 slides.");
      return;
    }
    if (!window.confirm(`Delete Slide ${currentSlideIdx + 1}?`)) return;

    toast.loading("Deleting slide...", { id: "del-slide" });
    try {
      const res = await deletePresentationSlideApi(session.id, currentSlideIdx);
      if (res && res.success && res.data) {
        setSession(res.data);
        saveClientSession(res.data);
        setCurrentSlideIdx(Math.max(0, currentSlideIdx - 1));
        toast.success("Slide deleted", { id: "del-slide" });
      }
    } catch {
      toast.error("Failed to delete slide", { id: "del-slide" });
    }
  };

  // Load session from API
  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        setLoading(true);
        const data = await fetchPresentationPreviewApi(sessionId);
        if (isMounted) {
          if (data && data.slides && data.slides.length > 0) {
            setSession(data);
            setSecondsRemaining(999999);
          } else {
            setIsExpired(true);
            setSession(null);
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setIsExpired(true);
        setSession(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  // Slide navigation handlers
  const slides = session?.slides || [];
  const currentSlide = slides[currentSlideIdx];

  const handlePrevSlide = useCallback(() => {
    setCurrentSlideIdx((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const handleNextSlide = useCallback(() => {
    setCurrentSlideIdx((prev) => (prev < slides.length - 1 ? prev + 1 : prev));
  }, [slides.length]);

  // Keyboard navigation listener (ArrowLeft, ArrowRight, Fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        handlePrevSlide();
      } else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrevSlide, handleNextSlide]);

  // Fullscreen listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!canvasContainerRef.current) return;
    if (!document.fullscreenElement) {
      canvasContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleDownloadPptx = async () => {
    if (isExpired) {
      toast.error("Session Expired", {
        description:
          "This temporary file was already deleted in accordance with our privacy policy.",
      });
      return;
    }

    try {
      setDownloading(true);
      toast.info("Preparing PowerPoint File...", {
        description: "Compiling vector .pptx package from secure temporary storage.",
      });

      let downloaded = false;

      // 1. Try server download endpoint first if backend is reachable
      try {
        const res = await fetch(`/api/presentations/${sessionId}/download`);
        if (res.status === 410) {
          setIsExpired(true);
          throw new Error("This temporary download link has expired.");
        }
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && !contentType.includes("text/html")) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${session?.title.replace(/[^a-zA-Z0-9_-]/g, "_") || "presentation"}.pptx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          downloaded = true;
        }
      } catch (err: unknown) {
        if ((err as Error)?.message?.includes("expired")) throw err;
      }

      // 2. Resilient client-side fallback (e.g. on Vercel deployment where Express is not running)
      if (!downloaded && session) {
        await generateAndDownloadClientPptx(session);
        downloaded = true;
      }

      if (downloaded) {
        eraseWorkspaceJobsOnDownload();
        toast.success("Download Complete!", {
          description: `Saved "${session?.title || "presentation"}.pptx" to your device (Temporary workspace data erased).`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Download failed.";
      toast.error("Download Error", { description: msg });
    } finally {
      setDownloading(false);
    }
  };

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
        <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
        <div
          className={`flex-1 transition-all duration-300 ${
            collapsed ? "lg:pl-20" : "lg:pl-64"
          } flex flex-col items-center justify-center p-8`}
        >
          <div className="text-center max-w-md">
            <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
            <h2 className="mt-4 font-serif text-2xl font-bold text-foreground">
              Opening Slide Preview...
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Loading structured slide hierarchy, typography presets, and theme styling.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Expired Screen (Server Enforced & Client Verified)
  if (isExpired || !session || !session.slides || session.slides.length === 0 || !currentSlide) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
        <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />

        <div
          className={`flex-1 transition-all duration-300 ${
            collapsed ? "lg:pl-20" : "lg:pl-64"
          } flex flex-col items-center justify-center p-6 sm:p-12`}
        >
          <div className="max-w-lg rounded-3xl border border-border bg-card p-8 sm:p-10 text-center shadow-lift">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Clock className="h-7 w-7" />
            </div>

            <span className="mt-4 inline-block rounded-full bg-surface-2 px-3 py-1 font-mono text-[10px] uppercase font-bold text-muted-foreground">
              Privacy-First Ephemeral Storage
            </span>

            <h1 className="mt-3 font-serif text-2xl sm:text-3xl font-bold text-foreground">
              This Preview Has Expired
            </h1>

            <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              To guarantee complete privacy, DocuMind enforces a{" "}
              <strong>10-minute temporary lifespan</strong>. All slide files, temporary exports, and
              preview assets associated with this session have been permanently deleted from the
              server.
            </p>

            <div className="mt-6 rounded-xl border border-border/80 bg-surface-2/40 p-4 text-left text-xs space-y-2 text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Zero permanent storage in Cloud Firestore or Cloud Storage</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Temporary files unlinked from isolated directory</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Old download URLs rejected with HTTP 410 Gone</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button variant="hero" className="w-full sm:w-auto min-h-[46px] px-6 text-xs" asChild>
                <Link to="/presentation-maker">
                  <RotateCcw className="h-4 w-4 mr-2" /> Create a New Presentation
                </Link>
              </Button>
              <Button
                variant="glass"
                className="w-full sm:w-auto min-h-[46px] px-6 text-xs"
                asChild
              >
                <Link to="/">Return to Home</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Presentation Preview Screen — Design tokens computed from unified theme design system
  const theme = session.theme;
  const primaryColor = tokens.textPrimary;
  const accentColor = tokens.accent;
  const bgColor = tokens.bg;
  const fontFamily = tokens.fontBody;

  const renderSlideHeader = (slide: SlidePreviewItem) => (
    <div dir={slide.isRtl ? "rtl" : "ltr"}>
      <h2
        className={`${
          slide.title.length > 70
            ? "text-xl sm:text-2xl lg:text-3xl"
            : slide.title.length > 40
              ? "text-2xl sm:text-3xl lg:text-4xl"
              : "text-2xl sm:text-4xl"
        } font-bold tracking-tight leading-tight line-clamp-2`}
        style={{ color: tokens.textPrimary, fontFamily: tokens.fontTitle }}
      >
        {slide.title}
      </h2>
      {slide.subtitle && (
        <p
          className="mt-1 text-xs sm:text-sm italic line-clamp-2"
          style={{ color: tokens.textSecondary, fontFamily: tokens.fontBody }}
        >
          {slide.subtitle}
        </p>
      )}
    </div>
  );

  const renderBulletWithAnchor = (text: string, defaultColor: string) => {
    const colonIdx = text.indexOf(": ");
    if (colonIdx > 2 && colonIdx < 32) {
      const anchor = text.slice(0, colonIdx);
      const rest = text.slice(colonIdx + 2);
      return (
        <span className="leading-relaxed" style={{ color: defaultColor, fontFamily: tokens.fontBody }}>
          <strong className="font-bold tracking-tight opacity-95">{anchor}:</strong> {rest}
        </span>
      );
    }
    return (
      <span className="leading-relaxed" style={{ color: defaultColor, fontFamily: tokens.fontBody }}>
        {text}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />

      <div
        className={`flex-1 transition-all duration-300 ${
          collapsed ? "lg:pl-20" : "lg:pl-64"
        } flex flex-col justify-between pb-24 lg:pb-0`}
      >
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 w-full flex-1 flex flex-col">
          {/* Top Bar: Navigation, Expiration Countdown & Action Buttons */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
            <div className="flex items-center gap-3">
              <Button
                variant="glass"
                size="sm"
                className="min-h-[44px] text-xs"
                onClick={() => navigate({ to: "/presentation-maker" })}
                title="Return to Presentation Maker"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Return to Editor
              </Button>

              <div>
                <h1 className="font-serif text-xl sm:text-2xl font-bold text-foreground truncate max-w-md sm:max-w-lg">
                  {session.title}
                </h1>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground font-mono">
                  <span>Theme: {theme.name}</span>
                  <span>•</span>
                  <span>Font: {fontFamily}</span>
                  <span>•</span>
                  <span>{slides.length} Slides</span>
                </div>
              </div>
            </div>

            {/* Live Session Badge, View Mode Toggle & Download PPTX Button */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* View Mode Switcher: Full Interactive Slide Editor vs Presentation View */}
              <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-2 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("editor")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "editor"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Full manual slide editor with drag, resize, formatting, and element controls"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Slide Editor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("preview")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "preview"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Clean presentation preview"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Preview View</span>
                </button>
              </div>

              {/* Active Session Indicator */}
              <div
                className="hidden sm:flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-mono font-medium text-emerald-700 dark:text-emerald-400 shadow-xs"
                title="Your presentation stays active in your browser until you refresh or leave the page."
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Session</span>
              </div>

              {/* Download PPTX Button */}
              <Button
                data-tour="tour-preview-download"
                variant="hero"
                className="min-h-[44px] px-4 text-xs font-semibold gap-2 shadow-xs"
                disabled={downloading || !session}
                onClick={handleDownloadPptx}
              >
                {downloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" /> Download PPTX
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Main Viewer Stage: Sidebar Thumbnails + Slide Canvas */}
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 flex-1 items-start">
            {/* Slide Thumbnail Strip (Left Sidebar on Desktop, Horizontal Bar on Mobile) */}
            <div className="order-2 lg:order-1 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto max-h-[70vh] p-1 rounded-2xl border border-border bg-card/60 p-3 shadow-xs">
              <span className="hidden lg:block text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-bold mb-1">
                Slides ({slides.length})
              </span>

              {slides.map((s, idx) => {
                const isActive = idx === currentSlideIdx;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCurrentSlideIdx(idx)}
                    className={`group relative text-left rounded-xl border p-2.5 transition-all shrink-0 w-48 lg:w-full h-[76px] flex flex-col justify-between ${
                      isActive
                        ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                        : "border-border bg-surface-2/40 hover:bg-surface-2 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                      <span className="font-bold flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-primary" : "bg-muted-foreground/40"}`}
                        />
                        Slide {s.slideNumber}
                      </span>
                      <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-muted/40 font-mono">
                        {s.layout}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-foreground line-clamp-1">
                      {s.title}
                    </div>

                    <div className="text-[10px] text-muted-foreground line-clamp-1 italic">
                      {s.subtitle || "Standard 16:9 Slide"}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Slide Presentation Viewport */}
            <div className="order-1 lg:order-2 flex flex-col gap-4">
              {viewMode === "editor" ? (
                <PresentationSlideEditor
                  slide={currentSlide}
                  slideIndex={currentSlideIdx}
                  totalSlides={slides.length}
                  tokens={tokens}
                  theme={session.theme}
                  onUpdateSlide={handleSlideCanvasUpdate}
                  onPrevSlide={handlePrevSlide}
                  onNextSlide={handleNextSlide}
                  onAddNewSlide={handleAddNewSlide}
                  onDuplicateSlide={handleDuplicateCurrentSlide}
                  onDeleteSlide={handleDeleteCurrentSlide}
                  onMoveSlide={handleMoveSlide}
                  onRegenerateWithAI={async (instruction: string) => {
                    await handleRegenerateSlideWithAI(instruction);
                  }}
                  isRegeneratingAI={isRegeneratingWithAI}
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={toggleFullscreen}
                  downloading={downloading}
                  onDownloadPptx={handleDownloadPptx}
                  onEditCoverMetadata={() => {
                    setTempCoverMeta(
                      currentSlide?.assignmentMetadata ||
                        session?.assignmentMetadata ||
                        getDefaultAssignmentMetadata(),
                    );
                    setCoverEditModalOpen(true);
                  }}
                />
              ) : (
                <>
                  {/* AI Slide Assistant & Quick Actions Bar */}
                  <div className="rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-background to-accent/10 p-3.5 sm:p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-7 w-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        AI Slide Designer & Assistant
                        <span className="text-[9px] font-mono font-normal px-1.5 py-0.2 bg-primary/15 text-primary rounded-full">
                          Active
                        </span>
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Ask AI to redesign Slide {currentSlideIdx + 1} with custom styling, diagrams, or modern layouts.
                      </p>
                    </div>
                  </div>

                  {/* Slide Management Buttons: Move Up, Move Down, Add, Delete */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => handleMoveSlide("up")}
                      disabled={currentSlideIdx === 0}
                      className="h-8 px-2 text-[11px]"
                      title="Move slide earlier in deck"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => handleMoveSlide("down")}
                      disabled={currentSlideIdx === slides.length - 1}
                      className="h-8 px-2 text-[11px]"
                      title="Move slide later in deck"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={handleAddNewSlide}
                      className="h-8 px-2.5 text-[11px]"
                      title="Add a new slide"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Slide
                    </Button>
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={handleDeleteCurrentSlide}
                      disabled={slides.length <= 2}
                      className="h-8 px-2 text-[11px] text-destructive hover:bg-destructive/10"
                      title="Delete this slide"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Quick AI Improvement Pills */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-mono text-muted-foreground mr-1 hidden md:inline">Quick Actions:</span>
                  {[
                    { label: "✨ Make More Attractive", prompt: "Make this slide more visually attractive and modern" },
                    { label: "📐 4-Card Bento Grid", prompt: "Convert this slide into a modern 4-card bento grid" },
                    { label: "⚡ Hero Split Screen", prompt: "Convert this slide into a bold high-impact hero split screen" },
                    { label: "📊 Add Architecture Diagram", prompt: "Add a conceptual architecture diagram explaining this topic" },
                    { label: "🔄 Process Workflow", prompt: "Format this content as a step-by-step process workflow" },
                    { label: "⚖️ Comparative Matrix", prompt: "Format as an in-scope vs out-of-scope comparative analysis" },
                  ].map((action, aIdx) => (
                    <button
                      key={aIdx}
                      type="button"
                      disabled={isRegeneratingWithAI}
                      onClick={() => handleRegenerateSlideWithAI(action.prompt)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-surface-2 border border-border hover:border-primary/40 text-foreground hover:bg-primary/5 transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>

                {/* Freeform Prompt Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={aiInstruction}
                    onChange={(e) => setAiInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isRegeneratingWithAI) {
                        handleRegenerateSlideWithAI();
                      }
                    }}
                    placeholder="Ask AI: e.g. 'Add a cloud topology diagram', 'Reduce text and use modern 4 cards', 'Highlight key metrics'..."
                    disabled={isRegeneratingWithAI}
                    className="flex-1 h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <Button
                    variant="hero"
                    size="sm"
                    disabled={isRegeneratingWithAI || !aiInstruction.trim()}
                    onClick={() => handleRegenerateSlideWithAI()}
                    className="h-9 px-4 text-xs font-semibold shrink-0"
                  >
                    {isRegeneratingWithAI ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Redesigning...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        Redesign Slide
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Canvas Container with ref for Fullscreen */}
              <div
                ref={canvasContainerRef}
                className={`relative overflow-hidden rounded-2xl border border-border shadow-lift flex flex-col justify-between ${
                  isFullscreen
                    ? "fixed inset-0 z-50 h-screen w-screen bg-black/95 p-4 sm:p-6 items-center justify-between"
                    : "bg-card p-4 sm:p-6"
                }`}
              >
                {/* Fixed Uniform 16:9 Widescreen Slide Canvas (Guaranteed Equal Size for All Slides) */}
                <div
                  className={`relative aspect-video w-full rounded-xl overflow-hidden border border-border/80 shadow-inner flex flex-col justify-between transition-all select-text shrink-0 ${
                    isFullscreen
                      ? "max-w-[calc((100vh-140px)*16/9)] max-h-[calc(100vh-140px)] mx-auto my-auto p-5 sm:p-8"
                      : "max-w-full p-5 sm:p-7 md:p-8"
                  }`}
                  style={{
                    backgroundColor: bgColor,
                    color: primaryColor,
                    fontFamily,
                  }}
                >
                  {/* Decorative Theme Accent Top Bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{ backgroundColor: accentColor }}
                  />

                  {/* Header / Layout Badge with Quick Edit Action */}
                  <div
                    className="flex items-center justify-between text-[11px] font-mono tracking-wider uppercase pb-2.5 border-b shrink-0"
                    style={{ borderColor: tokens.dividerColor }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-2 w-2 rounded-full animate-pulse"
                        style={{ backgroundColor: tokens.accent }}
                      />
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border"
                        style={{
                          backgroundColor: `${tokens.accent}15`,
                          borderColor: `${tokens.accent}30`,
                          color: tokens.accent,
                        }}
                      >
                        {currentSlide.categoryTag || "OVERVIEW"}
                      </span>
                      <span className="text-[11px] font-mono opacity-60">
                        Slide {currentSlide.slideNumber} of {slides.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditSlideModal(currentSlideIdx)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-sans font-bold uppercase transition-all hover:scale-105 shadow-xs cursor-pointer"
                        style={{
                          backgroundColor: tokens.cardBg,
                          borderColor: tokens.cardBorder,
                          borderWidth: "1px",
                          color: tokens.accent,
                        }}
                        title="Edit this slide (Fix typos, modify text, adjust layout)"
                      >
                        <Pencil className="h-3 w-3" />
                        <span>Edit Slide</span>
                      </button>

                      <span style={{ color: tokens.textMuted }}>{session.purpose}</span>
                    </div>
                  </div>

                  {/* Dynamic Slide Body Layouts - strictly constrained with min-h-0 so all slides maintain equal size */}
                  <div className="flex-1 min-h-0 overflow-y-auto my-auto py-3 pr-1 scrollbar-thin">
                    {/* 0. ACADEMIC ASSIGNMENT COVER */}
                    {currentSlide.layout === "assignment-cover" && (
                      <div className="w-full h-full flex flex-col justify-center">
                        <div className="w-full max-h-[460px] aspect-video rounded-xl overflow-hidden border border-border shadow-xs">
                          <AssignmentCoverRenderer
                            metadata={
                              currentSlide.assignmentMetadata ||
                              session.assignmentMetadata ||
                              getDefaultAssignmentMetadata()
                            }
                            aspectRatio="16:9"
                          />
                        </div>
                      </div>
                    )}

                    {/* 1. TITLE / COVER (GAMMA BENCHMARK) */}
                    {currentSlide.layout === "title" && (
                      <div
                        className="w-full h-full grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-6 items-center"
                        dir={currentSlide.isRtl ? "rtl" : "ltr"}
                      >
                        <div className="space-y-4 max-w-xl">
                          <div
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-mono font-bold tracking-wider uppercase shadow-xs"
                            style={{
                              backgroundColor: `${tokens.accent}15`,
                              borderColor: `${tokens.accent}40`,
                              color: tokens.accent,
                            }}
                          >
                            {(currentSlide.categoryTag || session.purpose || "EXECUTIVE OVERVIEW").toUpperCase()}
                          </div>
                          <h2
                            className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight"
                            style={{ color: tokens.textPrimary, fontFamily: tokens.fontTitle }}
                          >
                            {currentSlide.title}
                          </h2>
                          {currentSlide.subtitle && (
                            <p
                              className="text-base sm:text-lg font-medium opacity-85 leading-relaxed"
                              style={{ color: tokens.textSecondary, fontFamily: tokens.fontBody }}
                            >
                              {currentSlide.subtitle}
                            </p>
                          )}
                          <div
                            className="h-1.5 w-24 rounded-full mt-4"
                            style={{ backgroundColor: tokens.accent }}
                          />
                        </div>

                        {/* Right side: 3D Undulating Wireframe Mesh */}
                        <div className="relative w-full h-[240px] sm:h-[320px] rounded-2xl overflow-hidden border border-cyan-500/25 shadow-2xl">
                          <img
                            src={currentSlide.visual?.imageUrl || meshDataUrl}
                            alt="Visual Concept"
                            className="w-full h-full object-cover object-center"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                        </div>
                      </div>
                    )}

                    {/* 2. AGENDA */}
                    {currentSlide.layout === "agenda" && (
                      <div className="space-y-5">
                        {renderSlideHeader(currentSlide)}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                          {(currentSlide.bullets || []).map((topic, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3.5 rounded-xl border p-3.5 transition-all"
                              style={{
                                backgroundColor: tokens.cardBg,
                                borderColor: tokens.cardBorder,
                                color: tokens.cardText,
                              }}
                            >
                              <span
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold font-mono text-white"
                                style={{ backgroundColor: tokens.accent }}
                              >
                                0{idx + 1}
                              </span>
                              <span className="text-xs sm:text-sm font-semibold">{topic}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. SECTION HEADER */}
                    {currentSlide.layout === "section-header" && (
                      <div
                        className="rounded-2xl border p-8 sm:p-12 flex items-center gap-8"
                        style={{
                          backgroundColor: tokens.cardBg,
                          borderColor: tokens.accent,
                        }}
                      >
                        <div
                          className="text-5xl sm:text-7xl font-mono font-bold"
                          style={{ color: tokens.accent, fontFamily: tokens.fontTitle }}
                        >
                          0{currentSlide.slideNumber}
                        </div>
                        <div className="space-y-2">
                          <h2
                            className="text-2xl sm:text-4xl font-bold tracking-tight"
                            style={{ color: tokens.textPrimary, fontFamily: tokens.fontTitle }}
                          >
                            {currentSlide.title}
                          </h2>
                          {currentSlide.subtitle && (
                            <p
                              className="text-sm sm:text-base"
                              style={{ color: tokens.textSecondary, fontFamily: tokens.fontBody }}
                            >
                              {currentSlide.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 4. METRICS / TELEMETRY */}
                    {currentSlide.layout === "metrics" && (
                      <div className="space-y-5">
                        {renderSlideHeader(currentSlide)}

                        {currentSlide.metrics && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                            {currentSlide.metrics.map((m, mIdx) => (
                              <div
                                key={mIdx}
                                className="rounded-2xl border p-5 shadow-xs flex flex-col justify-between"
                                style={{
                                  backgroundColor: tokens.cardBg,
                                  borderColor: tokens.cardBorder,
                                }}
                              >
                                <div
                                  className="h-1 w-8 rounded-full mb-3"
                                  style={{ backgroundColor: tokens.accent }}
                                />
                                <div
                                  className="text-3xl sm:text-4xl font-mono font-bold"
                                  style={{ color: tokens.accent, fontFamily: tokens.fontTitle }}
                                >
                                  {m.value}
                                </div>
                                <div
                                  className="mt-2 text-sm font-semibold"
                                  style={{ color: tokens.cardText, fontFamily: tokens.fontTitle }}
                                >
                                  {m.label}
                                </div>
                                {m.description && (
                                  <div
                                    className="mt-1 text-xs"
                                    style={{ color: tokens.cardMuted, fontFamily: tokens.fontBody }}
                                  >
                                    {m.description}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 5. TWO-COLUMN COMPARISON */}
                    {currentSlide.layout === "two-column" && (
                      <div className="space-y-5">
                        <div>
                          <h2
                            className="text-2xl sm:text-4xl font-bold tracking-tight"
                            style={{ color: tokens.textPrimary, fontFamily: tokens.fontTitle }}
                          >
                            {currentSlide.title}
                          </h2>
                          {currentSlide.subtitle && (
                            <p
                              className="mt-1 text-xs sm:text-sm italic"
                              style={{ color: tokens.textSecondary, fontFamily: tokens.fontBody }}
                            >
                              {currentSlide.subtitle}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                          {currentSlide.leftColumn && (
                            <div
                              className="rounded-2xl border p-5"
                              style={{
                                backgroundColor: tokens.cardBg,
                                borderColor: tokens.cardBorder,
                              }}
                            >
                              <h3
                                className="font-bold text-sm sm:text-base border-b pb-2"
                                style={{
                                  color: tokens.cardText,
                                  borderColor: tokens.dividerColor,
                                  fontFamily: tokens.fontTitle,
                                }}
                              >
                                {currentSlide.leftColumn.title}
                              </h3>
                              <ul className="mt-3 space-y-2 text-xs sm:text-sm">
                                {currentSlide.leftColumn.bullets.slice(0, 5).map((b, bIdx) => (
                                  <li
                                    key={bIdx}
                                    className="flex items-start gap-2"
                                  >
                                    <span
                                      className="h-1.5 w-1.5 rounded-full mt-2 shrink-0"
                                      style={{ backgroundColor: tokens.accent }}
                                    />
                                    {renderBulletWithAnchor(b, tokens.cardText)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {currentSlide.rightColumn && (
                            <div
                              className="rounded-2xl border p-5"
                              style={{
                                backgroundColor: tokens.cardBg,
                                borderColor: tokens.accent,
                              }}
                            >
                              <h3
                                className="font-bold text-sm sm:text-base border-b pb-2"
                                style={{
                                  color: tokens.accent,
                                  borderColor: tokens.dividerColor,
                                  fontFamily: tokens.fontTitle,
                                }}
                              >
                                {currentSlide.rightColumn.title}
                              </h3>
                              <ul className="mt-3 space-y-2 text-xs sm:text-sm">
                                {currentSlide.rightColumn.bullets.slice(0, 5).map((b, bIdx) => (
                                  <li
                                    key={bIdx}
                                    className="flex items-start gap-2"
                                  >
                                    <span
                                      className="h-1.5 w-1.5 rounded-full mt-2 shrink-0"
                                      style={{ backgroundColor: tokens.accent }}
                                    />
                                    {renderBulletWithAnchor(b, tokens.cardText)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* HERO-SPLIT (High-impact editorial split screen with 3D Wireframe Mesh - Gamma Benchmark) */}
                    {currentSlide.layout === "hero-split" && (
                      <div
                        className="space-y-4 h-full flex flex-col justify-between"
                        dir={currentSlide.isRtl ? "rtl" : "ltr"}
                      >
                        {renderSlideHeader(currentSlide)}
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-6 items-stretch pt-1 flex-1">
                          {/* Visual Side: 3D Undulating Wireframe Mesh or Visual Asset */}
                          <div className="rounded-2xl border border-cyan-500/25 overflow-hidden relative shadow-lg min-h-[220px] flex items-center justify-center">
                            <img
                              src={currentSlide.visual?.imageUrl || meshDataUrl}
                              alt="3D Neural Mesh"
                              className="w-full h-full object-cover object-center"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none flex flex-col justify-end p-4">
                              <span
                                className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold text-white uppercase inline-block w-fit shadow-xs"
                                style={{ backgroundColor: tokens.accent }}
                              >
                                {currentSlide.categoryTag || "FOUNDATIONAL CONCEPT"}
                              </span>
                            </div>
                          </div>

                          {/* Detail Side: Question/Headline + Stacked Glass Cards + Callout */}
                          <div className="flex flex-col justify-between gap-3">
                            <div className="space-y-2.5">
                              {(currentSlide.heroSplit?.headline || currentSlide.subtitle) && (
                                <h3
                                  className="text-base sm:text-xl font-bold tracking-tight leading-snug"
                                  style={{ color: tokens.textPrimary, fontFamily: tokens.fontTitle }}
                                >
                                  {currentSlide.heroSplit?.headline || currentSlide.subtitle}
                                </h3>
                              )}

                              {/* Stacked Cards */}
                              <div className="space-y-2.5">
                                {(currentSlide.heroSplit?.details || currentSlide.bullets?.slice(0, 3) || [
                                  "Targeted execution framework supporting end-to-end deliverables.",
                                  "Continuous verification pipeline and automated quality gates.",
                                ]).map((detail, dIdx) => (
                                  <div
                                    key={dIdx}
                                    className="rounded-xl border p-3.5 sm:p-4 flex items-start gap-3.5 shadow-xs transition-all hover:border-cyan-500/40"
                                    style={{
                                      backgroundColor: tokens.isDark ? "rgba(15, 23, 42, 0.75)" : tokens.cardBg,
                                      borderColor: tokens.cardBorder,
                                    }}
                                  >
                                    <span
                                      className="h-6 w-6 rounded-lg text-white font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-xs"
                                      style={{ backgroundColor: tokens.accent }}
                                    >
                                      0{dIdx + 1}
                                    </span>
                                    <p
                                      className="text-xs sm:text-sm font-medium leading-relaxed"
                                      style={{ color: tokens.cardText, fontFamily: tokens.fontBody }}
                                    >
                                      {detail}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Bottom Takeaway Callout Pill Bar */}
                            {(currentSlide.calloutPill || currentSlide.heroSplit?.highlight) && (
                              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 flex items-center gap-2.5 shadow-xs">
                                <span className="text-base">{currentSlide.calloutPill?.icon || "💡"}</span>
                                <p className="text-xs font-semibold text-emerald-300">
                                  {currentSlide.calloutPill?.text || currentSlide.heroSplit?.highlight}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* BENTO-GRID (4 Quadrants / Feature Matrix - Gamma Benchmark) */}
                    {currentSlide.layout === "bento-grid" && (
                      <div
                        className="space-y-4"
                        dir={currentSlide.isRtl ? "rtl" : "ltr"}
                      >
                        {renderSlideHeader(currentSlide)}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                          {(currentSlide.bentoGrid || [
                            { title: "Core Architecture", description: currentSlide.bullets?.[0] || "Foundational service layer and interface boundaries.", tag: "01", icon: "🏛️" },
                            { title: "Strategic Workflow", description: currentSlide.bullets?.[1] || "Continuous integration pipeline and verification gates.", tag: "02", icon: "⚡" },
                            { title: "Telemetry & Metrics", description: currentSlide.bullets?.[2] || "Real-time indicators tracking throughput and thresholds.", tag: "03", icon: "📊" },
                            { title: "Target Deliverable", description: currentSlide.bullets?.[3] || "Production validation benchmarks and milestone release.", tag: "04", icon: "🎯" },
                          ]).slice(0, 4).map((bento, bIdx) => (
                            <div
                              key={bIdx}
                              className="rounded-2xl border p-4 sm:p-5 space-y-2 relative overflow-hidden shadow-xs transition-all hover:border-cyan-500/40"
                              style={{
                                backgroundColor: tokens.isDark ? "rgba(15, 23, 42, 0.75)" : tokens.cardBg,
                                borderColor: tokens.cardBorder,
                              }}
                            >
                              <div
                                className="absolute top-0 left-0 right-0 h-1"
                                style={{ backgroundColor: tokens.accent }}
                              />
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {bento.icon && <span className="text-lg">{bento.icon}</span>}
                                  <h4
                                    className="text-sm sm:text-base font-bold"
                                    style={{ color: tokens.cardText, fontFamily: tokens.fontTitle }}
                                  >
                                    {bento.title}
                                  </h4>
                                </div>
                                <span
                                  className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded"
                                  style={{ backgroundColor: `${tokens.accent}15`, color: tokens.accent }}
                                >
                                  {bento.tag && !bento.tag.toLowerCase().startsWith("pillar") ? bento.tag : `0${bIdx + 1}`}
                                </span>
                              </div>
                              <p
                                className="text-xs leading-relaxed opacity-85"
                                style={{ color: tokens.cardMuted, fontFamily: tokens.fontBody }}
                              >
                                {bento.description}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Bottom Takeaway Callout if present */}
                        {currentSlide.calloutPill && (
                          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 flex items-center gap-2.5 shadow-xs mt-3">
                            <span className="text-base">{currentSlide.calloutPill.icon || "💡"}</span>
                            <p className="text-xs font-semibold text-emerald-300">
                              {currentSlide.calloutPill.text}
                            </p>
                          </div>
                        )}

                        {/* Bottom Warning Alert if present */}
                        {currentSlide.alertCallout && (
                          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 flex items-center gap-2.5 shadow-xs mt-3">
                            <span className="text-base">⚠️</span>
                            <p className="text-xs font-semibold text-amber-200">
                              {currentSlide.alertCallout.text}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* HEADLINE-HERO (Big Statement + Supporting Takeaways) */}
                    {currentSlide.layout === "headline-hero" && (
                      <div className="space-y-4">
                        {renderSlideHeader(currentSlide)}
                        {/* Top Banner */}
                        <div
                          className="rounded-2xl border p-6 sm:p-7 space-y-2 relative overflow-hidden shadow-xs"
                          style={{
                            backgroundColor: tokens.cardBg,
                            borderColor: tokens.accent,
                            borderWidth: "1.5px",
                          }}
                        >
                          <div
                            className="absolute top-0 left-0 bottom-0 w-2"
                            style={{ backgroundColor: tokens.accent }}
                          />
                          <h3
                            className="text-2xl sm:text-3xl font-extrabold tracking-tight"
                            style={{ color: tokens.textPrimary, fontFamily: tokens.fontTitle }}
                          >
                            {currentSlide.statCallout?.stat || currentSlide.title}
                          </h3>
                          <p
                            className="text-xs sm:text-sm leading-relaxed"
                            style={{ color: tokens.textSecondary, fontFamily: tokens.fontBody }}
                          >
                            {currentSlide.statCallout?.context || currentSlide.subtitle || currentSlide.bullets?.[0]}
                          </p>
                        </div>

                        {/* Bottom Row Takeaways */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          {(currentSlide.statCallout?.bullets || currentSlide.bullets?.slice(1, 4) || [
                            "Strategic requirement validated by telemetry benchmarks.",
                            "Target milestone readiness confirmed for release gates.",
                            "Scalable deployment verified across target environments.",
                          ]).map((bItem, bIdx) => (
                            <div
                              key={bIdx}
                              className="rounded-xl border p-4 space-y-1.5 shadow-2xs"
                              style={{
                                backgroundColor: tokens.cardBg,
                                borderColor: tokens.cardBorder,
                              }}
                            >
                              <span
                                className="h-1.5 w-6 rounded-full block mb-2"
                                style={{ backgroundColor: tokens.accent }}
                              />
                              <p
                                className="text-xs font-medium leading-relaxed"
                                style={{ color: tokens.cardText, fontFamily: tokens.fontBody }}
                              >
                                {bItem}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* DIAGRAM-EXPLAINER (Architecture / Deep Technical Specification) */}
                    {currentSlide.layout === "diagram-explainer" && (
                      <div className="space-y-4">
                        {renderSlideHeader(currentSlide)}
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-5 items-stretch pt-2">
                          <div
                            className="rounded-2xl border p-5 space-y-3 flex flex-col justify-between"
                            style={{
                              backgroundColor: tokens.cardBg,
                              borderColor: tokens.cardBorder,
                            }}
                          >
                            <div className="space-y-3">
                              <span
                                className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold text-white uppercase"
                                style={{ backgroundColor: tokens.accent }}
                              >
                                TECHNICAL SPECIFICATION
                              </span>
                              <ul className="space-y-2.5 text-xs sm:text-sm">
                                {(currentSlide.bullets || ["System architecture verified for enterprise deployment."]).map((b, idx) => (
                                  <li key={idx} className="flex items-start gap-2.5">
                                    <span
                                      className="h-2 w-2 rounded-full mt-1.5 shrink-0"
                                      style={{ backgroundColor: tokens.accent }}
                                    />
                                    {renderBulletWithAnchor(b, tokens.cardText)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <p
                              className="text-[11px] italic pt-3 border-t"
                              style={{ color: tokens.cardMuted, borderColor: tokens.cardBorder }}
                            >
                              {currentSlide.visual?.caption || "Architecture topology & interface boundaries"}
                            </p>
                          </div>

                          {/* Right Diagram Image Box */}
                          <div
                            className="rounded-2xl border p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[260px]"
                            style={{
                              backgroundColor: tokens.cardBg,
                              borderColor: tokens.cardBorder,
                            }}
                          >
                            {(() => {
                              const vImg = currentSlide.visual?.imageUrl || buildContextualVisual({
                                title: currentSlide.title,
                                subtitle: currentSlide.subtitle,
                                bullets: currentSlide.bullets,
                                accentColor: tokens.accent,
                                isDark: tokens.isDark,
                                concept: currentSlide.visual?.concept || currentSlide.title,
                              }).imageUrl;
                              return (
                                <img
                                  src={vImg}
                                  alt={currentSlide.title}
                                  className="max-h-[280px] w-auto max-w-full object-contain rounded-lg"
                                />
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 6. THREE-CARD PILLARS */}
                    {currentSlide.layout === "three-card" && (
                      <div className="space-y-5">
                        {renderSlideHeader(currentSlide)}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                          {(currentSlide.cards || []).map((card, cIdx) => (
                            <div
                              key={cIdx}
                              className="rounded-2xl border p-5 space-y-3"
                              style={{
                                backgroundColor: tokens.cardBg,
                                borderColor: tokens.cardBorder,
                              }}
                            >
                              <span
                                className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold text-white uppercase"
                                style={{ backgroundColor: tokens.accent }}
                              >
                                {card.tag || `PILLAR 0${cIdx + 1}`}
                              </span>
                              <h4
                                className="text-base font-bold"
                                style={{ color: tokens.cardText, fontFamily: tokens.fontTitle }}
                              >
                                {card.title}
                              </h4>
                              <p
                                className="text-xs leading-relaxed"
                                style={{ color: tokens.cardMuted, fontFamily: tokens.fontBody }}
                              >
                                {card.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 7. TIMELINE & PHASES */}
                    {currentSlide.layout === "timeline" && (
                      <div className="space-y-6">
                        {renderSlideHeader(currentSlide)}

                        <div className="relative pt-6">
                          <div
                            className="absolute top-10 left-6 right-6 h-1 rounded-full"
                            style={{ backgroundColor: tokens.dividerColor }}
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
                            {(currentSlide.timeline || []).map((t, tIdx) => (
                              <div key={tIdx} className="space-y-3 text-center sm:text-left">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-4 w-4 rounded-full border-2 border-white ring-2"
                                    style={{ backgroundColor: tokens.accent }}
                                  />
                                  <span
                                    className="font-mono text-xs font-bold uppercase"
                                    style={{ color: tokens.accent }}
                                  >
                                    {t.phase}
                                  </span>
                                </div>
                                <h4
                                  className="text-sm sm:text-base font-bold"
                                  style={{
                                    color: tokens.textPrimary,
                                    fontFamily: tokens.fontTitle,
                                  }}
                                >
                                  {t.title}
                                </h4>
                                <p
                                  className="text-xs leading-relaxed"
                                  style={{
                                    color: tokens.textSecondary,
                                    fontFamily: tokens.fontBody,
                                  }}
                                >
                                  {t.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 8. PROCESS WORKFLOW (GAMMA STEPPER BENCHMARK) */}
                    {currentSlide.layout === "process" && (
                      <div
                        className="space-y-5 h-full flex flex-col justify-between"
                        dir={currentSlide.isRtl ? "rtl" : "ltr"}
                      >
                        {renderSlideHeader(currentSlide)}

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1 flex-1">
                          {(currentSlide.processSteps || []).map((step, sIdx) => (
                            <div
                              key={sIdx}
                              className="rounded-2xl border p-4 sm:p-5 space-y-3 relative overflow-hidden shadow-xs transition-all hover:border-cyan-500/40 flex flex-col justify-between"
                              style={{
                                backgroundColor: tokens.isDark ? "rgba(15, 23, 42, 0.75)" : tokens.cardBg,
                                borderColor: tokens.cardBorder,
                              }}
                            >
                              {/* Glowing Stepper Divider Line */}
                              <div
                                className="h-1 w-full rounded-full"
                                style={{ backgroundColor: tokens.accent }}
                              />
                              <div className="space-y-2">
                                <span
                                  className="font-mono text-xs font-bold uppercase tracking-wider block"
                                  style={{ color: tokens.accent }}
                                >
                                  0{step.stepNumber || sIdx + 1}
                                </span>
                                <h4
                                  className="text-sm font-bold"
                                  style={{ color: tokens.cardText, fontFamily: tokens.fontTitle }}
                                >
                                  {step.title}
                                </h4>
                                <p
                                  className="text-xs leading-relaxed opacity-85"
                                  style={{ color: tokens.cardMuted, fontFamily: tokens.fontBody }}
                                >
                                  {step.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Bottom takeaway pill */}
                        {currentSlide.calloutPill && (
                          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 flex items-center gap-2.5 shadow-xs">
                            <span className="text-base">{currentSlide.calloutPill.icon || "💡"}</span>
                            <p className="text-xs font-semibold text-emerald-300">
                              {currentSlide.calloutPill.text}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 9. QUOTE / SACRED TEXT (GAMMA BENCHMARK) */}
                    {currentSlide.layout === "quote" && (
                      <div
                        className="space-y-4 max-w-4xl mx-auto h-full flex flex-col justify-center"
                        dir={currentSlide.isRtl ? "rtl" : "ltr"}
                      >
                        {/* Source / Citation Badge */}
                        <div className="text-center">
                          <span
                            className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold border shadow-xs"
                            style={{
                              backgroundColor: `${tokens.accent}15`,
                              borderColor: `${tokens.accent}40`,
                              color: tokens.accent,
                            }}
                          >
                            {currentSlide.quoteBox?.badge || (currentSlide.isRtl ? "شاهد ومبدأ أساسي" : "CORE PRINCIPLE")}
                          </span>
                          <h2
                            className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2"
                            style={{ color: tokens.textPrimary, fontFamily: tokens.fontTitle }}
                          >
                            {currentSlide.title}
                          </h2>
                        </div>

                        {/* Illuminated Quote Card */}
                        <div
                          className="rounded-3xl border p-6 sm:p-9 space-y-3 relative overflow-hidden shadow-xl text-center"
                          style={{
                            backgroundColor: tokens.isDark ? "rgba(15, 23, 42, 0.85)" : tokens.cardBg,
                            borderColor: tokens.accent,
                            borderWidth: "1.5px",
                          }}
                        >
                          <blockquote
                            className="text-lg sm:text-2xl font-serif font-bold italic leading-relaxed"
                            style={{ color: tokens.cardText, fontFamily: tokens.fontTitle }}
                          >
                            {currentSlide.isRtl ? `﴿${currentSlide.quote?.text || currentSlide.quoteBox?.text || currentSlide.subtitle}﴾` : `“${currentSlide.quote?.text || currentSlide.quoteBox?.text || currentSlide.subtitle}”`}
                          </blockquote>
                          {(currentSlide.quote?.author || currentSlide.quoteBox?.citation) && (
                            <div
                              className="pt-2 text-xs sm:text-sm font-semibold opacity-90"
                              style={{ color: tokens.accent }}
                            >
                              — {currentSlide.quote?.author || currentSlide.quoteBox?.citation}
                            </div>
                          )}
                        </div>

                        {/* Explanatory synthesis if bullets present */}
                        {currentSlide.bullets && currentSlide.bullets.length > 0 && (
                          <div className="space-y-2 text-center max-w-2xl mx-auto pt-1">
                            {currentSlide.bullets.slice(0, 2).map((b, bIdx) => (
                              <p
                                key={bIdx}
                                className="text-xs sm:text-sm leading-relaxed opacity-85"
                                style={{ color: tokens.textSecondary, fontFamily: tokens.fontBody }}
                              >
                                {b}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 10. TEXT WITH VISUAL / DIAGRAM / PICTURE */}
                    {(currentSlide.layout === "text-visual" ||
                      currentSlide.layout === "image-led") && (
                      <div className="space-y-4">
                        <div>
                          <h2
                            className={`${
                              currentSlide.title.length > 70
                                ? "text-xl sm:text-2xl lg:text-3xl"
                                : currentSlide.title.length > 40
                                  ? "text-2xl sm:text-3xl lg:text-4xl"
                                  : "text-2xl sm:text-4xl"
                            } font-bold tracking-tight leading-tight line-clamp-2`}
                            style={{ color: tokens.textPrimary, fontFamily: tokens.fontTitle }}
                          >
                            {currentSlide.title}
                          </h2>
                          {currentSlide.subtitle && (
                            <p
                              className="mt-1 text-xs sm:text-sm italic line-clamp-2"
                              style={{ color: tokens.textSecondary, fontFamily: tokens.fontBody }}
                            >
                              {currentSlide.subtitle}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-5 items-stretch pt-2">
                          {currentSlide.bullets && (
                            <div className="flex flex-col justify-between gap-3 h-full">
                              {currentSlide.bullets.map((b, idx) => (
                                <div
                                  key={idx}
                                  className="rounded-2xl border p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs transition-all flex-1"
                                  style={{
                                    backgroundColor: tokens.cardBg,
                                    borderColor: tokens.cardBorder,
                                  }}
                                >
                                  <span
                                    className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg text-xs font-mono font-bold text-white mt-0.5 shadow-xs"
                                    style={{ backgroundColor: tokens.accent }}
                                  >
                                    0{idx + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    {renderBulletWithAnchor(b, tokens.cardText)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Contextual Visual Asset Box */}
                          {(() => {
                            const visualData = (() => {
                              const isCustomUpload = currentSlide.visual?.imageUrl && !currentSlide.visual.imageUrl.startsWith("data:image/svg");
                              if (isCustomUpload) {
                                return {
                                  imageUrl: currentSlide.visual!.imageUrl,
                                  svgContent: currentSlide.visual!.svgContent,
                                  type: currentSlide.visual!.type || "picture",
                                  concept: currentSlide.visual!.concept || currentSlide.title,
                                  caption: currentSlide.visual!.caption || currentSlide.subtitle,
                                };
                              }
                              // Always synthesize clean, theme-matched SVG matching current tokens
                              return buildContextualVisual({
                                title: currentSlide.title,
                                subtitle: currentSlide.subtitle,
                                bullets: currentSlide.bullets,
                                concept: currentSlide.visual?.concept || currentSlide.title,
                                accentColor: tokens.accent,
                                isDark: tokens.isDark,
                              });
                            })();

                            return (
                              <div
                                className="rounded-2xl border p-4 flex flex-col justify-between gap-3 shadow-xs transition-all h-full"
                                style={{
                                  backgroundColor: tokens.cardBg,
                                  borderColor: tokens.cardBorder,
                                }}
                              >
                                <div className="w-full flex items-center justify-between px-1">
                                  <span
                                    className="text-[10px] font-mono uppercase font-bold tracking-wider"
                                    style={{ color: tokens.accent }}
                                  >
                                    {(visualData.type || "VISUAL").toUpperCase()} //{" "}
                                    {(visualData.concept || "SYSTEM MATRIX").slice(0, 24)}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled={isRegeneratingVisual}
                                      onClick={() => handleRegenerateVisual(currentSlideIndex)}
                                      className="h-6 px-2 text-[10px] font-mono gap-1"
                                      title="Regenerate this visual using configured AI image providers"
                                    >
                                      {isRegeneratingVisual ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <RefreshCw className="h-3 w-3" />
                                      )}
                                      Regen
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => visualUploadInputRef.current?.click()}
                                      className="h-6 px-2 text-[10px] font-mono gap-1"
                                      title="Upload a custom PNG/JPG/SVG image"
                                    >
                                      <Upload className="h-3 w-3" />
                                      Replace
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRemoveVisual(currentSlideIndex)}
                                      className="h-6 px-1.5 text-[10px] text-destructive hover:text-destructive"
                                      title="Remove visual and switch slide to standard layout"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>

                                    <input
                                      type="file"
                                      ref={visualUploadInputRef}
                                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUploadCustomVisual(currentSlideIndex, file);
                                        e.target.value = "";
                                      }}
                                    />
                                  </div>
                                </div>

                                <div
                                  className="w-full rounded-xl overflow-hidden border flex items-center justify-center p-2 min-h-[190px] max-h-[250px]"
                                  style={{
                                    borderColor: tokens.cardBorder,
                                    backgroundColor: tokens.cardBg,
                                  }}
                                >
                                  {visualData.svgContent ? (
                                    <div
                                      className="w-full h-full flex items-center justify-center [&_svg]:max-h-[235px] [&_svg]:w-full [&_svg]:h-auto"
                                      dangerouslySetInnerHTML={{ __html: visualData.svgContent }}
                                    />
                                  ) : (
                                    <img
                                      src={visualData.imageUrl}
                                      alt={visualData.concept || "Slide visual asset"}
                                      className="w-full h-auto max-h-[240px] object-contain rounded-lg"
                                      onError={(e) => {
                                        const clientVis = buildContextualVisual({
                                          title: currentSlide.title,
                                          subtitle: currentSlide.subtitle,
                                          bullets: currentSlide.bullets,
                                          concept: currentSlide.title,
                                          accentColor: tokens.accent,
                                          isDark: tokens.isDark,
                                        });
                                        if (clientVis.svgContent) {
                                          const parent = e.currentTarget.parentElement;
                                          if (parent) {
                                            parent.innerHTML = `<div class="w-full h-full flex items-center justify-center [&_svg]:max-h-[235px] [&_svg]:w-full [&_svg]:h-auto">${clientVis.svgContent}</div>`;
                                          }
                                        }
                                      }}
                                    />
                                  )}
                                </div>

                                <span
                                  className="text-[11px] italic px-1 line-clamp-1"
                                  style={{ color: tokens.cardMuted }}
                                >
                                  {visualData.caption ||
                                    currentSlide.subtitle ||
                                    "Visual representation & structural topology"}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* 11. CONCLUSION */}
                    {currentSlide.layout === "conclusion" && (
                      <div
                        className="rounded-2xl border p-6 sm:p-8 space-y-5"
                        style={{
                          backgroundColor: tokens.cardBg,
                          borderColor: tokens.cardBorder,
                        }}
                      >
                        <div>
                          <span
                            className="text-[10px] font-mono uppercase font-bold tracking-wider"
                            style={{ color: tokens.accent }}
                          >
                            SYNTHESIS & ACTION CHECKLIST
                          </span>
                          <h2
                            className="text-2xl sm:text-3xl font-bold tracking-tight mt-1"
                            style={{ color: tokens.cardText, fontFamily: tokens.fontTitle }}
                          >
                            {currentSlide.title}
                          </h2>
                          {currentSlide.subtitle && (
                            <p
                              className="text-xs sm:text-sm mt-0.5"
                              style={{ color: tokens.cardMuted, fontFamily: tokens.fontBody }}
                            >
                              {currentSlide.subtitle}
                            </p>
                          )}
                        </div>

                        {currentSlide.bullets && currentSlide.bullets.length > 0 && (
                          <ul className="space-y-3 pt-2">
                            {currentSlide.bullets.map((b, idx) => (
                              <li key={idx} className="flex items-start gap-3">
                                <span
                                  className="h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                                  style={{ backgroundColor: tokens.accent }}
                                >
                                  ✓
                                </span>
                                <span
                                  className="text-xs sm:text-sm leading-relaxed"
                                  style={{ color: tokens.cardText, fontFamily: tokens.fontBody }}
                                >
                                  {b}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* 12. STANDARD CONTENT */}
                    {currentSlide.layout === "content" && (
                      <div className="space-y-5 max-w-4xl">
                        {renderSlideHeader(currentSlide)}

                        {currentSlide.bullets && currentSlide.bullets.length > 0 && (
                          currentSlide.bullets.length <= 2 ? (
                            <div
                              className="rounded-2xl border p-6 sm:p-7 space-y-4 shadow-xs relative overflow-hidden mt-2"
                              style={{
                                backgroundColor: tokens.cardBg,
                                borderColor: tokens.cardBorder,
                              }}
                            >
                              <div
                                className="absolute top-0 left-0 bottom-0 w-2"
                                style={{ backgroundColor: tokens.accent }}
                              />
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-[10px] sm:text-xs font-mono uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border"
                                  style={{
                                    backgroundColor: `${tokens.accent}15`,
                                    color: tokens.accent,
                                    borderColor: `${tokens.accent}35`,
                                  }}
                                >
                                  KEY STRATEGIC FOCUS
                                </span>
                              </div>
                              <ul className="space-y-3.5 text-base sm:text-lg">
                                {currentSlide.bullets.map((bullet, idx) => (
                                  <li key={idx} className="flex items-start gap-3">
                                    <span
                                      className="h-2.5 w-2.5 rounded-full mt-2.5 shrink-0"
                                      style={{ backgroundColor: tokens.accent }}
                                    />
                                    {renderBulletWithAnchor(bullet, tokens.cardText)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : currentSlide.bullets.length >= 4 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                              {/* Left Column */}
                              <div
                                className="rounded-2xl border p-5 space-y-3 relative overflow-hidden shadow-2xs"
                                style={{
                                  backgroundColor: tokens.cardBg,
                                  borderColor: tokens.cardBorder,
                                }}
                              >
                                <div
                                  className="absolute top-0 left-0 bottom-0 w-1.5"
                                  style={{ backgroundColor: tokens.accent }}
                                />
                                <span
                                  className="text-[10px] font-mono uppercase font-bold tracking-wider text-muted-foreground block"
                                  style={{ color: tokens.accent }}
                                >
                                  STRATEGIC FRAMEWORK
                                </span>
                                <ul className="space-y-2.5 text-xs sm:text-sm">
                                  {currentSlide.bullets.slice(0, Math.ceil(currentSlide.bullets.length / 2)).map((bullet, idx) => (
                                    <li key={idx} className="flex items-start gap-2.5">
                                      <span
                                        className="h-2 w-2 rounded-full mt-1.5 shrink-0"
                                        style={{ backgroundColor: tokens.accent }}
                                      />
                                      {renderBulletWithAnchor(bullet, tokens.cardText)}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              {/* Right Column */}
                              <div
                                className="rounded-2xl border p-5 space-y-3 relative overflow-hidden shadow-2xs"
                                style={{
                                  backgroundColor: tokens.cardBg,
                                  borderColor: tokens.cardBorder,
                                }}
                              >
                                <div
                                  className="absolute top-0 left-0 bottom-0 w-1.5"
                                  style={{ backgroundColor: tokens.accent }}
                                />
                                <span
                                  className="text-[10px] font-mono uppercase font-bold tracking-wider text-muted-foreground block"
                                  style={{ color: tokens.accent }}
                                >
                                  OPERATIONAL IMPACT
                                </span>
                                <ul className="space-y-2.5 text-xs sm:text-sm">
                                  {currentSlide.bullets.slice(Math.ceil(currentSlide.bullets.length / 2), 6).map((bullet, idx) => (
                                    <li key={idx} className="flex items-start gap-2.5">
                                      <span
                                        className="h-2 w-2 rounded-full mt-1.5 shrink-0"
                                        style={{ backgroundColor: tokens.accent }}
                                      />
                                      {renderBulletWithAnchor(bullet, tokens.cardText)}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          ) : (
                            <ul className="space-y-3.5 pt-2 text-sm sm:text-base">
                              {currentSlide.bullets.map((bullet, idx) => (
                                <li key={idx} className="flex items-start gap-3">
                                  <span
                                    className="h-2 w-2 rounded-full mt-2.5 shrink-0"
                                    style={{ backgroundColor: tokens.accent }}
                                  />
                                  {renderBulletWithAnchor(bullet, tokens.textPrimary)}
                                </li>
                              ))}
                            </ul>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* Slide Footer */}
                  <div
                    className="flex items-center justify-between text-[10px] font-mono pt-2.5 border-t mt-auto shrink-0"
                    style={{ borderColor: tokens.dividerColor, color: tokens.textMuted }}
                  >
                    <span>{tokens.name}</span>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span>
                        Slide {currentSlide.slideNumber} of {slides.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Viewport Control Bar */}
                <div
                  className={`mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-3 text-xs shrink-0 ${
                    isFullscreen ? "w-full max-w-4xl mx-auto" : "w-full"
                  }`}
                >
                  {/* Left: Slide navigation buttons */}
                  <div data-tour="tour-preview-nav" className="flex items-center gap-2">
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={handlePrevSlide}
                      disabled={currentSlideIdx === 0}
                      className="min-h-[44px] px-3.5 text-xs font-semibold"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <span className="font-mono text-xs text-muted-foreground px-2">
                      Slide {currentSlideIdx + 1} of {slides.length}
                    </span>
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={handleNextSlide}
                      disabled={currentSlideIdx === slides.length - 1}
                      className="min-h-[44px] px-3.5 text-xs font-semibold"
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>

                  {/* Right: Edit Slide, Fullscreen & Speaker Notes Toggle */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="hero"
                      size="sm"
                      onClick={() => openEditSlideModal(currentSlideIdx)}
                      className="min-h-[44px] px-3.5 text-xs font-semibold rounded-xl"
                      title="Edit slide text, bullets, or layout (Fix typos, customize message)"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit Slide
                    </Button>

                    {currentSlide.notes && (
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => setShowNotes(!showNotes)}
                        className={`min-h-[44px] text-xs ${showNotes ? "bg-primary/10 border-primary" : ""}`}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        {showNotes ? "Hide Notes" : "Speaker Notes"}
                      </Button>
                    )}

                    <Button
                      variant="glass"
                      size="sm"
                      onClick={toggleFullscreen}
                      className="min-h-[44px] text-xs"
                      title="Toggle Fullscreen (or press 'F')"
                    >
                      {isFullscreen ? (
                        <>
                          <Minimize2 className="h-4 w-4 mr-1" /> Exit Fullscreen
                        </>
                      ) : (
                        <>
                          <Maximize2 className="h-4 w-4 mr-1" /> Fullscreen
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Speaker Notes Drawer */}
                {showNotes && currentSlide.notes && (
                  <div className="mt-3 rounded-xl border border-border bg-surface-2/60 p-4 text-xs">
                    <span className="font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1 text-[10px]">
                      Speaker Delivery Notes:
                    </span>
                    <p className="text-foreground leading-relaxed">{currentSlide.notes}</p>
                  </div>
                )}
              </div>

              {/* Realism & Session Persistence Card */}
              <div className="rounded-2xl border border-border/80 bg-surface-2/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2.5">
                  <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Accurate In-Browser Viewer:</strong> Layouts, colors, and font pairings
                    match the generated PowerPoint binary. Your presentation stays active in your browser until you refresh or close this page.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="glass"
                    size="sm"
                    className="min-h-[40px] text-xs"
                    onClick={handleDownloadPptx}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" /> Save Offline
                  </Button>
                </div>
              </div>
                </>
              )}
            </div>
          </div>
        </main>

        <Footer />
      </div>

      {/* Interactive Slide Editor Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl border-border bg-card p-6 shadow-lift max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 font-mono text-xs font-bold uppercase tracking-wider">
                Slide Editor
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                Slide {editingSlideIdx + 1} of {slides.length}
              </span>
            </div>
            <DialogTitle className="mt-1 font-serif text-2xl font-bold text-foreground">
              Customize Slide Content &amp; Layout
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify the slide title, subtitle, layout style, bullet points, and speaker notes. Changes apply instantly to your live preview and downloaded PowerPoint deck.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4 text-xs">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Slide Title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="e.g. Data Ingestion &amp; Multimodal Inputs"
                className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Subtitle / Main Message
              </label>
              <input
                type="text"
                value={editSubtitle}
                onChange={(e) => setEditSubtitle(e.target.value)}
                placeholder="e.g. High-throughput data preprocessing and normalization"
                className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Layout Selection */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Slide Layout Structure
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "content", label: "Standard Bullets" },
                  { id: "text-visual", label: "Text & Visual Diagram" },
                  { id: "two-column", label: "Two Columns" },
                  { id: "process", label: "Process Steps" },
                  { id: "timeline", label: "Timeline / Roadmap" },
                  { id: "metrics", label: "Metrics & KPIs" },
                  { id: "conclusion", label: "Conclusion & Next Steps" },
                  { id: "quote", label: "Standout Insight" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setEditLayout(item.id)}
                    className={`rounded-xl border px-3 py-2 text-[11px] font-medium transition-all text-left ${
                      editLayout === item.id
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border bg-surface-2/60 text-muted-foreground hover:text-foreground hover:bg-surface-2"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bullet Points */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-foreground">
                  Bullet Points ({editBullets.length})
                </label>
                <Button
                  type="button"
                  variant="glass"
                  size="sm"
                  onClick={handleAddBullet}
                  className="h-7 text-[11px] px-2.5 rounded-lg"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Bullet
                </Button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {editBullets.map((bullet, bIdx) => (
                  <div key={bIdx} className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground w-4 shrink-0 text-center">
                      {bIdx + 1}.
                    </span>
                    <input
                      type="text"
                      value={bullet}
                      onChange={(e) => handleUpdateBullet(bIdx, e.target.value)}
                      placeholder={`Bullet point ${bIdx + 1}`}
                      className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveBullet(bIdx, "up")}
                        disabled={bIdx === 0}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveBullet(bIdx, "down")}
                        disabled={bIdx === editBullets.length - 1}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveBullet(bIdx)}
                        disabled={editBullets.length <= 1}
                        className="p-1 rounded-md text-red-500 hover:text-red-700 disabled:opacity-30 cursor-pointer"
                        title="Delete Bullet"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Speaker Notes */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Speaker Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Presenter talking points, background context, or spoken narrative..."
                className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-border pt-4">
            <Button
              type="button"
              variant="glass"
              size="sm"
              onClick={() => setEditModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="hero"
              size="sm"
              disabled={savingEdit}
              onClick={handleSaveSlide}
              className="rounded-xl text-xs font-semibold"
            >
              {savingEdit ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" /> Apply Changes
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assignment Cover Page Editor Dialog */}
      <Dialog open={coverEditModalOpen} onOpenChange={setCoverEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-bold text-foreground">
              Edit Assignment Cover Details &amp; Design
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update candidate names, student IDs, course information, instructor, university logo, or switch between all 10 academic cover templates.
            </DialogDescription>
          </DialogHeader>

          {tempCoverMeta && (
            <div className="space-y-6 pt-2">
              <AssignmentInformationForm
                metadata={tempCoverMeta}
                onChange={setTempCoverMeta}
              />

              <div className="border-t border-border pt-4">
                <CoverTemplateGallery
                  metadata={tempCoverMeta}
                  mode="presentation"
                  onSelectTemplate={(tid, accent) =>
                    setTempCoverMeta({
                      ...tempCoverMeta,
                      coverTemplateId: tid,
                      accentColor: accent || tempCoverMeta.accentColor,
                    })
                  }
                  onUpdateAccentColor={(color) =>
                    setTempCoverMeta({ ...tempCoverMeta, accentColor: color })
                  }
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCoverEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  disabled={savingEdit}
                  onClick={handleSaveCoverMetadata}
                >
                  {savingEdit ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1" /> Apply to Cover Slide
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
