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
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Footer } from "@/components/landing/Footer";
import {
  fetchPresentationPreviewApi,
  type PresentationSessionData,
  type SlidePreviewItem,
} from "@/lib/api-client";

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
});

export function PresentationPreviewPage() {
  const { id: sessionId } = Route.useParams();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<PresentationSessionData | null>(null);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600);
  const [isExpired, setIsExpired] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<"fit" | 75 | 100 | 125>("fit");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Load session from API
  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        setLoading(true);
        const data = await fetchPresentationPreviewApi(sessionId);
        if (isMounted) {
          setSession(data);
          const remaining = Math.max(0, Math.floor((data.expiresAt - Date.now()) / 1000));
          setSecondsRemaining(remaining);
          if (remaining <= 0) {
            setIsExpired(true);
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const errObj = err as { code?: string; message?: string };
        if (errObj.code === "SESSION_EXPIRED") {
          setIsExpired(true);
        } else {
          toast.error("Failed to load presentation preview", {
            description: errObj.message || "Session not found or server offline.",
          });
          setIsExpired(true);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  // Real 1-second interval timer for 10-minute expiration
  useEffect(() => {
    if (isExpired || !session) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        setIsExpired(true);
        clearInterval(interval);
        toast.warning("Preview Session Expired", {
          description:
            "Temporary files have been deleted from the server in accordance with our privacy policy.",
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session, isExpired]);

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
        description: "This temporary file was already deleted from the server.",
      });
      return;
    }

    try {
      setDownloading(true);
      toast.info("Preparing PowerPoint File...", {
        description: "Streaming vector .pptx package from secure temporary storage.",
      });

      const res = await fetch(`/api/presentations/${sessionId}/download`);
      if (res.status === 410) {
        setIsExpired(true);
        throw new Error("This temporary download link has expired.");
      }
      if (!res.ok) {
        throw new Error("Download request failed.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${session?.title.replace(/[^a-zA-Z0-9_-]/g, "_") || "presentation"}.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Download Complete!", {
        description: `Saved "${a.download}" to your device.`,
      });
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
  if (isExpired || !session) {
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
                <span>Zero permanent storage in MongoDB or Cloud Buckets</span>
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

  // Active Presentation Preview Screen
  const theme = session.theme;
  const primaryColor = theme.colors.primary || "#0F172A";
  const accentColor = theme.colors.accent || "#2563EB";
  const bgColor = theme.colors.bg || "#FFFFFF";
  const fontFamily = session.typography.fontFamily || "Inter";

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

            {/* Countdown Badge & Download PPTX Button */}
            <div className="flex items-center gap-3">
              {/* 10-Minute Expiration Badge */}
              <div
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-mono font-medium shadow-xs ${
                  secondsRemaining < 120
                    ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                }`}
                title="Temporary presentation expires 10 minutes after generation for zero-retention privacy."
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Expires in {formatTime(secondsRemaining)}</span>
              </div>

              {/* Download PPTX Button */}
              <Button
                data-tour="tour-preview-download"
                variant="hero"
                className="min-h-[46px] px-5 text-xs font-semibold gap-2 shadow-xs"
                disabled={downloading || isExpired}
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
                    className={`group relative text-left rounded-xl border p-2.5 transition-all shrink-0 w-44 lg:w-full ${
                      isActive
                        ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                        : "border-border bg-surface-2/40 hover:bg-surface-2 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1">
                      <span className="font-bold">Slide {s.slideNumber}</span>
                      <span className="uppercase">{s.layout}</span>
                    </div>

                    <div className="text-xs font-semibold text-foreground line-clamp-1">
                      {s.title}
                    </div>

                    {s.subtitle && (
                      <div className="text-[10px] text-muted-foreground line-clamp-1 italic mt-0.5">
                        {s.subtitle}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Slide Presentation Viewport */}
            <div className="order-1 lg:order-2 flex flex-col gap-4">
              {/* Canvas Container with ref for Fullscreen */}
              <div
                ref={canvasContainerRef}
                className={`relative overflow-hidden rounded-2xl border border-border shadow-lift flex flex-col justify-between ${
                  isFullscreen ? "bg-black p-6" : "bg-card p-4 sm:p-6"
                }`}
                style={{
                  minHeight: isFullscreen ? "100vh" : "500px",
                }}
              >
                {/* 16:9 Slide Canvas */}
                <div
                  className="relative aspect-16/9 w-full rounded-xl overflow-hidden border border-border/80 shadow-inner flex flex-col justify-between p-6 sm:p-10 transition-all select-text"
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

                  {/* Header / Layout Badge */}
                  <div className="flex items-center justify-between text-[11px] font-mono tracking-wider uppercase border-b border-black/10 dark:border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: accentColor }}
                      />
                      <span style={{ color: accentColor }} className="font-bold">
                        Slide 0{currentSlide.slideNumber} // {currentSlide.layout}
                      </span>
                    </div>
                    <span className="text-muted-foreground opacity-75">{session.purpose}</span>
                  </div>

                  {/* Dynamic Slide Body Layouts */}
                  <div className="my-auto py-4">
                    {currentSlide.layout === "title" && (
                      <div className="max-w-3xl space-y-4">
                        <div
                          className="h-1.5 w-16 rounded-full"
                          style={{ backgroundColor: accentColor }}
                        />
                        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                          {currentSlide.title}
                        </h2>
                        {currentSlide.subtitle && (
                          <p className="text-base sm:text-xl text-muted-foreground/90 font-medium">
                            {currentSlide.subtitle}
                          </p>
                        )}
                      </div>
                    )}

                    {currentSlide.layout === "metrics" && (
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
                            {currentSlide.title}
                          </h2>
                          {currentSlide.subtitle && (
                            <p className="mt-1 text-xs sm:text-sm text-muted-foreground italic">
                              {currentSlide.subtitle}
                            </p>
                          )}
                        </div>

                        {currentSlide.metrics && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                            {currentSlide.metrics.map((m, mIdx) => (
                              <div
                                key={mIdx}
                                className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-5 shadow-xs"
                              >
                                <div
                                  className="text-3xl sm:text-4xl font-mono font-bold"
                                  style={{ color: accentColor }}
                                >
                                  {m.value}
                                </div>
                                <div className="mt-2 text-sm font-semibold">{m.label}</div>
                                {m.description && (
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {m.description}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {currentSlide.layout === "two-column" && (
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
                            {currentSlide.title}
                          </h2>
                          {currentSlide.subtitle && (
                            <p className="mt-1 text-xs sm:text-sm text-muted-foreground italic">
                              {currentSlide.subtitle}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                          {currentSlide.leftColumn && (
                            <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-5">
                              <h3 className="font-bold text-sm sm:text-base border-b border-black/10 pb-2">
                                {currentSlide.leftColumn.title}
                              </h3>
                              <ul className="mt-3 space-y-2 text-xs sm:text-sm text-muted-foreground">
                                {currentSlide.leftColumn.bullets.map((b, bIdx) => (
                                  <li key={bIdx} className="flex items-start gap-2">
                                    <span
                                      className="h-1.5 w-1.5 rounded-full mt-2 shrink-0"
                                      style={{ backgroundColor: accentColor }}
                                    />
                                    <span>{b}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {currentSlide.rightColumn && (
                            <div
                              className="rounded-2xl border p-5 bg-black/5 dark:bg-white/5"
                              style={{ borderColor: accentColor }}
                            >
                              <h3
                                className="font-bold text-sm sm:text-base border-b border-black/10 pb-2"
                                style={{ color: accentColor }}
                              >
                                {currentSlide.rightColumn.title}
                              </h3>
                              <ul className="mt-3 space-y-2 text-xs sm:text-sm text-muted-foreground">
                                {currentSlide.rightColumn.bullets.map((b, bIdx) => (
                                  <li key={bIdx} className="flex items-start gap-2">
                                    <span
                                      className="h-1.5 w-1.5 rounded-full mt-2 shrink-0"
                                      style={{ backgroundColor: accentColor }}
                                    />
                                    <span>{b}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {(currentSlide.layout === "content" ||
                      currentSlide.layout === "agenda" ||
                      currentSlide.layout === "conclusion") && (
                      <div className="space-y-5 max-w-4xl">
                        <div>
                          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
                            {currentSlide.title}
                          </h2>
                          {currentSlide.subtitle && (
                            <p className="mt-1 text-xs sm:text-sm text-muted-foreground italic">
                              {currentSlide.subtitle}
                            </p>
                          )}
                        </div>

                        {currentSlide.bullets && currentSlide.bullets.length > 0 && (
                          <ul className="space-y-3 pt-2 text-sm sm:text-lg">
                            {currentSlide.bullets.map((bullet, idx) => (
                              <li key={idx} className="flex items-start gap-3">
                                <span
                                  className="h-2 w-2 rounded-full mt-2.5 shrink-0"
                                  style={{ backgroundColor: accentColor }}
                                />
                                <span className="leading-relaxed">{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Slide Footer */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground border-t border-black/10 dark:border-white/10 pt-3">
                    <span>DocuMind Vector PowerPoint Studio</span>
                    <span>
                      Slide {currentSlide.slideNumber} of {slides.length}
                    </span>
                  </div>
                </div>

                {/* Viewport Control Bar */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-3 text-xs">
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

                  {/* Right: Fullscreen & Speaker Notes Toggle */}
                  <div className="flex items-center gap-2">
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

              {/* Realism & Privacy Notice Card */}
              <div className="rounded-2xl border border-border/80 bg-surface-2/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2.5">
                  <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Accurate In-Browser Viewer:</strong> Layouts, colors, and font pairings
                    match the generated PowerPoint binary. Files will self-delete in{" "}
                    {formatTime(secondsRemaining)}.
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
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
