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
import { generateAndDownloadClientPptx } from "@/lib/presentation-session-client";
import { computeThemeTokens } from "@/lib/presentation-theme";
import { buildContextualVisual } from "@/lib/presentation-visual-generator";

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
        toast.success("Download Complete!", {
          description: `Saved "${session?.title || "presentation"}.pptx" to your device.`,
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

  // Active Presentation Preview Screen — Tokens computed from unified theme design system
  const tokens = computeThemeTokens(session.theme, session.typography);
  const theme = session.theme;
  const primaryColor = tokens.textPrimary;
  const accentColor = tokens.accent;
  const bgColor = tokens.bg;
  const fontFamily = tokens.fontBody;

  const renderSlideHeader = (slide: SlidePreviewItem) => (
    <div>
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
                  <div
                    className="flex items-center justify-between text-[11px] font-mono tracking-wider uppercase pb-3 border-b"
                    style={{ borderColor: tokens.dividerColor }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: tokens.accent }}
                      />
                      <span style={{ color: tokens.accent }} className="font-bold">
                        Slide 0{currentSlide.slideNumber} // {currentSlide.layout}
                      </span>
                    </div>
                    <span style={{ color: tokens.textMuted }}>{session.purpose}</span>
                  </div>

                  {/* Dynamic Slide Body Layouts */}
                  <div className="my-auto py-4">
                    {/* 1. TITLE / COVER */}
                    {currentSlide.layout === "title" && (
                      <div className="max-w-4xl space-y-4">
                        <div
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-[11px] font-mono font-bold tracking-wider uppercase"
                          style={{
                            backgroundColor: tokens.cardBg,
                            borderColor: tokens.accent,
                            color: tokens.accent,
                          }}
                        >
                          {(
                            currentSlide.categoryTag ||
                            session.purpose ||
                            "STRATEGIC OVERVIEW"
                          ).toUpperCase()}
                        </div>
                        <h2
                          className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight"
                          style={{ color: tokens.textPrimary, fontFamily: tokens.fontTitle }}
                        >
                          {currentSlide.title}
                        </h2>
                        {currentSlide.subtitle && (
                          <p
                            className="text-base sm:text-xl font-medium"
                            style={{ color: tokens.textSecondary, fontFamily: tokens.fontBody }}
                          >
                            {currentSlide.subtitle}
                          </p>
                        )}
                        <div
                          className="h-1 w-24 rounded-full mt-4"
                          style={{ backgroundColor: tokens.accent }}
                        />
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
                                {currentSlide.leftColumn.bullets.map((b, bIdx) => (
                                  <li
                                    key={bIdx}
                                    className="flex items-start gap-2"
                                    style={{ color: tokens.cardText, fontFamily: tokens.fontBody }}
                                  >
                                    <span
                                      className="h-1.5 w-1.5 rounded-full mt-2 shrink-0"
                                      style={{ backgroundColor: tokens.accent }}
                                    />
                                    <span>{b}</span>
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
                                {currentSlide.rightColumn.bullets.map((b, bIdx) => (
                                  <li
                                    key={bIdx}
                                    className="flex items-start gap-2"
                                    style={{ color: tokens.cardText, fontFamily: tokens.fontBody }}
                                  >
                                    <span
                                      className="h-1.5 w-1.5 rounded-full mt-2 shrink-0"
                                      style={{ backgroundColor: tokens.accent }}
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

                    {/* 8. PROCESS WORKFLOW */}
                    {currentSlide.layout === "process" && (
                      <div className="space-y-5">
                        {renderSlideHeader(currentSlide)}

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 pt-2">
                          {(currentSlide.processSteps || []).map((step, sIdx) => (
                            <div
                              key={sIdx}
                              className="rounded-2xl border p-4 space-y-2.5"
                              style={{
                                backgroundColor: tokens.cardBg,
                                borderColor: tokens.cardBorder,
                              }}
                            >
                              <div
                                className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-white text-sm"
                                style={{ backgroundColor: tokens.accent }}
                              >
                                {step.stepNumber || sIdx + 1}
                              </div>
                              <h4
                                className="text-sm font-bold"
                                style={{ color: tokens.cardText, fontFamily: tokens.fontTitle }}
                              >
                                {step.title}
                              </h4>
                              <p
                                className="text-xs leading-relaxed"
                                style={{ color: tokens.cardMuted, fontFamily: tokens.fontBody }}
                              >
                                {step.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 9. QUOTE / STANDOUT TAKEAWAY */}
                    {currentSlide.layout === "quote" && (
                      <div
                        className="rounded-3xl border p-8 sm:p-12 space-y-4 max-w-4xl mx-auto"
                        style={{
                          backgroundColor: tokens.cardBg,
                          borderColor: tokens.accent,
                        }}
                      >
                        <span
                          className="text-5xl sm:text-6xl font-serif font-bold leading-none block"
                          style={{ color: tokens.accent }}
                        >
                          “
                        </span>
                        <blockquote
                          className="text-lg sm:text-2xl font-serif italic leading-relaxed"
                          style={{ color: tokens.cardText, fontFamily: tokens.fontTitle }}
                        >
                          {currentSlide.quote?.text ||
                            currentSlide.subtitle ||
                            currentSlide.bullets?.[0]}
                        </blockquote>
                        {currentSlide.quote?.author && (
                          <div
                            className="pt-2 border-t text-xs sm:text-sm font-semibold"
                            style={{ borderColor: tokens.dividerColor, color: tokens.accent }}
                          >
                            — {currentSlide.quote.author}{" "}
                            {currentSlide.quote.role ? `• ${currentSlide.quote.role}` : ""}
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

                        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6 items-center pt-2">
                          {currentSlide.bullets && (
                            <ul className="space-y-3 text-sm sm:text-base">
                              {currentSlide.bullets.map((b, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-3"
                                  style={{ color: tokens.textPrimary, fontFamily: tokens.fontBody }}
                                >
                                  <span
                                    className="h-2 w-2 rounded-full mt-2 shrink-0"
                                    style={{ backgroundColor: tokens.accent }}
                                  />
                                  <span className="leading-relaxed">{b}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Contextual Visual Asset Box */}
                          {(() => {
                            const visualData = currentSlide.visual?.imageUrl
                              ? {
                                  imageUrl: currentSlide.visual.imageUrl,
                                  type: currentSlide.visual.type || "picture",
                                  concept: currentSlide.visual.concept || currentSlide.title,
                                  caption: currentSlide.visual.caption || currentSlide.subtitle,
                                }
                              : buildContextualVisual({
                                  title: currentSlide.title,
                                  subtitle: currentSlide.subtitle,
                                  bullets: currentSlide.bullets,
                                  accentColor: tokens.accent,
                                  isDark: tokens.isDark,
                                });

                            return (
                              <div
                                className="rounded-2xl border p-3.5 flex flex-col items-center justify-center gap-2.5 shadow-xs transition-all"
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
                                    {(visualData.concept || "CONCEPT MATRIX").slice(0, 24)}
                                  </span>
                                  <span
                                    className="text-[9px] font-mono px-2 py-0.5 rounded-full border"
                                    style={{
                                      borderColor: tokens.cardBorder,
                                      color: tokens.cardMuted,
                                    }}
                                  >
                                    16:9 Vector
                                  </span>
                                </div>

                                <div
                                  className="w-full rounded-xl overflow-hidden border flex items-center justify-center bg-black/5 min-h-[190px] max-h-[250px]"
                                  style={{ borderColor: tokens.cardBorder }}
                                >
                                  <img
                                    src={visualData.imageUrl}
                                    alt={visualData.concept || "Slide visual asset"}
                                    className="w-full h-auto max-h-[240px] object-contain rounded-lg"
                                  />
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
                          <ul className="space-y-3.5 pt-2 text-sm sm:text-base">
                            {currentSlide.bullets.map((bullet, idx) => (
                              <li key={idx} className="flex items-start gap-3">
                                <span
                                  className="h-2 w-2 rounded-full mt-2.5 shrink-0"
                                  style={{ backgroundColor: tokens.accent }}
                                />
                                <span
                                  className="leading-relaxed"
                                  style={{ color: tokens.textPrimary, fontFamily: tokens.fontBody }}
                                >
                                  {bullet}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Slide Footer */}
                  <div
                    className="flex items-center justify-between text-[10px] font-mono pt-3 border-t"
                    style={{ borderColor: tokens.dividerColor, color: tokens.textMuted }}
                  >
                    <span>DocuMind Vector PowerPoint Studio | {tokens.name}</span>
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
