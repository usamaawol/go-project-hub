import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  BookOpen,
  ArrowRightLeft,
  Minimize2,
  FileText,
  Layers,
  ArrowRight,
  CheckCircle2,
  Shield,
  Zap,
  Play,
  Download,
  Eye,
  Sliders,
  Check,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Hero } from "@/components/landing/Hero";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { ThemeThumb } from "@/components/landing/ThemeThumb";
import { TEMPLATES, type TemplateItem } from "@/data/templates";
import { restartProductTour } from "@/components/tour/ProductTour";
import { downloadTemplatePptx } from "@/lib/pptx-export";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DocuMind — Your Documents. Smarter." },
      {
        name: "description",
        content:
          "Turn your text into beautiful presentations, improve document formatting, and simplify your everyday file tasks with DocuMind.",
      },
      { property: "og:title", content: "DocuMind — Your Documents. Smarter." },
      {
        property: "og:description",
        content:
          "Your ideas deserve better documents. 50 free presentation themes, academic formatting, and lossless compression.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [collapsed, setCollapsed] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // 4 Featured Free Themes to showcase
  const featuredFreeThemes = TEMPLATES.filter((t) => t.isFree).slice(0, 4);

  const handleDownload = async (template: TemplateItem) => {
    try {
      setDownloadingId(template.id);
      toast.info("Generating Presentation...", {
        description: `Exporting "${template.name}" as PowerPoint .pptx.`,
      });
      const filename = await downloadTemplatePptx(template);
      toast.success("Download Complete!", {
        description: `Saved "${filename}" to your computer.`,
      });
    } catch {
      toast.error("Download Failed", {
        description: "Could not export PowerPoint file.",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div
      id="top"
      className="min-h-screen bg-background text-foreground selection:bg-blue-100 selection:text-primary flex flex-col"
    >
      {/* Modern Left Sidebar Navigation */}
      <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />

      {/* Main Content Area Padded for Sidebar */}
      <div
        className={`flex-1 transition-all duration-300 ${collapsed ? "lg:pl-20" : "lg:pl-64"} pb-24 lg:pb-0`}
      >
        <main>
          {/* Hero Section — Clean Introduction with 2 Primary CTAs & Shortcuts */}
          <Hero />

          {/* Interactive Guided Tour Banner */}
          <section className="mx-auto max-w-7xl px-5 lg:px-8 py-2">
            <div className="rounded-2xl border border-primary/20 bg-linear-to-r from-primary/5 via-card to-primary/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    New to DocuMind? Take the 2-Minute Interactive Tour
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Discover our AI presentation maker, academic styling, file tools, and 50 free
                    themes.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  variant="hero"
                  size="sm"
                  onClick={() => restartProductTour()}
                  className="text-xs"
                >
                  <Play className="h-3 w-3 mr-1.5 fill-current" /> Start Tour
                </Button>
                <Button variant="glass" size="sm" asChild className="text-xs">
                  <Link to="/how-it-works">How It Works</Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Dedicated Productivity Tools Launchpad */}
          <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                  The Complete Workspace Suite
                </span>
                <h2 className="mt-1 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Choose the Right Tool for the Job
                </h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                  Each tool is a dedicated workspace engineered for performance, precision, and
                  clean file output.
                </p>
              </div>
              <Button variant="glass" size="sm" asChild className="shrink-0">
                <Link to="/how-it-works">
                  Explore Architecture <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Link>
              </Button>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Tool 1: Presentation Maker */}
              <div className="group rounded-2xl border border-border bg-card p-6 shadow-paper hover:shadow-card hover:border-primary/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      <Sparkles className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                      AI Powered
                    </span>
                  </div>
                  <h3 className="mt-4 font-serif text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    Presentation Maker
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Convert raw text, notes, or uploaded documents into structured 16:9 PowerPoint
                    slide decks with intelligent theme recommendations.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    50 Free Themes · PPTX
                  </span>
                  <Button variant="hero" size="sm" asChild className="text-xs">
                    <Link to="/presentation-maker">
                      Launch Maker <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Tool 2: Document Studio */}
              <div className="group rounded-2xl border border-border bg-card p-6 shadow-paper hover:shadow-card hover:border-primary/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      <BookOpen className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                      Academic & Report
                    </span>
                  </div>
                  <h3 className="mt-4 font-serif text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    Document Studio
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Format academic theses, manuscripts, and reports with APA/MLA presets,
                    structured cover pages, margin standards, and running headers.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    APA · MLA · IEEE
                  </span>
                  <Button variant="hero" size="sm" asChild className="text-xs">
                    <Link to="/document-studio">
                      Open Studio <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Tool 3: File Converter */}
              <div className="group rounded-2xl border border-border bg-card p-6 shadow-paper hover:shadow-card hover:border-primary/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <ArrowRightLeft className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                      Multi-Format
                    </span>
                  </div>
                  <h3 className="mt-4 font-serif text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    File Converter
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Two-way transformation between PDF, Microsoft Word (.docx), and UTF-8 text with
                    deterministic parsing and zero waiting queues.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    PDF ↔ DOCX ↔ TXT
                  </span>
                  <Button variant="glass" size="sm" asChild className="text-xs">
                    <Link to="/converter">
                      Convert <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Tool 4: PDF Compressor */}
              <div className="group rounded-2xl border border-border bg-card p-6 shadow-paper hover:shadow-card hover:border-primary/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <Minimize2 className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                      Ghostscript
                    </span>
                  </div>
                  <h3 className="mt-4 font-serif text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    PDF Compressor
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Reduce bloated document sizes with Light (220 DPI), Balanced (150 DPI), and
                    Strong (96 DPI) profiles with honest byte telemetry.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    Genuine Byte Counts
                  </span>
                  <Button variant="glass" size="sm" asChild className="text-xs">
                    <Link to="/pdf-compressor">
                      Compress <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Tool 5: Text Extractor */}
              <div className="group rounded-2xl border border-border bg-card p-6 shadow-paper hover:shadow-card hover:border-primary/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                      <FileText className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase">
                      Instant Telemetry
                    </span>
                  </div>
                  <h3 className="mt-4 font-serif text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    Text Extractor
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Extract clean, raw text from documents instantly in your browser with word,
                    character, line telemetry, and keyword occurrence search.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    Telemetry & Search
                  </span>
                  <Button variant="glass" size="sm" asChild className="text-xs">
                    <Link to="/text-extractor">
                      Extract <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Tool 6: Presentation Templates */}
              <div className="group rounded-2xl border border-border bg-card p-6 shadow-paper hover:shadow-card hover:border-primary/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      <Layers className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                      50 Free Themes
                    </span>
                  </div>
                  <h3 className="mt-4 font-serif text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    Presentation Themes
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Browse 110 professionally designed themes (50 completely free forever). Instant
                    slide previews and editable vector .pptx export.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    110 Total · 50 Free
                  </span>
                  <Button variant="hero" size="sm" asChild className="text-xs">
                    <Link to="/templates">
                      Browse Themes <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* 50 Free Themes Showcase Teaser */}
          <section className="border-y border-border bg-surface-2/30 py-16 lg:py-20">
            <div className="mx-auto max-w-7xl px-5 lg:px-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-3">
                    <Check className="h-3.5 w-3.5" />
                    <span>Free Access Guarantee</span>
                  </div>
                  <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                    50 Free Presentation Themes. Zero Paywalls.
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                    Every published free theme can be customized and exported to genuine PowerPoint
                    format with no watermarks, subscription prompts, or trial limits.
                  </p>
                </div>

                <Button variant="hero" asChild className="shrink-0">
                  <Link to="/templates">
                    Browse All 110 Themes <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>

              {/* 4 Featured Free Theme Cards */}
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {featuredFreeThemes.map((theme) => {
                  const isDownloading = downloadingId === theme.id;
                  return (
                    <div
                      key={theme.id}
                      className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-paper hover:shadow-card hover:border-primary/40 transition-all"
                    >
                      <div>
                        {/* Thumbnail */}
                        <div className="relative aspect-16/10 w-full overflow-hidden rounded-xl border border-border/80">
                          <ThemeThumb kind={theme.kind} slide={0} />
                          <div className="absolute top-2 left-2 flex items-center gap-1.5">
                            <span className="rounded-full bg-emerald-600/90 backdrop-blur-xs px-2 py-0.5 font-mono text-[9px] font-bold text-white uppercase">
                              Free
                            </span>
                            <span className="rounded-full bg-black/60 backdrop-blur-xs px-2 py-0.5 font-mono text-[9px] text-white">
                              {theme.category}
                            </span>
                          </div>
                        </div>

                        {/* Title & info */}
                        <div className="mt-3">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-serif text-base font-bold text-foreground group-hover:text-primary transition-colors">
                              {theme.name}
                            </h3>
                            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                              {theme.slidesCount} slides
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {theme.description}
                          </p>
                        </div>
                      </div>

                      {/* Download action */}
                      <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="glass"
                          className="h-8 text-xs flex-1"
                          disabled={isDownloading}
                          onClick={() => handleDownload(theme)}
                        >
                          <Download className="h-3 w-3 mr-1" /> PPTX
                        </Button>
                        <Button size="sm" variant="hero" className="h-8 text-xs flex-1" asChild>
                          <Link to="/presentation-maker">Use</Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Privacy & Trust Guarantees Section */}
          <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                Built for Trust
              </span>
              <h2 className="mt-2 font-serif text-3xl font-bold text-foreground">
                Privacy-First, Deterministic Processing
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
                DocuMind is engineered so that your sensitive documents remain entirely under your
                control.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 mb-4">
                  <Shield className="h-5 w-5" />
                </span>
                <h3 className="font-serif text-lg font-bold text-foreground">Zero Retention</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Uploaded files are processed in ephemeral memory and discarded immediately upon
                  job completion. We do not store or inspect your documents.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 mb-4">
                  <Zap className="h-5 w-5" />
                </span>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Client-Side Acceleration
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Format detection, text extraction, and telemetry run directly in your browser for
                  instant response times with zero network overhead.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 mb-4">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  No Account Required
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  You can convert documents, extract text, compress PDFs, and generate presentations
                  immediately without creating an account or signing in.
                </p>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </div>
  );
}
